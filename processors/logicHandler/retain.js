// processors/logicHandler/retain.js
const retainHandler = {
    handle: async (session, message, dimConfig, retainConfig = [], globalInventory = null) => {
        const text = (message || "").toLowerCase().trim();
        // Lọc các quy tắc thuộc vùng RETAIN
        const retainRules = (dimConfig || []).filter(d => d.zone === 'RETAIN');

        let bestMatch = null;

        // 1. Tìm theo từ khóa (Dùng vòng lặp for...of để dễ kiểm soát)
        for (const rule of retainRules) {
            // Ép kiểu sang String để tránh lỗi .split is not a function nếu keywords là số
            const rawKeywords = String(rule.keywords || "");
            const keywords = rawKeywords.split(',').map(k => k.trim().toLowerCase()).filter(Boolean);
            
            if (keywords.some(k => text.includes(k))) {
                // ƯU TIÊN: Template (viết hoa T) -> template -> content -> Body
                bestMatch = rule.Template || rule.template || rule.content || rule.Body; 
                if (bestMatch) break; 
            }
        }

        // 2. Nếu không khớp từ khóa cụ thể, lấy dòng mặc định (BẢN SỬA LỖI TẠI ĐÂY)
        if (!bestMatch) {
            const defaultRule = retainRules.find(d => {
                const kw = String(d.keywords || "").trim(); // Ép kiểu an toàn trước khi trim
                return kw === "";
            });
            bestMatch = defaultRule?.Template || defaultRule?.template || defaultRule?.content || defaultRule?.Body;
        }

        // 3. Trả về kết quả
        if (bestMatch && String(bestMatch).trim() !== "") {
            return { reply: String(bestMatch).trim() };
        }
        
        return null;
    }
};

module.exports = retainHandler;