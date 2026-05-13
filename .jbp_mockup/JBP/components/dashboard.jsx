// Screen 2: Customer Dashboard ("Their Page")

function SideNav({ t, active = 'overview', onJBP }) {
  const items = [
    { id: 'overview', label: 'Overview', icon: 'sparkle' },
    { id: 'site', label: 'Website', icon: 'globe' },
    { id: 'dns', label: 'DNS', icon: 'server' },
    { id: 'domains', label: 'Domains', icon: 'shield' },
    { id: 'analytics', label: 'Analytics', icon: 'chart' },
    { id: 'billing', label: 'Billing', icon: 'credit' },
  ];
  return (
    <aside style={{
      width: 240, borderRight: `1px solid ${t.border}`, background: t.surface,
      padding: '20px 14px', display: 'flex', flexDirection: 'column', gap: 20,
    }}>
      <div style={{ padding: '0 8px' }}><Logo t={t} /></div>

      <div style={{
        padding: 10, borderRadius: 10, background: t.surfaceAlt,
        border: `1px solid ${t.border}`,
      }}>
        <div style={{ fontSize: 11, color: t.textFaint, fontWeight: 600, letterSpacing: 0.4, textTransform: 'uppercase', fontFamily: FONT }}>
          Workspace
        </div>
        <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 22, height: 22, borderRadius: 6, background: t.accent, color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 700, fontFamily: FONT }}>KS</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: t.text, fontFamily: FONT, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              Keller Studio
            </div>
            <div style={{ fontSize: 11, color: t.textMuted, fontFamily: FONT }}>Pro · monthly</div>
          </div>
        </div>
      </div>

      <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {items.map(it => {
          const on = active === it.id;
          return (
            <a key={it.id} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px',
              borderRadius: 8, cursor: 'pointer', fontFamily: FONT, fontSize: 13.5,
              fontWeight: on ? 600 : 500,
              color: on ? t.text : t.textMuted,
              background: on ? t.surfaceAlt : 'transparent',
              textDecoration: 'none',
            }}>
              <Icon name={it.icon} size={15} color={on ? t.accent : t.textMuted} />
              {it.label}
            </a>
          );
        })}
      </nav>

      <div style={{ marginTop: 'auto', paddingTop: 14, borderTop: `1px solid ${t.border}` }}>
        <a onClick={onJBP} style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px',
          borderRadius: 8, cursor: 'pointer', fontFamily: FONT, fontSize: 13,
          color: t.textMuted, textDecoration: 'none',
        }}>
          <Icon name="users" size={15} color={t.textMuted} />
          Admin · JBP
        </a>
        <a style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px',
          borderRadius: 8, cursor: 'pointer', fontFamily: FONT, fontSize: 13,
          color: t.textMuted, textDecoration: 'none',
        }}>
          <Icon name="info" size={15} color={t.textMuted} />
          Help & docs
        </a>
      </div>
    </aside>
  );
}

function SectionHeader({ t, children, action }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14 }}>
      <h3 style={{
        margin: 0, fontSize: 13, fontWeight: 600, color: t.textMuted,
        textTransform: 'uppercase', letterSpacing: 0.6, fontFamily: FONT,
      }}>{children}</h3>
      {action}
    </div>
  );
}

// ── Site preview (hero) ─────────────────────────────────────
function SitePreview({ t }) {
  return (
    <Card t={t} padding={0} style={{ overflow: 'hidden' }}>
      <div style={{ padding: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Badge t={t} tone="success" dot>Live</Badge>
            <span style={{ fontFamily: MONO, fontSize: 13, color: t.text, fontWeight: 500 }}>keller.studio</span>
            <a style={{ color: t.textMuted, display: 'flex', cursor: 'pointer' }}>
              <Icon name="external" size={14} />
            </a>
          </div>
          <div style={{ fontSize: 12, color: t.textMuted, fontFamily: FONT, marginTop: 6 }}>
            Last deployed <span style={{ color: t.text, fontWeight: 500 }}>3 minutes ago</span> · <span style={{ fontFamily: MONO }}>main@a7f91c3</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button t={t} variant="secondary" size="sm" iconLeft={<Icon name="refresh" size={13} />}>Redeploy</Button>
          <Button t={t} size="sm" iconRight={<Icon name="external" size={13} color="#fff" />}>Visit site</Button>
        </div>
      </div>

      {/* Fake preview frame */}
      <div style={{ padding: '0 20px 20px' }}>
        <div style={{
          border: `1px solid ${t.border}`, borderRadius: 10, overflow: 'hidden',
          background: t.surfaceAlt,
        }}>
          {/* mini url bar */}
          <div style={{
            height: 28, borderBottom: `1px solid ${t.border}`,
            display: 'flex', alignItems: 'center', gap: 6, padding: '0 12px',
            background: t.surface,
          }}>
            <div style={{ display: 'flex', gap: 4 }}>
              {['#ff5f57','#febc2e','#28c840'].map(c => (
                <div key={c} style={{ width: 8, height: 8, borderRadius: 999, background: c, opacity: 0.8 }} />
              ))}
            </div>
            <div style={{ flex: 1, height: 16, borderRadius: 999, background: t.surfaceAlt, display: 'flex', alignItems: 'center', padding: '0 10px',
              fontFamily: MONO, fontSize: 10, color: t.textMuted, marginLeft: 10 }}>
              https://keller.studio
            </div>
          </div>
          {/* site content mock */}
          <div style={{ padding: '38px 44px', minHeight: 260, position: 'relative',
            background: `linear-gradient(180deg, ${t.surface} 0%, ${t.surfaceAlt} 100%)` }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: t.accent, letterSpacing: 1, fontFamily: FONT }}>KELLER STUDIO</div>
            <div style={{ marginTop: 10, fontSize: 30, fontWeight: 700, color: t.text, letterSpacing: -0.8, fontFamily: FONT, maxWidth: 440, lineHeight: 1.15 }}>
              Brand identity &amp; interactive design for small, stubborn teams.
            </div>
            <div style={{ marginTop: 14, fontSize: 13, color: t.textMuted, fontFamily: FONT, maxWidth: 440, lineHeight: 1.6 }}>
              Independent studio in San Francisco. Currently booking for Q3.
            </div>
            <div style={{ marginTop: 20, display: 'flex', gap: 8 }}>
              <div style={{ padding: '7px 14px', borderRadius: 6, background: t.text, color: t.bg, fontSize: 12, fontWeight: 600, fontFamily: FONT }}>See work</div>
              <div style={{ padding: '7px 14px', borderRadius: 6, border: `1px solid ${t.border}`, color: t.text, fontSize: 12, fontWeight: 600, fontFamily: FONT }}>Start a project →</div>
            </div>

            {/* faux thumbnail strip */}
            <div style={{ position: 'absolute', right: 44, top: 38, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, width: 180 }}>
              {[0,1,2,3].map(i => (
                <div key={i} style={{
                  aspectRatio: '1 / 1', borderRadius: 6,
                  background: `repeating-linear-gradient(${45 + i*30}deg, ${t.border}, ${t.border} 4px, ${t.surfaceAlt} 4px, ${t.surfaceAlt} 8px)`,
                  border: `1px solid ${t.border}`,
                }} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

// ── Quick actions (management shortcuts) ────────────────────
function QuickAction({ t, icon, title, description }) {
  const [hover, setHover] = React.useState(false);
  return (
    <a onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
      display: 'flex', gap: 14, padding: 16, textDecoration: 'none',
      borderRadius: 12, border: `1px solid ${hover ? t.borderStrong : t.border}`,
      background: hover ? t.surfaceHover : t.surface,
      cursor: 'pointer', transition: 'all .12s', fontFamily: FONT,
      boxShadow: hover ? t.shadowSm : 'none',
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: 9, flexShrink: 0,
        background: t.accentSoft, color: t.accent,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon name={icon} size={17} color={t.accent} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: t.text, letterSpacing: -0.1 }}>{title}</span>
          <Icon name="arrowRight" size={12} color={t.textFaint}
            style={{ transform: hover ? 'translateX(2px)' : 'translateX(0)', transition: 'transform .15s' }} />
        </div>
        <div style={{ fontSize: 12.5, color: t.textMuted, marginTop: 3, lineHeight: 1.45 }}>{description}</div>
      </div>
    </a>
  );
}

// ── DNS status card ─────────────────────────────────────────
function DNSStatusCard({ t }) {
  return (
    <Card t={t}>
      <SectionHeader t={t} action={<Button t={t} variant="link">Open zone editor →</Button>}>
        Domain &amp; DNS
      </SectionHeader>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div>
          <div style={{ fontSize: 12, color: t.textMuted, fontFamily: FONT }}>Primary domain</div>
          <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontFamily: MONO, fontSize: 15, color: t.text, fontWeight: 500 }}>keller.studio</span>
            <Badge t={t} tone="success" dot>Resolving</Badge>
          </div>
          <div style={{ fontSize: 12, color: t.textMuted, marginTop: 8, fontFamily: FONT }}>
            SSL certificate auto-renewed · expires Feb 17, 2027
          </div>
        </div>
        <div>
          <div style={{ fontSize: 12, color: t.textMuted, fontFamily: FONT }}>Nameservers</div>
          <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontFamily: MONO, fontSize: 12.5, color: t.text }}>ns1.jbp.app</span>
            <span style={{ fontFamily: MONO, fontSize: 12.5, color: t.text }}>ns2.jbp.app</span>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 18, borderTop: `1px solid ${t.border}`, paddingTop: 14 }}>
        <div style={{ fontSize: 12, color: t.textMuted, fontFamily: FONT, marginBottom: 10 }}>
          Active records <span style={{ color: t.text, fontWeight: 500 }}>· 7</span>
        </div>
        <div style={{
          display: 'grid', gridTemplateColumns: '60px 1fr 1fr 60px', gap: 0,
          border: `1px solid ${t.border}`, borderRadius: 8, overflow: 'hidden',
          fontFamily: MONO, fontSize: 12,
        }}>
          {[
            ['A',     '@',    '76.76.21.21',      '3600'],
            ['AAAA',  '@',    '2606:4700::1111',  '3600'],
            ['CNAME', 'www',  'cname.vercel-dns', '3600'],
            ['MX',    '@',    '10 mx.jbp.app',    '3600'],
            ['TXT',   '@',    'v=spf1 include:_spf…', '3600'],
          ].map((r, i) => (
            <React.Fragment key={i}>
              <div style={cell(t, i === 0, 'accent')}>{r[0]}</div>
              <div style={cell(t, i === 0)}>{r[1]}</div>
              <div style={cell(t, i === 0)} title={r[2]}>{r[2]}</div>
              <div style={{ ...cell(t, i === 0), color: t.textMuted }}>{r[3]}</div>
            </React.Fragment>
          ))}
        </div>
      </div>
    </Card>
  );
}
function cell(t, first, variant) {
  return {
    padding: '8px 12px',
    borderTop: first ? 'none' : `1px solid ${t.border}`,
    color: variant === 'accent' ? t.accent : t.text,
    fontWeight: variant === 'accent' ? 600 : 500,
    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
    background: t.surfaceAlt,
  };
}

// ── Analytics snapshot ──────────────────────────────────────
function Sparkline({ t, values, color, fill }) {
  const w = 200, h = 42, pad = 2;
  const max = Math.max(...values), min = Math.min(...values);
  const range = max - min || 1;
  const pts = values.map((v, i) => [
    pad + (i * (w - pad*2)) / (values.length - 1),
    h - pad - ((v - min) / range) * (h - pad*2),
  ]);
  const d = pts.map((p, i) => (i === 0 ? 'M' : 'L') + p[0] + ',' + p[1]).join(' ');
  const area = d + ` L${w-pad},${h} L${pad},${h} Z`;
  return (
    <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <path d={area} fill={fill} />
      <path d={d} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function AnalyticsCard({ t }) {
  const metrics = [
    { label: 'Visitors', value: '1,284', delta: '+12.4%', data: [32,28,35,42,38,51,49,55,60,58,66,72,78,74], positive: true },
    { label: 'Pageviews', value: '3,902', delta: '+8.1%',  data: [80,72,88,95,90,110,102,120,115,130,125,142,150,148], positive: true },
    { label: 'Uptime',   value: '99.98%', delta: '30d',   data: [99.9,99.9,100,99.95,100,100,99.99,100,100,99.9,100,100,99.98,100], positive: true, mono: true },
  ];
  return (
    <Card t={t}>
      <SectionHeader t={t} action={<Button t={t} variant="link">View analytics →</Button>}>
        Last 14 days
      </SectionHeader>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
        {metrics.map(m => (
          <div key={m.label}>
            <div style={{ fontSize: 12, color: t.textMuted, fontFamily: FONT, fontWeight: 500 }}>{m.label}</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 4 }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: t.text, fontFamily: m.mono ? MONO : FONT, letterSpacing: -0.5 }}>
                {m.value}
              </div>
              <div style={{ fontSize: 12, color: t.success, fontWeight: 600, fontFamily: FONT }}>{m.delta}</div>
            </div>
            <div style={{ marginTop: 8 }}>
              <Sparkline t={t} values={m.data} color={t.accent} fill={`${t.accent}18`} />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ── Billing card ────────────────────────────────────────────
function BillingCard({ t }) {
  return (
    <Card t={t}>
      <SectionHeader t={t} action={<Button t={t} variant="link">Manage billing →</Button>}>Plan &amp; billing</SectionHeader>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 17, fontWeight: 600, color: t.text, fontFamily: FONT, letterSpacing: -0.2 }}>Pro</span>
            <Badge t={t} tone="accent">Monthly</Badge>
          </div>
          <div style={{ fontSize: 12.5, color: t.textMuted, marginTop: 4, fontFamily: FONT }}>
            Next invoice <span style={{ color: t.text, fontWeight: 500 }}>May 14 · $29.00</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Icon name="credit" size={16} color={t.textMuted} />
          <span style={{ fontFamily: MONO, fontSize: 12.5, color: t.textMuted }}>•••• 4242</span>
        </div>
      </div>
    </Card>
  );
}

// ── Dashboard ──────────────────────────────────────────────
function Dashboard({ t, onJBP }) {
  return (
    <div style={{ display: 'flex', minHeight: '100%', background: t.bg, fontFamily: FONT }}>
      <SideNav t={t} onJBP={onJBP} />

      <main style={{ flex: 1, padding: '28px 32px 60px', overflow: 'auto' }}>
        {/* header row */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 28 }}>
          <div>
            <div style={{ fontSize: 13, color: t.textMuted, fontWeight: 500, fontFamily: FONT }}>Welcome back, Jordan</div>
            <h1 style={{ margin: '4px 0 0', fontSize: 28, fontWeight: 700, color: t.text, letterSpacing: -0.6, fontFamily: FONT }}>
              Your workspace
            </h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Button t={t} variant="secondary" size="md" iconLeft={<Icon name="bell" size={14} />}>Notifications</Button>
            <Button t={t} size="md" iconLeft={<Icon name="plus" size={14} color="#fff" />}>New deploy</Button>
          </div>
        </div>

        {/* site preview */}
        <SitePreview t={t} />

        {/* Quick actions */}
        <div style={{ marginTop: 28 }}>
          <SectionHeader t={t}>Shortcuts</SectionHeader>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            <QuickAction t={t} icon="server" title="Manage DNS" description="Edit A, CNAME, MX, TXT records in the zone editor." />
            <QuickAction t={t} icon="globe" title="Change domain" description="Swap primary domain, add subdomains, redirects." />
            <QuickAction t={t} icon="shield" title="OpenSRS settings" description="Registrar contact, WHOIS privacy, renewal auto-pay." />
            <QuickAction t={t} icon="rocket" title="Redeploy site" description="Force a rebuild from the latest main commit." />
            <QuickAction t={t} icon="users" title="Invite collaborators" description="Add teammates or give your client a preview link." />
            <QuickAction t={t} icon="sparkle" title="Custom email" description="Set up jordan@keller.studio using your domain's MX." />
          </div>
        </div>

        {/* Bottom row */}
        <div style={{ marginTop: 28, display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 16 }}>
          <DNSStatusCard t={t} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <AnalyticsCard t={t} />
            <BillingCard t={t} />
          </div>
        </div>
      </main>
    </div>
  );
}

Object.assign(window, { Dashboard });
