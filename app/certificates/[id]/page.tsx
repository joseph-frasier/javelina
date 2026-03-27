'use client';

import { useParams } from 'next/navigation';
import CertificateDetail from '@/components/certificates/CertificateDetail';

export default function CertificateDetailPage() {
  const params = useParams();
  const id = params.id as string;

  return <CertificateDetail certificateId={id} />;
}
