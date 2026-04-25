FROM ollama/ollama

# Không cần curl tải thủ công nữa, chúng ta dùng lệnh pull của Ollama
# Lệnh này sẽ tự động tải con Llama 3.2 bản 1 tỷ tham số (rất nhẹ, ~1.3GB nhưng nén lại chỉ còn vài trăm MB)
# Hoặc nếu Đạt vẫn muốn con SmolLM, ta sẽ dùng lệnh pull smollm:135m

EXPOSE 11434

# Lệnh khởi chạy: 
# 1. Chạy server Ollama ngầm
# 2. Đợi 5 giây để server sẵn sàng
# 3. Tải mô hình smollm trực tiếp từ thư viện Ollama (chuẩn 100%)
# 4. Giữ server sống
ENTRYPOINT ["/bin/sh", "-c", "ollama serve & sleep 5 && ollama pull smollm:135m && tail -f /dev/null"]
