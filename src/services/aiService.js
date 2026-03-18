const axios = require('axios');

async function getAIReply(userHistory, shopProfile, khoHang) {
    try {
        const response = await axios.post("https://openrouter.ai/ai/v1/chat/completions", {
            model: "google/gemini-2.0-flash-001",
            messages: [
                {
                    role: "system",
                    content: `Bạn là nhân viên bán hàng tại "Hương Kid - Shop Bé Trai".
                    
                    THÔNG TIN SHOP: ${shopProfile}
                    DANH SÁCH KHO HÀNG (Dạng JSON): ${JSON.stringify(khoHang)}

                    QUY TẮC BÁN HÀNG:
                    1. Xưng hô: "Dạ", "Shop em", "Chị". Thái độ niềm nở, thân thiện.
                    2. Tư vấn Size: Dựa vào số KG của bé khách cung cấp, đối chiếu với cột "Cân nặng/Size" trong KHO để báo còn hay hết.
                    3. Hình ảnh: Nếu trong KHO có link ảnh, hãy gửi kèm dưới dạng: [IMG]link_anh[/IMG].
                    4. Chốt đơn: Khi khách đồng ý mua, bạn PHẢI trả về đúng cú pháp sau ở cuối câu: 
                       [CHOT_DON: Tên SP | Size | Giá | Tên Khách | SĐT | Địa chỉ]
                    5. Nếu không có địa chỉ hoặc SĐT, hãy khéo léo hỏi khách để hoàn thiện đơn hàng.
                    6. Không trả lời các vấn đề ngoài việc bán hàng của shop.`
                },
                ...userHistory
            ]
        }, { 
            headers: { 
                "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
                "HTTP-Referer": "https://render.com", // Yêu cầu của OpenRouter
                "X-Title": "Chatbot Huong Kid"
            } 
        });

        return response.data.choices[0].message.content;
    } catch (error) {
        console.error("Lỗi OpenRouter:", error.response ? error.response.data : error.message);
        return "Dạ hiện tại em đang bận tí, chị nhắn lại sau 1 phút giúp em nhé!";
    }
}

module.exports = { getAIReply };
