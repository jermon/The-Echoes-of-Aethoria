#!/bin/bash

# Run_local.sh - Start Jekyll server for The Echoes of Aethoria

# Change to the script directory
cd "$(dirname "$0")"

echo "Starting Jekyll server for The Echoes of Aethoria..."
echo "Server will be available at http://localhost:4000"
echo "Press Ctrl+C to stop the server"
echo ""

# Start Jekyll server with live reload
jekyll serve --livereload --trace

