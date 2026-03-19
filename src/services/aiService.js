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
const { GoogleGenerativeAI } = require("@google/generative-ai");
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function parseInventory(userInput) {
    const prompt = `Bạn là chuyên gia bóc tách dữ liệu kho hàng cho shop Hương Kid. 
    Hãy chuyển nội dung sau thành JSON: "${userInput}"
    Chỉ trả về DUY NHẤT mã JSON theo mẫu này: 
    {"name": "tên", "price": "giá", "size": "kích cỡ", "imageUrl": "link"}
    KHÔNG ĐƯỢC CÓ CHỮ GIẢI THÍCH NÀO KHÁC.`;

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    
    // Mẹo: Dùng RegEx để lọc lấy đúng phần nằm trong dấu { } nếu AI lỡ nói thừa
    const jsonMatch = text.match(/\{.*\}/s);
    if (jsonMatch) {
        return JSON.parse(jsonMatch[0]); // Trả về Object
    }
    throw new Error("Không tìm thấy JSON");
}




module.exports = { parseInventory };
