'use client';
import { useEffect, useRef, useState } from 'react';
import type { BusinessIntakeData, LogoAsset, PhotoAsset } from '@/lib/business-intake-store';
import { FONT, MONO, type Tokens } from '@/components/business/ui/tokens';
import { StepHeader } from '@/components/business/ui/StepHeader';
import { FieldLabel } from '@/components/business/ui/FieldLabel';
import { Input } from '@/components/business/ui/Input';
import { Checkbox } from '@/components/business/ui/Checkbox';
import { Button } from '@/components/business/ui/Button';
import { Icon } from '@/components/business/ui/Icon';
import { AestheticCard } from './AestheticCard';
import {
  uploadLogo,
  uploadPhotos,
  deletePhoto,
  getAssetUrls,
} from '@/lib/api/business-assets';

type W = BusinessIntakeData['website'];
type Patch = { website?: Partial<W> };

interface Props {
  t: Tokens;
  data: BusinessIntakeData;
  set: (patch: Patch) => void;
}

const TONES = ['Friendly', 'Professional', 'Playful', 'Direct', 'Warm', 'Technical'] as const;

const INDUSTRIES = [
  'Home Services',
  'Professional Services',
  'Retail & E-commerce',
  'Food & Beverage',
  'Health & Wellness',
  'Creative & Media',
  'Technology & Software',
  'Real Estate',
  'Education',
  'Nonprofit',
  'Other',
] as const;

const PAGE_OPTIONS = [
  { id: 'Home', required: true },
  { id: 'Services', required: false },
  { id: 'About', required: false },
  { id: 'Contact', required: false },
  { id: 'Gallery', required: false },
  { id: 'FAQs', required: false },
] as const;

// Per-plan caps (mirrors the marketing copy on Confirm step):
// business_starter -> 1-3 pages, business_pro -> 1-5 pages.
const PAGE_CAPS: Record<BusinessIntakeData['planCode'], number> = {
  business_starter: 3,
  business_pro: 5,
};

const AESTHETICS: Array<{
  id: 'bold' | 'simple' | 'choose';
  title: string;
  description: string;
  swatches: string[];
  fontLabel: string;
  sample: {
    bg: string; fg: string; font: string; weight: number;
    size: number; tracking: string; text: string;
  };
}> = [
  {
    id: 'bold',
    title: 'Bold & editorial',
    description: 'High contrast, oversized serif headlines, saturated accents.',
    swatches: ['#0f0f0f', '#f5f1e8', '#d97706', '#1e4620'],
    fontLabel: 'Fraunces / GT America',
    sample: {
      bg: '#f5f1e8', fg: '#0f0f0f', font: 'Georgia, serif',
      weight: 700, size: 26, tracking: '-0.03em',
      text: 'Made with\nintention.',
    },
  },
  {
    id: 'simple',
    title: 'Simple & professional',
    description: 'Clean sans-serif, generous whitespace, a single restrained accent.',
    swatches: ['#ffffff', '#0f1419', '#e6e8ec', '#0284c7'],
    fontLabel: 'Inter / System UI',
    sample: {
      bg: '#ffffff', fg: '#0f1419', font: 'Inter, system-ui, sans-serif',
      weight: 600, size: 22, tracking: '-0.02em',
      text: 'Clear. Competent.\nCalm.',
    },
  },
  {
    id: 'choose',
    title: 'Let me pick everything',
    description: 'Upload your own logo, pick colors and fonts yourself, and write all the copy.',
    swatches: ['#7c3aed', '#059669', '#d97706', '#e11d48'],
    fontLabel: 'Your choice',
    sample: {
      bg: 'linear-gradient(135deg, #f5f3ff, #ecfdf5)',
      fg: '#1f2937', font: 'system-ui',
      weight: 600, size: 20, tracking: '-0.02em',
      text: 'Your brand,\nyour rules.',
    },
  },
];

export function StepWebsite({ t, data, set }: Props) {
  const w = data.website;
  const update = (patch: Partial<W>) => set({ website: patch });

  // Local-only signed URL cache (1-hour TTL, not persisted in Zustand).
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});
  const [logoBusy, setLogoBusy] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const photoInputRef = useRef<HTMLInputElement | null>(null);

  // On mount (or when stored asset metadata changes from outside), pull fresh
  // 1-hour signed URLs so previews render after page reload.
  useEffect(() => {
    let cancelled = false;
    const hasLogoMeta = !!w.logo?.storage_path;
    const hasPhotoMeta = (w.photos ?? []).length > 0;
    if (!hasLogoMeta && !hasPhotoMeta) return;
    void (async () => {
      const urls = await getAssetUrls(data.orgId);
      if (cancelled || !urls) return;
      setLogoUrl(urls.logo?.signed_url ?? null);
      const map: Record<string, string> = {};
      for (const p of urls.photos) map[p.id] = p.signed_url;
      setPhotoUrls(map);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.orgId, w.logo?.storage_path, (w.photos ?? []).length]);

  async function handleLogoSelect(file: File) {
    setLogoError(null);
    setLogoBusy(true);
    // Optimistic preview.
    const objectUrl = URL.createObjectURL(file);
    setLogoUrl(objectUrl);

    const form = new FormData();
    form.append('file', file);
    const result = await uploadLogo(data.orgId, form);
    setLogoBusy(false);
    URL.revokeObjectURL(objectUrl);

    if (!result.ok) {
      setLogoUrl(null);
      setLogoError(result.error);
      update({ logo: null });
      return;
    }
    const { signed_url, expires_at, ...meta } = result.data;
    update({ logo: meta as LogoAsset });
    setLogoUrl(signed_url);
  }

  async function handlePhotosSelect(files: FileList) {
    setPhotoError(null);
    const incoming = Array.from(files);
    const existing = w.photos ?? [];
    if (existing.length + incoming.length > 10) {
      setPhotoError(`photo_limit_exceeded (${existing.length}/10)`);
      return;
    }
    setPhotoBusy(true);
    const form = new FormData();
    for (const f of incoming) form.append('files', f);
    const result = await uploadPhotos(data.orgId, form);
    setPhotoBusy(false);
    if (!result.ok) {
      setPhotoError(result.error);
      return;
    }
    const newMeta: PhotoAsset[] = result.data.photos.map(({ signed_url, expires_at, ...m }) => m);
    update({ photos: [...existing, ...newMeta] });
    setPhotoUrls((prev) => {
      const next = { ...prev };
      for (const p of result.data.photos) next[p.id] = p.signed_url;
      return next;
    });
  }

  async function handlePhotoDelete(photoId: string) {
    const existing = w.photos ?? [];
    const optimisticRemaining = existing.filter((p) => p.id !== photoId);
    update({ photos: optimisticRemaining });
    setPhotoUrls((prev) => {
      const next = { ...prev };
      delete next[photoId];
      return next;
    });
    const result = await deletePhoto(data.orgId, photoId);
    if (!result.ok) {
      // Revert on failure.
      update({ photos: existing });
      setPhotoError(result.error);
    }
  }

  return (
    <div>
      <StepHeader
        t={t}
        eyebrow="Step 2 of 5"
        title="Let's build your website"
        subtitle="Tell us about your business. We'll generate the first draft, then you can tweak anything after launch."
      />

      <div style={{ display: 'grid', gap: 16 }}>
        <div>
          <FieldLabel t={t}>Business name</FieldLabel>
          <Input t={t} value={w.bizName} onChange={(v) => update({ bizName: v })} placeholder="Keller Studio" />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <FieldLabel t={t}>What do you do?</FieldLabel>
            <Input
              t={t}
              value={w.bizType}
              onChange={(v) => update({ bizType: v })}
              placeholder="Design studio, coffee shop, contractor…"
            />
          </div>
          <div>
            <FieldLabel t={t} optional>Tagline</FieldLabel>
            <Input
              t={t}
              value={w.tagline}
              onChange={(v) => update({ tagline: v })}
              placeholder="A short, memorable one-liner"
            />
          </div>
        </div>

        <div>
          <FieldLabel t={t}>Industry</FieldLabel>
          <div style={{ position: 'relative' }}>
            <select
              value={w.industry || ''}
              onChange={(e) => update({ industry: e.target.value })}
              style={{
                width: '100%', padding: '10px 32px 10px 12px',
                fontSize: 14, fontFamily: FONT,
                borderRadius: 8, border: `1px solid ${t.border}`,
                backgroundColor: t.surface, color: w.industry ? t.text : t.textMuted,
                outline: 'none', boxShadow: t.shadowSm,
                appearance: 'none',
                WebkitAppearance: 'none',
                MozAppearance: 'none',
              }}
            >
              <option value="" disabled>Pick the closest fit</option>
              {INDUSTRIES.map((ind) => (
                <option key={ind} value={ind}>{ind}</option>
              ))}
            </select>
            <svg
              width={12} height={12} viewBox="0 0 24 24" fill="none"
              stroke={t.textMuted} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
              style={{
                position: 'absolute', right: 12, top: '50%',
                transform: 'translateY(-50%)', pointerEvents: 'none',
              }}
              aria-hidden="true"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>
        </div>

        <div>
          <FieldLabel t={t} hint={`${(w.description || '').length}/280`}>
            Describe your business in a few sentences
          </FieldLabel>
          <textarea
            value={w.description || ''}
            onChange={(e) => update({ description: e.target.value })}
            placeholder="Independent studio helping small teams ship products that feel considered."
            rows={3}
            style={{
              width: '100%', padding: '10px 12px',
              fontSize: 14, fontFamily: FONT,
              borderRadius: 8, border: `1px solid ${t.border}`,
              background: t.surface, color: t.text, resize: 'vertical',
              outline: 'none', lineHeight: 1.5, boxShadow: t.shadowSm,
            }}
          />
        </div>

        <div>
          <FieldLabel t={t} optional hint={`${(w.services || '').length}/500`}>
            What services or products do you offer?
          </FieldLabel>
          <textarea
            value={w.services || ''}
            onChange={(e) => update({ services: e.target.value.slice(0, 500) })}
            placeholder="Brand identity, web design, packaging. We typically work with early-stage product teams."
            rows={4}
            style={{
              width: '100%', padding: '10px 12px',
              fontSize: 14, fontFamily: FONT,
              borderRadius: 8, border: `1px solid ${t.border}`,
              background: t.surface, color: t.text, resize: 'vertical',
              outline: 'none', lineHeight: 1.5, boxShadow: t.shadowSm,
            }}
          />
          <div style={{ marginTop: 6, fontSize: 12, color: t.textMuted }}>
            We&apos;ll use this to draft your Services page and homepage copy.
          </div>
        </div>

        <div>
          <FieldLabel t={t} optional>Logo</FieldLabel>
          <input
            ref={logoInputRef}
            type="file"
            accept="image/png,image/jpeg,image/svg+xml,image/webp"
            style={{ display: 'none' }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleLogoSelect(f);
              e.currentTarget.value = '';
            }}
          />
          <div style={{ display: 'flex', gap: 12, alignItems: 'stretch' }}>
            <div
              style={{
                width: 80, height: 80, borderRadius: 10,
                border: `1.5px dashed ${t.borderStrong}`,
                background: t.surfaceAlt,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: t.textMuted, fontSize: 11, fontFamily: MONO,
                textAlign: 'center', padding: 6, overflow: 'hidden', position: 'relative',
              }}
            >
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={logoUrl}
                  alt={w.logo?.original_filename ?? 'logo preview'}
                  style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                />
              ) : (
                'no file'
              )}
              {logoBusy && (
                <div style={{
                  position: 'absolute', inset: 0,
                  background: 'rgba(255,255,255,0.7)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 10, color: t.textMuted,
                }}>
                  Uploading…
                </div>
              )}
            </div>
            <div
              style={{
                flex: 1, display: 'flex', flexDirection: 'column',
                justifyContent: 'center', gap: 8,
              }}
            >
              <div style={{ display: 'flex', gap: 8 }}>
                <Button
                  t={t}
                  variant="secondary"
                  size="sm"
                  onClick={() => logoInputRef.current?.click()}
                  iconLeft={<Icon name="plus" size={13} />}
                >
                  {w.logo ? 'Replace logo' : 'Upload logo'}
                </Button>
                <Button
                  t={t}
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    update({ logo: null });
                    setLogoUrl(null);
                    setLogoError(null);
                  }}
                >
                  Skip, use text wordmark
                </Button>
              </div>
              <div style={{ fontSize: 12, color: t.textMuted }}>
                SVG or PNG, transparent background works best. We&apos;ll generate favicons automatically.
              </div>
              {logoError && (
                <div style={{ fontSize: 12, color: '#b91c1c' }}>
                  Couldn&apos;t upload logo ({logoError}).
                </div>
              )}
            </div>
          </div>
        </div>

        <div>
          <FieldLabel t={t} optional>Photos &amp; imagery</FieldLabel>
          <input
            ref={photoInputRef}
            type="file"
            multiple
            accept="image/png,image/jpeg,image/webp,image/heic,image/heif"
            style={{ display: 'none' }}
            onChange={(e) => {
              const fs = e.target.files;
              if (fs && fs.length > 0) void handlePhotosSelect(fs);
              e.currentTarget.value = '';
            }}
          />
          <div
            style={{
              padding: 16, borderRadius: 10,
              border: `1.5px dashed ${t.borderStrong}`,
              background: t.surfaceAlt,
              display: 'flex', alignItems: 'center', gap: 14,
            }}
          >
            <div
              style={{
                width: 38, height: 38, borderRadius: 8,
                background: t.surface, border: `1px solid ${t.border}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: t.textMuted,
              }}
            >
              <Icon name="plus" size={16} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: t.text }}>
                {(w.photos ?? []).length
                  ? `${(w.photos ?? []).length} of 10 photos uploaded`
                  : 'Drop product shots, team photos, or work samples'}
              </div>
              <div style={{ fontSize: 12, color: t.textMuted, marginTop: 2 }}>
                Up to 10 files. PNG, JPG, WEBP, or HEIC.
              </div>
            </div>
            <Button
              t={t}
              variant="secondary"
              size="sm"
              onClick={() => photoInputRef.current?.click()}
            >
              {photoBusy ? 'Uploading…' : 'Browse files'}
            </Button>
          </div>
          {photoError && (
            <div style={{ fontSize: 12, color: '#b91c1c', marginTop: 6 }}>
              Couldn&apos;t upload photos ({photoError}).
            </div>
          )}
          {(w.photos ?? []).length > 0 && (
            <div
              style={{
                marginTop: 10,
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))',
                gap: 8,
              }}
            >
              {(w.photos ?? []).map((p) => {
                const url = photoUrls[p.id];
                return (
                  <div
                    key={p.id}
                    style={{
                      position: 'relative',
                      aspectRatio: '1 / 1',
                      borderRadius: 8,
                      overflow: 'hidden',
                      background: t.surface,
                      border: `1px solid ${t.border}`,
                    }}
                  >
                    {url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={url}
                        alt={p.original_filename}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <div
                        style={{
                          width: '100%', height: '100%',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 10, color: t.textMuted, fontFamily: MONO,
                        }}
                      >
                        loading…
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => void handlePhotoDelete(p.id)}
                      aria-label="Remove photo"
                      style={{
                        position: 'absolute', top: 4, right: 4,
                        width: 22, height: 22, borderRadius: 11,
                        background: 'rgba(15,20,25,0.7)', color: '#fff',
                        border: 'none', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 14, lineHeight: 1,
                      }}
                    >
                      ×
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div>
          {(() => {
            const cap = PAGE_CAPS[data.planCode] ?? 3;
            const selectedCount = (w.pages || []).length;
            const atCap = selectedCount >= cap;
            const planLabel =
              data.planCode === 'business_pro' ? 'Business Pro' : 'Business Starter';
            return (
              <>
                <FieldLabel t={t} hint={`${selectedCount} of ${cap} selected`}>
                  Pages to include
                </FieldLabel>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                  {PAGE_OPTIONS.map((p) => {
                    const selected = (w.pages || []).includes(p.id);
                    const locked = p.required;
                    const blockedByCap = !selected && !locked && atCap;
                    const interactive = !locked && !blockedByCap;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        disabled={locked || blockedByCap}
                        onClick={() => {
                          if (!interactive) return;
                          const curr = w.pages || [];
                          const next = selected
                            ? curr.filter((x) => x !== p.id)
                            : [...curr, p.id];
                          update({ pages: next });
                        }}
                        style={{
                          padding: '10px 12px', borderRadius: 8,
                          fontFamily: FONT, fontSize: 13, fontWeight: 550,
                          background: selected ? t.accentSoft : t.surface,
                          border: `1.5px solid ${selected ? t.accent : t.border}`,
                          color: selected ? t.accent : t.text,
                          cursor: interactive ? 'pointer' : 'not-allowed',
                          opacity: locked ? 0.85 : blockedByCap ? 0.45 : 1,
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          gap: 6,
                        }}
                      >
                        <span>{p.id}</span>
                        {locked ? (
                          <span style={{ fontSize: 10, fontFamily: MONO, color: t.textMuted }}>
                            required
                          </span>
                        ) : selected ? (
                          <Icon name="check" size={13} />
                        ) : null}
                      </button>
                    );
                  })}
                </div>
                <div style={{ marginTop: 6, fontSize: 12, color: t.textMuted }}>
                  {planLabel} includes up to {cap} pages.
                  {atCap ? ' Deselect one to swap.' : ''}
                </div>
              </>
            );
          })()}
        </div>

        <div>
          <FieldLabel t={t}>Copy tone</FieldLabel>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {TONES.map((tn) => {
              const on = w.tone === tn;
              return (
                <button
                  key={tn}
                  type="button"
                  onClick={() => update({ tone: tn })}
                  style={{
                    padding: '7px 13px', borderRadius: 999,
                    cursor: 'pointer',
                    fontFamily: FONT, fontSize: 13, fontWeight: 550,
                    background: on ? t.accentSoft : t.surface,
                    border: `1.5px solid ${on ? t.accent : t.border}`,
                    color: on ? t.accent : t.text,
                  }}
                >
                  {tn}
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ marginTop: 4 }}>
          <FieldLabel t={t} hint="We'll handle typography, color, spacing">
            Pick an aesthetic direction
          </FieldLabel>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            {AESTHETICS.map((a) => (
              <AestheticCard
                key={a.id}
                t={t}
                id={a.id}
                selected={w.aesthetic}
                onClick={(v) => update({ aesthetic: v })}
                title={a.title}
                description={a.description}
                swatches={a.swatches}
                fontLabel={a.fontLabel}
                sample={a.sample}
              />
            ))}
          </div>
        </div>

        {w.aesthetic === 'choose' && (
          <div
            style={{
              marginTop: 4, padding: 16, borderRadius: 10,
              background: t.surfaceAlt, border: `1px solid ${t.border}`,
            }}
          >
            <div style={{ display: 'grid', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <FieldLabel t={t}>Primary color</FieldLabel>
                  <Input
                    t={t}
                    value={w.customColor}
                    onChange={(v) => update({ customColor: v })}
                    placeholder="#EF7215"
                    prefix={
                      <div
                        style={{
                          width: 14, height: 14, borderRadius: 4,
                          background: w.customColor || t.accent,
                          border: `1px solid ${t.border}`,
                        }}
                      />
                    }
                  />
                </div>
                <div>
                  <FieldLabel t={t} optional>Secondary color</FieldLabel>
                  <Input
                    t={t}
                    value={w.customSecondaryColor}
                    onChange={(v) => update({ customSecondaryColor: v })}
                    placeholder="#1E4620"
                    prefix={
                      <div
                        style={{
                          width: 14, height: 14, borderRadius: 4,
                          background: w.customSecondaryColor || t.surfaceAlt,
                          border: `1px solid ${t.border}`,
                        }}
                      />
                    }
                  />
                </div>
              </div>
              <div>
                <FieldLabel t={t}>Font family</FieldLabel>
                <Input
                  t={t}
                  value={w.customFont}
                  onChange={(v) => update({ customFont: v })}
                  placeholder="Inter, Fraunces, IBM Plex…"
                />
              </div>
            </div>
          </div>
        )}

        <Checkbox
          t={t}
          checked={!!w.letUsWrite}
          onChange={(v) => update({ letUsWrite: v })}
          label="Write the copy for me"
          description="We'll draft the homepage, about, and contact sections based on what you told us."
        />
      </div>
    </div>
  );
}

export default StepWebsite;
