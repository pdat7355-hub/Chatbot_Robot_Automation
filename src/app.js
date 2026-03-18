const express = require('express');
const path = require('path'); // Thêm thư viện path để xử lý đường dẫn
const { getAppData, saveOrder } = require('./services/googleSheets');
const { getAIReply } = require('./services/aiService');

const app = express();

// Middleware
app.use(express.json());

// Cấu hình thư mục public (Chứa index.html)
// Giả sử thư mục 'public' nằm ở gốc dự án (cùng cấp với thư mục 'src')
app.use(express.static(path.join(__dirname, '../../public'))); 
// Nếu thư mục public nằm TRONG src, hãy sửa thành: path.join(__dirname, 'public')

// --- ROUTE QUAN TRỌNG ĐỂ RENDER KHÔNG BÁO LỖI ---
app.get('/', (req, res) => {
    res.send('Server Shop Hương Kid đang chạy tốt!');
});

let allUsersHistory = {};

app.post('/chat', async (req, res) => {
    const { message, userId } = req.body;
    
    if (!message || !userId) {
        return res.status(400).json({ error: "Thiếu thông tin nhắn" });
    }

    try {
        const { shopProfile, khoHang } = await getAppData();

        if (!allUsersHistory[userId]) allUsersHistory[userId] = [];
        let userHistory = allUsersHistory[userId];
        userHistory.push({ role: "user", content: message });

        let aiReply = await getAIReply(userHistory, shopProfile, khoHang);

        // Logic chốt đơn
        if (aiReply.includes("[CHOT_DON:")) {
            try {
                const orderRaw = aiReply.split("[CHOT_DON:")[1].split("]")[0];
                const parts = orderRaw.split("|").map(p => p.trim());
                await saveOrder(parts);
                aiReply = aiReply.replace(/\[CHOT_DON:.*?\]/g, "✅ Shop đã chốt đơn thành công!");
            } catch (err) {
                console.error("Lỗi ghi Sheet:", err);
                aiReply = aiReply.replace(/\[CHOT_DON:.*?\]/g, "⚠️ Lỗi lưu đơn, shop sẽ kiểm tra lại ạ!");
            }
        }

        userHistory.push({ role: "assistant", content: aiReply });
        
        // Giới hạn bộ nhớ tránh tràn RAM trên Render free
        if (userHistory.length > 15) userHistory.splice(0, 2);

        res.json({ reply: aiReply });

    } catch (error) {
        console.error("Lỗi hệ thống:", error);
        res.status(500).json({ reply: "Dạ hệ thống bận tí, chị nhắn lại sau nha!" });
    }
});

module.exports = app;
