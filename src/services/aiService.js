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

async function parseInventoryData(rawText) {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    const prompt = `
        Bạn là trợ lý nhập kho chuyên nghiệp cho shop quần áo trẻ em "Hương Kid".
        Nhiệm vụ: Trích xuất thông tin sản phẩm từ câu văn sau: "${rawText}"
        Trả về định dạng JSON duy nhất với các trường:
        {
          "name": "Tên sản phẩm (viết hoa chữ cái đầu)",
          "price": "Giá (chỉ để số, ví dụ 120000)",
          "size": "Dải size (ví dụ: 1-5 hoặc S, M, L)",
          "imageUrl": "Link ảnh nếu có, nếu không có để trống"
        }
        Lưu ý: Nếu giá là "120k" hãy chuyển thành "120000". Chỉ trả về JSON, không giải thích.
    `;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text().replace(/```json|```/g, "").trim();
        return JSON.parse(text);
    } catch (error) {
        console.error("AI Parse Error:", error);
        throw new Error("AI không hiểu được nội dung này, Đạt kiểm tra lại nhé!");
    }
}

module.exports = { parseInventoryData };
