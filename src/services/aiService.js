// phần ai chat bott
const axios = require('axios');

async function getAIReply(userHistory, shopProfile, khoHang) {
    try {
        const response = await axios.post("https://openrouter.ai/api/v1/chat/completions", {
            model: "google/gemini-2.0-flash-001",
            messages: [
                {
                    role: "system",
                    content: `Bạn là nhân viên bán hàng tại "Hương Kid - Shop Bé Trai". 
                    THÔNG TIN SHOP: ${shopProfile}
                    DANH SÁCH KHO: ${khoHang}

                    QUY TẮC:
                    1. Xưng hô: "Dạ", "Shop em", "Chị". 
                    2. TƯ VẤN ẢNH: Nếu sản phẩm có LinkAnh, hãy gửi kèm dưới dạng: [IMG]link_anh[/IMG].
                    3. SIZE: Luôn ưu tiên cân nặng khách vừa nhắc tới.
                    4. CHỐT ĐƠN: Bắt buộc dùng mã: [CHOT_DON: Tên Khách | Tên SP & Size | SĐT | Địa chỉ]`
                },
                ...userHistory
            ]
        }, { headers: { "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}` } });

        return response.data.choices[0].message.content;
    } catch (error) {
        console.error("Lỗi AI:", error.message);
        return "Dạ hệ thống bên em hơi chậm tí, chị nhắn lại giúp em mẫu chị ưng nha!";
    }
}
module.exports = { getAIReply };


// phần ai nhập kho
const axios = require('axios'); // Đạt nhớ kiểm tra xem đã có axios trong package.json chưa nhé

async function parseInventoryData(userInput) {
    try {
        const response = await axios.post("https://openrouter.ai/api/v1/chat/completions", {
            model: "google/gemini-2.0-flash-001", // Model Đạt muốn dùng
            messages: [
                {
                    role: "system",
                    content: "Bạn là chuyên gia bóc tách dữ liệu cho shop Hương Kid. Chỉ trả về DUY NHẤT mã JSON sạch, không giải thích."
                },
                {
                    role: "user",
                    content: `Chuyển nội dung này thành JSON: "${userInput}". Định dạng: {"name": "tên", "price": "giá", "size": "kích cỡ", "imageUrl": "link"}`
                }
            ]
        }, {
            headers: {
                "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
                "Content-Type": "application/json"
            }
        });

        const text = response.data.choices[0].message.content.trim();
        
        // Trích xuất JSON (đề phòng AI nói thừa)
        const jsonMatch = text.match(/\{.*\}/s);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }
        
        console.error("❌ OpenRouter trả về sai định dạng:", text);
        return null;

    } catch (error) {
        console.error("❌ Lỗi OpenRouter:", error.response ? error.response.data : error.message);
        return null;
    }
}

module.exports = { parseInventoryData };
