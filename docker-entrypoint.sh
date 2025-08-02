#!/bin/sh

# Wait for database to be ready
echo "Waiting for database to be ready..."
until npx prisma db push; do
  echo "Database is unavailable - sleeping"
  sleep 1
done

echo "Database is ready!"

# Run migrations
echo "Running database migrations..."
npx prisma migrate deploy

# Generate Prisma client
echo "Generating Prisma client..."
npx prisma generate

# Seed database (optional)
if [ "$NODE_ENV" != "production" ]; then
  echo "Seeding database..."
  npx prisma db seed || echo "Seeding failed or no seed script found"
fi

# Start the application
echo "Starting the application..."
exec "$@"
