const express = require('express');
const path = require('path');
const fs = require('fs'); // Thêm thư viện để kiểm tra file tồn tại
const { getAppData, saveOrder } = require('./services/googleSheets');
const { getAIReply } = require('./services/aiService');

const app = express();
app.use(express.json());

// --- LOGIC TỰ ĐỘNG DÒ ĐƯỜNG DẪN ---
let publicPath = path.join(process.cwd(), 'public');

// Nếu ở trên Render mà process.cwd() trỏ vào /src, ta phải nhảy ra ngoài
if (!fs.existsSync(path.join(publicPath, 'index.html'))) {
    publicPath = path.join(process.cwd(), '..', 'public');
}

console.log("👉 Bot đang tìm giao diện tại:", publicPath);

app.use(express.static(publicPath));

app.get('/', (req, res) => {
    const indexPath = path.join(publicPath, 'index.html');
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        res.status(404).send(`
            <h2>Shop Hương Kid: Không tìm thấy file giao diện!</h2>
            <p>Bot đã tìm ở: ${indexPath}</p>
            <p>Đạt hãy kiểm tra lại cấu thư mục trên GitHub nhé.</p>
        `);
    }
});

// --- PHẦN POST /CHAT GIỮ NGUYÊN ---
let allUsersHistory = {};
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
        res.json({ reply: aiReply });
    } catch (e) { res.status(500).json({ reply: "Hệ thống bận tí ạ!" }); }
});

module.exports = app;
