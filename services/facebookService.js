const axios = require('axios');

/**
 * Hàm lọc và chuyển đổi văn bản sang định dạng Facebook
 */
function formatMessage(text, psid) {
    // 1. XỬ LÝ FORM CHỐT ĐƠN (Chuyển thành nút Webview)
    if (text.includes("[[SHOW_ORDER_FORM")) {
        const cleanText = "Dạ Mẹ nhấn vào nút bên dưới để điền thông tin cho bé nhen! ❤️";
        return {
            attachment: {
                type: "template",
                payload: {
                    template_type: "button",
                    text: cleanText,
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

    // 2. XỬ LÝ NÚT BẤM [Nhãn|Lệnh]
    const buttonRegex = /\[([^\]|]+)\|?([^\]]*)\]/g;
    const matches = [...text.matchAll(buttonRegex)];

    if (matches.length > 0) {
        let cleanText = text.replace(/\[.*?\]/g, '').replace(/<img[^>]*>/g, "").trim();
        
        // Dùng Quick Replies để khách dễ bấm
        const quickReplies = matches.map(match => {
            const label = match[1].trim();
            const command = match[2] ? match[2].trim() : label;
            return {
                content_type: "text",
                title: label.substring(0, 20),
                payload: command // Gửi nguyên command về để logic cũ xử lý
            };
        });

        return {
            text: cleanText || "Mẹ chọn ở dưới nhen:",
            quick_replies: quickReplies.slice(0, 13)
        };
    }

    // 3. TIN NHẮN VĂN BẢN THUẦN
    return { text: text.replace(/<img[^>]*>/g, "").trim() };
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
        
        // Nếu có ảnh, gửi ảnh kèm text/nút bằng Generic Template (để ảnh và nút đi liền một khối, trông sẽ ĐẸP và CÓ MÀU hơn)
        if (imageUrl && responseText.includes("[")) {
             const formatted = formatMessage(responseText, senderPsid);
             // Gửi kiểu Generic để ảnh nằm trên, nút nằm dưới
             await axios.post(`https://graph.facebook.com/v19.0/me/messages?access_token=${accessToken}`, {
                recipient: { id: senderPsid },
                message: {
                    attachment: {
                        type: "template",
                        payload: {
                            template_type: "generic",
                            elements: [{
                                title: "Hương Kid tư vấn ạ!",
                                image_url: imageUrl,
                                subtitle: formatted.text,
                                buttons: (formatted.quick_replies || []).slice(0, 3).map(qr => ({
                                    type: "postback",
                                    title: qr.title,
                                    payload: qr.payload
                                }))
                            }]
                        }
                    }
                }
            });
        } else {
            // Gửi tách rời nếu không có nút hoặc chỉ có text
            if (imageUrl) {
                await axios.post(`https://graph.facebook.com/v19.0/me/messages?access_token=${accessToken}`, {
                    recipient: { id: senderPsid },
                    message: { attachment: { type: "image", payload: { url: imageUrl } } }
                });
            }
            const formatted = formatMessage(responseText, senderPsid);
            await axios.post(`https://graph.facebook.com/v19.0/me/messages?access_token=${accessToken}`, {
                recipient: { id: senderPsid },
                message: formatted
            });
        }

        console.log(`✅ [FB Service] Phản hồi thành công: ${senderPsid}`);
    } catch (err) {
        console.error("❌ [FB Service] Lỗi:", err.response?.data || err.message);
    }
}

module.exports = { sendResponse };
