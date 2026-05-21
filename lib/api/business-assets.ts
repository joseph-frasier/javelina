// javelina/lib/api/business-assets.ts
'use server';

import { cookies } from 'next/headers';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export interface LogoResponse {
  storage_path: string;
  original_filename: string;
  size_bytes: number;
  mime_type: string;
  uploaded_at: string;
  signed_url: string;
  expires_at: string;
}

export interface PhotoResponse {
  id: string;
  storage_path: string;
  original_filename: string;
  size_bytes: number;
  mime_type: string;
  uploaded_at: string;
  signed_url: string;
  expires_at: string;
}

export interface AssetUrlsResponse {
  logo: LogoResponse | null;
  photos: PhotoResponse[];
}

export type UploadResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; status: number };

async function sessionHeader(): Promise<Record<string, string>> {
  const cookieStore = await cookies();
  const sess = cookieStore.get('javelina_session');
  return sess ? { Cookie: `javelina_session=${sess.value}` } : {};
}

async function postFormData(path: string, form: FormData): Promise<Response> {
  const headers = await sessionHeader();
  // Note: do NOT set Content-Type — fetch will set the multipart boundary.
  return fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    body: form,
    headers,
    cache: 'no-store',
  });
}

export async function uploadLogo(
  orgId: string,
  form: FormData
): Promise<UploadResult<LogoResponse>> {
  try {
    const res = await postFormData(`/api/business/${orgId}/intake/logo`, form);
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, error: json?.error ?? 'unknown_error', status: res.status };
    }
    return { ok: true, data: json?.data as LogoResponse };
  } catch (err) {
    console.error('[business-assets api] uploadLogo', err);
    return { ok: false, error: 'network_error', status: 0 };
  }
}

export async function uploadPhotos(
  orgId: string,
  form: FormData
): Promise<UploadResult<{ photos: PhotoResponse[] }>> {
  try {
    const res = await postFormData(`/api/business/${orgId}/intake/photos`, form);
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, error: json?.error ?? 'unknown_error', status: res.status };
    }
    return { ok: true, data: json?.data as { photos: PhotoResponse[] } };
  } catch (err) {
    console.error('[business-assets api] uploadPhotos', err);
    return { ok: false, error: 'network_error', status: 0 };
  }
}

export async function deletePhoto(
  orgId: string,
  photoId: string
): Promise<UploadResult<null>> {
  try {
    const headers = await sessionHeader();
    const res = await fetch(
      `${API_BASE_URL}/api/business/${orgId}/intake/photos/${photoId}`,
      { method: 'DELETE', headers, cache: 'no-store' }
    );
    if (res.status === 204) return { ok: true, data: null };
    const json = await res.json().catch(() => ({}));
    return { ok: false, error: json?.error ?? `http_${res.status}`, status: res.status };
  } catch (err) {
    console.error('[business-assets api] deletePhoto', err);
    return { ok: false, error: 'network_error', status: 0 };
  }
}

export async function getAssetUrls(
  orgId: string
): Promise<AssetUrlsResponse | null> {
  try {
    const headers = await sessionHeader();
    const res = await fetch(
      `${API_BASE_URL}/api/business/${orgId}/intake/asset-urls`,
      { headers, cache: 'no-store' }
    );
    if (!res.ok) return null;
    const json = await res.json();
    return (json?.data ?? null) as AssetUrlsResponse | null;
  } catch (err) {
    console.error('[business-assets api] getAssetUrls', err);
    return null;
  }
}
