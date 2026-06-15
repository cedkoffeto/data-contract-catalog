#!/usr/bin/env bash
set -euo pipefail

# Seed Keycloak users
# Usage: ./scripts/seed-keycloak.sh
# Executes automatically after keycloak starts (via docker compose or npm run dev)

KC_BASE="${KC_BASE_URL:-http://localhost:8080}"
KC_REALM="${KC_REALM:-data-contracts}"
KC_ADMIN_USER="${KC_ADMIN:-admin}"
KC_ADMIN_PASS="${KC_ADMIN_PASSWORD:-admin}"

USERS=(
  "contract.user:Contract:User:contract.user@example.com:admin"
  "admin.user:Admin:User:admin.user@example.com:admin"
  "editor.user:Editor:User:editor.user@example.com:editor"
  "reader.user:Reader:User:reader.user@example.com:reader"
  "data_owner.user:Data Owner:User:data_owner.user@example.com:data_owner"
)

echo "[keycloak-seed] Waiting for Keycloak at $KC_BASE..."

# Wait for Keycloak to be ready
for i in $(seq 1 30); do
  if curl -sf "$KC_BASE/realms/master" > /dev/null 2>&1; then
    echo "[keycloak-seed] Keycloak is ready"
    break
  fi
  if [ "$i" -eq 30 ]; then
    echo "[keycloak-seed] ERROR: Keycloak did not start in time"
    exit 1
  fi
  sleep 2
done

# Get admin token
echo "[keycloak-seed] Getting admin token..."
ADMIN_TOKEN=$(curl -sf -X POST "$KC_BASE/realms/master/protocol/openid-connect/token" \
  -H "content-type: application/x-www-form-urlencoded" \
  -d "grant_type=password&client_id=admin-cli&username=$KC_ADMIN_USER&password=$KC_ADMIN_PASS" \
  | node -e "process.stdin.on('data',d=>console.log(JSON.parse(d).access_token))")

if [ -z "$ADMIN_TOKEN" ]; then
  echo "[keycloak-seed] ERROR: Failed to get admin token"
  exit 1
fi

echo "[keycloak-seed] Ensuring realm $KC_REALM exists..."

# Create realm if it doesn't exist (idempotent)
curl -sf -X POST -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"id\":\"$KC_REALM\",\"realm\":\"$KC_REALM\",\"enabled\":true}" \
  "$KC_BASE/admin/realms" \
  -o /dev/null 2>&1 || true

echo "[keycloak-seed] Creating/updating users..."

for user_entry in "${USERS[@]}"; do
  IFS=':' read -r username first last email role <<< "$user_entry"

  echo "  $username ($role)"

  # Check if user exists
  EXISTING=$(curl -sf -H "Authorization: Bearer $ADMIN_TOKEN" \
    "$KC_BASE/admin/realms/$KC_REALM/users?username=$username" \
    | node -e "process.stdin.on('data',d=>{try{const r=JSON.parse(d);console.log(r[0]?.id||'')}catch{console.log('')}})" 2>/dev/null || echo "")

  if [ -n "$EXISTING" ]; then
    # User exists — reset password
    curl -sf -X PUT -H "Authorization: Bearer $ADMIN_TOKEN" \
      -H "Content-Type: application/json" \
      -d '{"type":"password","value":"password","temporary":false}' \
      "$KC_BASE/admin/realms/$KC_REALM/users/$EXISTING/reset-password" \
      -o /dev/null
    echo "    - Password reset OK"
  else
    # Create user
    USER_ID=$(curl -sf -X POST -H "Authorization: Bearer $ADMIN_TOKEN" \
      -H "Content-Type: application/json" \
      -d "{
        \"username\":\"$username\",
        \"enabled\":true,
        \"emailVerified\":true,
        \"firstName\":\"$first\",
        \"lastName\":\"$last\",
        \"email\":\"$email\",
        \"credentials\":[{\"type\":\"password\",\"value\":\"password\",\"temporary\":false}]
      }" \
      "$KC_BASE/admin/realms/$KC_REALM/users" \
      -w "\n%D{http_code}" 2>/dev/null | tail -1)
    echo "    - Created (HTTP $USER_ID)"
  fi
done

echo "[keycloak-seed] Done — all users ready"
