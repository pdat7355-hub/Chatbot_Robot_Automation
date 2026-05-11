const googleSheets = require('../../services/googleSheets');
const helpers = require('../../utils/helpers');
const { buildCartReply } = require('../cartFormatter');

const conversionHandler = {
            handle: async (session, message, dimConfig, retainConfig = [], globalInventory = null, sessionManager = null) => {
                try {
                    // Lấy ID từ mọi nguồn có thể trong object session
                    const userId = session?.id || session?.userId || session?.sessionId;
                    
                    console.log("🎯 [DEBUG] ID chốt chặn cuối cùng:", userId);
                    if (!userId || userId === "undefined") {
                    console.error("❌ Lỗi: Vẫn không tìm thấy ID khách hàng!");
                    return { reply: "Dạ, đợi em xíu em kiểm tra lại mã khách nhen!" };
                }

            const rawText = (message || "").trim();
            const textLower = rawText.toLowerCase();
            const inventory = globalInventory?.inventory || globalInventory || {};

// =========================================================
            // 🚨 ƯU TIÊN SỐ 1: CHỐT ĐƠN & CẬP NHẬT THÔNG TIN KHÁCH
            // =========================================================
            if (rawText.includes("ACTION_SUBMIT_FORM")) {
                console.log("🚀 Phát hiện mã chốt đơn từ Form!");

                const nameMatch = rawText.match(/Tên:\s*(.*?)\s*,/i);
                const phoneMatch = rawText.match(/SĐT:\s*(.*?)\s*,/i);
                const ageMatch = rawText.match(/Bé\s*(.*?)\s*,/i);
                const weightMatch = rawText.match(/Nặng\s*([\d\.,\s]*)/i);
                const addressMatch = rawText.match(/Địa chỉ:\s*(.*?)\s*ACTION_SUBMIT_FORM/i);

                const dataForExcel = {
                    userId: userId,
                    name: nameMatch ? nameMatch[1].trim() : "",
                    phone: phoneMatch ? phoneMatch[1].trim() : "",
                    age: ageMatch ? ageMatch[1].trim() : "",
                    weight: weightMatch ? weightMatch[1].trim() : "",
                    address: addressMatch ? addressMatch[1].trim() : ""
                };

                // ✅ CẬP NHẬT VÀO BỘ NHỚ ROBOT (SESSION) - QUAN TRỌNG NHẤT
                session.phone = dataForExcel.phone;
                session.address = dataForExcel.address;
                session.weight = dataForExcel.weight;
                session.name = dataForExcel.name;

                // Cập nhật cả vào entities để Phần 4 kiểm tra chính xác
                if (!session.entities) session.entities = {};
                session.entities.phone = dataForExcel.phone;
                session.entities.address = dataForExcel.address;
                session.entities.weight = dataForExcel.weight;

                // ✅ GỌI ĐỒNG BỘ SANG EXCEL (Chỉ cần 1 lần trong try...catch)
                try {
                    if (session.id && (dataForExcel.phone || dataForExcel.name)) {
                        await googleSheets.syncCustomerToExcel(session.id, dataForExcel); 
                    }
                } catch (error) {
                    console.error("❌ Lỗi khi đồng bộ khách hàng:", error);
                }

                // 3. Ghi đơn hàng vào Sheet 'khachhang'
                if (session.cart?.length > 0) {
                    const cartCodes = session.cart.map(i => `${i.code}(S:${i.size})`).join(", ");
                    const rowOrder = [
                        new Date().toLocaleString("vi-VN", {timeZone: "Asia/Ho_Chi_Minh"}),
                        `DH_${Date.now()}`, 
                        dataForExcel.phone, 
                        dataForExcel.address, 
                        cartCodes, 
                        "Đã chốt từ Form", 
                        dataForExcel.weight + "kg", 
                        `${session.totals?.finalTotal || 0}đ`
                    ];

                    const success = await googleSheets.appendRow('khachhang', rowOrder);
                    
                    if (success) {
                        session.cart = []; // Reset giỏ hàng sau khi chốt
                        return { 
                            reply: `🎉 **XÁC NHẬN CHỐT ĐƠN THÀNH CÔNG!**\n\nShop Hương Kid đã ghi nhận thông tin của Mẹ **${dataForExcel.name}**. Đơn hàng sẽ được gửi đến **${dataForExcel.address}** sớm nhất ạ. Cảm ơn Mẹ! ❤️` 
                        };
                    }
                } else {
                    return { reply: "⚠️ Giỏ hàng trống, Mẹ chọn mẫu trước nhen!" };
                }
            }
            // =========================================================
            // 🛑 BƯỚC 2: LẤY DỮ LIỆU CŨ ĐỂ HIỂN THỊ (NẾU CHƯA CHỐT)
            // =========================================================
            const phone = session.phone || session.entities?.phone || "";
            const address = session.address || session.entities?.address || "";
            const weight = session.weight || session.entities?.weight || "";

            // ... (Giữ nguyên Phần 2: Nút bấm và Phần 3: Excel của file trước) ...
            const isButtonAction = rawText.includes("ACTION_");
            const excelRow = dimConfig.find(row => {
                const kws = String(row.keywords || "").split(',').map(k => k.trim().toLowerCase());
                return kws.some(k => k && textLower.includes(k));
            });

            if (isButtonAction) {
                // ... (Logic giỏ hàng giữ nguyên)
                if (!Array.isArray(session.cart)) session.cart = [];
                if (rawText.includes("ACTION_ADD:")) {
                    const code = rawText.split("ACTION_ADD:")[1]?.trim().split(/\s/)[0].toUpperCase();
                    if (inventory[code] && !session.cart.find(i => i.code === code)) {
                        session.cart.push({ code, name: inventory[code].name, price: inventory[code].price, size: session.entities?.size || "10" });
                    }
                }
                if (rawText.includes("ACTION_REMOVE:")) {
                    const code = rawText.split("ACTION_REMOVE:")[1]?.trim().split(/\s/)[0].toUpperCase();
                    session.cart = session.cart.filter(item => item.code !== code);
                }
                return { reply: buildCartReply(session, "✅ Hệ thống đã cập nhật giỏ hàng cho Mẹ:", inventory) };
            }

            if (excelRow) return { reply: excelRow.template || excelRow.Template };

            // =========================================================
            // 🎯 PHẦN 4: LUỒNG BẤM NÚT XÁC NHẬN (KIỂM TRA THÔNG TIN)
            // =========================================================
            if (textLower.includes("xác nhận") || textLower.includes("xac nhan") || rawText.includes("ACTION_CONFIRM")) {
                
                // Đã đủ thông tin -> Chốt luôn
                if (phone && address && weight && session.cart?.length > 0) {
                    const cartCodes = session.cart.map(i => `${i.code}(S:${i.size})`).join(", ");
                    const rowData = [
                        new Date().toLocaleString("vi-VN", {timeZone: "Asia/Ho_Chi_Minh"}),
                        `DH${Date.now()}`, phone, address, cartCodes, "Đã chốt", weight, `${session.totals?.finalTotal || 0}đ`
                    ];
                    const success = await googleSheets.appendRow('khachhang', rowData);
                    if (success) {
                        session.cart = [];
                        return { reply: `🎉 **ĐẶT HÀNG THÀNH CÔNG!**\n\nĐơn hàng của Mẹ đã được ghi lại thành công ạ! ❤️` };
                    }
                } 
                // Thiếu thông tin -> Hiện Form (Dữ liệu cũ sẽ được nạp vào ${weight}|${phone}|${address})
                else if (session.cart?.length > 0) {
                    return {
                        reply: `⚠️ Thông tin của Mẹ còn thiếu một chút, Mẹ kiểm tra lại và bổ sung nhé:\n\n[[SHOW_ORDER_FORM|${weight}|${phone}|${address}]]`
                    };
                }
            }

            // Mặc định hiện giỏ hàng
            if (session.cart?.length > 0) {
                return { reply: buildCartReply(session, "🌸 **GIỎ HÀNG HIỆN TẠI**", inventory) };
            }

            return null;

        } catch (err) {
            console.error("❌ Lỗi tại conversion.js:", err);
            return null;
        }
    }
};

module.exports = conversionHandler;