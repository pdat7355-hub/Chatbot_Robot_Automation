const axios = require('axios');

/**
 * 1. HÀM CHATBOT BÁN HÀNG (Tư vấn & Chốt đơn)
 */
async function getAIReply(userHistory, shopProfile, khoHang) {
    try {
        const response = await axios.post("https://openrouter.ai/ai/v1/chat/completions", {
            model: "google/gemini-2.0-flash-001",
            messages: [
                {
                    role: "system",
                    content: `Bạn là nhân viên bán hàng chuyên nghiệp tại "Hương Kid - Shop Bé Trai". 
                    THÔNG TIN SHOP: ${shopProfile}
                    DANH SÁCH KHO HÀNG HIỆN TẠI: ${khoHang}

                    QUY TẮC GIAO TIẾP:
                    1. Xưng hô: "Dạ", "Shop em", gọi khách là "Chị". Thân thiện, nhiệt tình.
                    2. TƯ VẤN ẢNH: Khi nhắc đến sản phẩm, BẮT BUỘC gửi kèm Link ảnh theo định dạng: [IMG]link_anh[/IMG].
                    3. SIZE: Dựa vào cân nặng khách cung cấp để tư vấn size khớp với kho hàng.
                    4. CHỐT ĐƠN: Khi khách đồng ý mua, hãy tổng hợp đơn và dùng mã: 
                       [CHOT_DON: Tên Khách | Tên SP & Size | SĐT | Địa chỉ]`
                },
                ...userHistory
            ]
        }, { 
            headers: { "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}` } 
        });

        return response.data.choices[0].message.content;
    } catch (error) {
        console.error("❌ Lỗi Chatbot:", error.message);
        return "Dạ hệ thống bên em đang bận tí, chị đợi em vài giây hoặc nhắn lại mẫu chị ưng nhé!";
    }
}

/**
 * 2. HÀM NHẬP KHO (Bóc tách dữ liệu & Kiểm tra tính đầy đủ)
 */
async function parseInventoryData(userInput) {
    try {
        const response = await axios.post("https://openrouter.ai/api/v1/chat/completions", {
            model: "google/gemini-2.0-flash-001",
            messages: [
                {
                    role: "system",
                    content: `Bạn là trợ lý quản lý kho cho shop Hương Kid. 
                    Nhiệm vụ: Trích xuất thông tin sản phẩm từ câu nói của chủ shop.
                    
                    YÊU CẦU BẮT BUỘC PHẢI CÓ ĐỦ 5 TRƯỜNG:
                    1. ten: Tên sản phẩm.
                    2. gia: Giá bán (chỉ lấy số).
                    3. size: Các kích cỡ hiện có.
                    4. mota: Chất liệu, đặc điểm nổi bật để tư vấn khách.
                    5. anh: Link hình ảnh (phải bắt đầu bằng http).

                    QUY TẮC TRẢ VỀ:
                    - Nếu THIẾU bất kỳ trường nào trong 5 trường trên: Trả về JSON {"status": "error", "missing": "tên trường còn thiếu"}.
                    - Nếu ĐỦ hết: Trả về JSON sạch: {"ten": "...", "gia": "...", "size": "...", "mota": "...", "anh": "..."}.
                    KHÔNG GIẢI THÍCH THÊM.`
                },
                {
                    role: "user",
                    content: `Nội dung nhập kho: "${userInput}"`
                }
            ]
        }, {
            headers: {
                "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
                "Content-Type": "application/json"
            }
        });

        const text = response.data.choices[0].message.content.trim();
        const jsonMatch = text.match(/\{.*\}/s);
        
        if (jsonMatch) {
            const result = JSON.parse(jsonMatch[0]);
            
            // Nếu AI báo thiếu thông tin
            if (result.status === "error") {
                console.log(`⚠️ Thiếu thông tin: ${result.missing}`);
                return result; 
            }
            return result; // Trả về object đủ 5 trường
        }
        
        return null;
    } catch (error) {
        console.error("❌ Lỗi Nhập Kho:", error.message);
        return null;
    }
}

// Xuất cả 2 hàm để sử dụng ở app.js
module.exports = { getAIReply, parseInventoryData };
