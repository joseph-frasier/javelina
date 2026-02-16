# Freshdesk Service Guide

## Overview

The Freshdesk Service provides integration with Freshdesk for knowledge base article syncing, contact management, and ticket creation. It supports both **real mode** (with Freshdesk credentials) and **mock mode** (for development without credentials).

## Environment Variables

Add these to your `.env.local` file:

```bash
# Freshdesk Configuration
NEXT_PUBLIC_FRESHDESK_DOMAIN=your-subdomain     # e.g., "javelina" for javelina.freshdesk.com
FRESHDESK_API_KEY=your_api_key                  # Server-side only (keep secret!)
NEXT_PUBLIC_FRESHDESK_ENABLED=false             # Set to "true" to enable real API calls
```

### Mock Mode vs Real Mode

- **Mock Mode** (`NEXT_PUBLIC_FRESHDESK_ENABLED=false` or not set):
  - No real API calls are made
  - Returns predefined sample data
  - Perfect for development and testing
  - No credentials required

- **Real Mode** (`NEXT_PUBLIC_FRESHDESK_ENABLED=true`):
  - Makes actual API calls to Freshdesk
  - Requires valid `NEXT_PUBLIC_FRESHDESK_DOMAIN` and `FRESHDESK_API_KEY`
  - Use in production only

## Usage Examples

### Import the Service

```typescript
import { freshdeskService } from '@/lib/support/freshdesk-service';
```

### 1. Sync Knowledge Base Articles

Fetch all published articles from Freshdesk (or mock data):

```typescript
const result = await freshdeskService.syncArticles();

if (result.success) {
  console.log(`Synced ${result.articlesCount} articles`);
  result.articles.forEach(article => {
    console.log(`- ${article.title} (ID: ${article.id})`);
  });
} else {
  console.error(`Sync failed: ${result.error}`);
}
```

### 2. Get a Single Article

Retrieve a specific article by ID:

```typescript
const result = await freshdeskService.getArticle(1001);

if (result.success && result.article) {
  console.log(`Title: ${result.article.title}`);
  console.log(`Content: ${result.article.description_text}`);
  console.log(`Tags: ${result.article.tags.join(', ')}`);
} else {
  console.error(`Article not found: ${result.error}`);
}
```

### 3. Get or Create Contact

Map a Javelina user to a Freshdesk contact:

```typescript
const user = {
  id: 'user-123',
  email: 'john@example.com',
  full_name: 'John Doe'
};

const org = {
  id: 'org-456',
  name: 'Acme Inc'
};

const result = await freshdeskService.getOrCreateContact(user, org);

if (result.success && result.contact) {
  console.log(`Contact ID: ${result.contact.id}`);
  console.log(`Is new contact: ${result.isNew}`);
} else {
  console.error(`Contact error: ${result.error}`);
}
```

### 4. Create a Support Ticket

Create a ticket from a user's support request:

```typescript
const result = await freshdeskService.createTicket({
  subject: 'DNS records not updating',
  description: 'I updated my A record 3 days ago but it still shows the old IP.',
  email: 'john@example.com',
  priority: 3, // 1=low, 2=medium, 3=high, 4=urgent
  tags: ['dns', 'propagation'],
  custom_fields: {
    cf_page_url: '/zone/example.com',
    cf_user_id: 'user-123',
    cf_org_id: 'org-456',
  },
});

if (result.success && result.ticket) {
  console.log(`Ticket created: #${result.ticket.id}`);
  console.log(`Status: ${result.ticket.status}`); // 2=open
} else {
  console.error(`Ticket creation failed: ${result.error}`);
}
```

### 5. Retrieve Ticket Details

Get information about an existing ticket:

```typescript
const result = await freshdeskService.getTicket(10001);

if (result.success && result.ticket) {
  console.log(`Subject: ${result.ticket.subject}`);
  console.log(`Status: ${result.ticket.status}`);
  console.log(`Priority: ${result.ticket.priority}`);
  console.log(`Created: ${result.ticket.created_at}`);
} else {
  console.error(`Ticket not found: ${result.error}`);
}
```

### 6. Check Configuration

Verify service status:

```typescript
console.log(`Freshdesk enabled: ${freshdeskService.isEnabled()}`);
console.log(`Freshdesk configured: ${freshdeskService.isConfigured()}`);

// isEnabled() - Returns true if NEXT_PUBLIC_FRESHDESK_ENABLED=true
// isConfigured() - Returns true if enabled AND has valid credentials
```

## TypeScript Types

All methods return strongly-typed results:

```typescript
// Article sync result
interface SyncArticlesResult {
  success: boolean;
  articlesCount: number;
  articles: FreshdeskArticle[];
  error?: string;
}

// Single article result
interface GetArticleResult {
  success: boolean;
  article?: FreshdeskArticle;
  error?: string;
}

// Contact result
interface ContactResult {
  success: boolean;
  contact?: FreshdeskContact;
  isNew?: boolean;
  error?: string;
}

// Ticket result
interface TicketResult {
  success: boolean;
  ticket?: FreshdeskTicket;
  error?: string;
}
```

## Mock Data

When running in mock mode, the service provides:

- **5 sample articles** covering DNS zones, records, troubleshooting, and organization management
- **Auto-generated contacts** with unique IDs starting from 5000
- **Auto-generated tickets** with unique IDs starting from 10000
- **Realistic delays** (200-1000ms) to simulate network latency

## Error Handling

All methods include proper error handling:

```typescript
const result = await freshdeskService.syncArticles();

if (!result.success) {
  // Handle error
  console.error('Sync failed:', result.error);
  // Show user-friendly message
  // Log to monitoring service
  // etc.
}
```

## Integration Steps

### Step 1: Set up environment variables

Copy `.env.local.example` to `.env.local` and configure:

```bash
NEXT_PUBLIC_FRESHDESK_ENABLED=false  # Start with mock mode
```

### Step 2: Test in mock mode

Import and use the service in your components/API routes. Verify everything works with mock data.

### Step 3: Get Freshdesk credentials

1. Log into your Freshdesk admin panel
2. Go to Profile Settings → API Key
3. Copy your API key
4. Note your subdomain (e.g., `javelina` in `javelina.freshdesk.com`)

### Step 4: Configure real mode

Update `.env.local`:

```bash
NEXT_PUBLIC_FRESHDESK_DOMAIN=javelina
FRESHDESK_API_KEY=your_actual_api_key_here
NEXT_PUBLIC_FRESHDESK_ENABLED=true
```

### Step 5: Configure custom fields (optional)

If you want to store Javelina-specific data in Freshdesk:

1. In Freshdesk, go to Admin → Ticket Fields (or Contact Fields)
2. Add custom fields:
   - `cf_javelina_user_id` (text)
   - `cf_javelina_org_id` (text)
   - `cf_javelina_org_name` (text)
   - `cf_page_url` (text)

These fields are automatically populated by the service when creating contacts/tickets.

## Best Practices

1. **Always use mock mode during development** to avoid hitting API rate limits
2. **Check `result.success`** before accessing data
3. **Log errors** to your monitoring service in production
4. **Use custom fields** to track Javelina context in Freshdesk
5. **Tag tickets** appropriately for better organization
6. **Set appropriate priority** based on issue severity

## Rate Limits

Freshdesk API has rate limits (typically 1000 requests/hour for most plans). The service includes:

- Console logging of all API calls
- Error handling for rate limit responses
- Mock mode to avoid hitting limits during development

## Support

For questions or issues with the Freshdesk integration, contact your development team or refer to:

- [Freshdesk API Documentation](https://developers.freshdesk.com/api/)
- This service file: `lib/support/freshdesk-service.ts`
