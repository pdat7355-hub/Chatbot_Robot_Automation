// C:\Users\Hi\OneDrive\Desktop\TCCS\Chatbot\chatbot_server\server.js

const fs = require('fs');
const path = require('path'); 
require('dotenv').config();

const express = require('express');
const axios = require('axios'); 

// Import các Module hệ thống
const sessionManager = require('./core/sessionManager');
const analyzer = require('./processors/analyzer');
const googleSheets = require('./services/googleSheets');
const facebookService = require('./services/facebookService');
const logicHandler = require('./processors/logicHandler/index'); 
const { identify } = require('./processors/recognizer');
const { handleTraps } = require('./processors/commandTraps');
const systemChecker = require('./utils/systemChecker');


// Import AI Service
const aiService = require('./processors/logicHandler/aiService'); 


const app = express();
app.use(express.json());
app.use(express.static('public')); 

// Biến tạm để chặn trùng tin nhắn từ Webhook
const processedMessages = new Set();

// =========================================================
// 🚀 QUY TRÌNH XỬ LÝ CHAT CHUẨN (HƯƠNG KID WORKFLOW)
// =========================================================
async function processChatLogicWithTrace(userId, message) {
    try {
        const text = (message || "").trim();
        const globalInventory = sessionManager.getInventory();
        const dimConfig = sessionManager.getDimensions() || [];

        // 1. Khởi tạo/Lấy Session khách hàng
        let session = sessionManager.get(userId) || { id: userId, cart: [], entities: {}, flags: {}, executionPath: [] };
        session.executionPath = ["Bắt đầu"]; 
        
        // 2. Nhận diện khách hàng (Tên, SĐT...)
        session = await identify(userId, session);
        session.executionPath.push("Nhận diện");

        // 3. ĐỒNG BỘ GOOGLE SHEETS (Đảm bảo ghi dữ liệu khách hàng trước)
        try {
            await googleSheets.syncCustomerToExcel(userId, {
                name: session.entities?.name || "",
                phone: session.entities?.phone || "",
                address: session.entities?.address || "",
                weight: session.entities?.weight || "",
                age: session.entities?.age || ""
            });
            console.log(`✅ [Sheets] Đã đồng bộ khách: ${userId}`);
        } catch (sheetErr) {
            console.error("⚠️ Lỗi ghi Sheets:", sheetErr.message);
        }

        // 4. Kiểm tra Bẫy lệnh
        const trapResult = await handleTraps(text, userId, session, globalInventory?.inventory || {}, [], sessionManager);
        if (trapResult) {
            return { 
                reply: trapResult.reply, 
                diagnostic: systemChecker.runDiagnostic(session, {}, "TRAP", "commandTraps.js") 
            };
        }

        // 5. Phân tích từ khóa từ Excel
        const analysis = analyzer.extract(text, session, dimConfig, globalInventory);
        session.executionPath.push("Phân tích");

        const winner = analysis.winner;
        const score = analysis.zones ? (analysis.zones[winner] || 0) : 0;

        let finalResult = null;

        // TUYẾN A: ƯU TIÊN LOGIC EXCEL
        if (winner && score >= 1) {
            session.executionPath.push("Logic Excel");
            const updatedSession = sessionManager.update(userId, {
                winner: winner,
                entities: { ...session.entities, ...(analysis.entities || {}) },
                executionPath: session.executionPath 
            });

            finalResult = await logicHandler.handleResponse(updatedSession, text, dimConfig, globalInventory, analysis);
        }

        // TUYẾN B: AI CỨU VIỆN (Chỉ chạy khi Tuyến A rỗng)
        if (!finalResult || !finalResult.reply || finalResult.reply.trim() === "") {
            session.executionPath.push("AI Ứng Cứu");
             
            // GỌI AI LẦN DUY NHẤT
            const lesson = await aiService.askTeacher(text, session);
            
            finalResult = { 
                reply: lesson.reply, 
                diagnostic: systemChecker.runDiagnostic(session, analysis.zones, "AI_FALLBACK_PERSONAL", "Gemma 4 Song Ma")
            };
        }

        return finalResult;

    } catch (error) {
        console.error("❌ Lỗi Hệ Thống:", error);
        return { reply: "Dạ em bận xíu, Mẹ nhắn lại nhen!", diagnostic: "Lỗi: " + error.message };
    }
}





// --- API ENDPOINTS ---

app.post('/webhook', async (req, res) => {
    let body = req.body;
    if (body.object === 'page') {
        res.status(200).send('EVENT_RECEIVED'); // Phản hồi FB ngay để tránh gửi lặp

        for (let entry of body.entry) {
            if (entry.messaging) {
                let event = entry.messaging[0];
                let sender_id = event.sender.id;
                let message_id = event.message?.mid;

                // Chặn xử lý trùng ID tin nhắn
                if (message_id && processedMessages.has(message_id)) continue;
                if (message_id) {
                    processedMessages.add(message_id);
                    setTimeout(() => processedMessages.delete(message_id), 600000);
                }

                // CHỖ NÀY LÀ QUAN TRỌNG NHẤT:
                if (event.message && event.message.text) {
                    // 1. Gửi tin nhắn vào "Bộ não" để xử lý logic (Excel/AI)
                    const result = await processChatLogicWithTrace(sender_id, event.message.text);

                    // 2. Gửi kết quả sang "Chi chi" (Facebook Service) để định dạng ảnh/nút và hiển thị
                    // Xóa bỏ hàm callSendAPI cũ, dùng facebookService mới tách ra
                    await facebookService.sendResponse(sender_id, result.reply);
                }
            }
        }
    } else {
        res.sendStatus(404);
    }
});

// =========================================================
// 🌐 ENDPOINT CHO GIAO DIỆN WEB (TESTING)
// =========================================================
app.post('/chat', async (req, res) => {
    try {
        const { userId, message } = req.body;
        
        // 1. Gửi vào bộ não xử lý logic
        const result = await processChatLogicWithTrace(userId || "WEB_TEST", message);
        
        // 2. Trả kết quả về trực tiếp cho giao diện Web hiển thị
        // Lưu ý: Web dùng res.json, còn Facebook dùng facebookService.sendResponse
        res.json(result); 
        
    } catch (error) {
        console.error("❌ Lỗi API Chat:", error);
        res.status(500).json({ reply: "Dạ em lỗi xíu, Mẹ nhắn lại nhen!" });
    }
}); 


// --- KHỞI CHẠY ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
    try {
        const inv = await googleSheets.getInventoryData();
        const dims = await googleSheets.getDimensions();
        sessionManager.setInventory(inv);
        sessionManager.setDimensions(dims);
        
        console.log(`🚀 HƯƠNG KID READY: http://localhost:${PORT}`);

        // Kiểm tra model
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`);
        const data = await res.json();
        const gemmaModels = data.models
            ? data.models.filter(m => m.name.toLowerCase().includes('gemma')).map(m => m.name)
            : [];
        console.log(`🤖 Gemma models available:`, gemmaModels);

    } catch (err) {
        console.error("❌ Lỗi khởi động:", err.message);
    }
});
