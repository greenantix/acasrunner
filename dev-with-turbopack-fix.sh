#!/bin/bash

echo "Starting ACAS Runner with Turbopack workaround..."

# Function to create missing manifest if needed
create_manifest_if_missing() {
    MANIFEST_DIR=".next/server/app/page"
    MANIFEST_FILE="$MANIFEST_DIR/app-build-manifest.json"
    
    if [ ! -f "$MANIFEST_FILE" ]; then
        echo "Creating missing manifest file..."
        mkdir -p "$MANIFEST_DIR"
        cat > "$MANIFEST_FILE" << 'EOF'
{
  "pages": {
    "/page": [
      "static/chunks/[turbopack]_browser_dev_hmr-client_hmr-client_ts_fd44f5a4._.js",
      "static/chunks/node_modules_next_dist_compiled_2ce9398a._.js",
      "static/chunks/node_modules_next_dist_client_8f19e6fb._.js",
      "static/chunks/node_modules_next_dist_2ecbf5fa._.js",
      "static/chunks/node_modules_@swc_helpers_cjs_00636ac3._.js",
      "static/chunks/_e69f0d32._.js",
      "static/chunks/_93808211._.js"
    ]
  }
}
EOF
        echo "Manifest file created."
    fi
}

# Start the development server with Turbopack
export NEXT_TURBOPACK=1

# Create the manifest in background after a delay
(sleep 8 && create_manifest_if_missing) &

# Start Next.js
npx next dev --turbopack -p 9002
