'use client';
import { useEffect, useState } from 'react';
import AppLayout from '@/components/AppLayout';
import { api } from '@/lib/api';
import {
  Users, Mail, TrendingUp, Zap, Target, BarChart2,
  ArrowUpRight, Activity, Clock, CheckCircle2
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, Legend
} from 'recharts';
import Link from 'next/link';

const STATUS_COLORS: Record<string, string> = {
  cold: '#64748b', warm: '#f59e0b', hot: '#ef4444',
  converted: '#10b981', unsubscribed: '#6366f1', bounced: '#ec4899',
};

export default function DashboardPage() {
  const [overview, setOverview] = useState<any>(null);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [statusBreakdown, setStatusBreakdown] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.analytics.overview(),
      api.analytics.leadsTimeline(),
      api.analytics.statusBreakdown(),
      api.analytics.campaigns(),
    ]).then(([ov, tl, sb, camp]) => {
      setOverview(ov);
      setTimeline(tl);
      setStatusBreakdown(sb.filter((s: any) => s.count > 0));
      setCampaigns(camp.slice(0, 5));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <AppLayout title="Dashboard" subtitle="Your outreach command center">
        <div className="loading-overlay"><div className="spinner" /> Loading dashboard...</div>
      </AppLayout>
    );
  }

  const stats = [
    { label: 'Total Leads', value: overview?.total_leads ?? 0, icon: Users, accent: 'indigo', color: 'accent-indigo', change: null },
    { label: 'Emails Sent', value: overview?.total_sent ?? 0, icon: Mail, accent: 'cyan', color: 'accent-cyan', change: null },
    { label: 'Open Rate', value: `${overview?.open_rate ?? 0}%`, icon: TrendingUp, accent: 'green', color: 'accent-green', change: null },
    { label: 'Hot Leads', value: overview?.hot_leads ?? 0, icon: Zap, accent: 'red', color: 'accent-red', change: null },
    { label: 'Reply Rate', value: `${overview?.reply_rate ?? 0}%`, icon: Activity, accent: 'orange', color: 'accent-orange', change: null },
    { label: 'Converted', value: overview?.converted_leads ?? 0, icon: CheckCircle2, accent: 'green', color: 'accent-green', change: null },
  ];

  return (
    <AppLayout
      title="Dashboard"
      subtitle="Your cold-to-hot conversion command center"
      actions={
        <Link href="/import" className="btn btn-primary">
          <Users size={15} /> Import Leads
        </Link>
      }
    >
      {/* Hero Stats */}
      <div className="grid-3 mb-6">
        {stats.map((s) => (
          <div key={s.label} className={`stat-card ${s.color}`}>
            <div className={`stat-icon ${s.accent}`}>
              <s.icon size={20} color={`var(--accent-${s.accent === 'indigo' ? 'primary' : s.accent === 'cyan' ? 'cyan' : s.accent === 'green' ? 'green' : s.accent === 'red' ? 'red' : s.accent === 'orange' ? 'orange' : 'primary'})`} />
            </div>
            <div className="stat-value">{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid-2 mb-6">
        {/* Leads Over Time */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Leads Imported</div>
              <div className="card-subtitle">Last 30 days</div>
            </div>
            <BarChart2 size={16} color="var(--text-muted)" />
          </div>
          {timeline.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={timeline}>
                <defs>
                  <linearGradient id="gd" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} tickFormatter={v => v.slice(5)} />
                <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-light)', borderRadius: 8 }}
                  labelStyle={{ color: 'var(--text-primary)' }}
                />
                <Area type="monotone" dataKey="count" stroke="#6366f1" fill="url(#gd)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state" style={{ padding: '40px 0' }}>
              <div className="empty-state-icon">📈</div>
              <div className="empty-state-title">No data yet</div>
              <div className="empty-state-desc">Import leads to see the timeline</div>
            </div>
          )}
        </div>

        {/* Lead Status Breakdown */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Lead Pipeline</div>
              <div className="card-subtitle">Status breakdown</div>
            </div>
            <Target size={16} color="var(--text-muted)" />
          </div>
          {statusBreakdown.length > 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
              <ResponsiveContainer width="50%" height={180}>
                <PieChart>
                  <Pie data={statusBreakdown} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={70} innerRadius={45}>
                    {statusBreakdown.map((entry, i) => (
                      <Cell key={i} fill={STATUS_COLORS[entry.status] || '#6366f1'} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-light)', borderRadius: 8 }} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {statusBreakdown.map((s) => (
                  <div key={s.status} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: STATUS_COLORS[s.status], flexShrink: 0 }} />
                    <span style={{ fontSize: 12.5, color: 'var(--text-secondary)', textTransform: 'capitalize', flex: 1 }}>{s.status}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{s.count}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="empty-state" style={{ padding: '40px 0' }}>
              <div className="empty-state-icon">🎯</div>
              <div className="empty-state-title">No leads yet</div>
              <div className="empty-state-desc">Import your first leads to see the pipeline</div>
            </div>
          )}
        </div>
      </div>

      {/* Email Performance */}
      {campaigns.length > 0 && (
        <div className="card mb-6">
          <div className="card-header">
            <div>
              <div className="card-title">Campaign Performance</div>
              <div className="card-subtitle">Recent campaigns</div>
            </div>
            <Link href="/campaigns" className="btn btn-ghost btn-sm">View all <ArrowUpRight size={13} /></Link>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={campaigns} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
              <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} unit="%" />
              <Tooltip
                contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-light)', borderRadius: 8 }}
                formatter={(val: any) => [`${val}%`]}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="open_rate" name="Open Rate" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid-4">
        {[
          { href: '/import', icon: '📥', label: 'Import Leads', desc: 'Upload CSV from Google Sheets' },
          { href: '/campaigns/new', icon: '🚀', label: 'New Campaign', desc: 'Launch targeted outreach' },
          { href: '/templates', icon: '✉️', label: 'Templates', desc: 'Create email templates' },
          { href: '/analytics', icon: '📊', label: 'Analytics', desc: 'Deep dive into metrics' },
        ].map((a) => (
          <Link key={a.href} href={a.href} className="card" style={{ textDecoration: 'none', cursor: 'pointer', transition: 'border-color 0.2s ease, transform 0.2s ease' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent-primary)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-3px)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLElement).style.transform = ''; }}
          >
            <div style={{ fontSize: 28, marginBottom: 8 }}>{a.icon}</div>
            <div style={{ fontWeight: 600, marginBottom: 4, color: 'var(--text-primary)' }}>{a.label}</div>
            <div className="text-sm text-secondary">{a.desc}</div>
          </Link>
        ))}
      </div>
    </AppLayout>
  );
}
