const path = require('path');

// __dirname là /opt/render/project/src
// ta cần đi ra ngoài 1 cấp để vào /opt/render/project/public
const publicPath = path.join(__dirname, '..', 'public'); 

app.use(express.json());

// Phục vụ file tĩnh
app.use(express.static(publicPath));

// Route chính
app.get('/', (req, res) => {
    // Kiểm tra xem file có tồn tại không trước khi gửi để tránh crash
    res.sendFile(path.join(publicPath, 'index.html'), (err) => {
        if (err) {
            console.error("Không tìm thấy file index.html tại:", path.join(publicPath, 'index.html'));
            res.status(404).send("Lỗi: Không tìm thấy giao diện web. Đạt kiểm tra lại thư mục public nhé!");
        }
    });
});
