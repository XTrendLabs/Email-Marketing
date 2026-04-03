'use client';
import { useEffect, useState } from 'react';
import AppLayout from '@/components/AppLayout';
import { ToastProvider, useToast } from '@/components/Toast';
import { api } from '@/lib/api';
import Link from 'next/link';
import {
  Plus, Play, Pause, Trash2, BarChart2, Users,
  Clock, CheckCircle2, AlertCircle, X, ChevronRight
} from 'lucide-react';

const STATUS_COLOR: Record<string, string> = {
  draft: 'neutral', active: 'info', paused: 'warning',
  completed: 'success',
};

function CampaignCard({ campaign, onDelete, onSend, onPause, onStats }: any) {
  const openRate = campaign.total_sent > 0 ? Math.round(campaign.total_opened / campaign.total_sent * 100) : 0;

  return (
    <div className="card" style={{ transition: 'border-color 0.2s, transform 0.2s' }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-light)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLElement).style.transform = ''; }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)', marginBottom: 4 }}>{campaign.name}</div>
          <span className={`badge badge-${STATUS_COLOR[campaign.status]}`}>{campaign.status}</span>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {campaign.status === 'draft' && (
            <button className="btn btn-primary btn-sm" onClick={() => onSend(campaign.id)} title="Send">
              <Play size={13} /> Send
            </button>
          )}
          {campaign.status === 'active' && (
            <button className="btn btn-secondary btn-sm" onClick={() => onPause(campaign.id)} title="Pause">
              <Pause size={13} /> Pause
            </button>
          )}
          <button className="btn btn-ghost btn-sm" onClick={() => onStats(campaign)} title="Stats">
            <BarChart2 size={13} />
          </button>
          <button className="btn btn-danger btn-sm" onClick={() => onDelete(campaign.id)} title="Delete">
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
        {[
          { label: 'Sent', value: campaign.total_sent, color: 'var(--text-primary)' },
          { label: 'Opened', value: `${openRate}%`, color: 'var(--accent-cyan)' },
          { label: 'Clicked', value: campaign.total_clicked, color: 'var(--accent-orange)' },
          { label: 'Replied', value: campaign.total_replied, color: 'var(--accent-green)' },
        ].map(m => (
          <div key={m.label} style={{ background: 'var(--bg-elevated)', borderRadius: 8, padding: '10px 12px' }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: m.color }}>{m.value}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{m.label}</div>
          </div>
        ))}
      </div>

      {campaign.steps?.length > 0 && (
        <div style={{ marginTop: 10, fontSize: 12, color: 'var(--text-muted)' }}>
          {campaign.steps.length} step{campaign.steps.length > 1 ? 's' : ''} · {campaign.steps.length > 1 ? 'Sequence' : 'Single'}
        </div>
      )}
    </div>
  );
}

function CampaignStatsModal({ campaign, onClose }: any) {
  const [stats, setStats] = useState<any>(null);
  useEffect(() => {
    api.campaigns.stats(campaign.id).then(setStats);
  }, [campaign.id]);

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal modal-sm">
        <div className="modal-header">
          <div className="modal-title">📊 {campaign.name}</div>
          <button className="btn btn-ghost btn-sm" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="modal-body">
          {!stats ? <div className="loading-overlay"><div className="spinner" /></div> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                { label: 'Open Rate', value: stats.open_rate, max: 100, color: '#22d3ee', suffix: '%' },
                { label: 'Click Rate', value: stats.click_rate, max: 100, color: '#f59e0b', suffix: '%' },
                { label: 'Reply Rate', value: stats.reply_rate, max: 100, color: '#10b981', suffix: '%' },
                { label: 'Bounce Rate', value: stats.bounce_rate, max: 100, color: '#ef4444', suffix: '%' },
              ].map(m => (
                <div key={m.label}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 5 }}>
                    <span style={{ color: 'var(--text-secondary)' }}>{m.label}</span>
                    <span style={{ fontWeight: 700, color: m.color }}>{m.value}{m.suffix}</span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${Math.min(m.value, 100)}%`, background: m.color }} />
                  </div>
                </div>
              ))}
              <div className="divider" />
              <div className="grid-2">
                {[['Sent', stats.total_sent], ['Opened', stats.total_opened], ['Clicked', stats.total_clicked], ['Replied', stats.total_replied]].map(([l, v]) => (
                  <div key={l as string} style={{ textAlign: 'center', padding: '12px', background: 'var(--bg-elevated)', borderRadius: 8 }}>
                    <div style={{ fontSize: 22, fontWeight: 800 }}>{v}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{l}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CampaignsContent() {
  const { toast } = useToast();
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statsModal, setStatsModal] = useState<any>(null);

  const load = async () => {
    const data = await api.campaigns.list();
    setCampaigns(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleSend = async (id: number) => {
    try {
      const res = await api.campaigns.send(id);
      toast(`🚀 ${res.message}`, 'success');
      load();
    } catch (e: any) {
      toast(e.message, 'error');
    }
  };

  const handlePause = async (id: number) => {
    await api.campaigns.pause(id);
    toast('Campaign paused', 'info');
    load();
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this campaign?')) return;
    await api.campaigns.delete(id);
    toast('Campaign deleted', 'success');
    load();
  };

  return (
    <AppLayout
      title="Campaigns"
      subtitle="Manage your outreach campaigns"
      actions={
        <Link href="/campaigns/new" className="btn btn-primary">
          <Plus size={15} /> New Campaign
        </Link>
      }
    >
      {loading ? (
        <div className="loading-overlay"><div className="spinner" /> Loading...</div>
      ) : campaigns.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '80px 40px' }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>🚀</div>
          <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>No campaigns yet</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>Create your first outreach campaign to start converting cold leads.</p>
          <Link href="/campaigns/new" className="btn btn-primary"><Plus size={15} /> Create Campaign</Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {campaigns.map(c => (
            <CampaignCard
              key={c.id}
              campaign={c}
              onDelete={handleDelete}
              onSend={handleSend}
              onPause={handlePause}
              onStats={setStatsModal}
            />
          ))}
        </div>
      )}
      {statsModal && <CampaignStatsModal campaign={statsModal} onClose={() => setStatsModal(null)} />}
    </AppLayout>
  );
}

export default function CampaignsPage() {
  return <ToastProvider><CampaignsContent /></ToastProvider>;
}
