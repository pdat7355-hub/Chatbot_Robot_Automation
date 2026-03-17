const express = require('express');
const { getAppData, saveOrder } = require('./services/googleSheets');
const { getAIReply } = require('./services/aiService');

const app = express();
app.use(express.json());
app.use(express.static('public'));

let allUsersHistory = {};

app.post('/chat', async (req, res) => {
    const { message, userId } = req.body;
    const { shopProfile, khoHang } = await getAppData();

    if (!allUsersHistory[userId]) allUsersHistory[userId] = [];
    let userHistory = allUsersHistory[userId];
    userHistory.push({ role: "user", content: message });

    try {
        let aiReply = await getAIReply(userHistory, shopProfile, khoHang);

        if (aiReply.includes("[CHOT_DON:")) {
            const orderRaw = aiReply.split("[CHOT_DON:")[1].split("]")[0];
            const parts = orderRaw.split("|").map(p => p.trim());
            await saveOrder(parts);
            aiReply = aiReply.replace(/\[CHOT_DON:.*?\]/g, "✅ Shop đã chốt đơn thành công!");
        }

        userHistory.push({ role: "assistant", content: aiReply });
        if (userHistory.length > 20) userHistory.shift();
        res.json({ reply: aiReply });

    } catch (error) {
        res.status(500).json({ reply: "Dạ hệ thống bận tí ạ!" });
    }
});

module.exports = app;
