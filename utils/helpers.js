const helpers = {
    removeAccents: (str) => {
        if (!str) return "";
        return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');
    },

    mapWeightToSize: (weightStr) => {
        const w = parseInt(weightStr);
        if (isNaN(w) || w < 5) return null;
        if (w >= 5 && w <= 10) return "1";
        if (w > 10 && w <= 12) return "2";
        if (w > 12 && w <= 14) return "3";
        if (w > 14 && w <= 16) return "4";
        if (w > 16 && w <= 18) return "5";
        if (w > 18 && w <= 20) return "6";
        if (w > 20 && w <= 22) return "7";
        if (w > 22 && w <= 25) return "8";
        if (w > 25 && w <= 30) return "10";
        if (w > 30 && w <= 35) return "12";
        if (w > 35 && w <= 40) return "14";
        if (w > 40 && w <= 48) return "S";
        if (w > 48 && w <= 55) return "M";
        if (w > 55 && w <= 62) return "L";
        if (w > 62 && w <= 70) return "XL";
        return "2XL";
    },

    formatReply: (reply, session, globalInventory = null) => {
        if (!reply) return "";
        let finalReply = reply;
        
        const entities = session.entities || {};
        const { productCode, weight, phone, address } = entities;
        const inventory = (globalInventory && globalInventory.inventory) ? globalInventory.inventory : (globalInventory || {});

        // A. Xử lý Địa chỉ & SĐT
        finalReply = finalReply.replace(/{{dia_chi}}|{address}/g, address || "địa chỉ cũ của Mẹ");
        finalReply = finalReply.replace(/{{sdt}}|{phone}/g, phone || "số điện thoại nhen");

        // B. Xử lý Mã hàng
        const code = productCode ? String(productCode).toUpperCase() : null;
        finalReply = finalReply.replace(/{productCode}|{{ma_hang}}/g, code || "mẫu này");

        // C. Xử lý Size
        const size = weight ? helpers.mapWeightToSize(weight) : null;
        finalReply = finalReply.replace(/{size}|{{size}}/g, size ? `Size ${size}` : "size chuẩn");

        // D. Xử lý Ảnh
        if (finalReply.includes("{image_link}")) {
            const img = (code && inventory[code]) ? inventory[code].image : null;
            finalReply = finalReply.replace(/{image_link}/g, img ? `📸 Ảnh: ${img}` : "tại kho nhen!");
        }

        // --- E. FIX NÚT BẤM DÀI & LẶP ICON ---
        // 1. Dọn dẹp icon ✨ bị nhân đôi (lỗi trong ảnh Đạt gửi)
        finalReply = finalReply.replace(/✨\s*✨/g, '✨');

        // 2. Ép cấu trúc [Label|Command] - Xóa khoảng trắng để nút co lại tối đa
        finalReply = finalReply.replace(/\[\s*([^\]|]+)\s*\|\s*([^\]]+)\s*\]/g, (match, label, command) => {
            return `[${label.trim()}|${command.trim()}]`;
        });

        return finalReply.replace(/\s\s+/g, ' ').trim();
    }
};

module.exports = helpers;
