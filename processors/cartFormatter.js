/**
 * Xây dựng nội dung giỏ hàng cho shop Hương Kid
 * Đã fix lỗi hiển thị Size và tối ưu nút bấm
 */
function buildCartReply(session, header, db) {
    const { subTotal = 0, shipFee = 30000, finalTotal = 0 } = session.totals || {};
    const inventory = db || {};
    let summary = `${header}\n\n🛒 **GIỎ HÀNG CỦA MẸ:**\n────────────────\n`;

    if (!session.cart || session.cart.length === 0) {
        return summary + "Dạ hiện tại giỏ hàng đang trống nhen Mẹ! [🛍️ XEM MẪU | ACTION_CONSULT]";
    }

    session.cart.forEach((item, index) => {
        const cleanCode = item.code.trim().toUpperCase();
        const productInStock = inventory[cleanCode]; 
        
        // FIX: Chỉ lấy phần số của Size (Ví dụ "G02:6" -> "6")
        let displaySize = String(item.size || "⚠️");
        if (displaySize.includes(':')) {
            displaySize = displaySize.split(':').pop(); 
        }
        
        summary += `${index + 1}. ${item.name}\n`;
        summary += `🔹 Mã: **${item.code}** - Size: **${displaySize}**\n`;
        summary += `💰 Giá: ${item.price.toLocaleString('vi-VN')}đ\n`;

        // Render nút đổi size siêu gọn
        if (productInStock && productInStock.category) {
            const availableSizes = String(productInStock.category).split(',').map(s => s.trim()).filter(Boolean);
            const otherSizes = availableSizes.filter(s => s !== displaySize);

            if (otherSizes.length > 0) {
                // Nhãn chỉ để số s, lệnh ẩn phía sau dấu |
                const sizeButtons = otherSizes.map(s => `[${s}|ACTION_SIZE:${item.code}:${s}]`).join("  ");
                summary += `🛠️ Đổi size: ${sizeButtons}\n`;
            }
        }
        
        summary += `🗑️ [Xóa|ACTION_REMOVE:${item.code}]\n────────────────\n`;
    });

    summary += `💵 Tạm tính: ${subTotal.toLocaleString('vi-VN')}đ\n`;
    summary += `🚚 Ship: ${shipFee.toLocaleString('vi-VN')}đ\n`;
    summary += `👉 **TỔNG: ${finalTotal.toLocaleString('vi-VN')}đ**\n\n`;
    
    // Nút điều hướng chính
    summary += `[✅ CHỐT ĐƠN|ACTION_CONFIRM]   [🛍️ XEM TIẾP|ACTION_CONSULT]`;
    
    return summary;
}

module.exports = { buildCartReply };