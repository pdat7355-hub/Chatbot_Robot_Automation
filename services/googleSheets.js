const { google } = require('googleapis');
require('dotenv').config();

const auth = new google.auth.GoogleAuth({
    credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY ? process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n') : undefined,
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });
const SPREADSHEET_ID = process.env.GOOGLE_ID;

// --- CẤU HÌNH VỊ TRÍ CỘT (CHỈ CẦN SỬA Ở ĐÂY) ---
const COLUMN_MAP = {
    USER_ID: 0,      // Cột A
    HO_TEN: 1,       // Cột B
    SDT: 2,          // Cột C
    DIA_CHI: 3,      // Cột D
    SO_CHAU: 4,      // Cột g
    TEN_BE_1: 5,       // Cột E
    TUOI_BE_1: 6,      // Cột F
    CAN_NANG_1: 7,   // Cột H
    TEN_BE_2: 8,       // Cột E
    TUOI_BE_2: 9,      // Cột F
    CAN_NANG_2: 10,  // Cột K
    TEN_BE_3: 11,       // Cột E
    TUOI_BE_3: 12,      // Cột F
    CAN_NANG_3: 13,  // Cột N
    LOG_TIME: 15     // Cột P
};

// Hàm hỗ trợ chuyển số thứ tự cột thành chữ cái (0 -> A, 15 -> P)
const columnToLetter = (column) => {
    let temp, letter = '';
    while (column > 0) {
        temp = (column - 1) % 26;
        letter = String.fromCharCode(temp + 65) + letter;
        column = (column - temp - 1) / 26;
    }
    return letter || 'A';
};

// Tự động tính toán cột xa nhất để lấy dữ liệu
const MAX_COL_INDEX = Math.max(...Object.values(COLUMN_MAP));
const AUTO_RANGE = `DANH_SACH_KHACH!A:${columnToLetter(MAX_COL_INDEX + 1)}`;

const googleSheets = {
 

    // --- 1. TRA CỨU KHÁCH HÀNG (Đã dùng AUTO_RANGE) ---
    findCustomerById: async (userId) => {
        try {
            const res = await sheets.spreadsheets.values.get({
                spreadsheetId: SPREADSHEET_ID,
                range: AUTO_RANGE,
            });
            const rows = res.data.values;
            if (!rows || rows.length <= 1) return null;

            const rowIndex = rows.findIndex(row => row[COLUMN_MAP.USER_ID] === userId);
            if (rowIndex !== -1) {
                const row = rows[rowIndex];
                return {
                    Ho_Ten: row[COLUMN_MAP.HO_TEN] || "",
                    SDT: row[COLUMN_MAP.SDT] || "",
                    Dia_Chi: row[COLUMN_MAP.DIA_CHI] || "",
                    Can_Nang_1: row[COLUMN_MAP.CAN_NANG_1] ||row[COLUMN_MAP.CAN_NANG_2] ||row[COLUMN_MAP.CAN_NANG_3] || row[COLUMN_MAP.CAN_NANG_OLD] || ""
                };
            }
            return null;
        } catch (error) {
            console.error("❌ Lỗi tìm khách hàng:", error.message);
            return null;
        }
    },

// --- 2. ĐỒNG BỘ KHÁCH HÀNG (Tối ưu logic Update & Append) ---
syncCustomerToExcel: async (userId, data) => {
    // CHỐT CHẶN: Chỉ chặn khi hoàn toàn không có định danh (userId)
    // Cho phép data rỗng để khởi tạo dòng mới cho khách vừa nhắn tin
    if (!userId || userId === "undefined") {
        console.error("🛑 [Sheets] Từ chối đồng bộ: Không có User_ID");
        return;
    }

    try {
        // Lấy dữ liệu hiện tại từ Sheet
        const res = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: 'DANH_SACH_KHACH!A:P', 
        });
        
        const rows = res.data.values || [];
        // Tìm dòng dựa trên User_ID (Cột A - index 0)
        const rowIndex = rows.findIndex(row => row[COLUMN_MAP.USER_ID] === userId);
        const now = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });

        if (rowIndex !== -1) {
            // ==========================================
            // CASE 1: KHÁCH CŨ - Cập nhật dòng hiện tại
            // ==========================================
            
            // CHẶN CẬP NHẬT RỖNG: Nếu khách cũ nhắn tin mà không có thông tin mới thì không ghi đè
            if (!data || (!data.name && !data.phone && !data.address && !data.weight)) {
                return; 
            }

            let updatedRow = [...rows[rowIndex]];
            while (updatedRow.length <= MAX_COL_INDEX) updatedRow.push("");

            // 1. Cập nhật thông tin cơ bản
            if (data.name) updatedRow[COLUMN_MAP.HO_TEN] = data.name;
            if (data.phone) updatedRow[COLUMN_MAP.SDT] = data.phone;
            if (data.address) updatedRow[COLUMN_MAP.DIA_CHI] = data.address;

            // 2. Xử lý logic thông tin Bé (1, 2, hoặc 3)
            let soChau = parseInt(updatedRow[COLUMN_MAP.SO_CHAU]) || 1;
            
            const childFields = {
                1: { name: COLUMN_MAP.TEN_BE_1, age: COLUMN_MAP.TUOI_BE_1, weight: COLUMN_MAP.CAN_NANG_1 },
                2: { name: COLUMN_MAP.TEN_BE_2, age: COLUMN_MAP.TUOI_BE_2, weight: COLUMN_MAP.CAN_NANG_2 },
                3: { name: COLUMN_MAP.TEN_BE_3, age: COLUMN_MAP.TUOI_BE_3, weight: COLUMN_MAP.CAN_NANG_3 }
            };

            const currentChild = childFields[soChau];
            if (data.name) updatedRow[currentChild.name] = data.name;
            if (data.age) updatedRow[currentChild.age] = data.age;
            if (data.weight) updatedRow[currentChild.weight] = data.weight;

            updatedRow[COLUMN_MAP.LOG_TIME] = now;

            await sheets.spreadsheets.values.update({
                spreadsheetId: SPREADSHEET_ID,
                range: `DANH_SACH_KHACH!A${rowIndex + 1}`,
                valueInputOption: 'USER_ENTERED',
                resource: { values: [updatedRow] },
            });
            console.log(`✅ [Sheets] Đã cập nhật khách cũ: ${userId}`);

        } else {
            // ==========================================
            // CASE 2: KHÁCH MỚI - Tạo dòng mới (Mỏ neo)
            // ==========================================
            const newRow = new Array(MAX_COL_INDEX + 1).fill("");
            
            newRow[COLUMN_MAP.USER_ID] = userId;
            newRow[COLUMN_MAP.HO_TEN] = data?.name || "";
            newRow[COLUMN_MAP.SDT] = data?.phone || "";
            newRow[COLUMN_MAP.DIA_CHI] = data?.address || "";
            newRow[COLUMN_MAP.SO_CHAU] = "1"; 

            // Khởi tạo thông tin bé 1 nếu có
            newRow[COLUMN_MAP.TEN_BE_1] = data?.name || "";
            newRow[COLUMN_MAP.TUOI_BE_1] = data?.age || ""; 
            newRow[COLUMN_MAP.CAN_NANG_1] = data?.weight || "";

            newRow[COLUMN_MAP.LOG_TIME] = now;

            await sheets.spreadsheets.values.append({
                spreadsheetId: SPREADSHEET_ID,
                range: 'DANH_SACH_KHACH!A1',
                valueInputOption: 'USER_ENTERED',
                resource: { values: [newRow] },
            });
            console.log(`✅ [Sheets] Đã khởi tạo khách mới: ${userId}`);
        }
    } catch (error) {
        console.error("❌ Lỗi đồng bộ Excel:", error.message);
    }
},
   // --- 3. LẤY KHO HÀNG (GIỮ NGUYÊN) ---
    getInventoryData: async () => {
        try {
            const res = await sheets.spreadsheets.values.get({
                spreadsheetId: SPREADSHEET_ID,
                range: 'KhoHang!A:Z',
            });
            const rows = res.data.values;
            if (!rows || rows.length <= 1) return { inventory: {}, groups: [] };

            const header = rows[0];
            const inventory = {};
            const groupSet = new Set(); 

            const getVal = (row, colName) => {
                const index = header.findIndex(h => h.trim().toLowerCase() === colName.toLowerCase());
                return (index !== -1 && row[index]) ? row[index].toString().trim() : "";
            };

            rows.slice(1).forEach(row => {
                const code = getVal(row, "Code").toUpperCase();
                const groupName = getVal(row, "Group");
                if (code) {
                    inventory[code] = {
                        code,
                        name: getVal(row, "Name"),
                        group: groupName, 
                        category: getVal(row, "category"), 
                        price: getVal(row, "Price"),
                        image: getVal(row, "Image"),
                        description: getVal(row, "Mô tả chi tiết")
                    };
                    if (groupName) groupSet.add(groupName);
                }
            });
            return { inventory, groups: Array.from(groupSet) }; 
        } catch (error) {
            return { inventory: {}, groups: [] };
        }
    },
    // --- 4. LẤY DỮ LIỆU CẤU HÌNH (DIMENSIONS) ---
    getDimensions: async () => {
        try {
            const res = await sheets.spreadsheets.values.get({
                spreadsheetId: SPREADSHEET_ID,
                range: 'Dimensions!A:I',
            });
            const rows = res.data.values;
            if (!rows || rows.length <= 1) return [];
            
            return rows.slice(1).map(row => ({
                id: row[0],
                name: row[1],
                keywords: row[2] ? row[2].split(',').map(k => k.trim()) : [],
                exclude: row[3] ? row[3].split(',').map(k => k.trim()) : [],
                regex: row[4] || null,
                weight: parseInt(row[5]) || 0,
                position: row[6] || 'Body',
                template: row[7] || '',
                zone: row[8] || 'RETAIN'
            }));
        } catch (error) {
            console.error("❌ Lỗi tải Dimensions:", error.message);
            return [];
        }
    },

    // --- 5. GHI DÒNG MỚI (LƯU ĐƠN HÀNG/LOG) ---
    appendRow: async (sheetName, rowData) => {
        try {
            await sheets.spreadsheets.values.append({
                spreadsheetId: SPREADSHEET_ID,
                range: `${sheetName}!A:Z`, 
                valueInputOption: 'USER_ENTERED',
                resource: { values: [rowData] },
            });
            console.log(`✅ Đã ghi dữ liệu vào sheet: ${sheetName}`);
            return true;
        } catch (error) {
            console.error(`❌ Lỗi ghi vào sheet ${sheetName}:`, error.message);
            return false;
        }
    },


// --- 6. GHI LOG TỰ HỌC (TACTICAL TRAINING) ---
    appendTacticalLog: async (rowData) => {
        try {
            const sheetName = 'Tactical_Training'; 

            await sheets.spreadsheets.values.append({
                spreadsheetId: SPREADSHEET_ID,
                range: `${sheetName}!A1`, // 🔥 Đổi A:I thành A1 để làm điểm tựa chia cột
                valueInputOption: 'USER_ENTERED',
                insertDataOption: 'INSERT_ROWS', // 🔥 Ép chèn hàng mới, không ghi đè
                resource: { 
                    // Đảm bảo rowData truyền vào từ logger.js là một MẢNG [id, name, keywords...]
                    values: [rowData] 
                },
            });
            console.log(`🚀 [Cloud-Sync] Đã tách cột thành công vào: ${sheetName}`);
            return true;
        } catch (error) {
            console.error(`❌ Lỗi ghi vào sheet Tactical_Training:`, error.message);
            return false;
        }
    }
};

module.exports = googleSheets;
