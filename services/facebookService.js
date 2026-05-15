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
// C:\Users\Hi\OneDrive\Desktop\TCCS\Chatbot\chatbot_server\services\facebookService.js

// ... (Các hàm cleanTextContent, extractAllImageUrls, formatMessage giữ nguyên phía trên) ...

/**
 * Hàm chính thực hiện gửi tin nhắn thông minh
 */
async function sendResponse(senderPsid, responseText) {
    try {
        const accessToken = process.env.FB_PAGE_ACCESS_TOKEN;
        const imageUrls = extractAllImageUrls(responseText);
        
        // --- TRƯỜNG HỢP NHIỀU SẢN PHẨM (Gộp thông tin lên Album Carousel & Xóa bảng text dưới) ---
        if (imageUrls.length >= 2) {
            console.log(`📚 [FB Service] Đang bóc tách thông tin chi tiết cho ${imageUrls.length} sản phẩm...`);

            // 1. Tách văn bản thành các khối nhỏ theo từng sản phẩm
            // Sử dụng các ký tự phân tách phổ biến như 🔹 hoặc **Mã:
            const blocks = responseText.split(/(?=🔹|\*\*Mã:)/i).filter(b => b.includes('http'));
            const elements = [];

            // 2. Duyệt qua từng khối để bóc tách: Mã, Tên, Giá, Nút bấm
            for (let i = 0; i < imageUrls.length; i++) {
                const currentUrl = imageUrls[i];
                const currentBlock = blocks[i] || "";

                // Bóc tách Mã sản phẩm (Ví dụ: G02, M01)
                const codeMatch = currentBlock.match(/\*\*Mã:\s*([^*]+)\*\*/i) || currentBlock.match(/Mã:\s*([^\n[-]+)/i);
                const itemCode = codeMatch ? codeMatch[1].trim() : `Mẫu ${i + 1}`;

                // Bóc tách Tên sản phẩm (Dòng chữ ngay sau Mã hoặc có icon 👕/👕/👚)
                const nameMatch = currentBlock.match(/(?:👕|👚|👕|🌱|👉|^)\s*([^\n$*|]+)/m);
                let itemName = nameMatch ? nameMatch[1].trim() : "Quần áo trẻ em";
                // Loại bỏ các chữ dư thừa nếu regex bắt nhầm cấu trúc giá
                if (itemName.toLowerCase().includes("giá")) itemName = "Thời trang bé trai";

                // Bóc tách Giá sản phẩm
                const priceMatch = currentBlock.match(/Giá:\s*\*?([^*|\n]+)\*?/i);
                const itemPrice = priceMatch ? priceMatch[1].trim() : "Liên hệ shop";

                // Bóc tách cấu trúc nút bấm tương ứng trong khối [Nhãn|Lệnh]
                const buttonRegex = /\[([^\]|]+)\|?([^\]]*)\]/g;
                const buttonMatches = [...currentBlock.matchAll(buttonRegex)];
                
                const buttons = [];
                if (buttonMatches.length > 0) {
                    // Lấy nút bấm đầu tiên của khối sản phẩm đó (Ví dụ: [CHỌN MẪU|ACTION_ADD:G02])
                    const label = buttonMatches[0][1].trim();
                    const command = buttonMatches[0][2] ? buttonMatches[0][2].trim() : label;
                    
                    // Nếu AI trả ra text thô dạng Lệnh hệ thống, ta đổi hiển thị cho đẹp mắt
                    const cleanLabel = label.toUpperCase().includes("ACTION_ADD") ? `🛍️ CHỌN MẪU ${itemCode}` : label.substring(0, 20);

                    buttons.push({
                        type: "postback",
                        title: cleanLabel,
                        payload: command
                    });
                } else {
                    // Dự phòng nếu khối không có nút, tự tạo nút chọn theo Mã sản phẩm luôn
                    buttons.push({
                        type: "postback",
                        title: `🛍️ CHỌN MẪU ${itemCode}`,
                        payload: `ACTION_ADD:${itemCode}`
                    });
                }

                // Đẩy ô sản phẩm hoàn chỉnh vào mảng (Giới hạn tối đa 10 ô của Facebook)
                if (elements.length < 10) {
                    elements.push({
                        title: `Mã: ${itemCode} - ${itemName}`.substring(0, 80), // Facebook giới hạn 80 ký tự title
                        image_url: currentUrl,
                        subtitle: `💰 Giá: ${itemPrice}\nMẹ bấm nút bên dưới để chọn nhen!`.substring(0, 80), // Giới hạn 80 ký tự subtitle
                        buttons: buttons
                    });
                }
            }

            // 3. Gửi Tin nhắn dạng Album xoay vòng lên Messenger
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
                console.log(`✅ [FB Service] Đã gửi Album Carousel tích hợp thông tin thành công.`);
            }

            // 4. KIỂM TRA VÀ CHỈ GỬI LỜI CHÀO/NÚT GIỎ HÀNG Ở CUỐI (Bỏ hoàn toàn bảng kê danh sách cũ)
            // Lọc ra các dòng text chung ở cuối tin nhắn (Ví dụ: Mẹ ưng mẫu nào bấm nút..., Hoặc bấm xem giỏ hàng...)
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
                // Gửi nốt câu dặn dò hoặc nút Xem giỏ hàng nếu có
                const formattedBottom = formatMessage(bottomText, senderPsid);
                await axios.post(`https://graph.facebook.com/v19.0/me/messages?access_token=${accessToken}`, {
                    recipient: { id: senderPsid },
                    message: formattedBottom
                });
            }
            return; // Hoàn thành luồng danh mục sản phẩm, thoát hàm
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
