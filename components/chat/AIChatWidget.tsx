'use client';

import { useState } from 'react';
import { ChatBubble } from './ChatBubble';
import { ChatWindow } from './ChatWindow';

export function AIChatWidget() {
  const [isOpen, setIsOpen] = useState(false);

  const toggleChat = () => {
    setIsOpen(!isOpen);
  };

  const closeChat = () => {
    setIsOpen(false);
  };

  return (
    <>
      <ChatBubble onClick={toggleChat} />
      <ChatWindow isOpen={isOpen} onClose={closeChat} />
    </>
  );
}

