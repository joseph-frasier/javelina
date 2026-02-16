#!/bin/bash

# Script to test Auth0 flow and debug cookie issues
# Usage: ./scripts/test-auth-flow.sh

echo "🔍 Testing Auth0 Authentication Flow"
echo "====================================="
echo ""

# Check if NEXT_PUBLIC_API_URL is set
if [ -z "$NEXT_PUBLIC_API_URL" ]; then
  echo "⚠️  NEXT_PUBLIC_API_URL not set in environment"
  echo "Please provide the backend URL:"
  read API_URL
else
  API_URL=$NEXT_PUBLIC_API_URL
  echo "✅ Using API_URL: $API_URL"
fi

echo ""
echo "1️⃣  Testing /auth/me endpoint (session check)"
echo "=============================================="
curl -v -X GET "$API_URL/auth/me" \
  -H "Cookie: javelina_session=test" \
  --cookie-jar cookies.txt \
  --cookie cookies.txt

echo ""
echo ""
echo "2️⃣  Testing CORS configuration"
echo "==============================="
curl -v -X OPTIONS "$API_URL/auth/me" \
  -H "Origin: https://app.javelina.cloud" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: Content-Type"

echo ""
echo ""
echo "3️⃣  Backend Environment Check"
echo "=============================="
echo "Expected environment variables in backend:"
echo "  - FRONTEND_URL=https://app.javelina.cloud"
echo "  - AUTH0_DOMAIN=javelina.us.auth0.com"
echo "  - AUTH0_CLIENT_ID=0exfHOmNKxciMVZaUeDRljEUePado5X4"
echo "  - AUTH0_CALLBACK_URL=https://app.javelina.cloud/auth/callback"
echo "  - SESSION_COOKIE_NAME=javelina_session"
echo "  - NODE_ENV=production"
echo ""
echo "Please verify these are set correctly in your production backend!"
echo ""
echo "4️⃣  Cookie Domain Analysis"
echo "=========================="
echo "Frontend: app.javelina.cloud"
echo "Backend:  $(echo $API_URL | sed 's|https://||' | sed 's|http://||' | cut -d'/' -f1)"
echo ""
if [[ "$API_URL" == *"app.javelina.cloud"* ]]; then
  echo "✅ Same domain - cookies should work with sameSite: 'lax'"
elif [[ "$API_URL" == *".javelina.cloud"* ]]; then
  echo "⚠️  Different subdomain - need domain: '.javelina.cloud' and sameSite: 'none'"
else
  echo "❌ Different domain - need CORS credentials: true and sameSite: 'none'"
fi

echo ""
echo "📋 Summary"
echo "=========="
echo "If session cookie is not working in production:"
echo "1. Check CORS configuration allows credentials"
echo "2. Check cookie sameSite setting (use 'none' for cross-domain)"
echo "3. Check cookie domain setting (use '.javelina.cloud' for subdomains)"
echo "4. Verify FRONTEND_URL is set correctly in backend"
echo "5. Check Auth0 callback URL is whitelisted"

# Clean up
rm -f cookies.txt
