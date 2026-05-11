// processors/recognizer.js
const googleSheets = require('../services/googleSheets');

/**
 * Hàm nhận diện khách hàng từ Excel
 * Trả về session đã được nạp dữ liệu cũ (nếu có)
 */
async function identify(userId, session) {
    // 1. Nếu đã nhận diện trong phiên này rồi thì thôi
    if (!session || session.isRecognized) return session;

    try {
        // Tìm thông tin khách trong Sheet bằng userId
        const customerData = await googleSheets.findCustomerById(userId);

        if (customerData) {
            if (!session.entities) session.entities = {};

            // Dữ liệu từ Excel làm "nền"
            const excelData = {
                name: customerData.Ho_Ten || "",
                phone: String(customerData.SDT || ""),
                address: customerData.Dia_Chi || "",
                weight: customerData.Can_Nang_1 || customerData.Can_Nang || "",
            };

            /**
             * CƠ CHẾ GỘP DỮ LIỆU AN TOÀN:
             * - Nếu trong Session hiện tại đang trống (null/rỗng), ta mới lấy từ Excel đắp vào.
             * - Nếu Session hiện tại đã có dữ liệu (do khách vừa nhắn), ta giữ nguyên dữ liệu đó.
             * - Tuyệt đối không để giá trị rỗng từ tin nhắn mới ghi đè lên giá trị đã có từ Excel.
             */
            for (const key in excelData) {
                const currentValue = session.entities[key];
                const hasNoCurrentValue = !currentValue || currentValue === "" || currentValue === "null";

                if (hasNoCurrentValue && excelData[key] !== "") {
                    session.entities[key] = excelData[key];
                }
            }

            // Đồng bộ ngược lại các biến trực tiếp trên session để các file khác dễ dùng
            session.phone = session.entities.phone;
            session.address = session.entities.address;
            session.weight = session.entities.weight;

            // Đánh dấu đã nhận diện thành công
            session.isRecognized = true;
            
            console.log(`\x1b[32m🔍 [Recognizer] Khách quen quay lại: ${session.entities.name || userId} (${session.entities.weight}kg)\x1b[0m`);
        } else {
            // Khách mới hoàn toàn
            session.isRecognized = true; 
            console.log(`🔍 [Recognizer] Khách mới hoàn toàn: ${userId}`);
        }
    } catch (err) {
        console.error("❌ [Recognizer Error]:", err.message);
    }

    return session;
}

module.exports = { identify };