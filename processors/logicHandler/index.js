const consultHandler = require('./consult');
const retainHandler = require('./retain');
const conversionHandler = require('./conversion');
const remedyHandler = require('./remedy'); 
const helpers = require('../../utils/helpers');
const cartHandler = require('./cart'); 

const logicHandler = {
    handleResponse: async (session, text, dimConfig, globalInventory, analysis) => {
        const sessionManager = require('../../core/sessionManager');
        const finalInventory = globalInventory || sessionManager.getInventory();
        const rawText = (text || "").trim();
        const upperText = rawText.toUpperCase();

        // =========================================================
        // 🛑 PHẦN 1: ƯU TIÊN MẬT MÃ NÚT BẤM (HÀNH ĐỘNG CỨNG)
        // =========================================================
        
        // 1. MỚI: Ưu tiên tuyệt đối cho mã chốt đơn từ Form
        if (upperText.includes('ACTION_SUBMIT_FORM')) {
            const submitResult = await conversionHandler.handle(session, rawText, dimConfig, [], finalInventory, sessionManager);
            if (submitResult && submitResult.reply) {
                // Trả về trực tiếp, không chạy thêm bất cứ logic nào bên dưới
                return { reply: helpers.formatReply(submitResult.reply, session, finalInventory) };
            }
        }

        // 2. Lệnh xem giỏ hàng từ nút nhấn
        if (upperText.includes('ACTION_VIEW_CART') || upperText === "GIỎ HÀNG") {
            const cartReply = cartHandler.handle(session);
            return { reply: helpers.formatReply(cartReply, session, finalInventory) };
        }

        // 3. Lệnh chốt đơn từ nút nhấn "Xác nhận" cũ
        if (upperText.includes('ACTION_CONFIRM')) {
            const confirmResult = await conversionHandler.handle(session, "xác nhận", dimConfig, [], finalInventory, sessionManager); 
            return { reply: helpers.formatReply(confirmResult.reply, session, finalInventory) };
        }

        // 4. Lệnh xem mẫu/menu từ nút nhấn
        if (upperText.includes('ACTION_CONSULT')) {
            if (session.entities) { delete session.entities.group; delete session.entities.productCode; }
            const menuResult = await consultHandler.handle(session, "xem mẫu", dimConfig, [], finalInventory);
            return { reply: helpers.formatReply(menuResult.reply, session, finalInventory) };
        }

        // =========================================================
        // 🔍 PHẦN 2: XỬ LÝ CHAT TỰ NHIÊN (EXCEL & AI TEACHER)
        // =========================================================
        let winner = analysis?.winner || session.winner || "CONSULT";
        
        // Chống bắt nhầm luồng Chốt đơn khi chat tự nhiên (trừ khi khách nhắn chữ "xác nhận")
        if ((winner === 'CONVERSION' || winner === 'REMEDY') && 
            !rawText.toLowerCase().includes("xác nhận") && 
            !upperText.includes('ACTION_SUBMIT_FORM')) {
            winner = 'CONSULT';
        }        


        let selectedHandler = (winner === 'RETAIN') ? retainHandler : consultHandler;
        let finalReply = "";

        try {
            // A. Tìm trong Excel trước
            const result = await selectedHandler.handle(session, rawText, dimConfig, analysis?.retainConfig || [], finalInventory);
            
            if (result && result.reply) {
                finalReply = result.reply;
            } else {
                // B. Nếu Excel không có, trả về null để Server.js gọi AI Teacher (Gemma 3)
                return null; 
            }

            // =========================================================
            // ⚡ BỘ QUÉT MÃ (TRIGGER SCANNER): BIẾN CHỮ THÀNH BẢNG
            // =========================================================
            
            // 1. Chèn Giỏ hàng nếu thấy mã {SHOW_CART}
            if (finalReply.includes("{SHOW_CART}")) {
                const cartData = cartHandler.handle(session);
                finalReply = finalReply.replace("{SHOW_CART}", "\n" + cartData);
            }

            // 2. Chèn Menu Sản phẩm nếu thấy mã {SHOW_MENU}
            if (finalReply.includes("{SHOW_MENU}")) {
                const menuData = await consultHandler.handle(session, "xem mẫu", dimConfig, [], finalInventory);
                finalReply = finalReply.replace("{SHOW_MENU}", "\n" + menuData.reply);
            }

            // 3. Chèn hướng dẫn chốt đơn nếu thấy mã {SHOW_GUIDE}
            if (finalReply.includes("{SHOW_GUIDE}")) {
                const guide = "\n📝 index ❤️";
                finalReply = finalReply.replace("{SHOW_GUIDE}", guide);
            }

            return { reply: helpers.formatReply(finalReply, session, finalInventory) };

        } catch (err) {
            console.error(`❌ Lỗi LogicHandler:`, err.message);
            return null; 
        }
    }
};

module.exports = logicHandler;