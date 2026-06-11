#!/bin/sh
set -e

echo "DATABASE_URL: $DATABASE_URL"

echo "Running migrations..."
npx prisma migrate deploy

echo "Generating Prisma client..."
npx prisma generate

echo "Starting backend..."
exec npm run start:dev
