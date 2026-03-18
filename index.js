require('dotenv').config();
const app = require('./src/app'); // Đúng đường dẫn đến src/app.js

const PORT = process.env.PORT || 10000;

app.listen(PORT, '0.0.0.0', () => {
    console.log(`-----------------------------------------`);
    console.log(`🚀 Server Shop Hương Kid đang chạy!`);
    console.log(`📍 Port: ${PORT}`);
    console.log(`-----------------------------------------`);
});
