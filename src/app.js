const express = require('express');
const path = require('path');
// Lưu ý: Đảm bảo trong thư mục src/services có 2 file này
const { getAppData, saveOrder } = require('./services/googleSheets');
const { getAIReply } = require('./services/aiService');

const app = express(); // DÒNG NÀY PHẢI NẰM TRÊN CÙNG

app.use(express.json());

// Vì public nằm cùng cấp với src, ta đi ra ngoài 1 cấp
const publicPath = path.join(__dirname, '..', 'public');
app.use(express.static(publicPath));

let allUsersHistory = {};

app.get('/', (req, res) => {
    res.sendFile(path.join(publicPath, 'index.html'));
});

app.post('/chat', async (req, res) => {
    const { message, userId } = req.body;
    try {
        const { shopProfile, khoHang } = await getAppData();
        if (!allUsersHistory[userId]) allUsersHistory[userId] = [];
        let userHistory = allUsersHistory[userId];
        userHistory.push({ role: "user", content: message });

        let aiReply = await getAIReply(userHistory, shopProfile, khoHang);

        if (aiReply.includes("[CHOT_DON:")) {
            const orderRaw = aiReply.split("[CHOT_DON:")[1].split("]")[0];
            const parts = orderRaw.split("|").map(p => p.trim());
            await saveOrder(parts);
            aiReply = aiReply.replace(/\[CHOT_DON:.*?\]/g, "✅ Shop Hương Kid đã chốt đơn thành công!");
        }

        userHistory.push({ role: "assistant", content: aiReply });
        if (userHistory.length > 20) userHistory.splice(0, 2);
        res.json({ reply: aiReply });
    } catch (error) {
        res.status(500).json({ reply: "Dạ hệ thống bận tí ạ!" });
    }
});

module.exports = app;
