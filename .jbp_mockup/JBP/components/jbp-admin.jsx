// JBP internal view — multi-tenant overview

const TENANTS = [
  { name: 'Keller Studio',   domain: 'keller.studio',      plan: 'Pro',    status: 'live',     since: 'Apr 22, 2026', deploys: 14, visitors: '1.2k',  owner: 'Jordan Keller',  avatar: '#0284c7' },
  { name: 'Northwind Coffee',domain: 'northwind.coffee',   plan: 'Pro',    status: 'live',     since: 'Apr 18, 2026', deploys: 42, visitors: '8.7k',  owner: 'Mei Park',        avatar: '#7c3aed' },
  { name: 'Alder & Oak',     domain: 'alderoak.com',       plan: 'Starter',status: 'live',     since: 'Apr 12, 2026', deploys: 6,  visitors: '420',   owner: 'Rafael Souza',    avatar: '#059669' },
  { name: 'Broadfin Labs',   domain: 'broadfin.ai',        plan: 'Pro',    status: 'deploying',since: 'Apr 22, 2026', deploys: 1,  visitors: '—',     owner: 'Dani Lowe',       avatar: '#d97706' },
  { name: 'Turner Carpentry',domain: 'turnerbuilds.co',    plan: 'Starter',status: 'dns',      since: 'Apr 21, 2026', deploys: 0,  visitors: '—',     owner: 'Ben Turner',      avatar: '#e11d48' },
  { name: 'Fieldnote',       domain: 'fieldnote.app',      plan: 'Pro',    status: 'live',     since: 'Apr 09, 2026', deploys: 88, visitors: '23.4k', owner: 'Aria Chen',       avatar: '#4f46e5' },
  { name: 'Bright Lantern',  domain: 'brightlantern.co',   plan: 'Starter',status: 'live',     since: 'Apr 03, 2026', deploys: 3,  visitors: '140',   owner: 'Noor Patel',      avatar: '#0284c7' },
  { name: 'Park & Provision',domain: 'parkprovision.shop', plan: 'Pro',    status: 'issue',    since: 'Mar 27, 2026', deploys: 31, visitors: '5.1k',  owner: 'Luka Ivanov',     avatar: '#7c3aed' },
  { name: 'Tallow Journal',  domain: 'tallow.pub',         plan: 'Starter',status: 'live',     since: 'Mar 18, 2026', deploys: 12, visitors: '790',   owner: 'Imani Brooks',    avatar: '#059669' },
  { name: 'Sundog Climbing', domain: 'sundog.gym',         plan: 'Pro',    status: 'live',     since: 'Mar 11, 2026', deploys: 19, visitors: '3.2k',  owner: 'Cam Riley',       avatar: '#d97706' },
];

const STATUS = {
  live:      { label: 'Live',        tone: 'success' },
  deploying: { label: 'Deploying',   tone: 'accent'  },
  dns:       { label: 'Awaiting DNS',tone: 'warning' },
  issue:     { label: 'Needs review',tone: 'danger'  },
};

function StatCard({ t, label, value, trend }) {
  return (
    <div style={{
      padding: '16px 18px', borderRadius: 12, background: t.surface,
      border: `1px solid ${t.border}`, fontFamily: FONT,
    }}>
      <div style={{ fontSize: 12, color: t.textMuted, fontWeight: 500 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 6 }}>
        <div style={{ fontSize: 24, fontWeight: 700, color: t.text, letterSpacing: -0.5 }}>{value}</div>
        {trend && <div style={{ fontSize: 12, color: t.success, fontWeight: 600 }}>{trend}</div>}
      </div>
    </div>
  );
}

function JBPAdmin({ t, onExit }) {
  const [query, setQuery] = React.useState('');
  const [filter, setFilter] = React.useState('all');

  const filtered = TENANTS.filter(row => {
    const q = query.toLowerCase();
    const matchQ = !q || row.name.toLowerCase().includes(q) || row.domain.toLowerCase().includes(q) || row.owner.toLowerCase().includes(q);
    const matchF = filter === 'all' || row.status === filter;
    return matchQ && matchF;
  });

  const filters = [
    { id: 'all', label: 'All', count: TENANTS.length },
    { id: 'live', label: 'Live', count: TENANTS.filter(r => r.status==='live').length },
    { id: 'deploying', label: 'Deploying', count: TENANTS.filter(r => r.status==='deploying').length },
    { id: 'dns', label: 'Awaiting DNS', count: TENANTS.filter(r => r.status==='dns').length },
    { id: 'issue', label: 'Issues', count: TENANTS.filter(r => r.status==='issue').length },
  ];

  return (
    <div style={{ minHeight: '100%', background: t.bg, fontFamily: FONT }}>
      {/* Admin top bar */}
      <div style={{
        height: 56, borderBottom: `1px solid ${t.border}`,
        background: t.surface,
        display: 'flex', alignItems: 'center', padding: '0 24px', gap: 16,
      }}>
        <Logo t={t} />
        <div style={{
          padding: '3px 9px', borderRadius: 5, border: `1px solid ${t.border}`,
          fontSize: 11, fontWeight: 600, color: t.textMuted, letterSpacing: 0.4,
          fontFamily: MONO, textTransform: 'uppercase', background: t.surfaceAlt,
        }}>Admin</div>
        <div style={{ flex: 1 }} />
        <Button t={t} variant="ghost" size="sm" onClick={onExit}
          iconLeft={<Icon name="arrowLeft" size={13} />}>Back to customer view</Button>
        <div style={{ width: 28, height: 28, borderRadius: 999, background: t.text, color: t.bg,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>AD</div>
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '28px 24px 60px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: t.accent, letterSpacing: 0.6, textTransform: 'uppercase' }}>
              Javelina Business Platform
            </div>
            <h1 style={{ margin: '6px 0 0', fontSize: 28, fontWeight: 700, color: t.text, letterSpacing: -0.6 }}>
              All tenants
            </h1>
          </div>
          <Button t={t} iconLeft={<Icon name="plus" size={13} color="#fff" />}>Provision tenant</Button>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
          <StatCard t={t} label="Active tenants" value={TENANTS.length} trend="+3 this week" />
          <StatCard t={t} label="Deployments (7d)" value="216" trend="+18%" />
          <StatCard t={t} label="Domains managed" value="14" />
          <StatCard t={t} label="MRR"             value="$1,840" trend="+$116" />
        </div>

        {/* Filter / search bar */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12,
          padding: 8, borderRadius: 12, background: t.surface,
          border: `1px solid ${t.border}`, boxShadow: t.shadowSm,
        }}>
          <div style={{ display: 'flex', gap: 4, padding: '0 4px' }}>
            {filters.map(f => (
              <button key={f.id} onClick={() => setFilter(f.id)}
                style={{
                  padding: '6px 11px', borderRadius: 6, border: 'none', cursor: 'pointer',
                  fontFamily: FONT, fontSize: 13, fontWeight: 550,
                  background: filter === f.id ? t.surfaceAlt : 'transparent',
                  color: filter === f.id ? t.text : t.textMuted,
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  boxShadow: filter === f.id ? `inset 0 0 0 1px ${t.border}` : 'none',
                }}>
                {f.label}
                <span style={{
                  fontSize: 11, padding: '1px 6px', borderRadius: 999,
                  background: filter === f.id ? t.accentSoft : t.surfaceAlt,
                  color: filter === f.id ? t.accent : t.textMuted,
                  fontFamily: MONO, fontWeight: 600,
                }}>{f.count}</span>
              </button>
            ))}
          </div>
          <div style={{ flex: 1 }} />
          <div style={{ width: 260 }}>
            <Input t={t} value={query} onChange={setQuery}
              placeholder="Search tenants, domains, owners…"
              prefix={<Icon name="search" size={13} />}
              style={{ height: 34 }} />
          </div>
        </div>

        {/* Table */}
        <div style={{
          background: t.surface, borderRadius: 12, overflow: 'hidden',
          border: `1px solid ${t.border}`, boxShadow: t.shadowSm,
        }}>
          {/* head */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '2.1fr 1.6fr 1fr 1fr 0.9fr 1.1fr 36px',
            padding: '10px 18px', borderBottom: `1px solid ${t.border}`,
            fontSize: 11, color: t.textMuted, fontWeight: 600, letterSpacing: 0.4,
            textTransform: 'uppercase', background: t.surfaceAlt,
          }}>
            <div>Tenant</div>
            <div>Domain</div>
            <div>Plan</div>
            <div>Status</div>
            <div>Deploys</div>
            <div>Visitors (7d)</div>
            <div />
          </div>
          {filtered.map((row, i) => {
            const st = STATUS[row.status];
            return (
              <div key={row.name} style={{
                display: 'grid',
                gridTemplateColumns: '2.1fr 1.6fr 1fr 1fr 0.9fr 1.1fr 36px',
                padding: '14px 18px', alignItems: 'center',
                borderBottom: i < filtered.length - 1 ? `1px solid ${t.border}` : 'none',
                fontSize: 13.5, color: t.text, fontFamily: FONT,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: 7, background: row.avatar, color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 700, flexShrink: 0,
                  }}>{row.name.split(' ').map(w => w[0]).slice(0,2).join('')}</div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, letterSpacing: -0.1 }}>{row.name}</div>
                    <div style={{ fontSize: 12, color: t.textMuted, marginTop: 1 }}>{row.owner}</div>
                  </div>
                </div>
                <div style={{ fontFamily: MONO, fontSize: 12.5, color: t.text, display: 'flex', alignItems: 'center', gap: 6 }}>
                  {row.domain}
                  <Icon name="external" size={11} color={t.textFaint} />
                </div>
                <div>
                  <Badge t={t} tone={row.plan === 'Pro' ? 'accent' : 'neutral'}>{row.plan}</Badge>
                </div>
                <div><Badge t={t} tone={st.tone} dot>{st.label}</Badge></div>
                <div style={{ fontFamily: MONO, fontSize: 12.5, color: t.textMuted }}>{row.deploys}</div>
                <div style={{ fontFamily: MONO, fontSize: 12.5, color: t.textMuted }}>{row.visitors}</div>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button style={{
                    width: 28, height: 28, borderRadius: 6, border: 'none', background: 'transparent',
                    cursor: 'pointer', color: t.textMuted, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}><Icon name="dots" size={15} color={t.textMuted} /></button>
                </div>
              </div>
            );
          })}
        </div>

        <div style={{
          marginTop: 10, fontSize: 12, color: t.textMuted, display: 'flex', justifyContent: 'space-between',
          padding: '0 4px',
        }}>
          <span>Showing {filtered.length} of {TENANTS.length}</span>
          <span>Updated just now</span>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { JBPAdmin });
