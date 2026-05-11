const { buildCartReply } = require('./cartFormatter');

async function handleTraps(text, userId, session, db, groups, sessionManager) {
    const rawText = (text || "").toUpperCase().trim();

    // --- 1. BẪY ĐỔI SIZE (Ưu tiên cao nhất để tránh bị trôi xuống hiển thị mẫu) ---
    // Cấu trúc: ACTION_SIZE:MÃ:SIZE (Ví dụ: ACTION_SIZE:G02:12)
    if (rawText.includes("ACTION_SIZE:")) {
        const parts = rawText.split(':');
        const pCode = parts[1]?.trim();
        const newSize = parts[2]?.trim();

        if (pCode && newSize && Array.isArray(session.cart)) {
            // Tìm món đồ cuối cùng hoặc món đồ có mã pCode trong giỏ để đổi size
            const itemIndex = session.cart.findLastIndex(i => i.code.toUpperCase() === pCode.toUpperCase());
            
            if (itemIndex !== -1) {
                session.cart[itemIndex].size = newSize;

                // Tính toán lại tiền (đề phòng giá có thể thay đổi theo size nếu sau này Đạt cần)
                const subTotal = session.cart.reduce((sum, item) => sum + (Number(item.price) || 0), 0);
                session.totals = {
                    subTotal: subTotal,
                    shipFee: 30000,
                    finalTotal: subTotal + 30000
                };

                await sessionManager.update(userId, { cart: session.cart, totals: session.totals });
                
                return { 
                    reply: buildCartReply(session, `✅ Đã đổi mã **${pCode}** sang **Size ${newSize}** thành công cho Mẹ nhen!`, db) 
                };
            }
        }
    }

    // --- 2. BẪY THÊM HÀNG (Hỗ trợ: "chọn G02" hoặc bấm nút ACTION_ADD:G02) ---
    if (rawText.startsWith("CHỌN ") || rawText.includes("ACTION_ADD:")) {
        const code = rawText.replace("CHỌN ", "").replace("ACTION_ADD:", "").split(/\s/)[0];
        
        if (db[code]) {
            const product = db[code];
            const availableSizes = String(product.category || "").split(',').map(s => s.trim());
            
            // Ưu tiên size mẹ đã chọn trước đó, nếu không lấy size tư vấn hoặc size mặc định
            const finalSize = session.entities?.size || availableSizes[0] || "10";

            if (!Array.isArray(session.cart)) session.cart = [];
            
            session.cart.push({ 
                code, 
                name: product.name, 
                price: Number(product.price) || 0, 
                size: finalSize 
            });

            const subTotal = session.cart.reduce((sum, item) => sum + item.price, 0);
            session.totals = {
                subTotal: subTotal,
                shipFee: 30000,
                finalTotal: subTotal + 30000
            };

            await sessionManager.update(userId, { cart: session.cart, totals: session.totals });
            
            return { reply: buildCartReply(session, `✅ Đã thêm mã **${code}** vào giỏ cho Mẹ nhen!`, db) };
        }
    }

    // --- 3. BẪY XÓA MÓN (Hỗ trợ nút bấm ACTION_REMOVE) ---
    if (rawText.includes("XOA:") || rawText.includes("ACTION_REMOVE:")) {
        const pCode = rawText.split(":")[1]?.trim().replace(/[\[\]]/g, "");
        if (pCode && Array.isArray(session.cart)) {
            session.cart = session.cart.filter(item => item.code.toUpperCase() !== pCode);
            
            const subTotal = session.cart.reduce((sum, item) => sum + (Number(item.price) || 0), 0);
            session.totals = { subTotal, shipFee: 30000, finalTotal: subTotal + 30000 };
            
            await sessionManager.update(userId, { cart: session.cart, totals: session.totals });
            return { reply: buildCartReply(session, `🗑️ Đã xóa mã **${pCode}** khỏi giỏ hàng ạ!`, db) };
        }
    }

    // --- 4. BẪY XEM GIỎ HÀNG ---
    if (rawText === "GIỎ HÀNG" || rawText.includes("ACTION_VIEW_CART")) {
        return { reply: buildCartReply(session, "🌸 Giỏ hàng của Mẹ hiện tại nè:", db) };
    }

    // --- 5. BẪY DANH MỤC/MENU ---

if (rawText === "DANH MỤC" || rawText === "MENU" || rawText.includes("ACTION_CONSULT")) {
    
    // 1. Tự động lấy danh sách nhóm từ kho hàng (db) nếu groups truyền vào bị thiếu
    let currentGroups = groups;
    if (!Array.isArray(currentGroups) || currentGroups.length === 0) {
        currentGroups = [...new Set(Object.values(db).map(item => item.group).filter(Boolean))];
    }

    // 2. Tạo chuỗi nút bấm
    if (currentGroups.length > 0) {
        const menuButtons = currentGroups.map(g => `[${g.toUpperCase()}]`).join("  ");
        return { 
            reply: `Dạ shop Hương Kid có các nhóm hàng này, Mẹ chọn xem nhóm nào để em gửi mẫu nhen:\n\n${menuButtons}\n\n*(Mẹ bấm vào nút để xem mẫu ạ!)*` 
        };
    } else {
        // Trường hợp kho hàng gặp sự cố không lấy được nhóm
        return { reply: "Dạ hiện shop đang cập nhật mẫu mới, Mẹ nhắn 'Bé trai' hoặc 'Bé gái' để em tư vấn trực tiếp nhen! ❤️" };
    }
}

    return null;
}

module.exports = { handleTraps };