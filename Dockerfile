FROM ollama/ollama

# Cài đặt curl
RUN apt-get update && apt-get install -y curl

# Tạo thư mục
RUN mkdir -p /root/.ollama/models/blobs/

# Tải mô hình (Dùng link download trực tiếp để tránh file 29 bytes)
RUN curl -L "https://huggingface.co/bartowski/SmolLM-135M-Instruct-add-basics-GGUF/resolve/main/SmolLM-135M-Instruct-add-basics-Q8_0.gguf?download=true" -o /root/.ollama/models/blobs/model.gguf

# Tạo Modelfile
RUN echo "FROM /root/.ollama/models/blobs/model.gguf" > Modelfile

# Mở cổng
EXPOSE 11434

# Lệnh khởi chạy
ENTRYPOINT ["/bin/sh", "-c", "ollama serve & sleep 5 && ollama create smollm-dat -f Modelfile && tail -f /dev/null"]
