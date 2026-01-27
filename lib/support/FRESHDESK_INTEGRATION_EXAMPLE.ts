/**
 * FRESHDESK INTEGRATION EXAMPLES
 * 
 * This file contains example code showing how to integrate the Freshdesk service
 * into various parts of your application. Copy/adapt these examples as needed.
 */

import { freshdeskService } from './freshdesk-service';
import type { CreateTicketParams } from './freshdesk-service';

// ============================================================================
// EXAMPLE 1: Sync KB Articles on Server Startup or Scheduled Job
// ============================================================================

/**
 * Sync Freshdesk articles to your database
 * Run this as a cron job or on server startup
 */
export async function syncKnowledgeBaseArticles() {
  console.log('Starting KB article sync...');
  
  const result = await freshdeskService.syncArticles();
  
  if (result.success) {
    console.log(`Successfully synced ${result.articlesCount} articles`);
    
    // TODO: Store articles in your database
    // Example: Save to Supabase knowledge_base table
    for (const article of result.articles) {
      // await supabase
      //   .from('knowledge_base')
      //   .upsert({
      //     freshdesk_id: article.id,
      //     title: article.title,
      //     content: article.description_text,
      //     html_content: article.description,
      //     tags: article.tags,
      //     url: article.url,
      //     thumbs_up: article.thumbs_up,
      //     thumbs_down: article.thumbs_down,
      //     updated_at: article.updated_at,
      //   });
    }
    
    return { success: true, count: result.articlesCount };
  } else {
    console.error('KB sync failed:', result.error);
    return { success: false, error: result.error };
  }
}

// ============================================================================
// EXAMPLE 2: Create Support Ticket from Chat Escalation
// ============================================================================

/**
 * When AI chat can't resolve an issue, create a Freshdesk ticket
 */
export async function escalateToTicket(params: {
  userId: string;
  userEmail: string;
  userName: string;
  orgId?: string;
  orgName?: string;
  subject: string;
  description: string;
  conversationId: string;
  pageUrl: string;
  chatTranscript?: string;
}) {
  console.log(`Escalating conversation ${params.conversationId} to ticket...`);
  
  // Step 1: Get or create Freshdesk contact
  const contactResult = await freshdeskService.getOrCreateContact(
    {
      id: params.userId,
      email: params.userEmail,
      full_name: params.userName,
    },
    params.orgId && params.orgName ? {
      id: params.orgId,
      name: params.orgName,
    } : undefined
  );
  
  if (!contactResult.success) {
    console.error('Failed to get/create contact:', contactResult.error);
    return { success: false, error: contactResult.error };
  }
  
  // Step 2: Create ticket with full context
  const fullDescription = `
${params.description}

---
**User Context:**
- User ID: ${params.userId}
- Organization: ${params.orgName || 'None'}
- Page URL: ${params.pageUrl}
- Conversation ID: ${params.conversationId}

${params.chatTranscript ? `**Chat Transcript:**\n${params.chatTranscript}` : ''}
  `.trim();
  
  const ticketResult = await freshdeskService.createTicket({
    subject: params.subject,
    description: fullDescription,
    email: params.userEmail,
    priority: 2, // Medium priority
    tags: ['chat-escalation', 'web-app'],
    custom_fields: {
      cf_javelina_user_id: params.userId,
      cf_javelina_org_id: params.orgId,
      cf_page_url: params.pageUrl,
      cf_conversation_id: params.conversationId,
    },
  });
  
  if (ticketResult.success && ticketResult.ticket) {
    console.log(`Ticket created: #${ticketResult.ticket.id}`);
    
    // TODO: Store ticket reference in your database
    // await supabase
    //   .from('support_conversations')
    //   .update({ freshdesk_ticket_id: ticketResult.ticket.id })
    //   .eq('id', params.conversationId);
    
    return {
      success: true,
      ticketId: ticketResult.ticket.id,
      ticketNumber: `#${ticketResult.ticket.id}`,
    };
  } else {
    console.error('Failed to create ticket:', ticketResult.error);
    return { success: false, error: ticketResult.error };
  }
}

// ============================================================================
// EXAMPLE 3: API Route Handler for Ticket Creation
// ============================================================================

/**
 * Example Next.js API route: /api/support/create-ticket
 * 
 * Usage:
 * POST /api/support/create-ticket
 * Body: { subject, description, priority?, tags? }
 */
export async function handleCreateTicketRequest(req: Request) {
  try {
    // 1. Parse request body
    const body = await req.json();
    const { subject, description, priority, tags } = body;
    
    // 2. Get user info from session/auth
    // const session = await getServerSession(req);
    // const user = session?.user;
    // if (!user) {
    //   return new Response(
    //     JSON.stringify({ error: 'Unauthorized' }),
    //     { status: 401 }
    //   );
    // }
    
    // Mock user for example
    const user = {
      id: 'user-123',
      email: 'user@example.com',
      name: 'Test User',
    };
    
    // 3. Create ticket
    const result = await freshdeskService.createTicket({
      subject,
      description,
      email: user.email,
      priority: priority || 2,
      tags: tags || ['web-app'],
      custom_fields: {
        cf_javelina_user_id: user.id,
      },
    });
    
    // 4. Return response
    if (result.success && result.ticket) {
      return new Response(
        JSON.stringify({
          success: true,
          ticketId: result.ticket.id,
          ticketNumber: `#${result.ticket.id}`,
        }),
        { status: 200 }
      );
    } else {
      return new Response(
        JSON.stringify({
          success: false,
          error: result.error || 'Failed to create ticket',
        }),
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in create-ticket handler:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500 }
    );
  }
}

// ============================================================================
// EXAMPLE 4: Server Action for Feedback Form
// ============================================================================

/**
 * Server action for submitting feedback/bug reports
 * Can be called directly from React components
 */
export async function submitFeedback(params: {
  subject: string;
  description: string;
  category: 'bug' | 'feature-request' | 'question' | 'feedback';
  pageUrl: string;
  userAgent?: string;
}) {
  'use server';
  
  // Get user from session
  // const user = await getCurrentUser();
  // if (!user) {
  //   return { success: false, error: 'Not authenticated' };
  // }
  
  // Mock user for example
  const user = {
    id: 'user-456',
    email: 'feedback@example.com',
    name: 'Feedback User',
  };
  
  // Map category to priority
  const priorityMap = {
    bug: 3, // High
    'feature-request': 2, // Medium
    question: 2, // Medium
    feedback: 1, // Low
  };
  
  const result = await freshdeskService.createTicket({
    subject: `[${params.category.toUpperCase()}] ${params.subject}`,
    description: `
${params.description}

---
**Submitted from:** ${params.pageUrl}
${params.userAgent ? `**User Agent:** ${params.userAgent}` : ''}
    `.trim(),
    email: user.email,
    priority: priorityMap[params.category],
    tags: [params.category, 'feedback-form'],
    custom_fields: {
      cf_javelina_user_id: user.id,
      cf_page_url: params.pageUrl,
      cf_feedback_category: params.category,
    },
  });
  
  if (result.success && result.ticket) {
    return {
      success: true,
      ticketId: result.ticket.id,
      message: `Thank you for your feedback! Ticket #${result.ticket.id} has been created.`,
    };
  } else {
    return {
      success: false,
      error: result.error || 'Failed to submit feedback',
    };
  }
}

// ============================================================================
// EXAMPLE 5: Search Articles by Tags/Keywords
// ============================================================================

/**
 * Search through synced articles
 * (You'd typically query your database, but this shows the data structure)
 */
export async function searchArticles(query: string) {
  const result = await freshdeskService.syncArticles();
  
  if (!result.success) {
    return { success: false, error: result.error, articles: [] };
  }
  
  const queryLower = query.toLowerCase();
  
  const matchedArticles = result.articles.filter(article => {
    // Search in title, description, and tags
    return (
      article.title.toLowerCase().includes(queryLower) ||
      article.description_text.toLowerCase().includes(queryLower) ||
      article.tags.some(tag => tag.toLowerCase().includes(queryLower))
    );
  });
  
  return {
    success: true,
    articles: matchedArticles,
    count: matchedArticles.length,
  };
}

// ============================================================================
// EXAMPLE 6: Get Article for Citation in AI Chat
// ============================================================================

/**
 * Fetch article details to provide as citation in AI response
 */
export async function getArticleForCitation(articleId: number) {
  const result = await freshdeskService.getArticle(articleId);
  
  if (result.success && result.article) {
    return {
      success: true,
      citation: {
        title: result.article.title,
        snippet: result.article.description_text.substring(0, 200) + '...',
        url: result.article.url || `/help/kb/${articleId}`,
        tags: result.article.tags,
        articleId: result.article.id,
      },
    };
  } else {
    return { success: false, error: result.error };
  }
}

// ============================================================================
// EXAMPLE 7: Periodic Sync Job (for cron/scheduled tasks)
// ============================================================================

/**
 * Run this on a schedule (e.g., every hour) to keep articles up to date
 */
export async function scheduledArticleSync() {
  console.log('[Cron] Starting scheduled KB article sync...');
  
  const result = await syncKnowledgeBaseArticles();
  
  if (result.success) {
    console.log(`[Cron] Successfully synced ${result.count} articles`);
    // TODO: Send success metric to monitoring service
  } else {
    console.error(`[Cron] Sync failed:`, result.error);
    // TODO: Send alert to error tracking service (Sentry, etc.)
  }
  
  return result;
}

// ============================================================================
// EXAMPLE 8: Check Service Status
// ============================================================================

/**
 * Health check endpoint to verify Freshdesk integration status
 */
export async function checkFreshdeskStatus() {
  const isEnabled = freshdeskService.isEnabled();
  const isConfigured = freshdeskService.isConfigured();
  
  return {
    enabled: isEnabled,
    configured: isConfigured,
    mode: isEnabled ? 'REAL' : 'MOCK',
    status: isConfigured ? 'ready' : isEnabled ? 'misconfigured' : 'disabled',
    message: !isEnabled
      ? 'Running in mock mode (NEXT_PUBLIC_FRESHDESK_ENABLED=false)'
      : !isConfigured
      ? 'Enabled but missing credentials'
      : 'Connected and ready',
  };
}
