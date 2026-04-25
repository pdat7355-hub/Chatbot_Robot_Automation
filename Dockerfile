# Sử dụng bản Ollama nhẹ nhất làm nền
FROM ollama/ollama

# Copy file mô hình của Đạt vào container
# Đảm bảo file .gguf nằm cùng thư mục với Dockerfile này
COPY smollm-135m-instruct-add-basics-q8_0.gguf /root/.ollama/models/blobs/temp_model.gguf

# Tạo file cấu hình mô hình để Ollama nhận diện
RUN echo "FROM /root/.ollama/models/blobs/temp_model.gguf" > Modelfile

# Mở cổng API
EXPOSE 11434

# Lệnh khởi động: Chạy server, tạo model, và giữ server sống
ENTRYPOINT ["/bin/sh", "-c", "ollama serve & sleep 5 && ollama create smollm-test -f Modelfile && tail -f /dev/null"]
