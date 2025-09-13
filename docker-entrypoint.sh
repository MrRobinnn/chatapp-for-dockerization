#!/bin/sh
set -e

CB_HOST=${COUCHBASE_HOST:-couchbase}
CB_PORT=${COUCHBASE_PORT:-8091}
CB_ADMIN=${COUCHBASE_ADMINISTRATOR_USERNAME:-Administrator}
CB_ADMIN_PASS=${COUCHBASE_ADMINISTRATOR_PASSWORD:-Alireza1379!}

APP_CB_BUCKET=${APP_CB_BUCKET:-myApp}
APP_CB_SCOPE=${APP_CB_SCOPE:-chat}
APP_CB_COLLECTIONS=${APP_CB_COLLECTIONS:-users,messages,rooms}
APP_CB_USER=${APP_CB_USER:-appuser}
APP_CB_PASS=${APP_CB_PASS:-apppass}

# Wait for Couchbase to be ready
echo "[entrypoint] waiting for Couchbase at ${CB_HOST}:${CB_PORT} ..."
until curl -sSf "http://${CB_HOST}:${CB_PORT}/pools" >/dev/null 2>&1; do
  echo "[entrypoint] Couchbase not ready yet, retrying in 5s..."
  sleep 5
done
echo "[entrypoint] Couchbase reachable."

# Create bucket (idempotent)
echo "[entrypoint] ensuring bucket '${APP_CB_BUCKET}' exists..."
curl -sf -u "${CB_ADMIN}:${CB_ADMIN_PASS}" -X POST "http://${CB_HOST}:${CB_PORT}/pools/default/buckets" \
  -d "name=${APP_CB_BUCKET}" \
  -d "bucketType=couchbase" \
  -d "ramQuotaMB=256" \
  || echo "[entrypoint] bucket may already exist - continuing."

sleep 4

# Create scope
echo "[entrypoint] ensuring scope '${APP_CB_SCOPE}' exists..."
curl -sf -u "${CB_ADMIN}:${CB_ADMIN_PASS}" -X POST "http://${CB_HOST}:${CB_PORT}/pools/default/buckets/${APP_CB_BUCKET}/scopes" \
  -d "name=${APP_CB_SCOPE}" \
  || echo "[entrypoint] scope may already exist - continuing."

# Create collections
OLD_IFS=$IFS
IFS=','
for coll in ${APP_CB_COLLECTIONS}; do
  coll=$(echo "$coll" | tr -d ' ')
  echo "[entrypoint] ensuring collection '${coll}' exists..."
  curl -sf -u "${CB_ADMIN}:${CB_ADMIN_PASS}" -X POST "http://${CB_HOST}:${CB_PORT}/pools/default/buckets/${APP_CB_BUCKET}/scopes/${APP_CB_SCOPE}/collections" \
    -d "name=${coll}" \
    || echo "[entrypoint] collection ${coll} may already exist."
done
IFS=$OLD_IFS

# Create/update RBAC user
echo "[entrypoint] ensuring RBAC user '${APP_CB_USER}' exists..."
curl -sf -u "${CB_ADMIN}:${CB_ADMIN_PASS}" -X PUT "http://${CB_HOST}:${CB_PORT}/settings/rbac/users/local/${APP_CB_USER}" \
  -d "password=${APP_CB_PASS}" \
  -d "roles=bucket_full_access[${APP_CB_BUCKET}]" \
  || echo "[entrypoint] user may already exist."

echo "[entrypoint] initialization finished. launching process..."

# Run the main container command
exec "$@"