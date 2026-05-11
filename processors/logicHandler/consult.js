const helpers = require('../../utils/helpers');

const consultHandler = {
    handle: async (session, message, dimConfig, retainConfig = [], globalInventory = null) => {
        // --- 1. GHI NHẬN LỘ TRÌNH (Giữ nguyên của Đạt) ---
        if (session.executionPath && !session.executionPath.includes("logicHandler/consult.js")) {
            session.executionPath.push("logicHandler/consult.js");
        }

        // --- 2. KHAI BÁO BIẾN & DỮ LIỆU CƠ BẢN ---
        const text = (message || "").toLowerCase().trim();
        const cleanText = helpers.removeAccents(text);

        const inventoryData = globalInventory || {};
        const inventory = inventoryData.inventory || inventoryData; 
        
        const pCode = session.entities?.productCode;
        const selectedGroup = session.entities?.group;
        const userWeight = session.entities?.weight;
        const recommendedSize = userWeight && helpers.mapWeightToSize ? helpers.mapWeightToSize(userWeight) : null;

        const dynamicGroups = (typeof inventory === 'object') 
            ? [...new Set(Object.values(inventory).map(item => item.group).filter(Boolean))]
            : [];
        const groupNamesClean = dynamicGroups.map(g => helpers.removeAccents(g.toLowerCase()).trim());

        // --- 3. BƯỚC QUÉT EXCEL TƯ VẤN (RETAIN - Giữ nguyên logic cũ) ---
        let bestMatch = { weight: 0, template: "" };
        if (retainConfig && retainConfig.length > 0) {
            const isAskingGroup = groupNamesClean.includes(cleanText);
            if (!isAskingGroup) {
                retainConfig.forEach(row => {
                    const rawKeywords = String(row.keywords || ""); 
                    if (!rawKeywords.trim()) return;
                    const keywords = rawKeywords.split(',').map(k => k.trim().toLowerCase());
                    const isMatch = keywords.some(k => {
                        const kw = k.trim();
                        return text.includes(kw) || cleanText.includes(helpers.removeAccents(kw));
                    });
                    if (isMatch && (Number(row.weight) || 0) > bestMatch.weight) {
                        bestMatch.weight = Number(row.weight);
                        bestMatch.template = row.template || row.Template;
                    }
                });
            }
        }

        if (bestMatch.template) {
            let finalReply = bestMatch.template;
            if (userWeight) finalReply = finalReply.replace(/{weight}/g, userWeight);
            if (recommendedSize) {
                finalReply = finalReply.replace(/{size}/g, recommendedSize);
                if (!bestMatch.template.includes("{size}")) {
                    finalReply += `\n(Bé mặc **Size ${recommendedSize}** là vừa in luôn Mẹ nhen! ❤️)`;
                }
            }
            if (pCode && inventory[pCode]) {
                finalReply = finalReply
                    .replace(/{productCode}/g, pCode)
                    .replace(/{product_price}/g, inventory[pCode].price || "giá cực tốt");
            }
            return { reply: finalReply };
        }

        // --- 4. CÁC TRƯỜNG HỢP TƯ VẤN MẪU/NHÓM THEO KHO HÀNG ---
        // Hàm lấy ảnh Drive - Giữ nguyên 100% logic hiển thị của Đạt
        const getDirectImgLink = (url) => {
            if (!url) return "";
            if (url.includes('drive.google.com')) {
                const match = url.match(/\/d\/(.+?)\/(?:view|edit)?/);
                if (match && match[1]) return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w600`;
            }
            return url;
        };

        // A. Trường hợp hỏi mã cụ thể
        if (pCode && inventory[pCode]) {
            const product = inventory[pCode];
            let reply = `Dạ mẫu **${pCode} - ${product.name}** cực xinh đây ạ!\n\n`;
            if (product.image) reply += `<img src="${getDirectImgLink(product.image)}" style="width:100%; max-width:250px; border-radius:10px; margin-bottom:10px;"><br>\n`;
            reply += `💰 **Giá:** ${product.price}\n`;
            if (product.category) reply += `📏 **Size:** ${product.category}\n`;
            reply += `\n------------------\n👉 [ACTION_ADD:${pCode}]`; 
            return { reply: reply };
        }

        // B. Trường hợp chọn nhóm hàng
        if (selectedGroup) {
            const filteredCodes = Object.keys(inventory).filter(code => {
                const item = inventory[code];
                if (!item.group) return false;
                const isGroupMatch = helpers.removeAccents(item.group.toLowerCase()).trim() === helpers.removeAccents(selectedGroup.toLowerCase()).trim();
                if (isGroupMatch && recommendedSize) {
                    return String(item.category || "").includes(String(recommendedSize));
                }
                return isGroupMatch;
            });

            if (filteredCodes.length > 0) {
                let listReply = `🌟 **CÁC MẪU ${selectedGroup.toUpperCase()} ${recommendedSize ? `(SIZE ${recommendedSize})` : ""} ĐANG CÓ** 🌟\n\n`;
                
                filteredCodes.slice(0, 6).forEach(code => {
                    const item = inventory[code];
                    if (item.image) listReply += `<img src="${getDirectImgLink(item.image)}" style="width:70px; height:70px; object-fit:cover; border-radius:8px; float:left; margin-right:12px; margin-bottom:15px;">`;
                    listReply += `🔹 **Mã: ${code}**\n👕 ${item.name}\n💰 Giá: **${item.price}**\n👉 [ACTION_ADD:${code}]\n`; 
                    listReply += `<div style="clear:both; margin-bottom:10px; border-bottom:1px dashed #eee;"></div>`;
                });
                
                listReply += `\n🛒 Mẹ ưng mẫu nào bấm nút **CHỌN** ở trên nhen!\nHoặc bấm xem 🛒 [ACTION_VIEW_CART] để em lên đơn ạ.`; 
                if (session.entities) {
                    delete session.entities.group; 
                }
                return { reply: listReply };
            } else if (recommendedSize) {
                return { reply: `Dạ hiện tại nhóm **${selectedGroup}** em đang tạm hết size ${recommendedSize} cho bé ${userWeight}kg rồi ạ. Mẹ xem thử nhóm khác nhen! ✨` };
            }
        }

// --- C. Mặc định hiện Menu Nhóm hàng ---
if (dynamicGroups.length > 0) {
    let welcomeText = `Dạ shop Hương Kid chào Mẹ! ❤️`;
    let sizeConsult = (userWeight && recommendedSize) 
        ? `\nBé **${userWeight}kg** mặc **Size ${recommendedSize}** là vừa in luôn nhen.\nGiờ Mẹ muốn xem nhóm nào để em lọc size ạ:\n\n`
        : `\nMẹ xem nhóm hàng nào thì bấm nút dưới đây nhen:\n\n`;

    // Tạo khối nút bấm
    let buttonRows = "";
    dynamicGroups.forEach((g, index) => {
        buttonRows += `[${g.toUpperCase()}]   `;
        if ((index + 1) % 2 === 0) buttonRows += "\n\n";
    });

    // 🔥 MẸO ÉP DÒNG CHÚ THÍCH XUỐNG DƯỚI CÙNG
    // Mình dùng \n. để tạo một điểm dừng, sau đó mới đến dòng chú thích
    let finalNote = `\n.\n\n*(Mẹ bấm vào nút để xem mẫu đúng size ạ!)*`;

    let menuReply = `${welcomeText}${sizeConsult}${buttonRows.trim()}${finalNote}`;
    
    return { reply: menuReply };
}
        return { reply: `Dạ shop Hương Kid chào Mẹ! Mẹ nhắn "Bé trai" hoặc "Bé gái" để em gửi mẫu mới nhen!` };
    }
};

module.exports = consultHandler;