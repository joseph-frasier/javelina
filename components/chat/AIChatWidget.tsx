'use client';

import { useState, useEffect } from 'react';
import { ChatBubble } from './ChatBubble';
import { ChatWindow } from './ChatWindow';

interface AIChatWidgetProps {
  orgId?: string;
  tier?: string;
  entryPoint?: string;
}

export function AIChatWidget({ orgId, tier, entryPoint }: AIChatWidgetProps = {}) {
  const [isOpen, setIsOpen] = useState(false);
  const [detectedContext, setDetectedContext] = useState<{
    orgId?: string;
    tier?: string;
    entryPoint?: string;
  }>({});

  // Detect context from URL if not provided
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const path = window.location.pathname;
    let detectedOrgId = orgId;
    let detectedEntryPoint = entryPoint;

    // Try to extract orgId from URL patterns
    if (!detectedOrgId) {
      const orgMatch = path.match(/\/organization\/([^\/]+)/);
      if (orgMatch) {
        detectedOrgId = orgMatch[1];
        detectedEntryPoint = detectedEntryPoint || 'organization_page';
      }
    }

    // Detect entry point from path
    if (!detectedEntryPoint) {
      if (path.includes('/zone/')) {
        detectedEntryPoint = 'zone_page';
      } else if (path.includes('/settings')) {
        detectedEntryPoint = 'settings_page';
      } else if (path.includes('/admin')) {
        detectedEntryPoint = 'admin_page';
      } else if (path === '/') {
        detectedEntryPoint = 'dashboard';
      } else {
        detectedEntryPoint = 'chat_widget';
      }
    }

    setDetectedContext({
      orgId: detectedOrgId,
      tier: tier,
      entryPoint: detectedEntryPoint,
    });
  }, [orgId, tier, entryPoint]);

  const toggleChat = () => {
    setIsOpen(!isOpen);
  };

  const closeChat = () => {
    setIsOpen(false);
  };

  return (
    <>
      <ChatBubble onClick={toggleChat} />
      <ChatWindow 
        isOpen={isOpen} 
        onClose={closeChat}
        orgId={detectedContext.orgId}
        tier={detectedContext.tier}
        entryPoint={detectedContext.entryPoint}
      />
    </>
  );
}

