# Chatbot_Robot_Automation
đường dẫn
https://chatbot-robot-automation.onrender.com/admin.html


"Chào Gemini, tiếp tục dự án Hương Kid nhé. Đây là hồ sơ dự án của mình: 
Tên dự án: Hệ thống Tự động hóa Shop Hương Kid (Closed-Loop Automation)
Mục tiêu: Nhập kho thông minh qua Web Admin + Chatbot tư vấn bán hàng tự động.

1. Cấu trúc thư mục (Project Root)
/src/services:

googleSheets.js (Xử lý Đọc/Ghi Sheets qua google-spreadsheet hoặc googleapis).

facebook.js (Gửi/nhận tin nhắn FB Messenger).

aiService.js (Luồng Admin: Gemini 1.5 Flash; Luồng Khách: Gemini 2.0 Flash qua OpenRouter).

/src/routes/webhook.js: Tiếp nhận dữ liệu từ FB/Telegram và API Admin.

/public: Chứa admin.html (Giao diện nhập kho) và index.html.

app.js & index.js: Cấu hình Server Express, Static files (process.cwd() + '/public'), và Port (10000).

2. Logic nghiệp vụ (Business Logic)
Luồng Admin (Nhập kho): * Input: Văn bản tự nhiên từ admin.html (VD: "Áo thun 120k size 1-5").

AI: Parse sang JSON {name, price, size, imageUrl}.

Output: Ghi thêm dòng vào Google Sheets sheet 'SẢN PHẨM'.

Luồng Chatbot (Bán hàng):

System Prompt: Đóng vai nhân viên shop Hương Kid, dùng khoHang từ Sheets để tư vấn.

Quy tắc: Xưng hô "Dạ/Chị", gửi ảnh qua mã [IMG], chốt đơn qua mã [CHOT_DON].

3. Cấu hình kỹ thuật
Hosting: Render.com (Gói Free, có cơ chế Sleep sau 15p).

Biến môi trường: GEMINI_API_KEY, OPENROUTER_API_KEY, ADMIN_PASSWORD, SPREADSHEET_ID.

Bây giờ mình muốn làm tiếp phần... [Tên tính năng]"
