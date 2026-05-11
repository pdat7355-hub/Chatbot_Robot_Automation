// core/aiConfig.js
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Khởi tạo Google AI với API Key từ file .env
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Cấu hình Model Gemma 3 (Hoặc Gemini tùy theo key của Đạt)
const model = genAI.getGenerativeModel({ 
    model: "gemini-1.5-flash", // Hoặc "gemma-3-flash" nếu Đạt đã có quyền truy cập sớm
});

module.exports = { model };