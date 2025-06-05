#!/bin/bash

echo "🚀 Starting ACAS Runner with Turbopack..."

# Kill any existing processes on port 9002
lsof -ti:9002 | xargs kill -9 2>/dev/null || true

# Function to create missing manifest files
create_missing_manifests() {
    local manifest_dir=".next/server/app/page"
    local manifest_file="$manifest_dir/app-build-manifest.json"
    local paths_file="$manifest_dir/app-paths-manifest.json"
    local build_file="$manifest_dir/build-manifest.json"
    
    if [ ! -f "$manifest_file" ]; then
        echo "📁 Creating missing manifest directory..."
        mkdir -p "$manifest_dir"
        
        echo "📄 Creating app-build-manifest.json..."
        cat > "$manifest_file" << 'EOF'
{
  "pages": {
    "/page": [
      "static/chunks/webpack.js",
      "static/chunks/main.js",
      "static/chunks/pages/_app.js"
    ]
  }
}
EOF

        echo "📄 Creating app-paths-manifest.json..."
        cat > "$paths_file" << 'EOF'
{
  "/page": "/page"
}
EOF

        echo "📄 Creating build-manifest.json..."
        cat > "$build_file" << 'EOF'
{
  "polyfillFiles": [
    "static/chunks/polyfills.js"
  ],
  "devFiles": [
    "static/chunks/webpack.js"
  ],
  "ampDevFiles": [
    "static/chunks/webpack.js"
  ],
  "lowPriorityFiles": [
    "static/chunks/main.js",
    "static/chunks/pages/_app.js"
  ],
  "rootMainFiles": [],
  "pages": {
    "/": [
      "static/chunks/webpack.js",
      "static/chunks/main.js",
      "static/chunks/pages/_app.js",
      "static/chunks/pages/index.js"
    ],
    "/_app": [
      "static/chunks/webpack.js",
      "static/chunks/main.js",
      "static/chunks/pages/_app.js"
    ],
    "/_error": [
      "static/chunks/webpack.js",
      "static/chunks/main.js",
      "static/chunks/pages/_app.js",
      "static/chunks/pages/_error.js"
    ]
  },
  "ampFirstPages": []
}
EOF
        echo "✅ Manifest files created successfully!"
    fi
}

# Function to monitor and fix manifests
monitor_manifests() {
    while true; do
        sleep 5
        if [ -d ".next/server/app" ] && [ ! -f ".next/server/app/page/app-build-manifest.json" ]; then
            echo "🔧 Detected missing manifest, recreating..."
            create_missing_manifests
        fi
    done
}

# Clean any existing build artifacts
echo "🧹 Cleaning build artifacts..."
rm -rf .next .turbopack

# Start manifest monitor in background
monitor_manifests &
MONITOR_PID=$!

# Handle cleanup on exit
cleanup() {
    echo "🛑 Shutting down..."
    kill $MONITOR_PID 2>/dev/null || true
    lsof -ti:9002 | xargs kill -9 2>/dev/null || true
    exit 0
}

trap cleanup SIGINT SIGTERM

# Start Next.js with Turbopack
echo "🎯 Starting Next.js with Turbopack on port 9002..."
cross-env NEXT_TURBOPACK=1 npx next dev --turbopack -p 9002 &
NEXT_PID=$!

# Wait for Next.js to start and create initial manifests if needed
sleep 8
create_missing_manifests

# Wait for Next.js process
wait $NEXT_PID
