// ... (phần require bên trên giữ nguyên)
async function getAIReply(userHistory, shopProfile, khoHang) {
    try {
        const response = await axios.post("https://openrouter.ai/api/v1/chat/completions", { // SỬA ĐOÀN NÀY: /api/v1/
            model: "google/gemini-2.0-flash-001",
            messages: [
                {
                    role: "system",
                    content: `Bạn là nhân viên bán hàng tại Hương Kid. Thông tin shop: ${shopProfile}. Kho hàng: ${JSON.stringify(khoHang)}`
                },
                ...userHistory
            ]
        }, { 
            headers: { 
                "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
                "Content-Type": "application/json",
                "HTTP-Referer": "https://chatbot-robot-automation.onrender.com", // Link web của bạn
                "X-Title": "Huong Kid Chatbot"
            } 
        });

        return response.data.choices[0].message.content;
    } catch (error) {
        // In lỗi ra Log của Render để Đạt dễ xem
        console.error("CHI TIẾT LỖI AI:", error.response ? error.response.data : error.message);
        return "Dạ em đây ạ! Chị nhắn lại giúp em mẫu chị ưng với nhé, nãy mạng bên em hơi lag tí ạ.";
    }
}
