// Screen 1: Post-Purchase Setup Wizard
// Multi-step: DNS → Domain → OpenSRS → Confirm

function Stepper({ t, steps, current }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontFamily: FONT }}>
      {steps.map((s, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <React.Fragment key={i}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 26, height: 26, borderRadius: 999,
                background: done ? t.accent : active ? t.surface : t.surfaceAlt,
                border: `1.5px solid ${done || active ? t.accent : t.border}`,
                color: done ? '#fff' : active ? t.accent : t.textMuted,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 600,
                boxShadow: active ? `0 0 0 3px ${t.ring}` : 'none',
                transition: 'all .15s',
              }}>
                {done ? <Icon name="check" size={14} color="#fff" /> : i + 1}
              </div>
              <div style={{
                fontSize: 13, fontWeight: active ? 600 : 500,
                color: active || done ? t.text : t.textMuted,
                letterSpacing: -0.1,
              }}>{s}</div>
            </div>
            {i < steps.length - 1 && (
              <div style={{
                flex: 1, height: 1, background: done ? t.accent : t.border,
                transition: 'background .15s', minWidth: 20, maxWidth: 60,
              }} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

function FieldLabel({ t, children, hint, optional }) {
  return (
    <div style={{ marginBottom: 8, display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
      <label style={{ fontSize: 14, fontWeight: 600, color: t.text, fontFamily: FONT, letterSpacing: -0.1 }}>
        {children}
        {optional && <span style={{ color: t.textFaint, fontWeight: 500, marginLeft: 6, fontSize: 13 }}>optional</span>}
      </label>
      {hint && <span style={{ fontSize: 12, color: t.textMuted, fontFamily: FONT }}>{hint}</span>}
    </div>
  );
}

function StepHeader({ t, eyebrow, title, subtitle }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{
        fontSize: 12, fontWeight: 600, color: t.accent, fontFamily: FONT,
        textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8,
      }}>{eyebrow}</div>
      <h1 style={{
        margin: 0, fontSize: 28, fontWeight: 700, color: t.text, letterSpacing: -0.6,
        fontFamily: FONT, lineHeight: 1.15,
      }}>{title}</h1>
      {subtitle && (
        <p style={{
          margin: '10px 0 0', fontSize: 15, color: t.textMuted, fontFamily: FONT,
          lineHeight: 1.55, maxWidth: 560,
        }}>{subtitle}</p>
      )}
    </div>
  );
}

// ── Step 1: DNS Management ──────────────────────────────────
function StepDNS({ t, data, set }) {
  return (
    <div>
      <StepHeader t={t}
        eyebrow="Step 1 of 5"
        title="How do you want to manage DNS?"
        subtitle="Choose who's in charge of your DNS records. You can always switch later — nothing here is permanent."
      />
      <div style={{ display: 'grid', gap: 12 }}>
        <Radio t={t}
          checked={data.dnsMode === 'jbp'}
          onChange={() => set({ dnsMode: 'jbp' })}
          icon={<Icon name="sparkle" size={18} />}
          label="Let JBP manage it (recommended)"
          description="We'll point your domain at our nameservers and wire up everything — A, AAAA, CNAME, MX — automatically. Best if you just want it to work."
        />
        <Radio t={t}
          checked={data.dnsMode === 'self'}
          onChange={() => set({ dnsMode: 'self' })}
          icon={<Icon name="server" size={18} />}
          label="I'll manage my own DNS"
          description="You keep your current DNS provider (Cloudflare, Route 53, etc). We'll give you the records to add."
        />
        <Radio t={t}
          checked={data.dnsMode === 'skip'}
          onChange={() => set({ dnsMode: 'skip' })}
          icon={<Icon name="globe" size={18} />}
          label="Skip for now"
          description="Your site will live at a jbp.app subdomain. You can add a custom domain whenever you're ready."
        />
      </div>

      {data.dnsMode === 'jbp' && (
        <div style={{
          marginTop: 20, padding: 16, background: t.accentSoft,
          borderRadius: 10, border: `1px solid ${t.accent}22`,
          display: 'flex', gap: 12, alignItems: 'flex-start',
        }}>
          <div style={{ color: t.accent, marginTop: 2 }}><Icon name="info" size={16} /></div>
          <div style={{ fontSize: 13, color: t.text, fontFamily: FONT, lineHeight: 1.5 }}>
            You'll update nameservers at your registrar to <span style={{ fontFamily: MONO, fontSize: 12, background: t.surface, padding: '2px 6px', borderRadius: 4, border: `1px solid ${t.border}` }}>ns1.jbp.app</span> and <span style={{ fontFamily: MONO, fontSize: 12, background: t.surface, padding: '2px 6px', borderRadius: 4, border: `1px solid ${t.border}` }}>ns2.jbp.app</span>. Propagation usually takes 15 minutes to an hour.
          </div>
        </div>
      )}

      {data.dnsMode === 'self' && (
        <div style={{ marginTop: 20 }}>
          <FieldLabel t={t}>Current DNS provider</FieldLabel>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            {['Cloudflare', 'Route 53', 'Google', 'Other'].map(p => (
              <button key={p}
                onClick={() => set({ dnsProvider: p })}
                style={{
                  padding: '10px 12px', borderRadius: 8, fontFamily: FONT, fontSize: 13,
                  background: data.dnsProvider === p ? t.accentSoft : t.surface,
                  border: `1.5px solid ${data.dnsProvider === p ? t.accent : t.border}`,
                  color: data.dnsProvider === p ? t.accent : t.text,
                  cursor: 'pointer', fontWeight: 550,
                }}>{p}</button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Step 2: Website (content, brand, aesthetic) ────────────
function AestheticCard({ t, selected, onClick, id, title, description, swatches, fontLabel, sample }) {
  const on = selected === id;
  return (
    <button onClick={() => onClick(id)} style={{
      textAlign: 'left', padding: 0, cursor: 'pointer',
      background: on ? t.accentSoft : t.surface,
      border: `1.5px solid ${on ? t.accent : t.border}`,
      borderRadius: 12, overflow: 'hidden', fontFamily: FONT,
      boxShadow: on ? `0 0 0 3px ${t.ring}` : 'none',
      transition: 'all .12s',
    }}>
      <div style={{
        height: 108, padding: '16px 18px',
        background: sample.bg,
        borderBottom: `1px solid ${on ? t.accent : t.border}`,
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
      }}>
        <div style={{
          fontFamily: sample.font, fontWeight: sample.weight,
          fontSize: sample.size, letterSpacing: sample.tracking,
          color: sample.fg, lineHeight: 1.1,
        }}>{sample.text}</div>
        <div style={{ display: 'flex', gap: 6 }}>
          {swatches.map((c, i) => (
            <div key={i} style={{ width: 18, height: 18, borderRadius: 5, background: c, boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.08)' }} />
          ))}
        </div>
      </div>
      <div style={{ padding: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: t.text, letterSpacing: -0.1 }}>{title}</div>
          {on && <Icon name="check" size={13} color={t.accent} />}
        </div>
        <div style={{ fontSize: 12.5, color: t.textMuted, marginTop: 4, lineHeight: 1.45 }}>{description}</div>
        <div style={{ fontSize: 11, color: t.textFaint, marginTop: 8, fontFamily: MONO, letterSpacing: 0.2 }}>{fontLabel}</div>
      </div>
    </button>
  );
}

function StepWebsite({ t, data, set }) {
  const toneOptions = ['Friendly', 'Professional', 'Playful', 'Direct', 'Warm', 'Technical'];
  const aesthetics = [
    {
      id: 'bold',
      title: 'Bold & editorial',
      description: 'High contrast, oversized serif headlines, saturated accents. Great for studios, restaurants, brands with a story.',
      swatches: ['#0f0f0f', '#f5f1e8', '#d97706', '#1e4620'],
      fontLabel: 'Fraunces / GT America',
      sample: { bg: '#f5f1e8', fg: '#0f0f0f', font: 'Georgia, serif', weight: 700, size: 26, tracking: '-0.03em', text: 'Made with\nintention.' },
    },
    {
      id: 'simple',
      title: 'Simple & professional',
      description: 'Clean sans-serif, generous whitespace, a single restrained accent. Reliable for consultants, services, SaaS.',
      swatches: ['#ffffff', '#0f1419', '#e6e8ec', '#0284c7'],
      fontLabel: 'Inter / System UI',
      sample: { bg: '#ffffff', fg: '#0f1419', font: 'Inter, system-ui, sans-serif', weight: 600, size: 22, tracking: '-0.02em', text: 'Clear. Competent.\nCalm.' },
    },
    {
      id: 'choose',
      title: 'Let me pick everything',
      description: 'Upload your own logo, pick colors and fonts yourself, and write all the copy. Full control.',
      swatches: ['#7c3aed', '#059669', '#d97706', '#e11d48'],
      fontLabel: 'Your choice',
      sample: { bg: 'linear-gradient(135deg, #f5f3ff, #ecfdf5)', fg: '#1f2937', font: 'system-ui', weight: 600, size: 20, tracking: '-0.02em', text: 'Your brand,\nyour rules.' },
    },
  ];

  return (
    <div>
      <StepHeader t={t}
        eyebrow="Step 2 of 5"
        title="Let's build your website"
        subtitle="Tell us about your business. We'll generate the first draft — you can tweak anything after launch."
      />

      {/* Business basics */}
      <div style={{ display: 'grid', gap: 16 }}>
        <div>
          <FieldLabel t={t}>Business name</FieldLabel>
          <Input t={t} value={data.bizName} onChange={v => set({ bizName: v })} placeholder="Keller Studio" />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <FieldLabel t={t}>What do you do?</FieldLabel>
            <Input t={t} value={data.bizType} onChange={v => set({ bizType: v })}
              placeholder="Design studio, coffee shop, contractor…" />
          </div>
          <div>
            <FieldLabel t={t} optional>Tagline</FieldLabel>
            <Input t={t} value={data.tagline} onChange={v => set({ tagline: v })}
              placeholder="A short, memorable one-liner" />
          </div>
        </div>

        <div>
          <FieldLabel t={t} hint={`${(data.description || '').length}/280`}>Describe your business in a few sentences</FieldLabel>
          <textarea
            value={data.description || ''}
            onChange={e => set({ description: e.target.value })}
            placeholder="Independent brand and interactive studio. We help small teams ship products that feel considered. Based in San Francisco, working with clients across the US."
            rows={3}
            style={{
              width: '100%', padding: '10px 12px', fontSize: 14, fontFamily: FONT,
              borderRadius: 8, border: `1px solid ${t.border}`,
              background: t.surface, color: t.text, resize: 'vertical',
              outline: 'none', lineHeight: 1.5, boxShadow: t.shadowSm,
            }} />
        </div>

        {/* Logo + assets */}
        <div>
          <FieldLabel t={t} optional>Logo</FieldLabel>
          <div style={{ display: 'flex', gap: 12, alignItems: 'stretch' }}>
            <div style={{
              width: 80, height: 80, borderRadius: 10,
              border: `1.5px dashed ${t.borderStrong}`, background: t.surfaceAlt,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: t.textMuted, fontSize: 11, fontFamily: MONO, textAlign: 'center', padding: 6,
            }}>
              {data.logoName ? (
                <div style={{ color: t.text, fontWeight: 600, wordBreak: 'break-all' }}>
                  ✓<br />{data.logoName}
                </div>
              ) : 'no file'}
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 8 }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <Button t={t} variant="secondary" size="sm"
                  onClick={() => set({ logoName: 'logo-mark.svg' })}
                  iconLeft={<Icon name="plus" size={13} />}>Upload logo</Button>
                <Button t={t} variant="ghost" size="sm"
                  onClick={() => set({ logoName: null })}>
                  Skip — use text wordmark
                </Button>
              </div>
              <div style={{ fontSize: 12, color: t.textMuted }}>
                SVG or PNG, transparent background works best. We'll generate favicons automatically.
              </div>
            </div>
          </div>
        </div>

        <div>
          <FieldLabel t={t} optional>Photos &amp; imagery</FieldLabel>
          <div style={{
            padding: 16, borderRadius: 10, border: `1.5px dashed ${t.borderStrong}`,
            background: t.surfaceAlt, display: 'flex', alignItems: 'center', gap: 14,
          }}>
            <div style={{
              width: 38, height: 38, borderRadius: 8, background: t.surface,
              border: `1px solid ${t.border}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: t.textMuted,
            }}><Icon name="plus" size={16} /></div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: t.text }}>
                {data.photoCount ? `${data.photoCount} photos ready` : 'Drop product shots, team photos, or work samples'}
              </div>
              <div style={{ fontSize: 12, color: t.textMuted, marginTop: 2 }}>
                Up to 20 files. We'll optimize and lay them out. No assets? We'll use placeholders.
              </div>
            </div>
            <Button t={t} variant="secondary" size="sm"
              onClick={() => set({ photoCount: (data.photoCount || 0) + 6 })}>
              Browse files
            </Button>
          </div>
        </div>

        {/* Tone */}
        <div>
          <FieldLabel t={t}>Copy tone</FieldLabel>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {toneOptions.map(tn => {
              const on = data.tone === tn;
              return (
                <button key={tn} onClick={() => set({ tone: tn })}
                  style={{
                    padding: '7px 13px', borderRadius: 999, cursor: 'pointer',
                    fontFamily: FONT, fontSize: 13, fontWeight: 550,
                    background: on ? t.accentSoft : t.surface,
                    border: `1.5px solid ${on ? t.accent : t.border}`,
                    color: on ? t.accent : t.text,
                  }}>{tn}</button>
              );
            })}
          </div>
        </div>

        {/* Aesthetic */}
        <div style={{ marginTop: 4 }}>
          <FieldLabel t={t} hint="We'll handle typography, color, spacing">Pick an aesthetic direction</FieldLabel>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            {aesthetics.map(a => (
              <AestheticCard key={a.id} t={t} selected={data.aesthetic}
                onClick={v => set({ aesthetic: v })}
                id={a.id} title={a.title} description={a.description}
                swatches={a.swatches} fontLabel={a.fontLabel} sample={a.sample} />
            ))}
          </div>
        </div>

        {data.aesthetic === 'choose' && (
          <div style={{
            marginTop: 4, padding: 16, borderRadius: 10,
            background: t.surfaceAlt, border: `1px solid ${t.border}`,
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <FieldLabel t={t}>Primary color</FieldLabel>
                <Input t={t} value={data.customColor} onChange={v => set({ customColor: v })}
                  placeholder="#0284c7"
                  prefix={<div style={{ width: 14, height: 14, borderRadius: 4, background: data.customColor || t.accent, border: `1px solid ${t.border}` }} />} />
              </div>
              <div>
                <FieldLabel t={t}>Font family</FieldLabel>
                <Input t={t} value={data.customFont} onChange={v => set({ customFont: v })}
                  placeholder="Inter, Fraunces, IBM Plex…" />
              </div>
            </div>
          </div>
        )}

        <Checkbox t={t}
          checked={!!data.letUsWrite}
          onChange={v => set({ letUsWrite: v })}
          label="Write the copy for me"
          description="We'll draft the homepage, about page, and contact section based on what you told us. You can edit everything after launch." />
      </div>
    </div>
  );
}

// ── Step 3: Domain ──────────────────────────────────────────
function StepDomain({ t, data, set }) {
  return (
    <div>
      <StepHeader t={t}
        eyebrow="Step 3 of 5"
        title="What's your domain story?"
        subtitle="Got a domain already? Bring it along. Need one? We can register it for you through our OpenSRS partnership."
      />
      <div style={{ display: 'grid', gap: 12 }}>
        <Radio t={t}
          checked={data.domainMode === 'transfer'}
          onChange={() => set({ domainMode: 'transfer' })}
          icon={<Icon name="globe" size={18} />}
          label="Transfer a domain I already own"
          description="Move it from GoDaddy, Namecheap, wherever. We handle the EPP code dance."
        />
        <Radio t={t}
          checked={data.domainMode === 'connect'}
          onChange={() => set({ domainMode: 'connect' })}
          icon={<Icon name="refresh" size={18} />}
          label="Connect a domain without transferring"
          description="Keep it at your current registrar. Just point DNS at us."
        />
        <Radio t={t}
          checked={data.domainMode === 'register'}
          onChange={() => set({ domainMode: 'register' })}
          icon={<Icon name="plus" size={18} />}
          label="Register a new domain"
          description="Search and buy a fresh one — billed alongside your plan."
        />
      </div>

      {data.domainMode === 'transfer' && (
        <div style={{ marginTop: 22, display: 'grid', gap: 16 }}>
          <div>
            <FieldLabel t={t} hint="e.g. mycompany.com">Domain to transfer</FieldLabel>
            <Input t={t} value={data.domain} onChange={v => set({ domain: v })}
              placeholder="mycompany.com"
              prefix={<Icon name="globe" size={14} />} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <FieldLabel t={t} hint="From your current registrar">Auth / EPP code</FieldLabel>
              <Input t={t} value={data.epp} onChange={v => set({ epp: v })}
                placeholder="XXXX-XXXX-XXXX"
                suffix={<Icon name="copy" size={14} />} />
            </div>
            <div>
              <FieldLabel t={t}>Current registrar</FieldLabel>
              <Input t={t} value={data.registrar} onChange={v => set({ registrar: v })}
                placeholder="GoDaddy, Namecheap, …" />
            </div>
          </div>
          <Checkbox t={t}
            checked={!!data.unlocked}
            onChange={v => set({ unlocked: v })}
            label="My domain is unlocked and eligible for transfer"
            description="Most registrars let you unlock in the domain settings. Transfers take up to 5 days." />
        </div>
      )}

      {data.domainMode === 'connect' && (
        <div style={{ marginTop: 22 }}>
          <FieldLabel t={t} hint="We'll give you the records to add">Domain to connect</FieldLabel>
          <Input t={t} value={data.domain} onChange={v => set({ domain: v })}
            placeholder="mycompany.com"
            prefix={<Icon name="globe" size={14} />} />
        </div>
      )}

      {data.domainMode === 'register' && (
        <div style={{ marginTop: 22 }}>
          <FieldLabel t={t} hint="From $12/yr">Find a domain</FieldLabel>
          <Input t={t} value={data.search} onChange={v => set({ search: v })}
            placeholder="mycompany"
            suffix={<Button t={t} size="sm" variant="primary">Search</Button>} />

          {data.search && (
            <div style={{
              marginTop: 16, border: `1px solid ${t.border}`, borderRadius: 10,
              background: t.surfaceAlt, overflow: 'hidden',
            }}>
              {['.com', '.app', '.io', '.dev'].map((ext, i) => {
                const available = i !== 0;
                const price = { '.com': '$14.99', '.app': '$18.00', '.io': '$39.50', '.dev': '$15.00' }[ext];
                return (
                  <div key={ext} style={{
                    display: 'flex', alignItems: 'center', padding: '12px 16px',
                    borderTop: i > 0 ? `1px solid ${t.border}` : 'none',
                    fontFamily: FONT,
                  }}>
                    <div style={{ flex: 1, fontSize: 14, color: t.text, fontFamily: MONO }}>
                      {data.search}<span style={{ color: t.textMuted }}>{ext}</span>
                    </div>
                    {available ? (
                      <>
                        <span style={{ fontSize: 13, color: t.textMuted, marginRight: 14 }}>{price}/yr</span>
                        <Badge t={t} tone="success" dot>Available</Badge>
                      </>
                    ) : (
                      <Badge t={t} tone="neutral">Taken</Badge>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Step 4: OpenSRS / Registrar contact ─────────────────────
function StepOpenSRS({ t, data, set }) {
  return (
    <div>
      <StepHeader t={t}
        eyebrow="Step 4 of 5"
        title="Registrar contact details"
        subtitle="ICANN requires accurate contact info on every domain. This stays private — we enable WHOIS privacy by default."
      />

      <div style={{ display: 'grid', gap: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <FieldLabel t={t}>First name</FieldLabel>
            <Input t={t} value={data.firstName} onChange={v => set({ firstName: v })} placeholder="Jordan" />
          </div>
          <div>
            <FieldLabel t={t}>Last name</FieldLabel>
            <Input t={t} value={data.lastName} onChange={v => set({ lastName: v })} placeholder="Keller" />
          </div>
        </div>

        <div>
          <FieldLabel t={t} optional>Organization</FieldLabel>
          <Input t={t} value={data.org} onChange={v => set({ org: v })} placeholder="Keller Studio, LLC" />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <FieldLabel t={t}>Email</FieldLabel>
            <Input t={t} value={data.email} onChange={v => set({ email: v })} placeholder="jordan@keller.studio" />
          </div>
          <div>
            <FieldLabel t={t}>Phone</FieldLabel>
            <Input t={t} value={data.phone} onChange={v => set({ phone: v })} placeholder="+1 (555) 010-0110" />
          </div>
        </div>

        <div>
          <FieldLabel t={t}>Street address</FieldLabel>
          <Input t={t} value={data.address} onChange={v => set({ address: v })} placeholder="1148 Mission St" />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 12 }}>
          <div>
            <FieldLabel t={t}>City</FieldLabel>
            <Input t={t} value={data.city} onChange={v => set({ city: v })} placeholder="San Francisco" />
          </div>
          <div>
            <FieldLabel t={t}>State</FieldLabel>
            <Input t={t} value={data.state} onChange={v => set({ state: v })} placeholder="CA" />
          </div>
          <div>
            <FieldLabel t={t}>Postal</FieldLabel>
            <Input t={t} value={data.zip} onChange={v => set({ zip: v })} placeholder="94103" />
          </div>
        </div>

        <div style={{
          marginTop: 4, padding: 14, background: t.surfaceAlt,
          borderRadius: 10, border: `1px solid ${t.border}`,
          display: 'flex', gap: 12, alignItems: 'flex-start',
        }}>
          <div style={{ color: t.textMuted, marginTop: 1 }}><Icon name="lock" size={16} /></div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: t.text, fontFamily: FONT }}>
              WHOIS privacy is on
            </div>
            <div style={{ fontSize: 12.5, color: t.textMuted, fontFamily: FONT, marginTop: 2, lineHeight: 1.5 }}>
              Your personal details won't show up in public WHOIS lookups. Registrars see them — nobody else.
            </div>
          </div>
          <Toggle t={t} checked={data.whois !== false} onChange={v => set({ whois: v })} />
        </div>
      </div>
    </div>
  );
}

// ── Step 5: Confirm ─────────────────────────────────────────
function SummaryRow({ t, label, value, mono }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', padding: '14px 0',
      borderBottom: `1px solid ${t.border}`, fontFamily: FONT,
    }}>
      <div style={{ width: 180, fontSize: 13, color: t.textMuted, fontWeight: 500 }}>{label}</div>
      <div style={{
        flex: 1, fontSize: 14, color: t.text,
        fontFamily: mono ? MONO : FONT, fontWeight: 500,
      }}>{value}</div>
    </div>
  );
}

function StepConfirm({ t, data, onEdit }) {
  const dnsLabel = {
    jbp: 'JBP managed',
    self: `Self-managed${data.dnsProvider ? ` · ${data.dnsProvider}` : ''}`,
    skip: 'Skip — use jbp.app subdomain',
  }[data.dnsMode] || '—';
  const domainLabel = {
    transfer: `Transfer · ${data.domain || '—'}`,
    connect: `Connect · ${data.domain || '—'}`,
    register: `Register · ${data.search || '—'}.com`,
  }[data.domainMode] || '—';

  return (
    <div>
      <StepHeader t={t}
        eyebrow="Step 5 of 5"
        title="Looks good? Let's ship it."
        subtitle="Review your setup. Your site goes live the moment you confirm."
      />

      <Card t={t} padding={0}>
        <div style={{ padding: '8px 20px' }}>
          <SummaryRow t={t} label="DNS management" value={dnsLabel} />
          <SummaryRow t={t} label="Business" value={data.bizName || '—'} />
          <SummaryRow t={t} label="What you do" value={data.bizType || '—'} />
          <SummaryRow t={t} label="Aesthetic"
            value={{bold: 'Bold & editorial', simple: 'Simple & professional', choose: 'Custom'}[data.aesthetic] || '—'} />
          <SummaryRow t={t} label="Tone" value={data.tone || '—'} />
          <SummaryRow t={t} label="Copy" value={data.letUsWrite ? 'JBP will draft for you' : 'You’ll write it'} />
          <SummaryRow t={t} label="Domain" value={domainLabel} mono />
          {data.domainMode === 'transfer' && (
            <SummaryRow t={t} label="Auth code" value={data.epp ? '••••-••••-' + (data.epp.slice(-4) || 'XXXX') : '—'} mono />
          )}
          <SummaryRow t={t} label="Registrant"
            value={[data.firstName, data.lastName].filter(Boolean).join(' ') || '—'} />
          <SummaryRow t={t} label="Email" value={data.email || '—'} mono />
          <div style={{ display: 'flex', alignItems: 'flex-start', padding: '14px 0', fontFamily: FONT }}>
            <div style={{ width: 180, fontSize: 13, color: t.textMuted, fontWeight: 500 }}>WHOIS privacy</div>
            <Badge t={t} tone={data.whois !== false ? 'success' : 'neutral'} dot>
              {data.whois !== false ? 'Enabled' : 'Disabled'}
            </Badge>
          </div>
        </div>
      </Card>

      <div style={{
        marginTop: 20, padding: 16, borderRadius: 12,
        background: t.accentSoft, border: `1px solid ${t.accent}33`,
        display: 'flex', gap: 14, alignItems: 'flex-start',
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8, background: t.accent,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          color: '#fff',
        }}><Icon name="rocket" size={18} color="#fff" /></div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: t.text, fontFamily: FONT }}>
            We'll deploy your site to Vercel right after this
          </div>
          <div style={{ fontSize: 13, color: t.textMuted, marginTop: 3, fontFamily: FONT, lineHeight: 1.5 }}>
            First deploy takes about 60 seconds. You can watch it happen on your dashboard.
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Wizard shell ────────────────────────────────────────────
function SetupWizard({ t, onComplete }) {
  const [step, setStep] = React.useState(0);
  const [data, setData] = React.useState({
    dnsMode: 'jbp', dnsProvider: 'Cloudflare',
    bizName: 'Keller Studio', bizType: 'Brand & interactive design studio',
    tagline: 'Made with intention.',
    description: 'Independent brand and interactive studio helping small teams ship products that feel considered. Based in San Francisco, working with clients across the US.',
    logoName: 'keller-mark.svg', photoCount: 12,
    tone: 'Friendly', aesthetic: 'simple', letUsWrite: true,
    customColor: '#0284c7', customFont: 'Inter',
    domainMode: 'transfer', domain: 'keller.studio', epp: 'A7F9-23KD-LMX8', registrar: 'Namecheap', unlocked: true,
    search: '',
    firstName: 'Jordan', lastName: 'Keller', org: 'Keller Studio, LLC',
    email: 'jordan@keller.studio', phone: '+1 (555) 010-0110',
    address: '1148 Mission St', city: 'San Francisco', state: 'CA', zip: '94103',
    whois: true,
  });
  const set = patch => setData(d => ({ ...d, ...patch }));
  const steps = ['DNS', 'Website', 'Domain', 'Contact', 'Confirm'];
  const StepView = [StepDNS, StepWebsite, StepDomain, StepOpenSRS, StepConfirm][step];

  return (
    <div style={{ minHeight: '100%', background: t.bg, fontFamily: FONT }}>
      {/* Top bar */}
      <div style={{
        height: 60, borderBottom: `1px solid ${t.border}`,
        display: 'flex', alignItems: 'center', padding: '0 28px',
        background: t.surface, justifyContent: 'space-between',
      }}>
        <Logo t={t} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ fontSize: 13, color: t.textMuted }}>Signed in as <span style={{ color: t.text, fontWeight: 500 }}>jordan@keller.studio</span></span>
          <div style={{ width: 28, height: 28, borderRadius: 999, background: t.accent, color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 600 }}>JK</div>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '36px 32px 60px' }}>
        <div style={{
          background: t.surface, borderRadius: 14, padding: '18px 24px',
          border: `1px solid ${t.border}`, boxShadow: t.shadowSm, marginBottom: 28,
        }}>
          <Stepper t={t} steps={steps} current={step} />
        </div>

        <Card t={t} padding={36}>
          <StepView t={t} data={data} set={set} onEdit={setStep} />
        </Card>

        {/* Footer actions */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginTop: 24,
        }}>
          <Button t={t} variant="ghost"
            onClick={() => step > 0 ? setStep(s => s - 1) : null}
            disabled={step === 0}
            iconLeft={<Icon name="arrowLeft" size={14} />}>
            Back
          </Button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 13, color: t.textMuted }}>
              Step {step + 1} of {steps.length}
            </span>
            {step < steps.length - 1 ? (
              <Button t={t} onClick={() => setStep(s => s + 1)}
                iconRight={<Icon name="arrowRight" size={14} color="#fff" />}>
                Continue
              </Button>
            ) : (
              <Button t={t} onClick={onComplete} size="md"
                iconRight={<Icon name="rocket" size={14} color="#fff" />}>
                Launch my site
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { SetupWizard, StepDNS, StepWebsite, StepDomain, StepOpenSRS, StepConfirm, Stepper });
