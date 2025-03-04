#!/usr/bin/env sh
set -e

echo "Waiting for Mongo to be available..."

# Attempt to connect via Node.js in a loop
MAX_ATTEMPTS=10
attempt=0

while [ $attempt -lt $MAX_ATTEMPTS ]; do
  # Try a quick Node one-liner to check connection
  node <<EOF
const mongoose = require('mongoose');
(async () => {
  try {
    await mongoose.connect('mongodb://mongo:27017/scisubmit');
    console.log("Mongo is up!");
    process.exit(0);
  } catch (err) {
    process.exit(1);
  }
})();
EOF

  if [ $? -eq 0 ]; then
    # Connection succeeded
    break
  fi

  attempt=$((attempt+1))
  echo "Mongo not ready yet... ($attempt/$MAX_ATTEMPTS), retrying in 3s"
  sleep 3
done

if [ $attempt -eq $MAX_ATTEMPTS ]; then
  echo "Mongo did not become available after $MAX_ATTEMPTS attempts."
  exit 1
fi

echo "Running DB seed..."
npx ts-node src/seed.ts || echo "Seeding failed or skipped."

echo "Database seeded (if needed). Starting server now..."
exec "$@"