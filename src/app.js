const express = require('express');
const app = express();
const { parseInventoryData, getAIReply } = require('./src/services/aiService');
const { saveToSheets, getAppData } = require('./src/services/googleSheets');

app.use(express.json());
app.use(express.static('public')); // Để chạy admin.html từ thư mục public

// --- LUỒNG ADMIN: NHẬP KHO 2 BƯỚC ---

// Bước 1: Phân tích dữ liệu (Chưa lưu)
app.post('/api/admin/analyze', async (req, res) => {
    const { password, data } = req.body;

    // Kiểm tra mật khẩu (Lấy từ biến môi trường trên Render)
    if (password !== process.env.ADMIN_PASSWORD) {
        return res.json({ success: false, message: "❌ Sai mật khẩu rồi Đạt ơi!" });
    }

    try {
        const result = await parseInventoryData(data);
        
        if (!result) {
            return res.json({ success: false, message: "❌ AI không hiểu đoạn này, Đạt nhập rõ tên và giá nhé!" });
        }

        // Trả về kết quả bóc tách cho giao diện Admin
        res.json({ 
            success: true, 
            status: result.status, // "success" hoặc "incomplete"
            data: result.status === "success" ? result.data : result.extracted,
            message: result.message || "" // Lời nhắc nếu thiếu thông tin
        });
    } catch (error) {
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
        // Gọi hàm lưu vào Google Sheets (Sản phẩm gồm: ten, gia, size, mota, anh)
        await saveToSheets(product);
        
        res.json({ success: true, message: "✅ Đã lưu vào Sheets thành công!" });
    } catch (error) {
        console.error("Lỗi Sheets:", error);
        res.json({ success: false, message: "❌ Lỗi khi ghi vào Google Sheets." });
    }
});

// --- ROUTE 2: CHATBOT BÁN HÀNG ---
app.post('/chat', async (req, res) => {
    const { message, userId } = req.body;
    try {
        const { shopProfile, khoHang } = await getAppData();
        if (!allUsersHistory[userId]) allUsersHistory[userId] = [];
        let userHistory = allUsersHistory[userId];

        userHistory.push({ role: "user", content: message });

        let aiReply = await getAIReply(userHistory, shopProfile, khoHang);

        // Xử lý chốt đơn tự động khi AI trả về mã [CHOT_DON:...]
        if (aiReply.includes("[CHOT_DON:")) {
            try {
                const orderRaw = aiReply.split("[CHOT_DON:")[1].split("]")[0];
                const parts = orderRaw.split("|").map(p => p.trim());
                
                await saveOrder(parts); // Lưu đơn vào sheet ĐƠN HÀNG

                aiReply = aiReply.replace(/\[CHOT_DON:.*?\]/g, "✅ Shop Hương Kid đã lưu đơn thành công cho chị rồi ạ! Shop sẽ liên hệ chị sớm nhé.");
            } catch (err) {
                console.error("Lỗi ghi đơn:", err);
            }
        }

        userHistory.push({ role: "assistant", content: aiReply });
        
        // Giới hạn lịch sử chat để tiết kiệm dung lượng API
        if (userHistory.length > 10) userHistory.splice(0, 2);

        res.json({ reply: aiReply });
    } catch (error) {
        console.error("Lỗi Chatbot:", error);
        res.status(500).json({ reply: "Dạ hệ thống bên em hơi chậm, chị chờ em tí nha!" });
    }
});

module.exports = app;
