const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');

const auth = new JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: process.env.GOOGLE_PRIVATE_KEY ? process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n') : null,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

let cachedData = { shopProfile: "", khoHang: "", lastUpdate: 0 };
const CACHE_TIMEOUT = 10 * 60 * 1000;

// HÀM LẤY DỮ LIỆU (Giữ nguyên logic của Đạt)
async function getAppData() {
    const now = Date.now();
    if (cachedData.khoHang && (now - cachedData.lastUpdate < CACHE_TIMEOUT)) {
        return { shopProfile: cachedData.shopProfile, khoHang: cachedData.khoHang };
    }
    try {
        const docInfo = new GoogleSpreadsheet(process.env.ID_FILE_INFO, auth);
        await docInfo.loadInfo();
        const infoRows = await docInfo.sheetsByIndex[0].getRows();
        const shopProfile = infoRows.map(r => `${r.get('Hạng mục')}: ${r.get('Nội dung')}`).join('\n');

        const docProd = new GoogleSpreadsheet(process.env.ID_FILE_PRODUCT, auth);
        await docProd.loadInfo();
        const prodRows = await docProd.sheetsByIndex[0].getRows();
        const khoHang = prodRows.map(r => `- SP: ${r.get('Tên')} | Giá: ${r.get('Giá')} | Size: ${r.get('Size')} | LinkAnh: ${r.get('Ảnh') || ''}`).join('\n');

        cachedData = { shopProfile, khoHang, lastUpdate: now };
        return { shopProfile, khoHang };
    } catch (err) {
        return { shopProfile: cachedData.shopProfile || "", khoHang: cachedData.khoHang || "" };
    }
}

/**
 * HÀM LƯU NHẬP KHO (Đã đổi tên thành saveToSheets để khớp với app.js)
 */
async function saveToSheets(product) {
    try {
        // ID_FILE_PRODUCT là ID của file chứa danh sách sản phẩm
        const docProd = new GoogleSpreadsheet(process.env.ID_FILE_PRODUCT, auth);
        await docProd.loadInfo();
        const sheet = docProd.sheetsByIndex[0];

        // LƯU Ý: Chữ 'Tên', 'Giá', 'Size'... bên trái PHẢI khớp 100% với dòng 1 của Sheet
        await sheet.addRow({
            'Tên': product.ten || 'Chưa rõ tên',
            'Giá': product.gia || '0',
            'Size': product.size || 'Đủ size',
            'Mô tả': product.mota || 'Hàng mới về cho bé',
            'Ảnh': product.anh || ''
        });

        // Xóa cache để chatbot cập nhật ngay hàng mới vừa nhập
        cachedData.khoHang = ""; 
        console.log("✅ Ghi Sheets thành công!");
        return true;
    } catch (err) {
        console.error("❌ Lỗi ghi Sheets chi tiết:", err.message);
        throw err; // Ném lỗi ra để app.js bắt được
    }
}

// Hàm lưu đơn hàng
async function saveOrder(parts) {
    try {
        const docOrder = new GoogleSpreadsheet(process.env.ID_FILE_ORDER, auth);
        await docOrder.loadInfo();
        const orderSheet = docOrder.sheetsByIndex[0];
        await orderSheet.addRow({
            'Thời gian': new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }),
            'Tên khách': parts[0],
            'Sản phẩm': parts[1],
            'Số điện thoại': parts[2],
            'Địa chỉ': parts[3]
        });
    } catch (err) {
        console.error("❌ Lỗi lưu đơn:", err.message);
    }
}

// Xuất khẩu đúng tên hàm app.js cần
module.exports = { getAppData, saveOrder, saveToSheets };
