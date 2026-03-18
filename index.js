require('dotenv').config();
const app = require('./src/app');

// Render sẽ tự cấp PORT thông qua biến môi trường. Nếu không có thì dùng 3000 (local).
const PORT = process.env.PORT || 3000;

app.listen(PORT, '0.0.0.0', () => {
    console.log(`-----------------------------------------`);
    console.log(`🚀 Server Shop Hương Kid đã sẵn sàng!`);
    console.log(`📍 Cổng: ${PORT}`);
    console.log(`-----------------------------------------`);
});
