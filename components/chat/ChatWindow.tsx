'use client';

import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';

interface ChatWindowProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ChatWindow({ isOpen, onClose }: ChatWindowProps) {
  const windowRef = useRef<HTMLDivElement>(null);
  const [shouldRender, setShouldRender] = useState(false);

  // Handle click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (windowRef.current && !windowRef.current.contains(event.target as Node)) {
        onClose();
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  // GSAP animations
  useGSAP(() => {
    if (!windowRef.current) return;

    if (isOpen) {
      setShouldRender(true);
      // Animate in: slide up + fade + scale
      gsap.fromTo(
        windowRef.current,
        {
          y: 40,
          opacity: 0,
          scale: 0.9,
        },
        {
          y: 0,
          opacity: 1,
          scale: 1,
          duration: 0.4,
          ease: 'power3.out',
        }
      );
    } else if (shouldRender) {
      // Animate out: slide down + fade + scale
      gsap.to(windowRef.current, {
        y: 20,
        opacity: 0,
        scale: 0.95,
        duration: 0.25,
        ease: 'power2.in',
        onComplete: () => setShouldRender(false),
      });
    }
  }, [isOpen, shouldRender]);

  if (!shouldRender) return null;

  return (
    <div
      ref={windowRef}
      className="fixed bottom-20 right-4 sm:bottom-24 sm:right-6 w-[calc(100vw-2rem)] sm:w-[350px] h-[500px] max-h-[calc(100vh-8rem)] bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-light dark:border-gray-600 flex flex-col z-50"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-light dark:border-gray-600">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-orange rounded-full flex items-center justify-center">
            <span className="text-white font-bold text-sm">J</span>
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">Jave</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">AI Assistant</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          aria-label="Close chat"
        >
          <svg
            className="w-5 h-5 text-gray-500 dark:text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Welcome Message */}
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 bg-orange rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-sm">J</span>
          </div>
          <div className="flex-1">
            <div className="bg-gray-100 dark:bg-gray-700 rounded-2xl rounded-tl-none px-4 py-3">
              <p className="text-sm text-gray-900 dark:text-white">
                Hi! I&apos;m Jave, your AI assistant. I&apos;m here to help you with anything you need.
              </p>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 ml-1">Just now</p>
          </div>
        </div>

        {/* Placeholder for future messages */}
        <div className="flex items-center justify-center py-8">
          <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
            Chat functionality coming soon...
          </p>
        </div>
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-gray-light dark:border-gray-600">
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Type a message..."
            className="flex-1 px-4 py-2.5 rounded-full border border-gray-light dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-orange transition-all text-sm"
            disabled
          />
          <button
            className="w-10 h-10 bg-orange hover:bg-orange-dark rounded-full flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-orange focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Send message"
            disabled
          >
            <svg
              className="w-5 h-5 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

