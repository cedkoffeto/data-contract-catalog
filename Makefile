.PHONY: dev build start typecheck
.PHONY: dc-up dc-down dc-reset kc-seed
.PHONY: prisma-generate prisma-migrate prisma-studio
.PHONY: install clean

NPM := npm
DC := docker compose

dev:
	$(NPM) run dev

build:
	$(NPM) run build

start:
	$(NPM) run start

typecheck:
	$(NPM) run typecheck

# --- Keycloak / Docker ---

dc-up:
	$(DC) up -d && $(NPM) run seed:kc

dc-down:
	$(DC) down -v

dc-reset:
	$(DC) down -v && $(DC) up -d && sleep 5 && $(NPM) run seed:kc

kc-seed:
	$(NPM) run seed:kc

# --- Prisma ---

prisma-generate:
	npx prisma generate

prisma-migrate:
	npx prisma migrate dev

prisma-studio:
	npx prisma studio

# --- Setup ---

install:
	$(NPM) ci

clean:
	rm -rf .next node_modules
