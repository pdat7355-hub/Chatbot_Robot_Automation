const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');

const auth = new JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

async function getInventory() {
    const doc = new GoogleSpreadsheet(process.env.ID_FILE_PRODUCT, auth);
    await doc.loadInfo();
    const rows = await doc.sheetsByIndex[0].getRows();
    return rows.map(r => `${r.get('Tên')} - ${r.get('Giá')}`).join('\n');
}

async function saveOrder(orderData) {
    const doc = new GoogleSpreadsheet(process.env.ID_FILE_ORDER, auth);
    await doc.loadInfo();
    await doc.sheetsByIndex[0].addRow(orderData);
}

module.exports = { getInventory, saveOrder };
