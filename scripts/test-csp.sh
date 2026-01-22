#!/bin/bash

# Test script to verify Content Security Policy headers are properly configured
# This script starts the Next.js dev server temporarily and checks the response headers

echo "🔍 Testing Content Security Policy (CSP) Headers..."
echo ""

# Start the dev server in the background
echo "Starting Next.js dev server..."
cd "$(dirname "$0")/.." || exit 1
npm run dev > /dev/null 2>&1 &
DEV_PID=$!

# Wait for server to start
echo "Waiting for server to start..."
sleep 8

# Check if server is running
if ! curl -s http://localhost:3000 > /dev/null; then
    echo "❌ Error: Server failed to start"
    kill $DEV_PID 2>/dev/null
    exit 1
fi

echo ""
echo "✅ Server is running. Checking headers..."
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Fetch headers
HEADERS=$(curl -s -I http://localhost:3000)

# Check for CSP header
if echo "$HEADERS" | grep -i "content-security-policy" > /dev/null; then
    echo "✅ Content-Security-Policy header is present"
    echo ""
    CSP=$(echo "$HEADERS" | grep -i "content-security-policy" | cut -d' ' -f2-)
    echo "CSP Value:"
    echo "$CSP" | tr ';' '\n' | sed 's/^/  - /'
    echo ""
else
    echo "❌ Content-Security-Policy header is MISSING"
    FAILED=1
fi

# Check for X-Frame-Options
if echo "$HEADERS" | grep -i "x-frame-options" > /dev/null; then
    XFO=$(echo "$HEADERS" | grep -i "x-frame-options" | cut -d' ' -f2-)
    echo "✅ X-Frame-Options: $XFO"
else
    echo "❌ X-Frame-Options header is MISSING"
    FAILED=1
fi

# Check for X-Content-Type-Options
if echo "$HEADERS" | grep -i "x-content-type-options" > /dev/null; then
    XCTO=$(echo "$HEADERS" | grep -i "x-content-type-options" | cut -d' ' -f2-)
    echo "✅ X-Content-Type-Options: $XCTO"
else
    echo "❌ X-Content-Type-Options header is MISSING"
    FAILED=1
fi

# Check for Referrer-Policy
if echo "$HEADERS" | grep -i "referrer-policy" > /dev/null; then
    RP=$(echo "$HEADERS" | grep -i "referrer-policy" | cut -d' ' -f2-)
    echo "✅ Referrer-Policy: $RP"
else
    echo "❌ Referrer-Policy header is MISSING"
    FAILED=1
fi

# Check for Permissions-Policy
if echo "$HEADERS" | grep -i "permissions-policy" > /dev/null; then
    PP=$(echo "$HEADERS" | grep -i "permissions-policy" | cut -d' ' -f2-)
    echo "✅ Permissions-Policy: $PP"
else
    echo "❌ Permissions-Policy header is MISSING"
    FAILED=1
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Stop the dev server
echo ""
echo "Stopping dev server..."
kill $DEV_PID 2>/dev/null
wait $DEV_PID 2>/dev/null

echo ""
if [ -z "$FAILED" ]; then
    echo "✅ All security headers are properly configured!"
    echo ""
    echo "🔒 Your application now has:"
    echo "   - Content Security Policy (XSS protection)"
    echo "   - Clickjacking protection (X-Frame-Options)"
    echo "   - MIME-sniffing protection (X-Content-Type-Options)"
    echo "   - Referrer control (Referrer-Policy)"
    echo "   - Feature restrictions (Permissions-Policy)"
    exit 0
else
    echo "❌ Some security headers are missing. Check next.config.ts"
    exit 1
fi
