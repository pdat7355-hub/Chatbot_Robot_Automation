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

// 1. Khai báo model ở ngoài cùng để tất cả các hàm đều dùng được
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

async function parseInventoryData(userInput) {
    try {
        // Kiểm tra nếu chưa có API Key
        if (!process.env.GEMINI_API_KEY) {
            throw new Error("Chưa cấu hình GEMINI_API_KEY trên Render");
        }

        const prompt = `Bạn là chuyên gia bóc tách dữ liệu cho shop Hương Kid. 
        Hãy chuyển nội dung sau thành JSON: "${userInput}"
        Chỉ trả về DUY NHẤT mã JSON theo mẫu:
        {"name": "tên sản phẩm", "price": "giá", "size": "kích cỡ", "imageUrl": "link"}
        Không giải thích gì thêm.`;

        // 2. Gọi model ở đây (bây giờ nó đã được định nghĩa ở trên rồi)
        const result = await model.generateContent(prompt);
        const response = await result.response;
        let text = response.text().trim();

        // Trích xuất JSON sạch
        const jsonMatch = text.match(/\{.*\}/s);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }
        
        console.error("AI trả về sai định dạng:", text);
        return null;
    } catch (error) {
        console.error("❌ Lỗi tại aiService:", error.message);
        return null;
    }
}

// 3. Xuất hàm ra với đúng tên Đạt muốn
module.exports = { parseInventoryData };
