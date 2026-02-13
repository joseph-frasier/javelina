# AI Support Chat - Demo Mode

The AI support chat can run in **demo mode** without requiring the backend API. This lets you test the full UI experience with simulated responses.

## Enable Demo Mode

Add this to your `.env.local` file:

```bash
NEXT_PUBLIC_MOCK_SUPPORT_API=true
```

## What's Simulated

The mock mode provides realistic responses for common support scenarios:

### Supported Topics
- **DNS Zones**: Creating zones, managing domains
- **DNS Records**: A, AAAA, CNAME, MX, TXT records
- **Organization Management**: Inviting members, roles, permissions
- **Troubleshooting**: DNS propagation, common issues
- **Billing**: Plans and subscriptions (with ticket escalation)
- **Error Reports**: Bug logging flow

### Features Tested
✅ Real-time messaging with typing indicators
✅ Citation rendering (mock KB articles)
✅ Resolution prompts ("Was this solved?")
✅ Escalation after 2 failed attempts
✅ Ticket creation flow
✅ Context detection (orgId, entry point from URL)

## Try These Example Messages

```
"How do I create a DNS zone?"
"What's the difference between A and CNAME records?"
"How do I invite team members?"
"My DNS changes aren't working"
"I found a bug"
"I need help with billing"
```

## Mock Response Logic

The mock API:
1. Analyzes your message for keywords
2. Returns relevant mock KB articles
3. Tracks attempt count for escalation
4. Simulates network latency (800-1200ms)
5. Logs all actions to console for debugging

## Disable Demo Mode

To connect to the real backend API:

```bash
NEXT_PUBLIC_MOCK_SUPPORT_API=false
# or remove the line entirely
```

Then restart your dev server.
