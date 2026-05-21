'use client';

import { FONT } from '@/components/business/ui/tokens';
import { useBusinessTheme } from '@/lib/business-theme-store';

interface Props {
  message: string;
}

export function EmptyCardState({ message }: Props) {
  const t = useBusinessTheme();
  return (
    <div
      style={{
        padding: '20px 4px',
        fontSize: 13,
        color: t.textMuted,
        fontFamily: FONT,
        lineHeight: 1.5,
      }}
    >
      {message}
    </div>
  );
}
