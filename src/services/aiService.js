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
