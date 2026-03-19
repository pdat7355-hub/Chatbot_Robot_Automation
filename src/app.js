const express = require('express');
const path = require('path');
const fs = require('fs');
const { getAppData, saveOrder, addProduct } = require('./services/googleSheets');
const { getAIReply, parseInventoryData } = require('./services/aiService');

const app = express();
app.use(express.json());

// --- LOGIC TỰ ĐỘNG DÒ ĐƯỜNG DẪN GIAO DIỆN ---
let publicPath = path.join(process.cwd(), 'public');
if (!fs.existsSync(path.join(publicPath, 'index.html'))) {
    publicPath = path.join(process.cwd(), '..', 'public');
}
app.use(express.static(publicPath));

app.get('/', (req, res) => {
    const indexPath = path.join(publicPath, 'index.html');
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        res.status(404).send(`<h2>Shop Hương Kid: Không tìm thấy giao diện!</h2>`);
    }
});

// --- LƯU TRỮ LỊCH SỬ CHAT ---
let allUsersHistory = {};

// --- ROUTE 1: NHẬP KHO (DÀNH CHO ĐẠT) ---
app.post('/api/admin/nhap-kho', async (req, res) => {
    const { password, data } = req.body;

    if (password !== process.env.ADMIN_PASSWORD) {
        return res.json({ success: false, message: "❌ Sai mật khẩu rồi Đạt ơi!" });
    }

    try {
        // Bước 1: Gọi AI bóc tách và kiểm tra đủ 5 trường
        const product = await parseInventoryData(data);

        // Bước 2: Kiểm tra nếu AI báo thiếu thông tin
        if (!product || product.status === "error") {
            const missing = product ? product.missing : "thông tin";
            return res.json({ 
                success: false, 
                message: `⚠️ AI báo thiếu ${missing.toUpperCase()}. Đạt nhập đủ: Tên, Giá, Size, Mô tả và Ảnh nhé!` 
            });
        }

        // Bước 3: Ghi vào Google Sheets (Sử dụng hàm addProduct đã thống nhất)
        // Truyền đúng Object có 5 trường cho googleSheets.js
        const isSaved = await addProduct({
            ten: product.ten,
            gia: product.gia,
            size: product.size,
            mota: product.mota,
            anh: product.anh
        });

        if (isSaved) {
            res.json({ 
                success: true, 
                message: `✅ ĐÃ NHẬP KHO: ${product.ten} | ${product.gia}đ | Size: ${product.size}` 
            });
        } else {
            res.json({ success: false, message: "❌ Lỗi: Không thể ghi vào file Sheets." });
        }

    } catch (error) {
        console.error("Lỗi nhập kho:", error);
        res.json({ success: false, message: "❌ Lỗi hệ thống: " + error.message });
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
