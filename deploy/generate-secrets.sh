#!/usr/bin/env bash
# ============================================================
# Inspecto — Generate Secrets
# ============================================================
# Usage:
#   ./generate-secrets.sh              Generate secrets (first time)
#   ./generate-secrets.sh --rotate     Rotate all secrets
#   ./generate-secrets.sh --rotate-jwt Rotate JWT only
#   ./generate-secrets.sh --dry-run    Print without writing
# ============================================================

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${SCRIPT_DIR}/.env"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
RESET='\033[0m'

# ============================================================
# Secret Generation
# ============================================================

gen_password() {
    local length="${1:-32}"
    openssl rand -base64 "$((length * 2))" | tr -dc 'A-Za-z0-9' | head -c "$length" || true
}

gen_jwt_key() {
    local length="${1:-48}"
    openssl rand -base64 "$((length * 2))" | tr -dc 'A-Za-z0-9_-' | head -c "$length" || true
}

# ============================================================
# Replace value in .env
# ============================================================
replace_env() {
    local key="$1"
    local value="$2"

    if grep -q "^${key}=" "$ENV_FILE"; then
        sed -i "s|^${key}=.*|${key}=${value}|" "$ENV_FILE"
    else
        echo "${key}=${value}" >> "$ENV_FILE"
    fi
}

has_placeholder() {
    local key="$1"
    grep -q "^${key}=CHANGE_ME" "$ENV_FILE" 2>/dev/null
}

# ============================================================
# Main
# ============================================================

MODE="generate"
DRY_RUN=false

for arg in "$@"; do
    case "$arg" in
        --rotate)     MODE="rotate" ;;
        --rotate-jwt) MODE="rotate-jwt" ;;
        --dry-run)    DRY_RUN=true ;;
        --help|-h)
            echo "Usage: $0 [--rotate|--rotate-jwt|--dry-run|--help]"
            exit 0
            ;;
        *) echo -e "${RED}Unknown option: $arg${RESET}" >&2; exit 1 ;;
    esac
done

if [ ! -f "$ENV_FILE" ]; then
    echo -e "${RED}.env not found. Run 'make init' first.${RESET}"
    exit 1
fi

# Generate values
DB_PASSWORD="$(gen_password 32)"
S3_ACCESS="$(gen_password 20)"
S3_SECRET="$(gen_password 40)"
JWT_SECRET="$(gen_jwt_key 48)"

echo -e "${CYAN}Inspecto Secret Generator${RESET}"
echo ""

if $DRY_RUN; then
    echo -e "${YELLOW}[DRY RUN] Generated secrets (not written):${RESET}"
    echo ""
    echo "  POSTGRES_PASSWORD  = ${DB_PASSWORD}"
    echo "  S3_ACCESS_KEY      = ${S3_ACCESS}"
    echo "  S3_SECRET_KEY      = ${S3_SECRET}"
    echo "  JWT_SECRET         = ${JWT_SECRET}"
    echo ""
    echo -e "${YELLOW}Run without --dry-run to write to .env${RESET}"
    exit 0
fi

if [ "$MODE" = "generate" ]; then
    echo -e "${GREEN}Generating secrets (skipping already-configured values)...${RESET}"
    CHANGED=0

    if has_placeholder "POSTGRES_PASSWORD"; then
        replace_env "POSTGRES_PASSWORD" "$DB_PASSWORD"
        echo "  [+] POSTGRES_PASSWORD"
        CHANGED=$((CHANGED + 1))
    fi

    if has_placeholder "S3_ACCESS_KEY"; then
        replace_env "S3_ACCESS_KEY" "$S3_ACCESS"
        echo "  [+] S3_ACCESS_KEY"
        CHANGED=$((CHANGED + 1))
    fi

    if has_placeholder "S3_SECRET_KEY"; then
        replace_env "S3_SECRET_KEY" "$S3_SECRET"
        echo "  [+] S3_SECRET_KEY"
        CHANGED=$((CHANGED + 1))
    fi

    if has_placeholder "JWT_SECRET"; then
        replace_env "JWT_SECRET" "$JWT_SECRET"
        echo "  [+] JWT_SECRET"
        CHANGED=$((CHANGED + 1))
    fi

    if [ "$CHANGED" -eq 0 ]; then
        echo -e "${YELLOW}All secrets already configured. Use --rotate to regenerate.${RESET}"
    else
        echo ""
        echo -e "${GREEN}Done! ${CHANGED} secret(s) generated.${RESET}"
    fi

elif [ "$MODE" = "rotate" ]; then
    echo -e "${YELLOW}Rotating ALL secrets...${RESET}"
    echo -e "${RED}WARNING: This will invalidate all sessions and require DB password update!${RESET}"
    read -p "Continue? [y/N] " confirm
    if [ "$confirm" != "y" ]; then echo "Aborted."; exit 0; fi

    replace_env "POSTGRES_PASSWORD" "$DB_PASSWORD"
    replace_env "S3_ACCESS_KEY" "$S3_ACCESS"
    replace_env "S3_SECRET_KEY" "$S3_SECRET"
    replace_env "JWT_SECRET" "$JWT_SECRET"

    echo "  [*] POSTGRES_PASSWORD"
    echo "  [*] S3_ACCESS_KEY"
    echo "  [*] S3_SECRET_KEY"
    echo "  [*] JWT_SECRET"
    echo ""
    echo -e "${GREEN}All secrets rotated.${RESET}"
    echo -e "${YELLOW}Note: POSTGRES_PASSWORD change requires updating Postgres user password manually.${RESET}"
    echo -e "  Restart: ${CYAN}make down && make up${RESET}"

elif [ "$MODE" = "rotate-jwt" ]; then
    echo -e "${YELLOW}Rotating JWT secret...${RESET}"
    echo -e "${RED}WARNING: This will invalidate all existing tokens!${RESET}"
    read -p "Continue? [y/N] " confirm
    if [ "$confirm" != "y" ]; then echo "Aborted."; exit 0; fi

    replace_env "JWT_SECRET" "$JWT_SECRET"
    echo "  [*] JWT_SECRET"
    echo ""
    echo -e "${GREEN}JWT rotated. Restart API: ${CYAN}make restart s=api${RESET}"
fi
