require('dotenv').config();
const app = require('./src/app'); // Gọi đến src/app.js

const PORT = process.env.PORT || 3000;

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server đang chạy tại cổng: ${PORT}`);
});
