const axios = require('axios');

/**
 * Làm sạch text rác
 */
function cleanTextContent(text) {
    return (text || "")
        .replace(/<[^>]*>/g, "") 
        .replace(/\[\[.*?\]\]/g, "") 
        .trim();
}

/**
 * Định dạng tin nhắn Facebook
 */
function formatMessage(text, psid) {
    // 1. XỬ LÝ NÚT CHỐT ĐƠN (Sửa lỗi #100)
    if (text.includes("[[SHOW_ORDER_FORM")) {
        const appUrl = process.env.APP_URL || 'https://chatbot-robot-automation.onrender.com';
        return {
            attachment: {
                type: "template",
                payload: {
                    template_type: "button",
                    text: "Dạ Mẹ nhấn vào nút bên dưới để điền thông tin cho bé nhen! ❤️",
                    buttons: [{
                        type: "web_url",
                        url: `${appUrl}/order-form.html?userId=${psid}`, // Đảm bảo file này có trong thư mục public
                        title: "📝 ĐIỀN THÔNG TIN",
                        webview_height_ratio: "tall",
                        // Nếu vẫn lỗi #100, hãy tạm thời đổi dòng dưới thành false cho đến khi Whitelist xong
                        messenger_extensions: true 
                    }]
                }
            }
        };
    }

    // 2. BẮT SĐT TỰ ĐỘNG (Lấy từ tài khoản khách)
    const cleanText = cleanTextContent(text);
    if (cleanText.toLowerCase().includes("sđt") || cleanText.toLowerCase().includes("số điện thoại")) {
        return {
            text: cleanText,
            quick_replies: [{ content_type: "user_phone_number" }]
        };
    }

    // 3. XỬ LÝ NÚT [Nhãn|Lệnh]
    const buttonRegex = /\[([^\]|]+)\|?([^\]]*)\]/g;
    const matches = [...text.matchAll(buttonRegex)];

    if (matches.length > 0) {
        const quickReplies = matches.map(match => ({
            content_type: "text",
            title: match[1].trim().substring(0, 20),
            payload: match[2] ? match[2].trim() : match[1].trim()
        }));

        return {
            text: cleanText || "Mẹ chọn ở dưới nhen:",
            quick_replies: quickReplies.slice(0, 13)
        };
    }

    return { text: cleanText };
}

/**
 * Gửi phản hồi
 */
async function sendResponse(senderPsid, responseText) {
    try {
        const accessToken = process.env.FB_PAGE_ACCESS_TOKEN;
        const formatted = formatMessage(responseText, senderPsid);

        await axios.post(`https://graph.facebook.com/v19.0/me/messages?access_token=${accessToken}`, {
            recipient: { id: senderPsid },
            message: formatted
        });

        console.log(`✅ [FB Service] Đã gửi tin nhắn cho: ${senderPsid}`);
    } catch (err) {
        // Log chi tiết lỗi để bạn dễ debug
        console.error("❌ [FB Service] Lỗi chi tiết:", JSON.stringify(err.response?.data, null, 2));
    }
}

module.exports = { sendResponse };
