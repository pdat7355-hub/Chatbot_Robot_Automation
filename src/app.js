const express = require('express');
const { getInventory, saveOrder } = require('./services/googleSheets');
const { getAIReply } = require('./services/aiService');
const axios = require('axios');

const app = express();
app.use(express.json());

// Webhook xử lý tin nhắn
app.post('/webhook', async (req, res) => {
    // Logic nhận tin nhắn từ Facebook/Telegram ở đây
    // Sau đó gọi getAIReply và cuối cùng gửi trả khách
    res.status(200).send('OK');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Robot đang chạy tại cổng ${PORT}`));
