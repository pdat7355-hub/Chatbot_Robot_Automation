const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');

const auth = new JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: process.env.GOOGLE_PRIVATE_KEY ? process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n') : null,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

// Biến lưu trữ bộ nhớ đệm (Cache)
let cachedData = {
    shopProfile: "",
    khoHang: "",
    lastUpdate: 0
};

// Cấu hình thời gian làm mới (ví dụ: 10 phút = 600.000 ms)
const CACHE_TIMEOUT = 10 * 60 * 1000;

async function getAppData() {
    const now = Date.now();

    // Nếu đã có dữ liệu trong RAM và chưa quá 10 phút thì trả về luôn, không gọi Google nữa
    if (cachedData.khoHang && (now - cachedData.lastUpdate < CACHE_TIMEOUT)) {
        console.log("⚡ Lấy dữ liệu từ Bộ nhớ đệm (Fast Cache)");
        return { 
            shopProfile: cachedData.shopProfile, 
            khoHang: cachedData.khoHang 
        };
    }

    console.log("🔄 Đang cập nhật dữ liệu mới từ Google Sheets...");
    try {
        // 1. Lấy thông tin Shop
        const docInfo = new GoogleSpreadsheet(process.env.ID_FILE_INFO, auth);
        await docInfo.loadInfo();
        const infoRows = await docInfo.sheetsByIndex[0].getRows();
        const shopProfile = infoRows.map(r => `${r.get('Hạng mục')}: ${r.get('Nội dung')}`).join('\n');

        // 2. Lấy danh sách Kho hàng (Xử lý được hàng ngàn dòng)
        const docProd = new GoogleSpreadsheet(process.env.ID_FILE_PRODUCT, auth);
        await docProd.loadInfo();
        const prodRows = await docProd.sheetsByIndex[0].getRows();
        
        // Dùng mảng để xử lý nhanh hơn
        const khoHang = prodRows.map(r => 
            `- SP: ${r.get('Tên')} | Giá: ${r.get('Giá')} | Size: ${r.get('Size')} | LinkAnh: ${r.get('Ảnh') || ''}`
        ).join('\n');

        // Lưu vào bộ nhớ đệm
        cachedData = {
            shopProfile,
            khoHang,
            lastUpdate: now
        };

        return { shopProfile, khoHang };
    } catch (err) {
        console.error("❌ Lỗi đọc Sheets:", err.message);
        // Nếu lỗi mà trong cache vẫn có dữ liệu cũ thì dùng tạm dữ liệu cũ
        return { 
            shopProfile: cachedData.shopProfile || "", 
            khoHang: cachedData.khoHang || "" 
        };
    }
}

// Hàm lưu nhập kho
async function addProduct(parts) {
    try {
        const docProd = new GoogleSpreadsheet(process.env.ID_FILE_PRODUCT, auth);
        await docProd.loadInfo();
        const sheet = docProd.sheetsByIndex[0];

        await sheet.addRow({
            'Tên': parts[0],
            'Giá': parts[1],
            'Size': parts[2],
            'Ảnh': parts[3] || ''
        });

        // Xóa cache để AI cập nhật hàng mới ngay lập tức
        cachedData.khoHang = ""; 
        return true;
    } catch (err) {
        console.error(err);
        return false;
    }
}


// Hàm lưu đơn hàng (Cái này không cache vì phải ghi thực tế)
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
        console.log("✅ Đã lưu đơn hàng mới!");
    } catch (err) {
        console.error("❌ Lỗi lưu đơn:", err.message);
    }
}




module.exports = { getAppData, saveOrder, addProduct };
