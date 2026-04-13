'use client';

import { Modal } from '@/components/ui/Modal';
import DomainCheckoutForm from '@/components/domains/DomainCheckoutForm';
import type { DomainRegistrationType } from '@/types/domains';

interface DomainCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  domain: string;
  registrationType: DomainRegistrationType;
  price: number;
  currency: string;
  onSuccess: () => void;
}

export function DomainCheckoutModal({
  isOpen,
  onClose,
  domain,
  registrationType,
  price,
  currency,
  onSuccess,
}: DomainCheckoutModalProps) {
  const title = registrationType === 'transfer' ? `Transfer ${domain}` : `Register ${domain}`;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="xlarge"
      allowOverflow
    >
      <DomainCheckoutForm
        domain={domain}
        registrationType={registrationType}
        price={price}
        currency={currency}
        onCancel={onClose}
        onSuccess={onSuccess}
        asModal
      />
    </Modal>
  );
}
