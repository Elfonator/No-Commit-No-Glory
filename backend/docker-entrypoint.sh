#!/usr/bin/env sh
set -e

echo "Waiting for Mongo to be ready..."
until nc -z mongo 27017
do
  echo "Mongo is unavailable - waiting..."
  sleep 2
done

echo "Running DB seed..."
npx ts-node src/seed.ts || echo "Seeding failed or already seeded."

echo "Starting backend..."
exec npx ts-node src/server.ts