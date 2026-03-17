const axios = require('axios');

async function getAIReply(userHistory, shopProfile, khoHang) {
    const response = await axios.post("https://openrouter.ai/api/v1/chat/completions", {
        model: "google/gemini-2.0-flash-001", 
        messages: [
            {
                role: "system",
                content: `Bạn là trợ lý ảo shop Hương Kid. 
                THÔNG TIN SHOP: ${shopProfile}
                KHO: ${khoHang}
                QUY TẮC: ... (Giữ nguyên quy tắc của bạn)`
            },
            ...userHistory
        ]
    }, { headers: { "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}` } });

    return response.data.choices[0].message.content;
}

module.exports = { getAIReply };
