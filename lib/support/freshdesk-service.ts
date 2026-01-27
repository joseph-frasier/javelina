/**
 * Freshdesk API Service
 * 
 * Provides integration with Freshdesk for:
 * - Knowledge base article syncing
 * - Contact management
 * - Ticket creation and retrieval
 * 
 * Supports MOCK MODE when NEXT_PUBLIC_FRESHDESK_ENABLED !== 'true'
 * This allows development without real Freshdesk credentials
 */

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface FreshdeskArticle {
  id: number;
  title: string;
  description: string;
  description_text: string;
  status: number; // 1 = draft, 2 = published
  type: number;
  category_id: number;
  folder_id: number;
  tags: string[];
  thumbs_up: number;
  thumbs_down: number;
  created_at: string;
  updated_at: string;
  url?: string;
}

export interface FreshdeskContact {
  id: number;
  name: string;
  email: string;
  phone?: string;
  company_id?: number;
  description?: string;
  custom_fields?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface FreshdeskTicket {
  id: number;
  subject: string;
  description: string;
  status: number; // 2=open, 3=pending, 4=resolved, 5=closed
  priority: number; // 1=low, 2=medium, 3=high, 4=urgent
  source: number; // 1=email, 2=portal, 3=phone, 7=chat, 9=feedback_widget
  requester_id: number;
  responder_id?: number;
  company_id?: number;
  custom_fields?: Record<string, any>;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface CreateTicketParams {
  subject: string;
  description: string;
  email: string;
  priority?: 1 | 2 | 3 | 4;
  status?: 2 | 3 | 4 | 5;
  tags?: string[];
  custom_fields?: Record<string, any>;
  cc_emails?: string[];
}

export interface SyncArticlesResult {
  success: boolean;
  articlesCount: number;
  articles: FreshdeskArticle[];
  error?: string;
}

export interface GetArticleResult {
  success: boolean;
  article?: FreshdeskArticle;
  error?: string;
}

export interface ContactResult {
  success: boolean;
  contact?: FreshdeskContact;
  isNew?: boolean;
  error?: string;
}

export interface TicketResult {
  success: boolean;
  ticket?: FreshdeskTicket;
  error?: string;
}

// ============================================================================
// MOCK DATA (used when Freshdesk is disabled)
// ============================================================================

const MOCK_ARTICLES: FreshdeskArticle[] = [
  {
    id: 1001,
    title: 'Getting Started with DNS Zones',
    description: '<p>DNS zones are containers for your DNS records. Each zone represents a domain name you want to manage.</p>',
    description_text: 'DNS zones are containers for your DNS records. Each zone represents a domain name you want to manage.',
    status: 2,
    type: 1,
    category_id: 100,
    folder_id: 10,
    tags: ['dns', 'zones', 'getting-started'],
    thumbs_up: 45,
    thumbs_down: 2,
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-01-15T10:00:00Z',
    url: 'https://example.freshdesk.com/support/solutions/articles/1001',
  },
  {
    id: 1002,
    title: 'Understanding DNS Record Types',
    description: '<p>Common DNS record types include A records (IPv4), AAAA records (IPv6), CNAME (aliases), MX (mail), and TXT (text).</p>',
    description_text: 'Common DNS record types include A records (IPv4), AAAA records (IPv6), CNAME (aliases), MX (mail), and TXT (text).',
    status: 2,
    type: 1,
    category_id: 100,
    folder_id: 10,
    tags: ['dns', 'records', 'a-record', 'cname', 'mx'],
    thumbs_up: 67,
    thumbs_down: 3,
    created_at: '2024-01-15T10:30:00Z',
    updated_at: '2024-01-15T10:30:00Z',
    url: 'https://example.freshdesk.com/support/solutions/articles/1002',
  },
  {
    id: 1003,
    title: 'How to Add a New DNS Record',
    description: '<p>Navigate to your zone, click Add Record, select the record type, enter the name and value, then save.</p>',
    description_text: 'Navigate to your zone, click Add Record, select the record type, enter the name and value, then save.',
    status: 2,
    type: 2, // How-to
    category_id: 100,
    folder_id: 10,
    tags: ['dns', 'records', 'tutorial', 'how-to'],
    thumbs_up: 89,
    thumbs_down: 1,
    created_at: '2024-01-15T11:00:00Z',
    updated_at: '2024-01-15T11:00:00Z',
    url: 'https://example.freshdesk.com/support/solutions/articles/1003',
  },
  {
    id: 1004,
    title: 'Troubleshooting DNS Propagation',
    description: '<p>DNS changes can take 24-48 hours to propagate globally. Use DNS checker tools to verify propagation status.</p>',
    description_text: 'DNS changes can take 24-48 hours to propagate globally. Use DNS checker tools to verify propagation status.',
    status: 2,
    type: 3, // Troubleshooting
    category_id: 100,
    folder_id: 11,
    tags: ['dns', 'troubleshooting', 'propagation'],
    thumbs_up: 123,
    thumbs_down: 8,
    created_at: '2024-01-15T11:30:00Z',
    updated_at: '2024-01-20T09:15:00Z',
    url: 'https://example.freshdesk.com/support/solutions/articles/1004',
  },
  {
    id: 1005,
    title: 'Managing Organization Members',
    description: '<p>Organization admins can invite members, assign roles (Admin, Editor, Viewer), and manage permissions.</p>',
    description_text: 'Organization admins can invite members, assign roles (Admin, Editor, Viewer), and manage permissions.',
    status: 2,
    type: 2,
    category_id: 101,
    folder_id: 12,
    tags: ['organization', 'team', 'members', 'permissions'],
    thumbs_up: 56,
    thumbs_down: 4,
    created_at: '2024-01-16T14:00:00Z',
    updated_at: '2024-01-16T14:00:00Z',
    url: 'https://example.freshdesk.com/support/solutions/articles/1005',
  },
];

let mockContactIdCounter = 5000;
let mockTicketIdCounter = 10000;
const mockContacts = new Map<string, FreshdeskContact>();
const mockTickets = new Map<number, FreshdeskTicket>();

// ============================================================================
// FRESHDESK SERVICE CLASS
// ============================================================================

export class FreshdeskService {
  private domain: string;
  private apiKey: string;
  private enabled: boolean;
  private baseUrl: string;

  constructor() {
    this.domain = process.env.NEXT_PUBLIC_FRESHDESK_DOMAIN || '';
    this.apiKey = process.env.FRESHDESK_API_KEY || '';
    this.enabled = process.env.NEXT_PUBLIC_FRESHDESK_ENABLED === 'true';
    this.baseUrl = this.domain ? `https://${this.domain}.freshdesk.com/api/v2` : '';

    if (!this.enabled) {
      console.log('[Freshdesk] Running in MOCK MODE - no real API calls will be made');
    } else if (!this.domain || !this.apiKey) {
      console.warn('[Freshdesk] ENABLED but missing credentials. Check NEXT_PUBLIC_FRESHDESK_DOMAIN and FRESHDESK_API_KEY');
    }
  }

  // ==========================================================================
  // CONFIGURATION & UTILITY METHODS
  // ==========================================================================

  /**
   * Check if Freshdesk integration is enabled
   */
  public isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Check if Freshdesk is properly configured
   */
  public isConfigured(): boolean {
    return this.enabled && !!this.domain && !!this.apiKey;
  }

  /**
   * Make authenticated request to Freshdesk API
   */
  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    if (!this.isConfigured()) {
      throw new Error('Freshdesk is not properly configured');
    }

    const url = `${this.baseUrl}${endpoint}`;
    const authHeader = `Basic ${Buffer.from(`${this.apiKey}:X`).toString('base64')}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Freshdesk] API Error:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText,
      });
      throw new Error(`Freshdesk API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Simulate network delay for mock responses
   */
  private async mockDelay(ms: number = 300): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, ms + Math.random() * 200));
  }

  // ==========================================================================
  // KNOWLEDGE BASE ARTICLES
  // ==========================================================================

  /**
   * Sync all published articles from Freshdesk
   * In mock mode, returns predefined articles
   * In real mode, fetches from Freshdesk Solutions API
   */
  public async syncArticles(): Promise<SyncArticlesResult> {
    console.log('[Freshdesk] Syncing knowledge base articles...');

    // MOCK MODE
    if (!this.enabled) {
      await this.mockDelay(800);
      console.log(`[Freshdesk] Mock sync completed: ${MOCK_ARTICLES.length} articles`);
      return {
        success: true,
        articlesCount: MOCK_ARTICLES.length,
        articles: MOCK_ARTICLES,
      };
    }

    // REAL MODE
    try {
      // Fetch articles from all folders (you may need to adjust based on your Freshdesk structure)
      // This is a simplified example - you might need pagination for large knowledge bases
      const articles = await this.makeRequest<FreshdeskArticle[]>('/solutions/articles');
      
      // Filter only published articles (status === 2)
      const publishedArticles = articles.filter(article => article.status === 2);

      console.log(`[Freshdesk] Sync completed: ${publishedArticles.length} published articles`);
      
      return {
        success: true,
        articlesCount: publishedArticles.length,
        articles: publishedArticles,
      };
    } catch (error) {
      console.error('[Freshdesk] Error syncing articles:', error);
      return {
        success: false,
        articlesCount: 0,
        articles: [],
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get a single article by ID
   */
  public async getArticle(articleId: number): Promise<GetArticleResult> {
    console.log(`[Freshdesk] Fetching article ${articleId}...`);

    // MOCK MODE
    if (!this.enabled) {
      await this.mockDelay(200);
      const article = MOCK_ARTICLES.find(a => a.id === articleId);
      
      if (article) {
        return { success: true, article };
      } else {
        return {
          success: false,
          error: `Article ${articleId} not found`,
        };
      }
    }

    // REAL MODE
    try {
      const article = await this.makeRequest<FreshdeskArticle>(
        `/solutions/articles/${articleId}`
      );

      return { success: true, article };
    } catch (error) {
      console.error(`[Freshdesk] Error fetching article ${articleId}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // ==========================================================================
  // CONTACT MANAGEMENT
  // ==========================================================================

  /**
   * Get or create a Freshdesk contact for a user
   * Maps Javelina users/orgs to Freshdesk contacts
   */
  public async getOrCreateContact(
    user: { id: string; email: string; full_name?: string },
    org?: { id: string; name: string }
  ): Promise<ContactResult> {
    console.log(`[Freshdesk] Getting/creating contact for ${user.email}...`);

    // MOCK MODE
    if (!this.enabled) {
      await this.mockDelay(300);
      
      let contact = mockContacts.get(user.email);
      let isNew = false;

      if (!contact) {
        isNew = true;
        contact = {
          id: ++mockContactIdCounter,
          name: user.full_name || user.email,
          email: user.email,
          description: `Javelina User ID: ${user.id}`,
          custom_fields: {
            cf_javelina_user_id: user.id,
            cf_javelina_org_id: org?.id,
            cf_javelina_org_name: org?.name,
          },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        mockContacts.set(user.email, contact);
        console.log(`[Freshdesk] Mock contact created: ${contact.id}`);
      } else {
        console.log(`[Freshdesk] Mock contact found: ${contact.id}`);
      }

      return { success: true, contact, isNew };
    }

    // REAL MODE
    try {
      // First, try to find existing contact by email
      const searchResponse = await this.makeRequest<FreshdeskContact[]>(
        `/contacts?email=${encodeURIComponent(user.email)}`
      );

      if (searchResponse && searchResponse.length > 0) {
        console.log(`[Freshdesk] Existing contact found: ${searchResponse[0].id}`);
        return {
          success: true,
          contact: searchResponse[0],
          isNew: false,
        };
      }

      // If not found, create new contact
      const newContact = await this.makeRequest<FreshdeskContact>('/contacts', {
        method: 'POST',
        body: JSON.stringify({
          name: user.full_name || user.email,
          email: user.email,
          description: `Javelina User ID: ${user.id}`,
          custom_fields: {
            cf_javelina_user_id: user.id,
            cf_javelina_org_id: org?.id,
            cf_javelina_org_name: org?.name,
          },
        }),
      });

      console.log(`[Freshdesk] New contact created: ${newContact.id}`);
      return {
        success: true,
        contact: newContact,
        isNew: true,
      };
    } catch (error) {
      console.error('[Freshdesk] Error getting/creating contact:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // ==========================================================================
  // TICKET MANAGEMENT
  // ==========================================================================

  /**
   * Create a support ticket in Freshdesk
   */
  public async createTicket(params: CreateTicketParams): Promise<TicketResult> {
    console.log(`[Freshdesk] Creating ticket: ${params.subject}`);

    // MOCK MODE
    if (!this.enabled) {
      await this.mockDelay(500);

      const mockTicket: FreshdeskTicket = {
        id: ++mockTicketIdCounter,
        subject: params.subject,
        description: params.description,
        status: params.status || 2, // 2 = open
        priority: params.priority || 2, // 2 = medium
        source: 9, // 9 = feedback_widget (from web app)
        requester_id: mockContactIdCounter, // Last created contact
        tags: params.tags || [],
        custom_fields: params.custom_fields || {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      mockTickets.set(mockTicket.id, mockTicket);
      console.log(`[Freshdesk] Mock ticket created: ${mockTicket.id}`);

      return { success: true, ticket: mockTicket };
    }

    // REAL MODE
    try {
      const ticket = await this.makeRequest<FreshdeskTicket>('/tickets', {
        method: 'POST',
        body: JSON.stringify({
          subject: params.subject,
          description: params.description,
          email: params.email,
          priority: params.priority || 2,
          status: params.status || 2,
          source: 9, // feedback_widget
          tags: params.tags || [],
          custom_fields: params.custom_fields || {},
          cc_emails: params.cc_emails || [],
        }),
      });

      console.log(`[Freshdesk] Ticket created: ${ticket.id}`);
      return { success: true, ticket };
    } catch (error) {
      console.error('[Freshdesk] Error creating ticket:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get ticket details by ID
   */
  public async getTicket(ticketId: number): Promise<TicketResult> {
    console.log(`[Freshdesk] Fetching ticket ${ticketId}...`);

    // MOCK MODE
    if (!this.enabled) {
      await this.mockDelay(200);
      
      const ticket = mockTickets.get(ticketId);
      
      if (ticket) {
        return { success: true, ticket };
      } else {
        return {
          success: false,
          error: `Ticket ${ticketId} not found`,
        };
      }
    }

    // REAL MODE
    try {
      const ticket = await this.makeRequest<FreshdeskTicket>(
        `/tickets/${ticketId}`
      );

      return { success: true, ticket };
    } catch (error) {
      console.error(`[Freshdesk] Error fetching ticket ${ticketId}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

// ============================================================================
// SINGLETON INSTANCE EXPORT
// ============================================================================

/**
 * Singleton instance of FreshdeskService
 * Import and use this throughout your application
 * 
 * @example
 * import { freshdeskService } from '@/lib/support/freshdesk-service';
 * 
 * const result = await freshdeskService.syncArticles();
 * if (result.success) {
 *   console.log(`Synced ${result.articlesCount} articles`);
 * }
 */
export const freshdeskService = new FreshdeskService();
