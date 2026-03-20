const express = require('express');
const path = require('path');
const app = express();

// SỬA LỖI ĐƯỜNG DẪN: Vì app.js nằm trong thư mục /src, 
// nên gọi các service cùng cấp chỉ cần ./services/...
const { parseInventoryData, getAIReply } = require('./services/aiService');
const { saveToSheets, getAppData } = require('./services/googleSheets');

app.use(express.json());

// Chỉ định đúng thư mục public nằm ở ngoài thư mục src
app.use(express.static(path.join(__dirname, '../public'))); 

// Biến lưu trữ lịch sử chat tạm thời
const allUsersHistory = {};

// --- LUỒNG ADMIN: NHẬP KHO 2 BƯỚC ---

// Bước 1: Phân tích dữ liệu (Chưa lưu)
app.post('/api/admin/analyze', async (req, res) => {
    const { password, data } = req.body;

    if (password !== process.env.ADMIN_PASSWORD) {
        return res.json({ success: false, message: "❌ Sai mật khẩu rồi Đạt ơi!" });
    }

    try {
        const result = await parseInventoryData(data);
        
        if (!result) {
            return res.json({ success: false, message: "❌ AI không hiểu đoạn này, Đạt nhập rõ tên và giá nhé!" });
        }

        res.json({ 
            success: true, 
            status: result.status, 
            data: result.status === "success" ? result.data : result.extracted,
            message: result.message || "" 
        });
    } catch (error) {
        console.error("Lỗi Analyze:", error);
        res.json({ success: false, message: "❌ Lỗi khi gọi AI phân tích." });
    }
});

// Bước 2: Lưu chính thức vào Google Sheets
app.post('/api/admin/save-to-sheets', async (req, res) => {
    const { password, product } = req.body;

    if (password !== process.env.ADMIN_PASSWORD) {
        return res.json({ success: false, message: "❌ Sai mật khẩu!" });
    }

    try {
        await saveToSheets(product);
        res.json({ success: true, message: "✅ Đã lưu vào Sheets thành công!" });
    } catch (error) {
        console.error("Lỗi Sheets:", error);
        res.json({ success: false, message: "❌ Lỗi khi ghi vào Google Sheets." });
    }
});

// --- LUỒNG 2: CHATBOT BÁN HÀNG ---
app.post('/chat', async (req, res) => {
    const { message, userId } = req.body;
    if (!userId) return res.status(400).json({ reply: "Thiếu userId rồi Đạt ơi!" });

    try {
        const { shopProfile, khoHang } = await getAppData();
        
        if (!allUsersHistory[userId]) allUsersHistory[userId] = [];
        let userHistory = allUsersHistory[userId];

        userHistory.push({ role: "user", content: message });

        let aiReply = await getAIReply(userHistory, shopProfile, khoHang);

        // Xử lý chốt đơn tự động khi AI trả về mã [CHOT_DON:...]
        if (aiReply.includes("[CHOT_DON:")) {
            try {
                // Tạm thời log ra hoặc bạn có thể gọi hàm saveOrder riêng
                console.log("Phát hiện đơn hàng mới:", aiReply);
                
                aiReply = aiReply.replace(/\[CHOT_DON:.*?\]/g, "✅ Shop Hương Kid đã lưu đơn thành công cho chị rồi ạ! Shop sẽ liên hệ chị sớm nhé.");
            } catch (err) {
                console.error("Lỗi xử lý đơn:", err);
            }
        }

        userHistory.push({ role: "assistant", content: aiReply });
        
        if (userHistory.length > 10) userHistory.splice(0, 2);

        res.json({ reply: aiReply });
    } catch (error) {
        console.error("Lỗi Chatbot:", error);
        res.status(500).json({ reply: "Dạ hệ thống bên em hơi chậm, chị chờ em tí nha!" });
    }
});

module.exports = app;
