// C:\Users\Hi\OneDrive\Desktop\TCCS\Chatbot\chatbot_server\services\facebookService.js
const axios = require('axios');

/**
 * Hàm làm sạch văn bản: Xóa HTML rác và các tag lệnh ẩn
 */
function cleanTextContent(text) {
    return (text || "")
        .replace(/<[^>]*>/g, "") // Xóa sạch các thẻ html
        .replace(/\[\[.*?\]\]/g, "") // Xóa các tag đặc biệt
        .trim();
}

/**
 * Hàm lọc và trích xuất TOÀN BỘ link ảnh có trong tin nhắn (Dùng cờ g)
 */
function extractAllImageUrls(text) {
    if (!text) return [];
    const urlRegex = /https?:\/\/[^\s"<>]+(?:\.jpg|\.jpeg|\.png|\.gif|\.webp|thumbnail\?[^\s"<>]+)/gi;
    const matches = text.match(urlRegex);
    return matches ? [...new Set(matches)] : []; // Loại bỏ trùng lặp nếu có
}

/**
 * Hàm phân tích tin nhắn để dựng cấu trúc Facebook
 */
function formatMessage(text, psid) {
    const cleanText = cleanTextContent(text);

    // 1. XỬ LÝ FORM CHỐT ĐƠN WEBVIEW
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
                        webview_height_ratio: "full",
                        messenger_extensions: false 
                    }]
                }
            }
        };
    }

    // 2. TỰ ĐỘNG BẮT SĐT
    if (cleanText.toLowerCase().includes("sđt") || cleanText.toLowerCase().includes("số điện thoại")) {
        return {
            text: cleanText,
            quick_replies: [{ content_type: "user_phone_number" }]
        };
    }

    // 3. XỬ LÝ NÚT BẤM [Nhãn|Lệnh] DẠNG QUICK REPLIES
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

    return { text: cleanText };
}

/**
 * Hàm chính thực hiện gửi tin nhắn thông minh
 */
async function sendResponse(senderPsid, responseText) {
    try {
        const accessToken = process.env.FB_PAGE_ACCESS_TOKEN;
        const imageUrls = extractAllImageUrls(responseText);
        
        // --- TRƯỜNG HỢP NHIỀU ẢNH (Gửi dạng Album xoay vòng Carousel) ---
        if (imageUrls.length >= 2) {
            console.log(`📚 [FB Service] Phát hiện danh sách dữ liệu có ${imageUrls.length} ảnh. Tiến hành dựng Album Carousel...`);
            
            // Tìm toàn bộ cấu trúc khối sản phẩm để bóc tách nút bấm tương ứng với từng sản phẩm
            // Giả định văn bản phân tách các sản phẩm dựa trên việc liệt kê Mã sản phẩm hoặc Nút bấm
            const buttonRegex = /\[([^\]|]+)\|?([^\]]*)\]/g;
            const allButtons = [...responseText.matchAll(buttonRegex)].map(m => ({
                label: m[1].trim(),
                command: m[2] ? m[2].trim() : m[1].trim()
            }));

            // Tạo các elements (Tối đa 10 ô theo quy định của Facebook)
            const elements = imageUrls.slice(0, 10).map((url, index) => {
                // Phân phối nút bấm tương ứng cho từng ô sản phẩm (nếu có)
                const itemBtn = allButtons[index] ? [
                    {
                        type: "postback",
                        title: allButtons[index].label.substring(0, 20),
                        payload: allButtons[index].command
                    }
                ] : [];

                return {
                    title: `Mẫu Sản Phẩm ${index + 1}`,
                    image_url: url,
                    subtitle: `Mẹ nhấn nút bên dưới để chọn phân loại này nhen!`,
                    buttons: itemBtn.length > 0 ? itemBtn : undefined
                };
            });

            // Gửi tin nhắn cấu trúc dạng Generic Album xoay vòng
            await axios.post(`https://graph.facebook.com/v19.0/me/messages?access_token=${accessToken}`, {
                recipient: { id: senderPsid },
                message: {
                    attachment: {
                        type: "template",
                        payload: {
                            template_type: "generic",
                            elements: elements
                        }
                    }
                }
            });

            // Gửi kèm dòng chữ hướng dẫn hoặc giỏ hàng tổng hợp ở cuối cho khách nắm thông tin
            const cleanText = cleanTextContent(responseText).replace(/https?:\/\/[^\s"<>]+/gi, '').trim();
            if (cleanText) {
                await axios.post(`https://graph.facebook.com/v19.0/me/messages?access_token=${accessToken}`, {
                    recipient: { id: senderPsid },
                    message: { text: cleanText }
                });
            }
            console.log(`✅ [FB Service] Đã gửi Album sản phẩm thành công tới: ${senderPsid}`);
            return;
        }

        // --- TRƯỜNG HỢP THÔNG THƯỜNG (1 ẢNH HOẶC KHÔNG CÓ ẢNH) ---
        const formatted = formatMessage(responseText, senderPsid);
        
        if (imageUrls.length === 1) {
            console.log(`📸 [FB Service] Gửi 1 ảnh sản phẩm lẻ: ${imageUrls[0]}`);
            try {
                await axios.post(`https://graph.facebook.com/v19.0/me/messages?access_token=${accessToken}`, {
                    recipient: { id: senderPsid },
                    message: { 
                        attachment: { 
                            type: "image", 
                            payload: { url: imageUrls[0], is_reusable: true } 
                        } 
                    }
                });
            } catch (imgErr) {
                console.error("⚠️ Lỗi gửi ảnh đơn:", imgErr.message);
            }
        }

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
