// Sử dụng thư viện đời mới nhất mà Đạt vừa test thành công
const { GoogleGenerativeAI } = require("@google/generative-ai");
const http = require("http");
const url = require("url");

// 1. LẤY KEY TỪ ENVIRONMENT TRÊN RENDER (Bảo mật tuyệt đối)
const API_KEY = process.env.GEMINI_API_KEY; 
const genAI = new GoogleGenerativeAI(API_KEY);

// 2. DÙNG MODEL "CỨU TINH" MÀ ĐẠT VỪA TEST THÀNH CÔNG
// Lưu ý: Dùng đúng tên 'gemma-3-4b-it'
const model = genAI.getGenerativeModel({ model: "gemma-3-4b-it" });

async function phanHoiKhachHang(userMessage) {
    const promptSystem = `Bạn là nhân viên shop Hương Kid, 210 Trần Cao Vân, Đà Nẵng. 
    Chuyên quần áo bé trai. Phong cách: Lễ phép, dạ thưa, tư vấn nhiệt tình. 
    Hãy trả lời khách hàng một cách ngắn gọn và thân thiện.`;

    try {
        const result = await model.generateContent(`${promptSystem}\nKhách: ${userMessage}\nNhân viên:`);
        const response = await result.response;
        return response.text();
    } catch (error) {
        console.error("❌ Lỗi AI:", error.message);
        return "Dạ shop Hương Kid chào bạn, hiện hệ thống đang bận một chút, bạn đợi shop giây lát nhé!";
    }
}

// 3. TẠO SERVER WEB CHO CHATBOT
const server = http.createServer(async (req, res) => {
    const parsedUrl = url.parse(req.url, true);
    
    // API phản hồi tin nhắn
    if (parsedUrl.pathname === "/chat" && parsedUrl.query.msg) {
        const reply = await phanHoiKhachHang(parsedUrl.query.msg);
        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ reply }));
        return;
    }

    // Giao diện Chat đơn giản
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(`
        <html>
        <body style="font-family:sans-serif; padding:20px; text-align:center;">
            <h2 style="color:#e91e63;">HƯƠNG KID - BOT V2</h2>
            <div id="chat" style="border:1px solid #ccc; height:300px; overflow-y:auto; padding:10px; margin-bottom:10px; text-align:left;"></div>
            <input type="text" id="msg" style="width:70%; padding:10px;" placeholder="Nhập tin nhắn...">
            <button onclick="send()" style="padding:10px; background:#e91e63; color:white; border:none;">Gửi</button>
            <script>
                async function send() {
                    const input = document.getElementById('msg');
                    const chat = document.getElementById('chat');
                    const userMsg = input.value;
                    chat.innerHTML += '<div><b>Bạn:</b> ' + userMsg + '</div>';
                    input.value = '';
                    const res = await fetch('/chat?msg=' + encodeURIComponent(userMsg));
                    const data = await res.json();
                    chat.innerHTML += '<div><b>Bot:</b> ' + data.reply + '</div>';
                    chat.scrollTop = chat.scrollHeight;
                }
            </script>
        </body>
        </html>
    `);
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
    console.log("🚀 Shop Hương Kid đang trực tại cổng " + PORT);
});
