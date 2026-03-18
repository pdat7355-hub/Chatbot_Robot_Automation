const axios = require('axios');

async function getAIReply(userHistory, shopProfile, khoHang) {
    try {
        // Đảm bảo dùng đúng link /api/v1/ như code cũ của bạn
        const response = await axios.post("https://openrouter.ai/api/v1/chat/completions", {
            model: "google/gemini-2.0-flash-001", 
            messages: [
                {
                    role: "system",
                    content: `Bạn là trợ lý ảo shop Hương Kid. 
                    THÔNG TIN SHOP: ${shopProfile}
                    KHO: ${khoHang}
                    
                    QUY TẮC THÔNG TIN KHÁCH HÀNG:
                    1. Tên, SĐT, Địa chỉ: Nếu đã có trong lịch sử thì KHÔNG hỏi lại.
                    2. CÂN NẶNG & SIZE: Ưu tiên cân nặng khách nhắc tới mới nhất.
                    3. Mã chốt đơn bắt buộc: [CHOT_DON: Tên | Sản phẩm | SĐT | Địa chỉ]`
                },
                ...userHistory
            ]
        }, { 
            headers: { 
                "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
                "Content-Type": "application/json"
            } 
        });

        if (response.data && response.data.choices && response.data.choices[0]) {
            return response.data.choices[0].message.content;
        } else {
            throw new Error("Phản hồi từ AI không đúng định dạng");
        }

    } catch (error) {
        // Log lỗi này ra để Đạt xem trên Render Dashboard -> Logs
        console.error("LỖI GỌI OPENROUTER:", error.response ? error.response.data : error.message);
        throw error; // Đẩy lỗi ra ngoài để app.js bắt được
    }
}

module.exports = { getAIReply };
