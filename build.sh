#!/bin/bash

echo "=== Starting custom build script ==="

# Install dependencies
echo "Installing dependencies..."
npm ci --production=false

# Build Next.js
echo "Building Next.js app..."
npm run build

# Copy static files to standalone
echo "Copying static files to standalone..."
if [ -d ".next/standalone" ]; then
    cp -r public .next/standalone/public 2>/dev/null || echo "public folder copy skipped"
    mkdir -p .next/standalone/.next
    cp -r .next/static .next/standalone/.next/static 2>/dev/null || echo "static folder copy skipped"
    echo "Static files copied successfully"
else
    echo "ERROR: .next/standalone directory not found!"
    exit 1
fi

echo "=== Build completed ==="
