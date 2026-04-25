const { GoogleGenerativeAI } = require("@google/generative-ai");
const http = require("http");
const url = require("url");

// 1. CẤU HÌNH API KEY (Giữ nguyên chìa khóa của Đạt)
const API_KEY = "AIzaSyDk4T2-1TaJTRnxk3QAXqD9fSrVTFRZkWY";
const genAI = new GoogleGenerativeAI(API_KEY);

// 2. KHỞI TẠO MODEL (Dùng tên model chuẩn để tránh lỗi 404)
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// 3. HÀM XỬ LÝ AI GIAO TIẾP
async function phanHoiKhachHang(userMessage) {
    // Prompt này giúp AI hiểu rõ nó là nhân viên shop Hương Kid tại Đà Nẵng
    const promptSystem = `Bạn là nhân viên bán hàng tại shop "Hương Kid" (210 Trần Cao Vân, Đà Nẵng). 
    Shop chuyên quần áo bé trai chất lượng cao. 
    Phong cách: Luôn nói tiếng Việt, lễ phép (dạ, thưa), tư vấn nhiệt tình, ngắn gọn. 
    Khi khách chào hoặc hỏi, hãy trả lời thân thiện như một người bán hàng thực thụ.`;

    try {
        const result = await model.generateContent(`${promptSystem}\nKhách: ${userMessage}\nNhân viên:`);
        const response = await result.response;
        const text = response.text();
        console.log("🤖 Bot trả lời thành công!");
        return text;
    } catch (error) {
        console.error("❌ Lỗi gọi Gemini:", error.message);
        // Nếu lỗi 404 vẫn xảy ra, trả về thông báo lịch sự
        return "Dạ shop Hương Kid chào bạn, hiện tại hệ thống tư vấn đang cập nhật một chút. Bạn vui lòng ghé 210 Trần Cao Vân hoặc đợi shop tí nhé!";
    }
}

// 4. TẠO SERVER WEB VÀ GIAO DIỆN CHAT
const server = http.createServer(async (req, res) => {
    const parsedUrl = url.parse(req.url, true);
    
    // API xử lý tin nhắn từ giao diện web
    if (parsedUrl.pathname === "/chat" && parsedUrl.query.msg) {
        const reply = await phanHoiKhachHang(parsedUrl.query.msg);
        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ reply }));
        return;
    }

    // Giao diện người dùng (HTML/CSS)
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(`
        <!DOCTYPE html>
        <html lang="vi">
        <head>
            <meta charset="UTF-8">
            <title>Hương Kid Bot - 210 Trần Cao Vân</title>
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
                body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #f0f2f5; margin: 0; display: flex; flex-direction: column; height: 100vh; }
                header { background: #0084ff; color: white; padding: 15px; text-align: center; font-weight: bold; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
                #chat-box { flex: 1; overflow-y: auto; padding: 15px; display: flex; flex-direction: column; gap: 10px; }
                .msg { max-width: 85%; padding: 12px; border-radius: 18px; font-size: 15px; line-height: 1.4; position: relative; }
                .user { align-self: flex-end; background: #0084ff; color: white; border-bottom-right-radius: 2px; }
                .bot { align-self: flex-start; background: white; color: #1c1e21; box-shadow: 0 1px 2px rgba(0,0,0,0.1); border-bottom-left-radius: 2px; }
                footer { padding: 15px; background: white; display: flex; gap: 10px; border-top: 1px solid #ddd; }
                input { flex: 1; padding: 12px 18px; border: 1px solid #ddd; border-radius: 25px; outline: none; font-size: 15px; }
                button { background: #0084ff; color: white; border: none; padding: 10px 20px; border-radius: 20px; font-weight: bold; cursor: pointer; transition: 0.2s; }
                button:active { transform: scale(0.95); }
            </style>
        </head>
        <body>
            <header>HƯƠNG KID BOT - TƯ VẤN BÁN HÀNG</header>
            <div id="chat-box">
                <div class="msg bot">Dạ shop Hương Kid (210 Trần Cao Vân) xin chào! Đạt hoặc quý khách cần shop tư vấn mẫu áo quần nào cho bé trai ạ?</div>
            </div>
            <footer>
                <input type="text" id="userInput" placeholder="Nhập tin nhắn tại đây..." onkeypress="if(event.key==='Enter') send()">
                <button onclick="send()">GỬI</button>
            </footer>
            <script>
                async function send() {
                    const input = document.getElementById('userInput');
                    const msg = input.value.trim();
                    if(!msg) return;
                    
                    addMsg(msg, 'user');
                    input.value = '';

                    try {
                        const res = await fetch('/chat?msg=' + encodeURIComponent(msg));
                        const data = await res.json();
                        addMsg(data.reply, 'bot');
                    } catch (e) {
                        addMsg("Dạ, có lỗi kết nối, bạn thử lại sau nhé!", 'bot');
                    }
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

// 5. KHỞI CHẠY SERVER
const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
    console.log(`
    --------------------------------------------------
    🚀 HỆ THỐNG SHOP HƯƠNG KID ĐÃ SẴN SÀNG!
    📍 Địa chỉ: 210 Trần Cao Vân, Đà Nẵng
    🌐 Link: https://chatbot-robot-automation.onrender.com
    --------------------------------------------------
    `);
});
