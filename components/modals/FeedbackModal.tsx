'use client';

import { useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { useSettingsStore } from '@/lib/settings-store';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function FeedbackModal({ isOpen, onClose }: FeedbackModalProps) {
  const { general } = useSettingsStore();
  const isDarkMode = general.theme === 'dark';

  // Load Freshdesk widget script when modal opens
  useEffect(() => {
    if (isOpen) {
      // Check if script is already loaded
      const existingScript = document.getElementById('freshdesk-widget-script');
      if (!existingScript) {
        const script = document.createElement('script');
        script.id = 'freshdesk-widget-script';
        script.type = 'text/javascript';
        script.src = 'https://s3.amazonaws.com/assets.freshdesk.com/widget/freshwidget.js';
        script.async = true;
        document.head.appendChild(script);
      }

      // Load Freshdesk widget CSS
      const existingStyle = document.getElementById('freshdesk-widget-style');
      if (!existingStyle) {
        const style = document.createElement('style');
        style.id = 'freshdesk-widget-style';
        style.type = 'text/css';
        style.media = 'screen, projection';
        style.appendChild(
          document.createTextNode('@import url(https://s3.amazonaws.com/assets.freshdesk.com/widget/freshwidget.css);')
        );
        document.head.appendChild(style);
      }

      // Inject custom CSS for dark mode styling
      if (isDarkMode) {
        const customStyleId = 'freshdesk-dark-mode-override';
        let customStyle = document.getElementById(customStyleId);
        
        if (!customStyle) {
          customStyle = document.createElement('style');
          customStyle.id = customStyleId;
          customStyle.textContent = `
            .feedback-modal-content iframe {
              filter: invert(0.9) hue-rotate(180deg) !important;
              background: #1a1b1e !important;
            }
            .feedback-modal-content {
              background: #1a1b1e !important;
            }
          `;
          document.head.appendChild(customStyle);
        }
      } else {
        // Remove dark mode styling if switching to light mode
        const customStyle = document.getElementById('freshdesk-dark-mode-override');
        if (customStyle) {
          customStyle.remove();
        }
      }
    }
  }, [isOpen, isDarkMode]);

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title="Submit a ticket" 
      subtitle="We're here to help"
      size="xlarge"
    >
      <div className={`feedback-modal-content ${isDarkMode ? 'dark-mode' : ''}`}>
        <iframe
          title="Feedback Form"
          className="freshwidget-embedded-form w-full rounded-md"
          id="freshwidget-embedded-form"
          src="https://irongrove-help.freshdesk.com/widgets/feedback_widget/new?&widgetType=embedded&searchArea=no"
          scrolling="no"
          height="600px"
          width="100%"
          style={{ border: 'none' }}
        />
      </div>
    </Modal>
  );
}

