#!/bin/bash

# ============================================================================
# Production API Testing Script
# ============================================================================
# This script helps test your production backend API to diagnose issues
# with subscription creation.
#
# Usage:
#   chmod +x scripts/test-production-api.sh
#   ./scripts/test-production-api.sh
# ============================================================================

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "============================================"
echo "Production API Diagnostic Test"
echo "============================================"
echo ""

# Get backend URL from user
read -p "Enter your production backend URL (e.g., https://api.example.com): " BACKEND_URL

# Remove trailing slash if present
BACKEND_URL=${BACKEND_URL%/}

echo ""
echo "Testing backend at: $BACKEND_URL"
echo ""

# ============================================================================
# Test 1: Health Check
# ============================================================================
echo "----------------------------------------"
echo "Test 1: Health Check"
echo "----------------------------------------"
echo "Testing: $BACKEND_URL/api/health"
echo ""

HEALTH_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" "$BACKEND_URL/api/health")
HTTP_STATUS=$(echo "$HEALTH_RESPONSE" | grep "HTTP_STATUS" | cut -d':' -f2)
HEALTH_BODY=$(echo "$HEALTH_RESPONSE" | sed '/HTTP_STATUS/d')

if [ "$HTTP_STATUS" = "200" ]; then
    echo -e "${GREEN}✅ Health check passed${NC}"
    echo "Response: $HEALTH_BODY"
else
    echo -e "${RED}❌ Health check failed (HTTP $HTTP_STATUS)${NC}"
    echo "Response: $HEALTH_BODY"
    echo ""
    echo -e "${YELLOW}Possible issues:${NC}"
    echo "  - Backend is not running"
    echo "  - Backend URL is incorrect"
    echo "  - Network/firewall issues"
    exit 1
fi

echo ""

# ============================================================================
# Test 2: Subscription Endpoint (requires auth)
# ============================================================================
echo "----------------------------------------"
echo "Test 2: Subscription Creation Endpoint"
echo "----------------------------------------"
echo ""
echo -e "${YELLOW}This test requires authentication.${NC}"
echo "You need to provide:"
echo "  1. JWT token (from your production site)"
echo "  2. Organization ID"
echo ""
echo "To get your JWT token:"
echo "  1. Go to your production site"
echo "  2. Open Developer Tools (F12) → Console"
echo "  3. Run this code:"
echo ""
echo "     const session = await (await fetch('/api/auth/session')).json();"
echo "     console.log(session.access_token);"
echo ""
echo "  4. Copy the token that's printed"
echo ""
read -p "Enter JWT token (or press Enter to skip): " JWT_TOKEN
echo ""

if [ -z "$JWT_TOKEN" ]; then
    echo -e "${YELLOW}⏭️  Skipping authenticated test${NC}"
else
    read -p "Enter organization ID: " ORG_ID
    echo ""
    echo "Testing: POST $BACKEND_URL/api/stripe/subscriptions"
    echo "Payload: {org_id: \"$ORG_ID\", plan_code: \"pro\", price_id: \"\"}"
    echo ""
    
    SUB_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
        -X POST "$BACKEND_URL/api/stripe/subscriptions" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $JWT_TOKEN" \
        -d "{\"org_id\":\"$ORG_ID\",\"plan_code\":\"pro\",\"price_id\":\"\"}")
    
    HTTP_STATUS=$(echo "$SUB_RESPONSE" | grep "HTTP_STATUS" | cut -d':' -f2)
    SUB_BODY=$(echo "$SUB_RESPONSE" | sed '/HTTP_STATUS/d')
    
    if [ "$HTTP_STATUS" = "200" ]; then
        echo -e "${GREEN}✅ Subscription endpoint working${NC}"
        echo "Response: $SUB_BODY"
    else
        echo -e "${RED}❌ Subscription endpoint failed (HTTP $HTTP_STATUS)${NC}"
        echo "Response: $SUB_BODY"
        echo ""
        echo -e "${YELLOW}Possible issues:${NC}"
        
        case $HTTP_STATUS in
            401)
                echo "  - JWT token is invalid or expired"
                echo "  - Auth middleware not working"
                ;;
            404)
                echo "  - Endpoint doesn't exist"
                echo "  - Backend routes not configured correctly"
                ;;
            500)
                echo "  - Backend error (check logs)"
                echo "  - Missing environment variables (STRIPE_SECRET_KEY, etc.)"
                echo "  - Database connection issue"
                ;;
            502|503)
                echo "  - Backend is not responding"
                echo "  - Backend crashed or not running"
                ;;
        esac
        
        if echo "$SUB_BODY" | grep -q "Stripe"; then
            echo ""
            echo -e "${RED}Stripe-related error detected!${NC}"
            echo "Check these environment variables in your backend:"
            echo "  - STRIPE_SECRET_KEY (must be sk_live_... for production)"
            echo "  - STRIPE_WEBHOOK_SECRET"
        fi
    fi
fi

echo ""

# ============================================================================
# Test 3: CORS Check
# ============================================================================
echo "----------------------------------------"
echo "Test 3: CORS Configuration"
echo "----------------------------------------"
read -p "Enter your production frontend URL (e.g., https://app.example.com): " FRONTEND_URL

echo ""
echo "Testing CORS from: $FRONTEND_URL"
echo ""

CORS_RESPONSE=$(curl -s -I -X OPTIONS "$BACKEND_URL/api/health" \
    -H "Origin: $FRONTEND_URL" \
    -H "Access-Control-Request-Method: POST")

if echo "$CORS_RESPONSE" | grep -q "Access-Control-Allow-Origin"; then
    ALLOWED_ORIGIN=$(echo "$CORS_RESPONSE" | grep "Access-Control-Allow-Origin" | cut -d' ' -f2 | tr -d '\r')
    echo -e "${GREEN}✅ CORS is configured${NC}"
    echo "Allowed origin: $ALLOWED_ORIGIN"
    
    if [ "$ALLOWED_ORIGIN" != "$FRONTEND_URL" ] && [ "$ALLOWED_ORIGIN" != "*" ]; then
        echo -e "${YELLOW}⚠️  Warning: CORS allows '$ALLOWED_ORIGIN' but your frontend is '$FRONTEND_URL'${NC}"
        echo "This might cause issues!"
    fi
else
    echo -e "${RED}❌ CORS headers not found${NC}"
    echo ""
    echo -e "${YELLOW}Possible issues:${NC}"
    echo "  - CORS not configured in backend"
    echo "  - FRONTEND_URL environment variable not set correctly"
fi

echo ""

# ============================================================================
# Summary
# ============================================================================
echo "============================================"
echo "Test Summary"
echo "============================================"
echo ""
echo "Backend URL: $BACKEND_URL"
echo "Frontend URL: $FRONTEND_URL"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "1. Check your backend logs for detailed error messages"
echo "2. Verify all environment variables are set in production:"
echo "   - STRIPE_SECRET_KEY (sk_live_... for production)"
echo "   - STRIPE_WEBHOOK_SECRET"
echo "   - SUPABASE_SERVICE_ROLE_KEY"
echo "   - FRONTEND_URL"
echo "3. If tests passed but subscriptions still not working:"
echo "   - Check Stripe Dashboard for activity/errors"
echo "   - Verify webhook endpoint is configured"
echo "   - Check database directly for subscription records"
echo ""
echo "For more detailed debugging, see:"
echo "  - PRODUCTION_ENVIRONMENT_DEBUG.md"
echo "  - STRIPE_WEBHOOK_SETUP.md"
echo ""



