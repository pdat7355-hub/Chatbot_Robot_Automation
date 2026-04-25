FROM ollama/ollama

# Tạo thư mục và tải file mô hình trực tiếp từ Hugging Face
RUN apt-get update && apt-get install -y curl
RUN mkdir -p /root/.ollama/models/blobs/
RUN curl -L https://huggingface.co/bartowski/SmolLM-135M-Instruct-add-basics-GGUF/resolve/main/SmolLM-135M-Instruct-add-basics-Q8_0.gguf -o /root/.ollama/models/blobs/model.gguf

# Cấu hình Modelfile
RUN echo "FROM /root/.ollama/models/blobs/model.gguf" > Modelfile

EXPOSE 11434

ENTRYPOINT ["/bin/sh", "-c", "ollama serve & sleep 5 && ollama create smollm-test -f Modelfile && tail -f /dev/null"]
