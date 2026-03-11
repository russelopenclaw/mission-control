#!/bin/bash
# Revert HTTPS changes - restore HTTP-only access

echo "Stopping Caddy..."
sudo systemctl stop caddy

echo "Disabling Caddy from startup..."
sudo systemctl disable caddy

echo ""
echo "✅ Caddy stopped and disabled"
echo ""
echo "Mission Control is now available at:"
echo "http://thewolfefamily.ddns.net:8765"
echo ""
echo "To re-enable Caddy later:"
echo "  sudo systemctl enable caddy"
echo "  sudo systemctl start caddy"
