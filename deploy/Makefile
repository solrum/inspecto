# ============================================================
# Inspecto — Server Deployment Makefile
# ============================================================
# Usage on server:
#   1. cd /opt/inspecto
#   2. make setup         Create .env + generate secrets
#   3. Edit .env          Set SMTP credentials manually
#   4. make ghcr-login    Login to GHCR
#   5. make pull && make up
#
# Prerequisites:
#   - Docker Engine 24+ & Docker Compose v2
#   - GHCR auth: docker login ghcr.io
# ============================================================

COMPOSE := docker compose -f docker-compose.prod.yml --env-file .env

# Colors
RED    := \033[0;31m
GREEN  := \033[0;32m
YELLOW := \033[1;33m
CYAN   := \033[0;36m
RESET  := \033[0m

.DEFAULT_GOAL := help

# ============================================================
# Setup
# ============================================================

.PHONY: init
init: ## Create .env from template (first time setup)
	@if [ -f .env ]; then \
		echo "$(YELLOW)[SKIP] .env already exists$(RESET)"; \
	else \
		cp .env.example .env; \
		echo "$(GREEN)Created .env from template$(RESET)"; \
	fi

.PHONY: secrets
secrets: ## Generate secrets (auto-fill CHANGE_ME values)
	@./generate-secrets.sh

.PHONY: secrets-rotate
secrets-rotate: ## Rotate ALL secrets (DB, S3, JWT)
	@./generate-secrets.sh --rotate

.PHONY: secrets-rotate-jwt
secrets-rotate-jwt: ## Rotate JWT secret only
	@./generate-secrets.sh --rotate-jwt

.PHONY: secrets-dry-run
secrets-dry-run: ## Print generated secrets without writing
	@./generate-secrets.sh --dry-run

.PHONY: ghcr-login
ghcr-login: ## Login to GitHub Container Registry
	@echo "$(CYAN)Login to GHCR...$(RESET)"
	@echo "Create a token at: https://github.com/settings/tokens/new?scopes=read:packages"
	@read -rp "GitHub username: " user; \
	read -rsp "GitHub token: " token; \
	echo ""; \
	echo "$$token" | docker login ghcr.io -u "$$user" --password-stdin
	@echo "$(GREEN)Logged in to GHCR$(RESET)"

# ============================================================
# Lifecycle
# ============================================================

.PHONY: pull
pull: ## Pull latest images from GHCR
	@echo "$(CYAN)Pulling latest images...$(RESET)"
	$(COMPOSE) pull api web
	@echo "$(GREEN)Pull complete$(RESET)"

.PHONY: preflight
preflight: ## Verify .env exists before starting
	@if [ ! -f .env ]; then \
		echo "$(RED)Missing .env — run 'make init' first$(RESET)"; \
		exit 1; \
	fi
	@if grep -q 'CHANGE_ME' .env; then \
		echo "$(YELLOW)WARNING: .env contains CHANGE_ME placeholders — edit before production!$(RESET)"; \
	fi
	@echo "$(GREEN)Preflight OK$(RESET)"

.PHONY: up
up: preflight ## Start all services
	@echo "$(CYAN)Starting all services...$(RESET)"
	$(COMPOSE) up -d
	@echo "$(GREEN)All services started$(RESET)"

.PHONY: down
down: ## Stop all services (keep volumes)
	@echo "$(YELLOW)Stopping all services...$(RESET)"
	$(COMPOSE) down

.PHONY: restart
restart: ## Restart a service (usage: make restart s=api)
	@if [ -z "$(s)" ]; then \
		echo "$(RED)Usage: make restart s=<service>$(RESET)"; \
		echo "  Services: api, web, postgres, minio, watchtower"; \
	else \
		echo "$(CYAN)Restarting $(s)...$(RESET)"; \
		$(COMPOSE) restart $(s); \
	fi

.PHONY: update
update: pull ## Pull + recreate all services
	@echo "$(CYAN)Recreating services...$(RESET)"
	$(COMPOSE) up -d --remove-orphans
	@echo "$(GREEN)Update complete$(RESET)"

# ============================================================
# Monitoring
# ============================================================

.PHONY: ps
ps: ## Show running containers
	@$(COMPOSE) ps

.PHONY: logs
logs: ## Tail logs (usage: make logs or make logs s=api)
	@if [ -z "$(s)" ]; then \
		$(COMPOSE) logs -f --tail=100; \
	else \
		$(COMPOSE) logs -f --tail=100 $(s); \
	fi

.PHONY: health
health: ## Check health of all services
	@echo "$(CYAN)Service Health Check$(RESET)"
	@echo "============================================================"
	@for c in inspecto-postgres inspecto-minio inspecto-api inspecto-web inspecto-watchtower; do \
		status=$$(docker inspect --format='{{.State.Health.Status}}' $$c 2>/dev/null || echo "no healthcheck"); \
		running=$$(docker inspect --format='{{.State.Status}}' $$c 2>/dev/null || echo "not found"); \
		if [ "$$running" = "running" ]; then \
			printf "  $(GREEN)%-24s running (%s)$(RESET)\n" "$$c" "$$status"; \
		else \
			printf "  $(RED)%-24s %s$(RESET)\n" "$$c" "$$running"; \
		fi; \
	done
	@echo "============================================================"

.PHONY: stats
stats: ## Show resource usage (CPU, memory)
	@docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}" \
		$$(docker ps --filter "name=inspecto-" --format "{{.Names}}" 2>/dev/null)

# ============================================================
# Database
# ============================================================

BACKUP_DIR := ./backups
TIMESTAMP  := $(shell date +%Y%m%d_%H%M%S)

.PHONY: db-shell
db-shell: ## Open psql shell
	@docker exec -it inspecto-postgres psql -U $${POSTGRES_USER:-inspecto} -d $${POSTGRES_DB:-inspecto}

.PHONY: db-migrate
db-migrate: ## Run database migrations via API container
	@echo "$(CYAN)Running migrations...$(RESET)"
	@docker exec inspecto-api node -e "require('./dist/config/run-migrate.js')" 2>/dev/null || \
		echo "$(YELLOW)Migration runner not available — migrations run on API startup$(RESET)"

.PHONY: backup
backup: ## Backup database
	@mkdir -p $(BACKUP_DIR)
	@echo "$(CYAN)Backing up database...$(RESET)"
	@file="$(BACKUP_DIR)/inspecto_$(TIMESTAMP).sql.gz"; \
	docker exec inspecto-postgres pg_dump -U $${POSTGRES_USER:-inspecto} \
		--no-owner --no-acl --clean --if-exists $${POSTGRES_DB:-inspecto} \
		| gzip > "$$file"; \
	echo "$(GREEN)Backup saved: $$file$(RESET)"; \
	ls -lh "$$file"

.PHONY: backup-list
backup-list: ## List available backups
	@if [ -d $(BACKUP_DIR) ] && [ "$$(ls -A $(BACKUP_DIR) 2>/dev/null)" ]; then \
		echo "$(CYAN)Available backups:$(RESET)"; \
		ls -lhS $(BACKUP_DIR)/*.sql.gz 2>/dev/null | awk '{print "  " $$NF " (" $$5 ")"}'; \
	else \
		echo "$(YELLOW)No backups found$(RESET)"; \
	fi

.PHONY: restore
restore: ## Restore database (usage: make restore f=backups/inspecto_20260330.sql.gz)
	@if [ -z "$(f)" ]; then \
		echo "$(RED)Usage: make restore f=backups/<filename>.sql.gz$(RESET)"; \
		exit 1; \
	fi
	@if [ ! -f "$(f)" ]; then \
		echo "$(RED)File not found: $(f)$(RESET)"; \
		exit 1; \
	fi
	@echo "$(RED)WARNING: This will overwrite the database with backup $(f)$(RESET)"; \
	read -p "Continue? [y/N] " confirm; \
	if [ "$$confirm" = "y" ]; then \
		echo "$(CYAN)Restoring from $(f)...$(RESET)"; \
		gunzip -c "$(f)" | docker exec -i inspecto-postgres psql -U $${POSTGRES_USER:-inspecto} -d $${POSTGRES_DB:-inspecto}; \
		echo "$(GREEN)Restore complete$(RESET)"; \
	else \
		echo "Aborted."; \
	fi

.PHONY: backup-clean
backup-clean: ## Remove backups older than 30 days
	@echo "$(YELLOW)Removing backups older than 30 days...$(RESET)"
	@find $(BACKUP_DIR) -name "*.sql.gz" -mtime +30 -delete 2>/dev/null || true
	@echo "$(GREEN)Done$(RESET)"

# ============================================================
# Troubleshooting
# ============================================================

.PHONY: shell
shell: ## Open shell in a container (usage: make shell s=api)
	@if [ -z "$(s)" ]; then \
		echo "$(RED)Usage: make shell s=<service>$(RESET)"; \
	else \
		docker exec -it inspecto-$(s) sh; \
	fi

# ============================================================
# Cleanup
# ============================================================

.PHONY: clean
clean: ## Stop services + remove volumes (DESTRUCTIVE)
	@echo "$(RED)WARNING: This will remove all containers, volumes, and data!$(RESET)"
	@read -p "Are you sure? [y/N] " confirm; \
	if [ "$$confirm" = "y" ]; then \
		$(COMPOSE) down -v --rmi all; \
		echo "$(GREEN)Cleanup complete$(RESET)"; \
	fi

.PHONY: prune
prune: ## Remove unused Docker images
	@echo "$(YELLOW)Pruning unused images...$(RESET)"
	@docker image prune -f --filter "label=com.centurylinklabs.watchtower.enable=true"
	@echo "$(GREEN)Prune complete$(RESET)"

# ============================================================
# Quick Setup
# ============================================================

.PHONY: setup
setup: init secrets ## Full first-time setup (init + generate secrets)
	@echo ""
	@echo "$(GREEN)============================================================$(RESET)"
	@echo "$(GREEN)Setup complete! Next steps:$(RESET)"
	@echo "$(GREEN)============================================================$(RESET)"
	@echo "  1. Set SMTP creds:  nano .env  (SMTP_USER, SMTP_PASS)"
	@echo "  2. Login to GHCR:   make ghcr-login"
	@echo "  3. Pull & start:    make pull && make up"
	@echo "  4. Check health:    make health"
	@echo ""

# ============================================================
# Help
# ============================================================

.PHONY: help
help: ## Show this help
	@echo "$(CYAN)Inspecto — Server Deployment$(RESET)"
	@echo ""
	@echo "$(YELLOW)Quick Start:$(RESET)"
	@echo "  make setup              First-time setup"
	@echo "  make ghcr-login         Login to GHCR"
	@echo "  make pull && make up    Pull images and start"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  $(CYAN)%-22s$(RESET) %s\n", $$1, $$2}'
	@echo ""
	@echo "$(YELLOW)Parameterized commands:$(RESET)"
	@echo "  make restart s=api      Restart a service"
	@echo "  make logs s=api         Tail logs for a service"
	@echo "  make shell s=api        Shell into a container"
	@echo "  make restore f=backups/inspecto_20260330.sql.gz"
	@echo ""
