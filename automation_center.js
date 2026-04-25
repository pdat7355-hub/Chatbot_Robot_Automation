const { GoogleGenerativeAI } = require("@google/generative-ai");
const http = require("http");

const API_KEY = "AIzaSyDk4T2-1TaJTRnxk3QAXqD9fSrVTFRZkWY";
const genAI = new GoogleGenerativeAI(API_KEY);

// ĐÃ SỬA: Thêm "models/" vào trước gemini-1.5-flash
const model = genAI.getGenerativeModel({ model: "models/gemini-1.5-flash" });

async function phanHoiKhachHang(userMessage) {
    const promptSystem = `Bạn là nhân viên shop Hương Kid, 210 Trần Cao Vân, Đà Nẵng. Lễ phép, dạ thưa.`;
    try {
        const result = await model.generateContent(`${promptSystem}\nKhách: ${userMessage}\nNhân viên:`);
        const response = await result.response;
        const text = response.text();
        console.log("🤖 Bot trả lời:", text);
        return text;
    } catch (error) {
        console.error("❌ Lỗi API:", error.message);
        return "Dạ shop đang bận tí, Đạt đợi shop tí nhé!";
    }
}

const server = http.createServer((req, res) => {
    res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Hương Kid Bot đang chạy mượt mà!");
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
    console.log(`🚀 Server đang chạy trên cổng ${PORT}`);
    // Chạy thử kiểm tra
    phanHoiKhachHang("Shop có áo thun bé trai không?");
});
