// services/webService.js

function formatForWeb(responseText, originalResult = {}) {
    // 1. Lấy link ảnh
    const urlRegex = /https?:\/\/[^\s"<>]+(?:\.jpg|\.jpeg|\.png|\.gif|thumbnail\?[^\s"<>]+)/i;
    const imageUrl = (responseText.match(urlRegex) || [])[0] || null;

    // 2. Lấy Nút bấm [Nhãn] hoặc [Nhãn|Lệnh]
    const buttonRegex = /\[([^\]|]+)\|?([^\]]*)\]/g;
    const buttons = [...responseText.matchAll(buttonRegex)].map(m => ({
        label: m[1].trim(),
        command: m[2] ? m[2].trim() : m[1].trim()
    }));

    // 3. Làm sạch text (Xóa thẻ img và các khối [Nút])
    let cleanText = responseText.replace(/\[.*?\]/g, '').replace(/<img[^>]*>/g, "").trim();

    // 4. Lấy danh sách sản phẩm từ kết quả gốc của "Bộ não"
    const products = originalResult?.inventory || originalResult?.products || [];

    return {
        reply: cleanText || "Dạ Mẹ xem mẫu bên dưới nhen:",
        image: imageUrl,
        buttons: buttons,
        products: products 
    };
}

module.exports = { formatForWeb };
