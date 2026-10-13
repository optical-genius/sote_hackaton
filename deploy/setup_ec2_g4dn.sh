#!/usr/bin/env bash
# ==============================================================================
# Setup script for Mykes/medicus on AWS EC2 g4dn.xlarge (Ubuntu 22.04)
# ==============================================================================
set -euo pipefail

echo "=========================================================="
echo " Starting Medicus Model Server Setup on AWS EC2 g4dn.xlarge"
echo " Model: https://huggingface.co/Mykes/medicus (Gemma-2 2.6B)"
echo "=========================================================="

# 1. Check NVIDIA GPU
if ! command -v nvidia-smi &> /dev/null; then
    echo "[-] nvidia-smi not found. Installing NVIDIA Drivers..."
    sudo apt-get update
    sudo apt-get install -y ubuntu-drivers-common
    sudo ubuntu-drivers autoinstall
    echo "[!] Drivers installed. A system reboot may be required if kernel modules are not active."
else
    echo "[+] NVIDIA GPU detected:"
    nvidia-smi --query-gpu=name,memory.total,driver_version --format=csv,noheader
fi

# 2. Check & Install Docker
if ! command -v docker &> /dev/null; then
    echo "[-] Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker "$USER"
    rm get-docker.sh
fi

# 3. Check & Install NVIDIA Container Toolkit
if ! dpkg -l | grep -q nvidia-container-toolkit; then
    echo "[-] Installing NVIDIA Container Toolkit..."
    curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey | sudo gpg --dearmor -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg \
    && curl -s -L https://nvidia.github.io/libnvidia-container/stable/deb/nvidia-container-toolkit.list | \
      sed 's#deb https://#deb [signed-by=/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg] https://#g' | \
      sudo tee /etc/apt/sources.list.d/nvidia-container-toolkit.list
    sudo apt-get update
    sudo apt-get install -y nvidia-container-toolkit
    sudo nvidia-ctk runtime configure --runtime=docker
    sudo systemctl restart docker
fi

echo "[+] Docker & NVIDIA GPU runtime verified."

# 4. Choose engine: vLLM (default) or llama.cpp server
ENGINE="${1:-vllm}"

if [ "$ENGINE" = "vllm" ]; then
    echo "[*] Launching Medicus via vLLM (port 8001)..."
    docker rm -f medicus-model-server 2>/dev/null || true
    docker run -d --restart unless-stopped \
      --name medicus-model-server \
      --gpus all \
      --ipc=host \
      -p 8001:8000 \
      -v "$HOME/.cache/huggingface:/root/.cache/huggingface" \
      vllm/vllm-openai:v0.6.3 \
      --model Mykes/medicus \
      --served-model-name medicus \
      --max-model-len 4096 \
      --gpu-memory-utilization 0.70 \
      --dtype bfloat16 \
      --port 8000
else
    echo "[*] Launching Medicus via llama.cpp GGUF server (port 8001)..."
    docker rm -f medicus-model-server 2>/dev/null || true
    docker run -d --restart unless-stopped \
      --name medicus-model-server \
      --gpus all \
      -p 8001:8000 \
      -v "$HOME/.cache/models:/models" \
      ghcr.io/ggerganov/llama.cpp:server-cuda \
      -hf Mykes/medicus:medicus-Q4_K_M.gguf \
      --alias medicus \
      --port 8000 \
      --host 0.0.0.0 \
      -ngl 99 \
      -c 4096
fi

echo "[*] Waiting for model server to initialize (this takes 30-60s on first download)..."
sleep 15

# 5. Check Health
for i in {1..30}; do
    if curl -s http://127.0.0.1:8001/v1/models | grep -q "medicus"; then
        echo ""
        echo "=========================================================="
        echo " [+] SUCCESS: Medicus is ONLINE at http://127.0.0.1:8001/v1"
        echo "=========================================================="
        break
    fi
    echo -n "."
    sleep 3
done

echo ""
echo "To test the model with a prompt in Finnish:"
echo "curl http://127.0.0.1:8001/v1/chat/completions \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{\"model\": \"medicus\", \"messages\": [{\"role\": \"user\", \"content\": \"Hei, kerro lyhyesti kuka olet.\"}]}'"
echo ""
echo "To configure your Sopi backend on EC2, set in your .env:"
echo "MEDICUS_API_URL=http://127.0.0.1:8001/v1"
echo "MEDICUS_MODEL=medicus"
