#!/bin/bash

PORT=2137
HOST=0.0.0.0

echo "🎮 Starting Godot Web Game Server"
echo "================================"
echo ""
echo "Server will be available at:"
echo "  • Local: http://localhost:$PORT"
echo "  • Network: http://$HOST:$PORT"
echo ""
echo "Game URLs:"
echo "  • Main page (itch.io style): http://localhost:$PORT/index.html"
echo "  • Game only: http://localhost:$PORT/game.html"
echo ""
echo "Press Ctrl+C to stop the server"
echo "================================"
echo ""

cd web_export
python3 -m http.server $PORT --bind $HOST
