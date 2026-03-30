#!/usr/bin/env bash
# ============================================================
# Inspecto — Server Setup Script
# ============================================================
# Run once on a fresh server to configure everything:
#   - Docker & Docker Compose
#   - GHCR authentication
#   - .env file
#   - Start all services (DB, MinIO, API, Web, Watchtower)
#
# Usage:
#   ssh user@server
#   curl -sSL <raw-url>/scripts/setup-server.sh | bash
#   — or —
#   git clone git@github.com:solrum/inspecto.git /opt/inspecto
#   cd /opt/inspecto && bash scripts/setup-server.sh
#
# Idempotent — safe to run multiple times.
# ============================================================

set -euo pipefail

# ============================================================
# Colors & Helpers
# ============================================================
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
RESET='\033[0m'

info()    { echo -e "${CYAN}[INFO]${RESET} $1"; }
success() { echo -e "${GREEN}[OK]${RESET} $1"; }
warn()    { echo -e "${YELLOW}[SKIP]${RESET} $1"; }
error()   { echo -e "${RED}[ERROR]${RESET} $1"; }

check_command() {
    command -v "$1" >/dev/null 2>&1
}

# ============================================================
# Banner
# ============================================================
echo -e "${BOLD}${CYAN}"
echo "╔══════════════════════════════════════════════════════╗"
echo "║          Inspecto — Server Setup                    ║"
echo "╚══════════════════════════════════════════════════════╝"
echo -e "${RESET}"

# ============================================================
# Step 1: Check Linux
# ============================================================
info "Checking operating system..."
if [[ "$(uname)" != "Linux" ]]; then
    error "This script is designed for Linux servers only."
    exit 1
fi
success "Linux detected ($(uname -m))"

# ============================================================
# Step 2: Check Docker
# ============================================================
info "Checking Docker..."
if check_command docker; then
    if docker info >/dev/null 2>&1; then
        success "Docker is running ($(docker --version | grep -oE '[0-9]+\.[0-9]+\.[0-9]+'))"
    else
        error "Docker is installed but not running. Start it with: sudo systemctl start docker"
        exit 1
    fi
else
    info "Installing Docker..."
    curl -fsSL https://get.docker.com | sh
    sudo systemctl enable docker
    sudo systemctl start docker
    sudo usermod -aG docker "$USER"
    success "Docker installed. You may need to re-login for group changes."
fi

# ============================================================
# Step 3: Check Docker Compose
# ============================================================
info "Checking Docker Compose..."
if docker compose version >/dev/null 2>&1; then
    success "Docker Compose available ($(docker compose version --short))"
else
    error "Docker Compose plugin not found. Install: sudo apt install docker-compose-plugin"
    exit 1
fi

# ============================================================
# Step 4: Login to GHCR
# ============================================================
info "Checking GHCR authentication..."
if docker pull ghcr.io/solrum/inspecto-api:latest >/dev/null 2>&1; then
    warn "Already authenticated to GHCR"
else
    echo ""
    echo -e "${BOLD}GitHub Container Registry login required.${RESET}"
    echo "Create a Personal Access Token (classic) with 'read:packages' scope:"
    echo "  https://github.com/settings/tokens/new?scopes=read:packages"
    echo ""
    read -rp "GitHub username: " GH_USER
    read -rsp "GitHub token (paste, hidden): " GH_TOKEN
    echo ""

    echo "$GH_TOKEN" | docker login ghcr.io -u "$GH_USER" --password-stdin
    success "Logged in to GHCR"
fi

# ============================================================
# Step 5: Setup deploy directory
# ============================================================
DEPLOY_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
info "Deploy directory: $DEPLOY_DIR"

cd "$DEPLOY_DIR/deploy"

# ============================================================
# Step 6: Setup .env file
# ============================================================
info "Setting up environment file..."
if [[ -f .env ]]; then
    warn ".env already exists — skipping (edit manually if needed)"
else
    if [[ -f ../env.example ]]; then
        cp ../.env.example .env
        success "Created .env from .env.example"
    else
        cat > .env << 'ENVEOF'
# ─── Database ────────────────────────────────────────────────
POSTGRES_USER=inspecto
POSTGRES_PASSWORD=CHANGE_ME_STRONG_PASSWORD
POSTGRES_DB=inspecto

# ─── S3 / MinIO ─────────────────────────────────────────────
S3_ACCESS_KEY=CHANGE_ME_ACCESS_KEY
S3_SECRET_KEY=CHANGE_ME_SECRET_KEY
S3_BUCKET=inspecto-files
S3_REGION=us-east-1
S3_PRESIGNED_URL_EXPIRY=900

# ─── Auth ────────────────────────────────────────────────────
JWT_SECRET=CHANGE_ME_JWT_SECRET
JWT_EXPIRES_IN=7d
BCRYPT_SALT_ROUNDS=12
PASSWORD_RESET_EXPIRY_MS=3600000

# ─── API ─────────────────────────────────────────────────────
NODE_ENV=production
API_PORT=3010
CORS_ORIGIN=https://inspecto.solrum.dev

# ─── Upload Limits (bytes) ──────────────────────────────────
MAX_FILE_SIZE=52428800
MAX_IMAGE_SIZE=20971520

# ─── SMTP ────────────────────────────────────────────────────
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USE_TLS=true
SMTP_USER=
SMTP_PASS=
SMTP_REJECT_UNAUTHORIZED=true
SMTP_MOCK_MODE=false
MAIL_FROM=Inspecto <noreply@solrum.dev>
SMTP_FROM_NAME=Inspecto

# ─── App URL ────────────────────────────────────────────────
APP_URL=https://inspecto.solrum.dev
NEXT_PUBLIC_API_URL=https://inspecto.solrum.dev/api

# ─── Ports ───────────────────────────────────────────────────
WEB_PORT=3011
ENVEOF
        success "Created .env with defaults — EDIT SECRETS BEFORE STARTING!"
    fi

    echo ""
    echo -e "${YELLOW}${BOLD}IMPORTANT: Edit .env and set real passwords/secrets:${RESET}"
    echo -e "  ${CYAN}nano $DEPLOY_DIR/deploy/.env${RESET}"
    echo ""
    read -rp "Press Enter after editing .env (or Ctrl+C to abort)..."
fi

# ============================================================
# Step 7: Start services
# ============================================================
echo ""
info "Pulling images and starting services..."
docker compose -f docker-compose.prod.yml up -d
success "All services started"

# ============================================================
# Step 8: Wait for health
# ============================================================
info "Waiting for services to be healthy..."
MAX_WAIT=60
WAITED=0
while ! docker exec inspecto-postgres pg_isready -U inspecto >/dev/null 2>&1; do
    if [[ $WAITED -ge $MAX_WAIT ]]; then
        error "PostgreSQL did not become ready within ${MAX_WAIT}s"
        exit 1
    fi
    sleep 2
    WAITED=$((WAITED + 2))
done
success "PostgreSQL is ready (${WAITED}s)"

# ============================================================
# Summary
# ============================================================
echo ""
echo -e "${BOLD}${GREEN}╔══════════════════════════════════════════════════════╗${RESET}"
echo -e "${BOLD}${GREEN}║          Setup Complete!                            ║${RESET}"
echo -e "${BOLD}${GREEN}╚══════════════════════════════════════════════════════╝${RESET}"
echo ""
echo -e "${BOLD}Services:${RESET}"
docker compose -f docker-compose.prod.yml ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"
echo ""
echo -e "${BOLD}How it works:${RESET}"
echo -e "  1. Push to ${CYAN}main${RESET} branch"
echo -e "  2. GitHub Actions builds & pushes images to GHCR"
echo -e "  3. Watchtower detects new images within 60s"
echo -e "  4. Watchtower auto-pulls & restarts containers"
echo ""
echo -e "${BOLD}Useful commands:${RESET}"
echo -e "  ${CYAN}cd $DEPLOY_DIR/deploy${RESET}"
echo -e "  ${CYAN}docker compose -f docker-compose.prod.yml ps${RESET}       # Status"
echo -e "  ${CYAN}docker compose -f docker-compose.prod.yml logs -f${RESET}  # Logs"
echo -e "  ${CYAN}docker compose -f docker-compose.prod.yml down${RESET}     # Stop"
echo ""
