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

        // Xử lý chốt đơn ngầm
        if (aiReply.includes("[CHOT_DON:")) {
            try {
                const orderRaw = aiReply.split("[CHOT_DON:")[1].split("]")[0];
                const parts = orderRaw.split("|").map(p => p.trim());
                
                // Gọi hàm lưu vào Google Sheets (Đảm bảo đã import saveOrder)
                await saveOrder(parts); 

                // Thay thế mã chốt đơn bằng câu thông báo thân thiện
                aiReply = aiReply.replace(/\[CHOT_DON:.*?\]/g, "✅ Shop Hương Kid đã lưu đơn thành công cho chị rồi ạ!");
            } catch (err) {
                console.error("Lỗi ghi đơn:", err);
            }
        }

        userHistory.push({ role: "assistant", content: aiReply });
        if (userHistory.length > 15) userHistory.splice(0, 2);

        res.json({ reply: aiReply });
    } catch (error) {
        res.status(500).json({ reply: "Dạ em bận tí, chị nhắn lại nha!" });
    }
});

module.exports = app;
