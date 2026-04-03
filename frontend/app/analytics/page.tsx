'use client';
import { useEffect, useState } from 'react';
import AppLayout from '@/components/AppLayout';
import { ToastProvider, useToast } from '@/components/Toast';
import { api } from '@/lib/api';
import {
  BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { TrendingUp, Users, Mail, Zap, MousePointerClick, MessageSquare } from 'lucide-react';

const STATUS_COLORS: Record<string, string> = {
  cold: '#64748b', warm: '#f59e0b', hot: '#ef4444',
  converted: '#10b981', unsubscribed: '#6366f1', bounced: '#ec4899',
};

function AnalyticsContent() {
  const [overview, setOverview] = useState<any>(null);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [statusBreakdown, setStatusBreakdown] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.analytics.overview(),
      api.analytics.campaigns(),
      api.analytics.leadsTimeline(),
      api.analytics.statusBreakdown(),
    ]).then(([ov, camp, tl, sb]) => {
      setOverview(ov);
      setCampaigns(camp);
      setTimeline(tl);
      setStatusBreakdown(sb.filter((s: any) => s.count > 0));
      setLoading(false);
    });
  }, []);

  if (loading) return (
    <AppLayout title="Analytics"><div className="loading-overlay"><div className="spinner" /> Loading analytics...</div></AppLayout>
  );

  const emailStats = [
    { label: 'Open Rate', value: overview?.open_rate ?? 0, icon: Mail, color: 'var(--accent-cyan)', desc: `${overview?.total_opened ?? 0} opens` },
    { label: 'Click Rate', value: overview?.click_rate ?? 0, icon: MousePointerClick, color: 'var(--accent-orange)', desc: `${overview?.total_clicked ?? 0} clicks` },
    { label: 'Reply Rate', value: overview?.reply_rate ?? 0, icon: MessageSquare, color: 'var(--accent-green)', desc: `${overview?.total_replied ?? 0} replies` },
    { label: 'Bounce Rate', value: overview?.bounce_rate ?? 0, icon: Zap, color: 'var(--accent-red)', desc: `${overview?.total_bounced ?? 0} bounces` },
  ];

  return (
    <AppLayout title="Analytics" subtitle="Deep insights into your outreach performance">
      {/* Email Performance KPIs */}
      <div className="grid-4 mb-6">
        {emailStats.map(s => (
          <div key={s.label} className="card" style={{ textAlign: 'center', padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
              <s.icon size={22} color={s.color} />
            </div>
            <div style={{ fontSize: 32, fontWeight: 800, color: s.color }}>{s.value}%</div>
            <div style={{ fontWeight: 600, marginBottom: 2 }}>{s.label}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{s.desc}</div>
          </div>
        ))}
      </div>

      <div className="grid-2 mb-6">
        {/* Leads Timeline */}
        <div className="card">
          <div className="card-header">
            <div><div className="card-title">Lead Imports</div><div className="card-subtitle">Last 30 days</div></div>
          </div>
          {timeline.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={timeline}>
                <defs>
                  <linearGradient id="areagd" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} tickFormatter={v => v.slice(5)} />
                <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-light)', borderRadius: 8 }} />
                <Area type="monotone" dataKey="count" fill="url(#areagd)" stroke="#6366f1" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state" style={{ padding: '40px 0' }}><div className="empty-state-icon">📈</div><div className="empty-state-desc">No data yet</div></div>
          )}
        </div>

        {/* Status Pie */}
        <div className="card">
          <div className="card-header">
            <div><div className="card-title">Lead Pipeline</div><div className="card-subtitle">Status distribution</div></div>
          </div>
          {statusBreakdown.length > 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <ResponsiveContainer width="50%" height={200}>
                <PieChart>
                  <Pie data={statusBreakdown} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={75} innerRadius={45}>
                    {statusBreakdown.map((e, i) => <Cell key={i} fill={STATUS_COLORS[e.status] || '#6366f1'} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-light)', borderRadius: 8 }} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {statusBreakdown.map(s => (
                  <div key={s.status} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: STATUS_COLORS[s.status], flexShrink: 0 }} />
                    <span style={{ fontSize: 12.5, flex: 1, textTransform: 'capitalize', color: 'var(--text-secondary)' }}>{s.status}</span>
                    <span style={{ fontWeight: 700, fontSize: 13 }}>{s.count}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="empty-state" style={{ padding: '40px 0' }}><div className="empty-state-icon">🎯</div><div className="empty-state-desc">No leads imported yet</div></div>
          )}
        </div>
      </div>

      {/* Campaign Performance Table */}
      {campaigns.length > 0 && (
        <div className="card mb-6">
          <div className="card-header">
            <div><div className="card-title">Campaign Performance</div><div className="card-subtitle">Open rates by campaign</div></div>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={campaigns} barCategoryGap="25%">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
              <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} unit="%" />
              <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-light)', borderRadius: 8 }} formatter={(v: any) => [`${v}%`]} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="open_rate" name="Open Rate %" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Campaign list */}
      {campaigns.length > 0 && (
        <div className="card">
          <div className="card-header">
            <div className="card-title">Campaign Details</div>
          </div>
          <div className="table-container" style={{ border: 'none' }}>
            <table>
              <thead>
                <tr>
                  <th>Campaign</th>
                  <th>Status</th>
                  <th>Sent</th>
                  <th>Open Rate</th>
                  <th>Clicks</th>
                  <th>Replies</th>
                  <th>Bounced</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map(c => (
                  <tr key={c.id}>
                    <td className="primary">{c.name}</td>
                    <td><span className={`badge badge-${c.status === 'completed' ? 'success' : c.status === 'active' ? 'info' : 'neutral'}`}>{c.status}</span></td>
                    <td>{c.sent}</td>
                    <td><span style={{ color: 'var(--accent-cyan)', fontWeight: 600 }}>{c.open_rate}%</span></td>
                    <td>{c.clicked}</td>
                    <td><span style={{ color: 'var(--accent-green)', fontWeight: 600 }}>{c.replied}</span></td>
                    <td><span style={{ color: 'var(--accent-red)' }}>{c.bounced}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </AppLayout>
  );
}

export default function AnalyticsPage() {
  return <ToastProvider><AnalyticsContent /></ToastProvider>;
}
