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
const webService = require('./services/webService');
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
const userStates = new Map(); // Lưu trạng thái chốt đơn tạm thời

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
        res.status(200).send('EVENT_RECEIVED');

        for (let entry of body.entry) {
            if (entry.messaging) {
                let event = entry.messaging[0];
                let sender_id = event.sender.id;
                
                // --- XÁC ĐỊNH NỘI DUNG TIN NHẮN ---
                let received_text = "";

                if (event.message && event.message.quick_reply) {
                    received_text = event.message.quick_reply.payload;
                } else if (event.message && event.message.text) {
                    received_text = event.message.text;
                } else if (event.postback) {
                    received_text = event.postback.payload;
                }

                // --- KIỂM TRA TRÙNG TIN NHẮN ---
                let message_id = event.message?.mid;
                if (message_id) {
                    if (processedMessages.has(message_id)) continue;
                    processedMessages.add(message_id);
                    setTimeout(() => processedMessages.delete(message_id), 600000);
                }

                // --- GỬI ĐI XỬ LÝ ---
                if (received_text) {
                    console.log(`📩 Nhận lệnh từ ${sender_id}: ${received_text}`);
                    const result = await processChatLogicWithTrace(sender_id, received_text);
                    await facebookService.sendResponse(sender_id, result.reply);
                }
            }
        }
    } else {
        res.sendStatus(404);
    }
});

app.post('/chat', async (req, res) => {
    try {
        const { userId, message } = req.body;
        const result = await processChatLogicWithTrace(userId || "WEB_TEST", message);
        const webDisplay = webService.formatForWeb(result.reply || "", result);

        res.json({
            ...result,
            reply: webDisplay.reply,
            image: webDisplay.image,
            buttons: webDisplay.buttons,
            products: webDisplay.products 
        });
        
    } catch (error) {
        console.error("❌ Lỗi hiển thị Web:", error);
        res.json({ reply: "Dạ em lỗi xíu, Mẹ nhắn lại nhen!", products: [] });
    }
});

// =========================================================
// 📦 ENDPOINT TIẾP NHẬN DỮ LIỆU TỪ FORM CHỐT ĐƠN WEBVIEW
// =========================================================
app.post('/api/submit-order', async (req, res) => {
    try {
        const { userId, name, phone, address } = req.body;

        // Kiểm tra xem dữ liệu form gửi lên có bị trống trường nào không
        if (!userId || !name || !phone || !address) {
            return res.status(400).json({ success: false, message: "Mẹ điền thiếu thông tin mất rồi nhen!" });
        }

        console.log(`\n📦 [Form Webview] Có đơn chốt mới từ khách ${userId}:`);
        console.log(`   - Tên: ${name} | SĐT: ${phone} | ĐC: ${address}`);

        // Xử lý chống lỗi #ERROR! trên Google Sheets khi số điện thoại có dấu "+" ở đầu
        const safePhone = (phone.startsWith('+') || phone.startsWith('0')) ? `'${phone}` : phone;

        // 1. Lưu thông tin vừa điền trực tiếp vào file Excel/Google Sheets
        await googleSheets.syncCustomerToExcel(userId, {
            name: name,
            phone: safePhone, // Dùng biến đã được thêm dấu nháy đơn bảo vệ
            address: address,
            note: "Khách tự điền qua Form Webview"
        });

        // 2. Cập nhật lại bộ nhớ tạm (Session) để hệ thống nhận biết SĐT/Địa chỉ mới
        let session = sessionManager.get(userId);
        if (session) {
            session.entities = session.entities || {};
            session.entities.name = name;
            session.entities.phone = phone; // Trong session lưu chuỗi gốc của khách cho sạch
            session.entities.address = address;
            sessionManager.update(userId, session);
        }

        // 3. Gửi tin nhắn xác nhận định dạng văn bản SẠCH qua Messenger cho khách yên tâm
        const confirmText = `✅ Hệ thống Hương Kid đã ghi nhận thông tin của Mẹ thành công ạ:\n\n` +
                            `👤 Tên: ${name}\n` +
                            `📞 SĐT: ${phone}\n` +
                            `📍 Địa chỉ: ${address}\n\n` +
                            `Em chuẩn bị hàng rồi gửi sớm cho bé nhen! ❤️ Cảm ơn Mẹ nhiều.`;
                            
        await facebookService.sendResponse(userId, confirmText);

        // Trả kết quả thành công về cho Trình duyệt để xử lý đóng Form lập tức
        return res.status(200).json({ success: true });

    } catch (error) {
        console.error("❌ Lỗi xử lý dữ liệu Form:", error);
        return res.status(500).json({ success: false, message: "Lỗi Server: " + error.message });
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
