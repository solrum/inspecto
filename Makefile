# ============================================================
# Inspecto — Local Development
# ============================================================

PID_DIR := .pids

GREEN  := \033[0;32m
YELLOW := \033[1;33m
CYAN   := \033[0;36m
RED    := \033[0;31m
RESET  := \033[0m

.DEFAULT_GOAL := help

# ============================================================
# Dev
# ============================================================

.PHONY: dev
dev: ## Start API + Web dev servers
	@mkdir -p $(PID_DIR)
	@if [ -f $(PID_DIR)/dev.pid ] && kill -0 $$(cat $(PID_DIR)/dev.pid) 2>/dev/null; then \
		echo "$(YELLOW)Already running (PID $$(cat $(PID_DIR)/dev.pid))$(RESET)"; \
	else \
		nohup pnpm dev > $(PID_DIR)/dev.log 2>&1 & echo $$! > $(PID_DIR)/dev.pid; \
		sleep 3; \
		echo "$(GREEN)Web: http://localhost:3000  API: http://localhost:3001$(RESET)"; \
	fi

.PHONY: stop
stop: ## Stop dev servers
	@if [ -f $(PID_DIR)/dev.pid ]; then \
		kill $$(cat $(PID_DIR)/dev.pid) 2>/dev/null; \
		rm -f $(PID_DIR)/dev.pid; \
	fi
	@lsof -ti :3000 -ti :3001 2>/dev/null | xargs kill -9 2>/dev/null || true
	@echo "$(GREEN)Stopped$(RESET)"

.PHONY: restart
restart: stop dev ## Restart dev servers

.PHONY: logs
logs: ## Tail dev logs
	@tail -f $(PID_DIR)/dev.log 2>/dev/null || echo "$(YELLOW)Run 'make dev' first$(RESET)"

.PHONY: status
status: ## Show status
	@if [ -f $(PID_DIR)/dev.pid ] && kill -0 $$(cat $(PID_DIR)/dev.pid) 2>/dev/null; then \
		echo "$(GREEN)Running (PID $$(cat $(PID_DIR)/dev.pid))$(RESET)  Web :3000  API :3001"; \
	else \
		echo "$(YELLOW)Not running$(RESET)"; \
	fi

# ============================================================
# Infrastructure (Docker)
# ============================================================

.PHONY: infra
infra: ## Start DB + MinIO
	@docker compose up -d

.PHONY: infra-stop
infra-stop: ## Stop DB + MinIO
	@docker compose down

# ============================================================
# Database
# ============================================================

.PHONY: db-migrate
db-migrate: ## Run migrations
	@pnpm db:migrate

.PHONY: db-rollback
db-rollback: ## Rollback last migration
	@pnpm db:rollback

.PHONY: db-seed
db-seed: ## Run seed
	@pnpm db:seed

# ============================================================
# Build & Test
# ============================================================

.PHONY: build
build: ## Build all packages
	@pnpm build

.PHONY: lint
lint: ## Type-check
	@pnpm lint

.PHONY: test
test: ## Run tests
	@pnpm test

# ============================================================
# Help
# ============================================================

.PHONY: help
help:
	@echo "$(CYAN)Inspecto$(RESET)"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  $(CYAN)%-16s$(RESET) %s\n", $$1, $$2}'
	@echo ""
