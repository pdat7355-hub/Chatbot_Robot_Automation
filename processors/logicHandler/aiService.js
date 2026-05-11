const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require("fs");
const path = require("path");
const googleSheets = require("../../services/googleSheets"); 

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const MEMORY_PATH = path.join(process.cwd(), 'learned_keywords.json');

// --- CẤU HÌNH SONG MÃ (2 MODEL) ---
const sysPrompt = "JSON ONLY. NO TALK. NO EXPLANATION. Fields: reply, intent, keyword, regex.";

const model31b = genAI.getGenerativeModel({ 
    model: "gemma-4-31b-it", 
    systemInstruction: sysPrompt 
});

const model26b = genAI.getGenerativeModel({ 
    model: "gemma-4-26b-a4b-it", 
    systemInstruction: sysPrompt 
});

/**
 * HÀM CHÍNH: Nhận thêm biến session để biết khách là ai
 */
async function askTeacher(message, session = {}) {
    console.log("📩 Khách nhắn:", message);

    // Trích xuất thông tin khách từ session
    const customerInfo = {
        name: session.entities?.name || "Mẹ",
        weight: session.entities?.weight ? `${session.entities.weight}kg` : "chưa rõ cân nặng",
        address: session.entities?.address || "Đà Nẵng",
        age: session.entities?.age || "bé"
    };

    // Đưa thông tin khách vào Prompt để AI "thân mật" hơn
const prompt = `[HƯỚNG DẪN TỐI CAO]: 
    1. Bối cảnh: Bạn là nhân viên shop Hương Kid. 
    2. Khách hàng: ${customerInfo.name} (Bé ${customerInfo.weight}, ở ${customerInfo.address}).
    3. Quy tắc trả lời:
       - Luôn gọi "Mẹ" hoặc "Chị", xưng "Em" hoặc "Shop".
       - Câu trả lời phải THÂN MẬT, VUI VẺ.
       - CẤM nói mỗi câu "Đợi em tí". 
       - LUÔN KẾT THÚC BẰNG CÂU HỎI hoặc GỢI Ý HÀNH ĐỘNG (Ví dụ: Mẹ muốn xem mẫu váy hay bộ đồ ạ? Mẹ thích tông màu sáng hay tối cho bé?).
    
    Tin nhắn khách: "${message}"
    
    YÊU CẦU: Trả về duy nhất 1 object JSON.
    Mẫu JSON: {"reply": "Câu trả lời + Câu hỏi gợi mở", "intent": "CONSULT", "keyword": "...", "regex": "..."}`;

    let result;
    try {
        // --- GIỮ NGUYÊN CƠ CHẾ SONG MÃ (31b/26b) ---
        try {
            result = await model31b.generateContent(prompt);
        } catch (err) {
            result = await model26b.generateContent(prompt);
        }

        const responseText = result.response.text();
        const matches = responseText.match(/\{[\s\S]*?\}/g);
        if (!matches) throw new Error("AI không trả về JSON");
        
        const cleanJson = matches[matches.length - 1].replace(/[\u0000-\u001F\u007F-\u009F]/g, "").trim();
        const data = JSON.parse(cleanJson);

        // Lưu log (giữ nguyên)
        saveEverything(message, data).catch(e => console.error("❌ Lỗi lưu:", e.message));

        return data;
    } catch (e) {
        return { reply: `Dạ ${customerInfo.name} đợi em xíu nhen, em kiểm tra kho ạ!`, intent: "CONSULT", keyword: "lỗi", regex: ".*" };
    }
}

/**
 * HÀM GHI DỮ LIỆU TỔNG HỢP
 */
async function saveEverything(userText, aiData) {
    try {
        if (!aiData.keyword) return;

        // 1. Lưu Local JSON
        let memory = {};
        if (fs.existsSync(MEMORY_PATH)) {
            const raw = fs.readFileSync(MEMORY_PATH, 'utf-8');
            memory = raw ? JSON.parse(raw) : {};
        }
        memory[aiData.keyword.toLowerCase()] = {
            ...aiData,
            learnedAt: new Date().toLocaleString('vi-VN')
        };
        fs.writeFileSync(MEMORY_PATH, JSON.stringify(memory, null, 2));

        // 2. Lưu Google Sheets (Đầy đủ 9 cột)
        const now = new Date();
        const timeId = `${now.getFullYear()}-${(now.getMonth()+1).toString().padStart(2,'0')}-${now.getDate().toString().padStart(2,'0')}_${now.getHours()}h${now.getMinutes()}`;

        const rowData = [
            timeId,                     // A: Thời gian
            aiData.intent || "CONSULT", // B: Intent
            aiData.keyword,             // C: Keyword
            "",                         // D: Trống
            aiData.regex || ".*",       // E: Regex
            "5",                        // F: Ưu tiên
            "Tactical",                 // G: Tuyến
            aiData.reply,               // H: Trả lời
            "RETAIN"                    // I: Trạng thái
        ];

        if (googleSheets && typeof googleSheets.appendTacticalLog === 'function') {
            await googleSheets.appendTacticalLog(rowData);
            console.log(`✅ [Hệ thống] Đã học kiến thức mới: [${aiData.keyword}]`);
        }
    } catch (err) {
        console.error("❌ Lỗi saveEverything:", err.message);
    }
}

module.exports = { 
    askTeacher,
    callAI_To_Analyze: askTeacher 
};
