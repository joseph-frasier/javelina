# Support Chat Quick Start Guide

Get the AI-powered support chat system running in **under 10 minutes** using mock mode.

---

## Prerequisites

Before you begin, ensure you have:

- ✅ Node.js 18+ installed
- ✅ Access to the Javelina codebase
- ✅ Local development environment running
- ✅ Basic familiarity with the project structure

**No backend, no API keys, no credentials needed for this quick start!**

---

## 5-Minute Setup

### Step 1: Configure Environment (1 min)

Create or update your `.env.local` file with mock mode enabled:

```bash
# Enable mock support API (no backend required)
NEXT_PUBLIC_MOCK_SUPPORT_API=true

# Disable Freshdesk (use mock data)
NEXT_PUBLIC_FRESHDESK_ENABLED=false

# Your existing Supabase config (already set up)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

### Step 2: Install Dependencies (if needed) (1 min)

```bash
npm install
```

The chat widget uses:
- `gsap` and `@gsap/react` for animations (already in `package.json`)
- `date-fns` for timestamp formatting (already in `package.json`)

### Step 3: Apply Database Migration (2 min)

The support chat system requires database tables. Apply the migration:

**Option A: Supabase CLI (Recommended)**
```bash
# Link your project (if not already linked)
supabase link --project-ref your-project-ref

# Push the migration
supabase db push
```

**Option B: Supabase Dashboard**
1. Go to https://app.supabase.com/project/your-project/sql
2. Open `supabase/migrations/20260127000000_support_chat_system.sql`
3. Copy and paste the entire file into the SQL editor
4. Click "Run"

**Verify migration succeeded:**
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_name IN ('chat_sessions', 'chat_messages', 'kb_documents');
```

You should see 3 tables returned.

### Step 4: Start Development Server (1 min)

```bash
npm run dev
```

Navigate to: `http://localhost:3000`

### Step 5: Verify Chat Widget Appears (< 1 min)

Look for the **chat button** in the bottom-right corner of the screen. It should be visible on most pages.

**If you don't see it:** Check that you're on a page where the chat widget is rendered. Try navigating to any authenticated page (zones, settings, etc.).

---

## Testing the Chat

### Test 1: Basic Conversation (Happy Path)

1. **Click the chat button** in the bottom-right corner
2. **Watch the animation** - The window should slide up and fade in smoothly
3. **Type a message:**
   ```
   How do I add an A record?
   ```
4. **Press Enter** or click the send button
5. **Observe the response:**
   - AI assistant "Javi" responds with step-by-step instructions
   - Citation links appear below the response (e.g., "How to Add a New DNS Record")
   - Resolution buttons appear: **"Yes, resolved"** | **"Not yet"**

6. **Click "Yes, resolved"**
7. **Verify:** Thank you message appears, conversation marked as resolved

**Expected mock response:**
```
To add an A record:

1. Navigate to your zone
2. Click 'Add Record' button
3. Select the record type (A, AAAA, CNAME, MX, TXT, etc.)
4. Enter the record name (hostname)
5. Enter the record value
6. Set TTL (optional, default is 3600 seconds)
7. Click 'Save'

[Sources: How to Add a New DNS Record, Understanding DNS Record Types]
```

### Test 2: Escalation Path (Ticket Creation)

1. **Click the chat button** again (opens new conversation)
2. **Type:**
   ```
   My DNS records aren't saving
   ```
3. **Press Enter**
4. **Click "Not yet"** when resolution buttons appear
5. **Type a follow-up:**
   ```
   I've tried multiple times but it's still not working
   ```
6. **Press Enter**
7. **Click "Not yet"** again
8. **Observe:** After 2 failed attempts, Javi offers to create a ticket:
   ```
   I understand you're still having issues. Would you like me to create 
   a support ticket so our team can investigate?
   ```
9. **Click "Create Ticket"**
10. **Fill out the ticket form:**
    - Subject: Auto-populated or edit as needed
    - Description: Conversation history is automatically included
    - Priority: Select (Low, Medium, High, Urgent)
11. **Click "Submit Ticket"**
12. **Verify:** Success message with mock ticket ID (e.g., "Ticket #10001 created")

### Test 3: Direct Bug Report

1. **Open chat**
2. **Type:**
   ```
   I found a bug - when I delete a zone, the page crashes
   ```
3. **Press Enter**
4. **Observe:** Javi automatically offers ticket creation for bug reports
5. **Click "Create Ticket"** and submit

### Test 4: Multiple Topics

Try these other prompts to test mock responses:

```
How do I manage team members?
```

```
What DNS record types are supported?
```

```
How long does DNS propagation take?
```

```
I need help with billing
```

### Test 5: Chat Behavior

**Test animations:**
- Open/close the chat multiple times - smooth GSAP animations
- Notice the slide-up, fade-in, and scale effects

**Test persistence:**
- Type a message, close chat, reopen - conversation should persist
- Close and reopen after 5+ minutes - new conversation session starts

**Test keyboard shortcuts:**
- Press **Enter** to send messages
- Press **Escape** to close chat (if implemented)

**Test dark mode:**
- Toggle dark mode in your app settings
- Chat window should adapt to the theme

---

## Viewing Admin Dashboard

### Step 1: Grant SuperAdmin Access

You need SuperAdmin role to access the support review dashboard.

**Run this SQL in Supabase:**
```sql
-- Replace 'your-user-id' with your actual Supabase user ID
INSERT INTO user_roles (user_id, role)
VALUES ('your-user-id', 'SuperAdmin')
ON CONFLICT (user_id) DO UPDATE SET role = 'SuperAdmin';
```

**Find your user ID:**
- Go to Supabase Dashboard → Authentication → Users
- Copy your user ID from the list

### Step 2: Navigate to Admin Dashboard

Go to: `http://localhost:3000/admin/support-review`

### Step 3: Explore the Dashboard

**What you'll see:**

1. **Conversation List**
   - All support conversations across all users/orgs
   - Filterable by:
     - Date range (Last 7, 30, 90 days)
     - Status (pending, resolved, escalated, abandoned)
     - Organization
   - Sortable by:
     - Most recent
     - Most messages
     - Escalated tickets

2. **Conversation Details**
   - Click any conversation to view:
     - Complete message history
     - Citations used in responses
     - User feedback (thumbs up/down, resolution status)
     - App state snapshots (for debugging)
     - Linked Freshdesk ticket (if escalated)

3. **Metrics Section** (Ready for backend)
   - Placeholder for analytics:
     - Total conversations
     - Resolution rate
     - Deflection rate (% solved without ticket)
     - Average response time
     - Top intents (most common questions)
     - Feedback scores

**Note:** In mock mode, you'll see minimal data or placeholders. Real conversations you create via the chat widget **will** appear here if the database is properly set up.

### Step 4: Test Admin Features

1. **Create test conversations** via the chat widget (as shown in Testing section)
2. **Refresh admin dashboard** - Your conversations should appear
3. **Click a conversation** to view full details
4. **Test filters** - Filter by status, date range
5. **Test sorting** - Sort by most recent, most messages

---

## Next Steps

### Understand the System Architecture

Read these docs for deeper understanding:

1. **[SUPPORT_CHAT_IMPLEMENTATION_SUMMARY.md](./SUPPORT_CHAT_IMPLEMENTATION_SUMMARY.md)**
   - Complete overview of the system
   - Frontend and backend architecture
   - Database schema explanation
   - Troubleshooting guide

2. **[SUPPORT_CHAT_BACKEND_REQUIREMENTS.md](./SUPPORT_CHAT_BACKEND_REQUIREMENTS.md)**
   - Backend API specification (6 endpoints)
   - RAG retrieval implementation
   - LLM integration guide
   - Rate limiting and error handling

3. **[FRESHDESK_SERVICE_IMPLEMENTATION.md](./FRESHDESK_SERVICE_IMPLEMENTATION.md)**
   - Freshdesk API integration details
   - Knowledge base sync process
   - Ticket creation workflow

### Transition to Production

When ready to deploy with real backend:

1. **Set up environment variables:**
   ```bash
   # Disable mock mode
   NEXT_PUBLIC_MOCK_SUPPORT_API=false
   
   # Backend API URL
   NEXT_PUBLIC_API_URL=https://api.javelina.com
   
   # Enable Freshdesk
   NEXT_PUBLIC_FRESHDESK_ENABLED=true
   FRESHDESK_DOMAIN=your-subdomain
   FRESHDESK_API_KEY=your-api-key
   
   # LLM Configuration (backend only)
   OPENAI_API_KEY=sk-your-openai-key
   ```

2. **Implement backend API endpoints:**
   - POST `/api/support/chat` - Main chat processing
   - POST `/api/support/feedback` - User feedback submission
   - POST `/api/support/log-bug` - Ticket creation
   - GET `/api/support/admin/conversations` - Admin conversation list
   - GET `/api/support/admin/metrics` - Analytics
   - GET `/api/support/admin/conversation/:id` - Conversation details

3. **Run knowledge base sync:**
   - Sync Freshdesk articles to `kb_documents` table
   - Generate embeddings for RAG retrieval
   - Schedule cron job (every 6 hours)

4. **Deploy and monitor:**
   - Deploy backend API
   - Set up monitoring (Sentry, Datadog)
   - Test end-to-end with real users

### Customize the Chat Experience

**Frontend customization:**
- Edit `components/chat/ChatWindow.tsx` for UI changes
- Modify animations in the `useGSAP` hook
- Update colors/styles using Tailwind classes
- Change chat button position or style

**Backend customization:**
- Adjust rate limits in `lib/rate-limit.ts`
- Modify LLM prompts for different AI behavior
- Add custom intents for domain-specific questions
- Customize ticket creation flow

### Learn More

**Code references:**
- Chat Widget: `components/chat/ChatWindow.tsx`
- Ticket Modal: `components/support/TicketCreationModal.tsx`
- Admin Dashboard: `app/admin/support-review/page.tsx`
- API Client: `lib/api-client.ts`
- Mock API: `lib/support/mock-support-api.ts`
- Types: `types/support.ts`

**External documentation:**
- [Freshdesk API Docs](https://developers.freshdesk.com/api/)
- [OpenAI API Docs](https://platform.openai.com/docs/api-reference)
- [pgvector Documentation](https://github.com/pgvector/pgvector)
- [GSAP Animation Docs](https://greensock.com/docs/)

---

## Troubleshooting

### Chat button not appearing

**Check:**
- Is the development server running?
- Are you on an authenticated page?
- Check browser console for errors

**Fix:**
```bash
# Restart dev server
npm run dev
```

### Chat window won't open

**Check:**
- Browser console for JavaScript errors
- GSAP animation library loaded

**Fix:**
```bash
# Reinstall dependencies
npm install gsap @gsap/react
```

### No response after sending message

**Check:**
- Environment variable: `NEXT_PUBLIC_MOCK_SUPPORT_API=true`
- Browser network tab for API calls
- Console logs for errors

**Fix:**
- Verify `.env.local` is configured correctly
- Check `lib/support/mock-support-api.ts` exists

### Database tables not found

**Check:**
- Migration was applied successfully
- Supabase connection is working

**Fix:**
```bash
# Re-apply migration
supabase db reset
supabase db push
```

### Admin dashboard shows 403 Forbidden

**Check:**
- User role is set to SuperAdmin
- JWT token is valid

**Fix:**
```sql
-- Grant SuperAdmin role
UPDATE user_roles 
SET role = 'SuperAdmin' 
WHERE user_id = 'your-user-id';
```

### Citations not appearing

**Expected in mock mode:** Mock responses include citations. Check `mockChat()` in `lib/support/mock-support-api.ts`

**Not a bug:** Citations are rendered below AI responses automatically.

---

## Summary

You now have:

✅ Support chat widget running in mock mode  
✅ Working conversation flow with escalation  
✅ Ticket creation functionality  
✅ Admin dashboard for conversation review  
✅ Complete testing coverage  
✅ Path to production deployment

**Total setup time:** ~10 minutes  
**Backend required:** No (mock mode)  
**Ready for user testing:** Yes

---

**Questions or issues?** 
- Check [SUPPORT_CHAT_IMPLEMENTATION_SUMMARY.md](./SUPPORT_CHAT_IMPLEMENTATION_SUMMARY.md) for detailed troubleshooting
- Review code in `components/chat/ChatWindow.tsx` for frontend behavior
- Inspect `lib/support/mock-support-api.ts` for mock data and responses

**Happy chatting! 🚀**
