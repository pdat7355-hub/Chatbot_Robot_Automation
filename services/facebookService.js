// C:\Users\Hi\OneDrive\Desktop\TCCS\Chatbot\chatbot_server\services\facebookService.js
const axios = require('axios');

/**
 * Hàm làm sạch văn bản: Xóa HTML rác và các tag lệnh ẩn
 */
function cleanTextContent(text) {
    return (text || "")
        .replace(/<[^>]*>/g, "") // Xóa sạch các thẻ <div>, <span>, <br>...
        .replace(/\[\[.*?\]\]/g, "") // Xóa các tag đặc biệt dạng [[...]]
        .trim();
}

/**
 * Hàm lọc và chuyển đổi văn bản sang định dạng Facebook
 */
function formatMessage(text, psid) {
    const cleanText = cleanTextContent(text);

    // 1. XỬ LÝ FORM CHỐT ĐƠN (Giữ nguyên Webview của bạn)
    if (text.includes("[[SHOW_ORDER_FORM") || text.toUpperCase().includes("ACTION_CONFIRM")) {
        const appUrl = process.env.APP_URL || 'https://chatbot-robot-automation.onrender.com';
        return {
            attachment: {
                type: "template",
                payload: {
                    template_type: "button",
                    text: cleanText || "Dạ Mẹ nhấn vào nút bên dưới để điền thông tin cho bé nhen! ❤️",
                    buttons: [{
                        type: "web_url",
                        url: `${appUrl}/order-form.html?userId=${psid}`, 
                        title: "📝 ĐIỀN THÔNG TIN",
                        webview_height_ratio: "full", // Mở toàn màn hình cho dễ nhìn
                        messenger_extensions: false 
                    }]
                }
            }
        };
    }

    // 2. TỰ ĐỘNG BẮT SĐT (Nếu nội dung có chữ SĐT/Số điện thoại)
    if (cleanText.toLowerCase().includes("sđt") || cleanText.toLowerCase().includes("số điện thoại")) {
        return {
            text: cleanText,
            quick_replies: [{ content_type: "user_phone_number" }]
        };
    }

    // 3. XỬ LÝ NÚT BẤM [Nhãn|Lệnh]
    const buttonRegex = /\[([^\]|]+)\|?([^\]]*)\]/g;
    const matches = [...text.matchAll(buttonRegex)];

    if (matches.length > 0) {
        const isAskingAddress = cleanText.toLowerCase().includes("địa chỉ");
        
        const quickReplies = matches.map(match => {
            const label = match[1].trim();
            const command = match[2] ? match[2].trim() : label;
            return {
                content_type: "text",
                title: label.substring(0, 20),
                payload: command
            };
        });

        // Nếu đang hỏi địa chỉ, chèn thêm 1 nút mẫu ở đầu
        if (isAskingAddress) {
            quickReplies.unshift({
                content_type: "text",
                title: "Mẫu: Tên - SĐT - ĐC",
                payload: "TEMPLATE_ADDRESS"
            });
        }

        return {
            text: cleanText || "Mẹ chọn ở dưới nhen:",
            quick_replies: quickReplies.slice(0, 13)
        };
    }

    // 4. TIN NHẮN VĂN BẢN THUẦN
    return { text: cleanText };
}

/**
 * Trích xuất Link ảnh (Hỗ trợ quét link ảnh sạch hơn)
 */
function extractImageUrl(text) {
    if (!text) return null;
    const urlRegex = /https?:\/\/[^\s"<>]+密*(?:\.jpg|\.jpeg|\.png|\.gif|\.webp|thumbnail\?[^\s"<>]+)/i;
    const match = text.match(urlRegex);
    return match ? match[0] : null;
}

/**
 * Gửi phản hồi chính
 */
async function sendResponse(senderPsid, responseText) {
    try {
        const accessToken = process.env.FB_PAGE_ACCESS_TOKEN;
        const imageUrl = extractImageUrl(responseText);
        const formatted = formatMessage(responseText, senderPsid);
        
        // BƯỚC 1: CỨ CÓ ẢNH LÀ GỬI RIÊNG TRƯỚC (Đảm bảo 100% hiển thị ảnh mẫu)
        if (imageUrl) {
            console.log(`📸 [FB Service] Đang gửi ảnh mẫu sản phẩm: ${imageUrl}`);
            try {
                await axios.post(`https://graph.facebook.com/v19.0/me/messages?access_token=${accessToken}`, {
                    recipient: { id: senderPsid },
                    message: { 
                        attachment: { 
                            type: "image", 
                            payload: { url: imageUrl, is_reusable: true } 
                        } 
                    }
                });
            } catch (imgErr) {
                console.error("⚠️ Không gửi được ảnh (Có thể lỗi link ảnh):", imgErr.message);
            }
        } 

        // BƯỚC 2: GỬI NỘI DUNG CHỮ + NÚT BẤM (QUICK REPLIES HOẶC WEBVIEW) NGAY PHÍA SAU
        if (formatted && (formatted.text || formatted.attachment)) {
            await axios.post(`https://graph.facebook.com/v19.0/me/messages?access_token=${accessToken}`, {
                recipient: { id: senderPsid },
                message: formatted
            });
        }

        console.log(`✅ [FB Service] Đã xử lý tin nhắn sạch cho khách: ${senderPsid}`);
    } catch (err) {
        console.error("❌ [FB Service] Lỗi nghiêm trọng:", err.response?.data || err.message);
    }
}

module.exports = { sendResponse };
