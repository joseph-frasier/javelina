/**
 * Mock Support API for Demo/Testing
 * 
 * Simulates backend responses without requiring actual API endpoints
 * Enable by setting NEXT_PUBLIC_MOCK_SUPPORT_API=true
 */

import type { SupportChatResponse } from '@/lib/api-client';

// Sample knowledge base articles (simulating Freshdesk)
const mockArticles = [
  {
    id: 'kb-001',
    title: 'Getting Started with DNS Zones',
    url: '/help/kb/kb-001',
    snippet: 'DNS zones are containers for your DNS records. Each zone represents a domain name you want to manage.',
  },
  {
    id: 'kb-002',
    title: 'Understanding DNS Record Types',
    url: '/help/kb/kb-002',
    snippet: 'Common DNS record types include A records (IPv4), AAAA records (IPv6), CNAME (aliases), MX (mail), and TXT (text).',
  },
  {
    id: 'kb-003',
    title: 'How to Add a New DNS Record',
    url: '/help/kb/kb-003',
    snippet: 'Navigate to your zone, click Add Record, select the record type, enter the name and value, then save.',
  },
  {
    id: 'kb-004',
    title: 'Troubleshooting DNS Propagation',
    url: '/help/kb/kb-004',
    snippet: 'DNS changes can take 24-48 hours to propagate globally. Use DNS checker tools to verify propagation status.',
  },
  {
    id: 'kb-005',
    title: 'Managing Organization Members',
    url: '/help/kb/kb-005',
    snippet: 'Organization admins can invite members, assign roles (Admin, Editor, Viewer), and manage permissions.',
  },
];

// Track conversation state for mock logic
const conversationState = new Map<string, { attemptCount: number; lastIntent: string }>();

/**
 * Mock chat API - simulates intelligent responses based on user input
 */
export async function mockChat(params: {
  message: string;
  conversationId?: string;
  attemptCount?: number;
}): Promise<SupportChatResponse> {
  const { message, conversationId, attemptCount = 0 } = params;
  const convId = conversationId || `mock-conv-${Date.now()}`;
  
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 400));

  const messageLower = message.toLowerCase();
  
  // Detect intent from message
  let intent = 'general';
  let relevantArticles: typeof mockArticles = [];
  let reply = '';
  let needsResolution = true;
  let nextActionType: 'none' | 'ask_clarifying' | 'offer_ticket' | 'log_bug' = 'none';
  
  // DNS Zone related
  if (messageLower.includes('zone') || messageLower.includes('domain')) {
    intent = 'dns-zones';
    relevantArticles = [mockArticles[0], mockArticles[3]];
    reply = "I can help you with DNS zones! A DNS zone is a container that holds all the DNS records for a specific domain name. You can create a new zone by navigating to your organization dashboard and clicking 'Add Zone'. Each zone needs a unique domain name and an admin email address.\n\nWould you like help creating a zone, or do you have questions about managing an existing one?";
  }
  // DNS Records
  else if (messageLower.includes('record') || messageLower.includes('a record') || messageLower.includes('cname')) {
    intent = 'dns-records';
    relevantArticles = [mockArticles[1], mockArticles[2]];
    reply = "DNS records are the entries within your zone that control how your domain behaves. Here are the main types:\n\n• **A Record**: Points your domain to an IPv4 address\n• **AAAA Record**: Points to an IPv6 address\n• **CNAME**: Creates an alias to another domain\n• **MX Record**: Handles email routing\n• **TXT Record**: Stores text data (often for verification)\n\nTo add a record, go to your zone and click 'Add Record'. Select the type, enter the name (like 'www' or '@' for root), and provide the value.\n\nDid this help answer your question?";
  }
  // Organization/Members
  else if (messageLower.includes('organization') || messageLower.includes('member') || messageLower.includes('invite') || messageLower.includes('team')) {
    intent = 'organization';
    relevantArticles = [mockArticles[4]];
    reply = "I can help you manage your organization! As an admin, you can:\n\n• **Invite members**: Click 'Manage Team' and enter their email address\n• **Assign roles**: Choose Admin (full access), Editor (manage zones/records), or Viewer (read-only)\n• **Remove members**: Click the options menu next to any member\n\nMembers will receive an email invitation to join your organization.\n\nIs this what you were looking for?";
  }
  // Propagation/Troubleshooting
  else if (messageLower.includes('propagat') || messageLower.includes('not working') || messageLower.includes('slow') || messageLower.includes('delay')) {
    intent = 'troubleshooting';
    relevantArticles = [mockArticles[3]];
    reply = "DNS propagation can take time! When you make DNS changes, it typically takes 1-48 hours for the changes to propagate worldwide. This is because:\n\n• DNS servers cache records based on TTL (Time To Live)\n• Global DNS infrastructure updates gradually\n• Different regions may see changes at different times\n\n**You can check propagation using**:\n• whatsmydns.net\n• dnschecker.org\n\nIf it's been more than 48 hours and changes still aren't visible, double-check that:\n1. The record was saved correctly in Javelina\n2. Your domain's nameservers point to Javelina\n\nDid this answer your question?";
  }
  // Billing/Plans
  else if (messageLower.includes('billing') || messageLower.includes('plan') || messageLower.includes('subscription') || messageLower.includes('upgrade')) {
    intent = 'billing';
    relevantArticles = [];
    reply = "For billing and subscription questions, I can provide some general info:\n\n• **Starter Plan**: Free tier with basic features\n• **Pro Plan**: Advanced features and higher limits\n• **Business Plan**: Enterprise features and priority support\n\nYou can view and manage your subscription in Settings → Billing. For specific billing questions or issues, would you like me to create a support ticket so our billing team can assist you directly?";
    nextActionType = 'offer_ticket';
    needsResolution = false;
  }
  // Error/Bug report
  else if (messageLower.includes('error') || messageLower.includes('bug') || messageLower.includes('broken') || messageLower.includes('not work') || messageLower.includes("doesn't work")) {
    intent = 'error-report';
    relevantArticles = [];
    reply = "I'm sorry you're experiencing an issue. To help you best, I can create a support ticket with our technical team. They'll investigate the problem and get back to you.\n\nWould you like me to create a ticket with the details you've provided?";
    nextActionType = 'log_bug';
    needsResolution = false;
  }
  // Greeting/General
  else if (messageLower.includes('hello') || messageLower.includes('hi') || messageLower.includes('hey')) {
    intent = 'greeting';
    reply = "Hello! I'm Javi, your Javelina support assistant. I can help you with:\n\n• DNS zones and records\n• Organization and team management\n• Troubleshooting DNS issues\n• Billing and subscriptions\n• General platform questions\n\nWhat would you like help with today?";
    needsResolution = false;
  }
  // Fallback - no good match
  else {
    intent = 'unknown';
    
    if (attemptCount >= 1) {
      // After 2 attempts, offer escalation
      reply = "I'm sorry I haven't been able to fully address your question. Would you like me to create a support ticket so our team can assist you directly?";
      nextActionType = 'offer_ticket';
      needsResolution = false;
    } else {
      reply = "I'm sorry, I don't have information on that based on our current documentation. Could you rephrase your question or provide more details about what you're trying to do?\n\nFor example:\n• 'How do I create a DNS zone?'\n• 'What's the difference between A and CNAME records?'\n• 'How do I invite team members?'";
      nextActionType = 'ask_clarifying';
      needsResolution = false;
    }
  }

  // Store conversation state
  conversationState.set(convId, { attemptCount: attemptCount + 1, lastIntent: intent });

  return {
    reply,
    citations: relevantArticles.map(article => ({
      title: article.title,
      articleId: article.id,
      javelinaUrl: article.url,
      confidence: 0.85 + Math.random() * 0.1,
    })),
    intent,
    resolution: {
      needsConfirmation: needsResolution,
    },
    nextAction: {
      type: nextActionType,
      reason: nextActionType === 'ask_clarifying' ? 'Low confidence - need more details' : 
              nextActionType === 'offer_ticket' ? 'Complex issue requiring human support' :
              nextActionType === 'log_bug' ? 'Technical issue reported' : '',
    },
    conversationId: convId,
  };
}

/**
 * Mock feedback submission
 */
export async function mockSubmitFeedback(params: {
  conversationId: string;
  resolved: boolean;
}): Promise<{ success: boolean }> {
  await new Promise(resolve => setTimeout(resolve, 300));
  console.log('[Mock] Feedback submitted:', params);
  return { success: true };
}

/**
 * Mock bug logging
 */
export async function mockLogBug(params: {
  subject: string;
  description: string;
  page_url: string;
  user_id: string;
}): Promise<{ success: boolean; ticket_id?: string }> {
  await new Promise(resolve => setTimeout(resolve, 500));
  const ticketId = `MOCK-${Math.floor(Math.random() * 10000)}`;
  console.log('[Mock] Bug ticket created:', { ...params, ticket_id: ticketId });
  return { success: true, ticket_id: ticketId };
}

/**
 * Check if mock mode is enabled
 */
export function isMockMode(): boolean {
  return process.env.NEXT_PUBLIC_MOCK_SUPPORT_API === 'true';
}
