const { GoogleGenerativeAI } = require("@google/generative-ai");
const http = require("http");
const url = require("url");

const API_KEY = "AIzaSyDk4T2-1TaJTRnxk3QAXqD9fSrVTFRZkWY";
const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: "models/gemini-1.5-flash" });

// Hàm xử lý AI
async function phanHoiKhachHang(userMessage) {
    const promptSystem = `Bạn là nhân viên shop Hương Kid, 210 Trần Cao Vân, Đà Nẵng. 
    Chuyên quần áo bé trai. Lễ phép, dạ thưa, tư vấn nhiệt tình bằng tiếng Việt.`;
    try {
        const result = await model.generateContent(`${promptSystem}\nKhách: ${userMessage}\nNhân viên:`);
        const response = await result.response;
        return response.text();
    } catch (error) {
        return "Dạ shop đang bận một chút, bạn chờ shop tí nhé!";
    }
}

// Tạo Server kèm giao diện web
const server = http.createServer(async (req, res) => {
    const parsedUrl = url.parse(req.url, true);
    
    // Nếu là yêu cầu lấy câu trả lời (API)
    if (parsedUrl.pathname === "/chat" && parsedUrl.query.msg) {
        const reply = await phanHoiKhachHang(parsedUrl.query.msg);
        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ reply }));
        return;
    }

    // Nếu là trang chính - Giao diện khung chat
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Hương Kid Bot - Test</title>
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
                body { font-family: sans-serif; background: #f0f2f5; display: flex; flex-direction: column; height: 100vh; margin: 0; }
                header { background: #0084ff; color: white; padding: 15px; text-align: center; font-weight: bold; }
                #chat-box { flex: 1; overflow-y: auto; padding: 15px; display: flex; flex-direction: column; gap: 10px; }
                .msg { max-width: 80%; padding: 10px; border-radius: 15px; margin: 5px 0; line-height: 1.4; }
                .user { align-self: flex-end; background: #0084ff; color: white; }
                .bot { align-self: flex-start; background: white; color: #333; box-shadow: 0 1px 2px rgba(0,0,0,0.1); }
                footer { padding: 15px; background: white; display: flex; gap: 10px; }
                input { flex: 1; padding: 10px; border: 1px solid #ddd; border-radius: 20px; outline: none; }
                button { background: #0084ff; color: white; border: none; padding: 10px 20px; border-radius: 20px; cursor: pointer; }
            </style>
        </head>
        <body>
            <header>HƯƠNG KID BOT - 210 TRẦN CAO VÂN</header>
            <div id="chat-box">
                <div class="msg bot">Dạ shop Hương Kid chào Đạt! Đạt muốn hỏi gì về mẫu áo cho bé ạ?</div>
            </div>
            <footer>
                <input type="text" id="userInput" placeholder="Nhập tin nhắn..." onkeypress="if(event.key==='Enter') send()">
                <button onclick="send()">Gửi</button>
            </footer>
            <script>
                async function send() {
                    const input = document.getElementById('userInput');
                    const msg = input.value.trim();
                    if(!msg) return;
                    
                    addMsg(msg, 'user');
                    input.value = '';

                    const res = await fetch('/chat?msg=' + encodeURIComponent(msg));
                    const data = await res.json();
                    addMsg(data.reply, 'bot');
                }
                function addMsg(text, type) {
                    const box = document.getElementById('chat-box');
                    const div = document.createElement('div');
                    div.className = 'msg ' + type;
                    div.innerText = text;
                    box.appendChild(div);
                    box.scrollTop = box.scrollHeight;
                }
            </script>
        </body>
        </html>
    `);
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
    console.log(`🚀 Hệ thống chat shop Hương Kid đã sẵn sàng tại cổng ${PORT}`);
});
