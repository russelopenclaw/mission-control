#!/bin/bash
# SSL Setup Script for Mission Control
# Run this once to install cert tools and trust Caddy's local CA

set -e

echo "🔧 Installing certificate tools..."
sudo apt install -y libnss3-tools

echo "📋 Installing Caddy local root certificate..."
# Caddy will auto-install the cert when it reloads

echo "✅ Reload Caddy to complete setup..."
sudo systemctl reload caddy

echo ""
echo "🎉 HTTPS is ready!"
echo "Access Mission Control at: https://thewolfefamily.ddns.net"
echo ""
echo "⚠️  If you still see certificate warnings in browsers:"
echo "   - Chrome/Edge: Accept the risk and continue"
echo "   - Firefox: Advanced → Accept the Risk and Continue"
echo "   - Or run: certutil -d sql:$HOME/.pki/nssdb -D -n \"Caddy Local Authority - ECC Root\""
