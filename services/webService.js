// C:\Users\Hi\OneDrive\Desktop\TCCS\Chatbot\chatbot_server\services\webService.js

function formatForWeb(responseText, originalResult = {}) {
    // 1. Lấy link ảnh và Nút bấm (giữ nguyên logic cũ)
    const urlRegex = /https?:\/\/[^\s"<>]+(?:\.jpg|\.jpeg|\.png|\.gif|thumbnail\?[^\s"<>]+)/i;
    const imageUrl = (responseText.match(urlRegex) || [])[0] || null;

    const buttonRegex = /\[(.*?)\]/g;
    const buttons = [...responseText.matchAll(buttonRegex)].map(m => m[1]);

    // 2. Làm sạch text để không hiện mã HTML hay [Nút]
    let cleanText = responseText.replace(buttonRegex, '').replace(/<img[^>]*>/g, "").trim();

    // 3. QUAN TRỌNG: Lấy danh sách sản phẩm đã lọc
    // Tùy vào logicHandler của bạn trả về tên biến là 'inventory' hay 'products'
    const products = originalResult.inventory || originalResult.products || [];

    return {
        reply: cleanText || "Dạ Mẹ xem mẫu đúng size bé nhà mình ở dưới nhen:",
        image: imageUrl,
        buttons: buttons,
        products: products // Trả mảng này về để Web hiển thị Card sản phẩm
    };
}

module.exports = { formatForWeb };