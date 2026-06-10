const { Client, GatewayIntentBits, Events } = require('discord.js');
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

// 1. CẤU HÌNH CƠ BẢN
const app = express();
app.use(cors({ origin: '*' })); // Cho phép mọi web truy cập API

// Gọi biến từ Environment Variables (Trên Render ông đã cấu hình)
const TOKEN = process.env.TOKEN;
const MONGO_URI = process.env.MONGO_URI;
const SERVER_ID = "1514089514535096482";

// 2. KẾT NỐI MONGODB
mongoose.connect(MONGO_URI)
    .then(() => console.log('✅ Đã kết nối MongoDB!'))
    .catch(err => console.error('❌ Lỗi MongoDB:', err));

const memberSchema = new mongoose.Schema({ name: String, joinedAt: Date });
const Member = mongoose.model('Member', memberSchema);

// 3. CẤU HÌNH BOT
const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildPresences 
    ] 
});

client.on(Events.ClientReady, async (c) => {
    console.log(`🤖 Bot đã đăng nhập: ${c.user.tag}`);
    const guild = client.guilds.cache.get(SERVER_ID);
    if (guild) {
        const members = await guild.members.fetch({ force: true });
        for (const [id, m] of members) {
            if (!m.user.bot) {
                await Member.findOneAndUpdate(
                    { name: m.user.username }, 
                    { name: m.user.username, joinedAt: m.joinedAt }, 
                    { upsert: true }
                );
            }
        }
        console.log(`☁️ Đã đồng bộ ${members.size} thành viên.`);
    }
});

// 4. API CHO WEB
app.get('/api/members', async (req, res) => {
    try {
        const members = await Member.find().sort({ joinedAt: 1 });
        const memberList = members.map(m => `${m.name}|${m.joinedAt.toISOString()}`).join('\n');
        res.send(memberList);
    } catch (err) { res.status(500).send("Lỗi Server"); }
});

app.get('/api/stats', (req, res) => {
    const guild = client.guilds.cache.get(SERVER_ID);
    res.json(guild ? { total: guild.memberCount, online: guild.presences.cache.filter(p => p.status !== 'offline').size } : { total: 0, online: 0 });
});

// 5. KHỞI ĐỘNG
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🌐 API đang mở tại cổng ${PORT}`));
client.login(TOKEN);
