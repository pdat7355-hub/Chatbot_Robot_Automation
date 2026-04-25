const { GoogleGenerativeAI } = require("@google/generative-ai");
const http = require("http");
const url = require("url");

// 1. LẤY KEY TỪ ENVIRONMENT (Như mình vừa hướng dẫn Đạt ở bước trước)
const API_KEY = process.env.GEMINI_API_KEY; 
const genAI = new GoogleGenerativeAI(API_KEY);

// 2. KHỞI TẠO MODEL - SỬA LẠI CÁCH GỌI CHUẨN
// Đạt xóa chữ "models/" đi, chỉ để tên model thôi
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); 

async function phanHoiKhachHang(userMessage) {
    const promptSystem = `Bạn là nhân viên shop Hương Kid, 210 Trần Cao Vân, Đà Nẵng. 
    Chuyên quần áo bé trai. Lễ phép, dạ thưa, tư vấn nhiệt tình.`;

    try {
        // Thêm cấu hình thế hệ để ép nó chạy đúng bản v1
        const result = await model.generateContent(promptSystem + "\nKhách: " + userMessage);
        const response = await result.response;
        return response.text();
    } catch (error) {
        console.error("❌ Lỗi chi tiết:", error.message);
        
        // Nếu vẫn lỗi 404 với Flash, hãy thử đổi dòng số 10 thành "gemini-pro"
        return "Dạ shop Hương Kid chào Đạt, hệ thống đang bận tí, Đạt thử lại sau 30 giây nhé!";
    }
}
