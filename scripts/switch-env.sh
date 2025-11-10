#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to show current environment
show_current() {
  if [ -f .env.local ]; then
    echo -e "\n${BLUE}Current environment:${NC}"
    grep "NEXT_PUBLIC_SUPABASE_URL" .env.local | head -1 | sed 's/^/  /'
  else
    echo -e "\n${YELLOW}No .env.local file found${NC}"
  fi
}

# Main script
case "$1" in
  prod|production)
    if [ ! -f .env.production ]; then
      echo "❌ Error: .env.production file not found"
      exit 1
    fi
    cp .env.production .env.local
    echo -e "${GREEN}✅ Switched to PRODUCTION${NC}"
    show_current
    echo -e "\n${YELLOW}⚠️  Restart your dev server to apply changes${NC}"
    ;;
    
  branch|schema-enhancements)
    if [ ! -f .env.branch-schema-enhancements ]; then
      echo "❌ Error: .env.branch-schema-enhancements file not found"
      exit 1
    fi
    cp .env.branch-schema-enhancements .env.local
    echo -e "${GREEN}✅ Switched to SCHEMA-ENHANCEMENTS BRANCH${NC}"
    show_current
    echo -e "\n${YELLOW}⚠️  Restart your dev server to apply changes${NC}"
    ;;
    
  status|current)
    show_current
    ;;
    
  *)
    echo "Usage: ./scripts/switch-env.sh [prod|branch|status]"
    echo ""
    echo "Commands:"
    echo "  prod, production          - Switch to production environment"
    echo "  branch, schema-enhancements - Switch to schema-enhancements branch"
    echo "  status, current           - Show current active environment"
    show_current
    exit 1
    ;;
esac

