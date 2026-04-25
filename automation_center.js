const { GoogleGenerativeAI } = require("@google/generative-ai");
const http = require("http"); // Thêm cái này để tạo server ảo giữ Render không tắt

const API_KEY = "AIzaSyDk4T2-1TaJTRnxk3QAXqD9fSrVTFRZkWY";
const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

async function phanHoiKhachHang(userMessage) {
    const promptSystem = `Bạn là nhân viên shop Hương Kid, 210 Trần Cao Vân, Đà Nẵng. Lễ phép, dạ thưa.`;
    try {
        const result = await model.generateContent(`${promptSystem}\nKhách: ${userMessage}\nNhân viên:`);
        const response = await result.response;
        console.log("🤖 Bot trả lời:", response.text());
        return response.text();
    } catch (error) {
        console.error("❌ Lỗi API:", error.message);
        return "Dạ shop đang bận tí, Đạt đợi shop tí nhé!";
    }
}

// Tạo một server đơn giản để Render không tắt ứng dụng (Health Check)
const server = http.createServer(async (req, res) => {
    res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Hương Kid Bot đang hoạt động!");
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
    console.log(`🚀 Server đang chạy trên cổng ${PORT}`);
    // Chạy thử một câu khi vừa khởi động
    phanHoiKhachHang("Shop có áo thun không?");
});
