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

    // 1. XỬ LÝ FORM CHỐT ĐƠN (Giữ nguyên Webview cũ của bạn)
    if (text.includes("[[SHOW_ORDER_FORM")) {
        return {
            attachment: {
                type: "template",
                payload: {
                    template_type: "button",
                    text: "Dạ Mẹ nhấn vào nút bên dưới để điền thông tin cho bé nhen! ❤️",
                    buttons: [{
                        type: "web_url",
                        url: `${process.env.APP_URL || 'https://your-domain.com'}/order-form?userId=${psid}`, 
                        title: "📝 ĐIỀN THÔNG TIN",
                        webview_height_ratio: "tall",
                        messenger_extensions: true
                    }]
                }
            }
        };
    }

    // 2. TỰ ĐỘNG BẮT SĐT (Nếu nội dung có chữ SĐT/Số điện thoại)
    // Cách này giúp khách gửi SĐT chuẩn 100% không lan man
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
        // Nếu là yêu cầu địa chỉ, gợi ý sẵn mẫu để khách đỡ gõ sai
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
 * Trích xuất Link ảnh
 */
function extractImageUrl(text) {
    const urlRegex = /https?:\/\/[^\s"<>]+(?:\.jpg|\.jpeg|\.png|\.gif)/i;
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
        
        // TRƯỜNG HỢP 1: CÓ ẢNH VÀ NÚT BẤM (Dùng Generic Template cho ĐẸP)
        if (imageUrl && formatted.quick_replies) {
             await axios.post(`https://graph.facebook.com/v19.0/me/messages?access_token=${accessToken}`, {
                recipient: { id: senderPsid },
                message: {
                    attachment: {
                        type: "template",
                        payload: {
                            template_type: "generic",
                            elements: [{
                                title: "Hương Kid tư vấn ạ! ❤️",
                                image_url: imageUrl,
                                subtitle: formatted.text,
                                // Chuyển Quick Replies thành Buttons cho Generic (tối đa 3 nút)
                                buttons: formatted.quick_replies
                                    .filter(qr => qr.content_type === "text")
                                    .slice(0, 3)
                                    .map(qr => ({
                                        type: "postback",
                                        title: qr.title,
                                        payload: qr.payload
                                    }))
                            }]
                        }
                    }
                }
            });
        } 
        // TRƯỜNG HỢP 2: CHỈ CÓ ẢNH HOẶC CHỈ CÓ TEXT/QUICK REPLY
        else {
            if (imageUrl) {
                await axios.post(`https://graph.facebook.com/v19.0/me/messages?access_token=${accessToken}`, {
                    recipient: { id: senderPsid },
                    message: { attachment: { type: "image", payload: { url: imageUrl } } }
                });
            }
            
            await axios.post(`https://graph.facebook.com/v19.0/me/messages?access_token=${accessToken}`, {
                recipient: { id: senderPsid },
                message: formatted
            });
        }

        console.log(`✅ [FB Service] Đã xử lý tin nhắn sạch cho khách: ${senderPsid}`);
    } catch (err) {
        console.error("❌ [FB Service] Lỗi:", err.response?.data || err.message);
    }
}

module.exports = { sendResponse };
