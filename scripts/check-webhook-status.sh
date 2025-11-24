#!/bin/bash

# ============================================================================
# Webhook Status Checker
# ============================================================================
# Quick script to check if webhooks are reaching your backend
# ============================================================================

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "============================================"
echo "Webhook Configuration Checker"
echo "============================================"
echo ""

# Get backend URL
read -p "Enter your production backend URL: " BACKEND_URL
BACKEND_URL=${BACKEND_URL%/}

echo ""
echo -e "${BLUE}Testing webhook endpoint...${NC}"
echo ""

# Test 1: Check if endpoint responds
echo "Test 1: Checking if webhook endpoint exists..."
echo "URL: $BACKEND_URL/api/stripe/webhooks"
echo ""

RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
    -X POST "$BACKEND_URL/api/stripe/webhooks" \
    -H "Content-Type: application/json" \
    -d '{"test": "data"}')

HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS" | cut -d':' -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_STATUS/d')

case $HTTP_STATUS in
    400)
        echo -e "${GREEN}✅ Endpoint exists and is responding${NC}"
        echo "Response: $BODY"
        if echo "$BODY" | grep -qi "signature"; then
            echo -e "${GREEN}✅ Webhook signature verification is working${NC}"
        fi
        ;;
    404)
        echo -e "${RED}❌ Endpoint not found (404)${NC}"
        echo ""
        echo "The webhook endpoint doesn't exist at this URL."
        echo "Check:"
        echo "  1. Is your backend deployed?"
        echo "  2. Is the URL correct?"
        echo "  3. Does the route exist in your backend code?"
        exit 1
        ;;
    500)
        echo -e "${RED}❌ Server error (500)${NC}"
        echo "Response: $BODY"
        echo ""
        echo "The endpoint exists but is crashing."
        echo "Check backend logs for error details."
        ;;
    502|503)
        echo -e "${RED}❌ Backend not responding ($HTTP_STATUS)${NC}"
        echo ""
        echo "The backend is not accessible or is down."
        echo "Check if your backend service is running."
        exit 1
        ;;
    *)
        echo -e "${YELLOW}⚠️  Unexpected response: HTTP $HTTP_STATUS${NC}"
        echo "Response: $BODY"
        ;;
esac

echo ""
echo "----------------------------------------"
echo "Next Steps:"
echo "----------------------------------------"
echo ""
echo "1. Go to: https://dashboard.stripe.com/webhooks"
echo ""
echo "2. Check if webhook endpoint exists for:"
echo "   URL: $BACKEND_URL/api/stripe/webhooks"
echo ""
echo "3. If endpoint exists, click on it and:"
echo "   - Copy the 'Signing secret' (starts with whsec_)"
echo "   - Set in backend env: STRIPE_WEBHOOK_SECRET=whsec_xxx"
echo "   - Restart backend service"
echo ""
echo "4. Test webhook delivery:"
echo "   - In Stripe Dashboard, click 'Send test webhook'"
echo "   - Select 'customer.subscription.created'"
echo "   - Check if it succeeds (200 OK)"
echo ""
echo "5. Check backend logs for webhook processing:"
echo "   - Look for incoming webhook requests"
echo "   - Check for any errors"
echo ""
echo "For detailed debugging: WEBHOOK_DEBUG_PRODUCTION.md"
echo ""

