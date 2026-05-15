// C:\Users\Hi\OneDrive\Desktop\TCCS\Chatbot\chatbot_server\services\facebookService.js
const axios = require('axios');

/**
 * Hàm làm sạch văn bản: Xóa HTML rác và các tag lệnh ẩn
 */
function cleanTextContent(text) {
    return (text || "")
        .replace(/<[^>]*>/g, "") // Xóa sạch các thẻ html
        .replace(/\[\[.*?\]\]/g, "") // Xóa các tag đặc biệt dạng [[...]]
        .trim();
}

/**
 * Hàm lọc và trích xuất TOÀN BỘ link ảnh có trong tin nhắn (Dùng cờ g)
 */
function extractAllImageUrls(text) {
    if (!text) return [];
    const urlRegex = /https?:\/\/[^\s"<>]+密*(?:\.jpg|\.jpeg|\.png|\.gif|\.webp|thumbnail\?[^\s"<>]+)/gi;
    const matches = text.match(urlRegex);
    return matches ? [...new Set(matches)] : []; // Loại bỏ trùng lặp nếu có
}

/**
 * Hàm phân tích tin nhắn để dựng cấu trúc Facebook (Quick Replies / Webview)
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
        
        // --- TRƯỜNG HỢP NHIỀU SẢN PHẨM (Dựng Album Carousel) ---
        if (imageUrls.length >= 2) {
            console.log(`📚 [FB Service] Đang cấu trúc lại Album Carousel cho ${imageUrls.length} sản phẩm...`);

            // 1. Tách văn bản thành các khối nhỏ theo từng sản phẩm để không lấy râu ông nọ cắm cằm bà kia
            const blocks = responseText.split(/(?=🔹|\*\*Mã:)/i).filter(b => b.includes('http'));
            const elements = [];

            // 2. Duyệt qua từng khối ảnh và text tương ứng
            for (let i = 0; i < imageUrls.length; i++) {
                const currentUrl = imageUrls[i];
                const currentBlock = blocks[i] || "";

                // Bóc tách Mã sản phẩm
                const codeMatch = currentBlock.match(/\*\*Mã:\s*([^*]+)\*\*/i) || currentBlock.match(/Mã:\s*([^\n[-]+)/i);
                const itemCode = codeMatch ? codeMatch[1].trim() : `Mẫu ${i + 1}`;

                // Bóc tách Tên sản phẩm
                const nameMatch = currentBlock.match(/(?:👕|👚|👕|🌱|👉|^)\s*([^\n$*|]+)/m);
                let itemName = nameMatch ? nameMatch[1].trim() : "Quần áo trẻ em";
                if (itemName.toLowerCase().includes("giá")) itemName = "Thời trang bé trai";

                // Bóc tách Giá sản phẩm
                const priceMatch = currentBlock.match(/Giá:\s*\*?([^*|\n]+)\*?/i);
                const itemPrice = priceMatch ? priceMatch[1].trim() : "Liên hệ shop";

                // Bóc tách cấu trúc nút bấm: Tìm kiếm toàn bộ chuỗi nằm trong cặp ngoặc vuông [LỆNH] nguyên bản
                const rawButtonRegex = /(\[[^\]]+\])/g;
                const rawButtons = currentBlock.match(rawButtonRegex) || [];
                
                const buttons = [];
                let finalPayload = `[ACTION_ADD:${itemCode}]`; // Giá trị payload dự phòng mặc định

                if (rawButtons.length > 0) {
                    // Lấy chính xác chuỗi thô bao gồm cả dấu ngoặc vuông (Ví dụ: "[ACTION_ADD:G02]")
                    const rawText = rawButtons[0].trim();
                    
                    // Phân tách Nhãn và Lệnh bên trong dấu ngoặc vuông nếu có dấu gạch đứng "|"
                    const innerContent = rawText.slice(1, -1); // Bỏ dấu [ và ]
                    if (innerContent.includes('|')) {
                        finalPayload = innerContent.split('|')[1].trim();
                    } else {
                        finalPayload = rawText; // Trả về nguyên văn chuỗi có ngoặc vuông [ACTION_ADD:G02]
                    }
                }

                // Thiết lập cấu trúc nút bấm Postback gửi lên Facebook
                buttons.push({
                    type: "postback",
                    title: `🛍️ CHỌN MẪU ${itemCode}`, // Chỉ hiển thị chữ tiếng Việt đẹp ra ngoài màn hình
                    payload: finalPayload            // GIỮ NGUYÊN lệnh thô hệ thống để cộng vào giỏ hàng thành công
                });

                if (elements.length < 10) {
                    elements.push({
                        title: `Mã: ${itemCode} - ${itemName}`.substring(0, 80),
                        image_url: currentUrl,
                        subtitle: `💰 Giá: ${itemPrice}\nMẹ bấm nút bên dưới để chọn nhen!`.substring(0, 80),
                        buttons: buttons
                    });
                }
            }

            // Gửi cấu trúc Album hoàn chỉnh
            if (elements.length > 0) {
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
            }

            // 3. LỌC VÀ GỬI TEXT HƯỚNG DẪN / GIỎ HÀNG Ở CUỐI (Xóa bỏ hoàn toàn bảng kê chữ xanh cũ)
            const lines = responseText.split('\n');
            const bottomTextLines = lines.filter(line => 
                !line.includes('http') && 
                !line.toLowerCase().includes('mã:') && 
                !line.toLowerCase().includes('giá:') &&
                !line.toLowerCase().includes('action_add')
            );
            
            let bottomText = bottomTextLines.join('\n').trim();
            bottomText = cleanTextContent(bottomText);

            if (bottomText) {
                const formattedBottom = formatMessage(bottomText, senderPsid);
                await axios.post(`https://graph.facebook.com/v19.0/me/messages?access_token=${accessToken}`, {
                    recipient: { id: senderPsid },
                    message: formattedBottom
                });
            }
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
