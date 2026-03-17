const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');

const auth = new JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: process.env.GOOGLE_PRIVATE_KEY ? process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n') : null,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

async function getAppData() {
    try {
        const docInfo = new GoogleSpreadsheet(process.env.ID_FILE_INFO, auth);
        await docInfo.loadInfo();
        const infoRows = await docInfo.sheetsByIndex[0].getRows();
        const shopProfile = infoRows.map(r => `${r.get('Hạng mục')}: ${r.get('Nội dung')}`).join('\n');

        const docProd = new GoogleSpreadsheet(process.env.ID_FILE_PRODUCT, auth);
        await docProd.loadInfo();
        const prodRows = await docProd.sheetsByIndex[0].getRows();
        const khoHang = prodRows.map(r => 
            `- SP: ${r.get('Tên')} | Giá: ${r.get('Giá')} | Size: ${r.get('Size')} | LinkAnh: ${r.get('Ảnh') || ''}`
        ).join('\n');

        return { shopProfile, khoHang };
    } catch (err) { return { shopProfile: "", khoHang: "" }; }
}

async function saveOrder(parts) {
    const docOrder = new GoogleSpreadsheet(process.env.ID_FILE_ORDER, auth);
    await docOrder.loadInfo();
    const orderSheet = docOrder.sheetsByIndex[0];
    await orderSheet.addRow({
        'Thời gian': new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }),
        'Tên khách': parts[0],
        'Sản phẩm': parts[1],
        'Số điện thoại': parts[2],
        'Ghi chú (nếu có)': parts[3]
    });
}

module.exports = { getAppData, saveOrder };
