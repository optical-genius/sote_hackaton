#!/usr/bin/env bash
set -e

echo "======================================================"
echo "  Sopi - Länsi-Uusimaa Production Deployment (CPU/EC2)"
echo "======================================================"

# Check if docker is installed
if ! command -v docker &> /dev/null; then
    echo "Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker "$USER"
    rm get-docker.sh
    echo "Docker installed successfully."
fi

# Create .env if not exists
if [ ! -f .env ]; then
    echo "Creating .env configuration..."
    cat << 'EOF' > .env
MEDICUS_API_URL=http://medicus:8001/v1
MEDICUS_MODEL=medicus
WHISPER_MODEL=tiny
WHISPER_DEVICE=cpu
WHISPER_COMPUTE_TYPE=int8
EOF
fi

echo "Starting containers with docker-compose.prod.yml..."
docker compose -f docker-compose.prod.yml up -d --build

echo ""
echo "======================================================"
echo " Deployment is starting in the background!"
echo " Medicus model (Q4_K_M ~1.6GB) is being downloaded..."
echo " Monitor model logs with: docker logs -f sopi-medicus-model"
echo " When ready, access your app at: http://$(curl -s http://checkip.amazonaws.com || echo '56.228.1.91')"
echo "======================================================"
