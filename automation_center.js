const { GoogleGenerativeAI } = require("@google/generative-ai");

// API Key Đạt vừa lấy
const API_KEY = "AIzaSyDk4T2-1TaJTRnxk3QAXqD9fSrVTFRZkWY";
const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

async function phanHoiKhachHang(userMessage) {
    console.log(`🚀 Đang kết nối nhân viên Gemini cho shop Hương Kid...`);

    const promptSystem = `
    Bạn là nhân viên bán hàng tại shop "Hương Kid", địa chỉ 210 Trần Cao Vân, Đà Nẵng.
    Chuyên quần áo bé trai. Phong cách: Niềm nở, lễ phép, luôn gọi khách là 'dạ', xưng 'shop'.
    Nhiệm vụ: Tư vấn quần áo và trả lời thắc mắc của khách bằng tiếng Việt.
    `;

    try {
        const result = await model.generateContent(`${promptSystem}\nKhách hỏi: ${userMessage}\nNhân viên trả lời:`);
        const response = await result.response;
        const text = response.text();

        console.log("\n----------------------------");
        console.log("💬 Khách hỏi: " + userMessage);
        console.log("🤖 Trợ lý Hương Kid: " + text.trim());
        console.log("----------------------------");
    } catch (error) {
        console.error("❌ Lỗi API:", error.message);
    }
}

// Chạy thử
phanHoiKhachHang("Shop ơi có mẫu áo thun nào mới cho bé 5 tuổi không?");
