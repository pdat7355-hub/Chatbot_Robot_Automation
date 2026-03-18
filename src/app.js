const express = require('express');
const path = require('path');
const { getAppData, saveOrder } = require('./services/googleSheets');
const { getAIReply } = require('./services/aiService');

const app = express();
app.use(express.json());

// --- CẤU HÌNH ĐƯỜNG DẪN ĐÚNG ---
// Vì app.js nằm trong /src, nên ta dùng '../public' để nhảy ra ngoài tìm thư mục public
const publicPath = path.join(__dirname, '../public');

// Phục vụ các file tĩnh (css, js, images trong thư mục public)
app.use(express.static(publicPath));

// Khi khách vào trang chủ, gửi file index.html cho họ
app.get('/', (req, res) => {
    res.sendFile(path.join(publicPath, 'index.html'));
});

// --- GIỮ NGUYÊN PHẦN APP.POST('/CHAT') CỦA BẠN Ở ĐÂY ---
app.post('/chat', async (req, res) => {
    // ... code xử lý chat cũ của bạn ...
});

module.exports = app;
