'use client';
import { useEffect, useState, useCallback } from 'react';
import AppLayout from '@/components/AppLayout';
import { ToastProvider, useToast } from '@/components/Toast';
import { api } from '@/lib/api';
import Link from 'next/link';
import {
  Search, Filter, X, ChevronLeft, ChevronRight, Trash2,
  Mail, Edit3, Tag, SlidersHorizontal, UserCheck, RefreshCw,
  ExternalLink, Download
} from 'lucide-react';

const STATUS_OPTIONS = ['cold', 'warm', 'hot', 'converted', 'unsubscribed', 'bounced'];

function LeadsBadge({ status }: { status: string }) {
  return <span className={`badge badge-${status}`}>{status}</span>;
}

function ScoreBar({ score }: { score: number }) {
  const color = score >= 70 ? 'var(--accent-red)' : score >= 40 ? 'var(--accent-orange)' : 'var(--accent-primary)';
  return (
    <div className="lead-score">
      <div className="score-bar"><div className="score-fill" style={{ width: `${score}%`, background: color }} /></div>
      <span style={{ fontSize: 12, fontWeight: 600, color }}>{score}</span>
    </div>
  );
}

function LeadsContent() {
  const { toast } = useToast();
  const [leads, setLeads] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [showFilter, setShowFilter] = useState(true);
  const [editLead, setEditLead] = useState<any>(null);

  // Filters
  const [filters, setFilters] = useState({
    search: '', status: '', company: '', job_title: '',
    country: '', industry: '', tags: '', min_score: '',
    not_contacted_days: '', exclude_unsubscribed: true, exclude_bounced: true,
  });
  const [sortBy, setSortBy] = useState('imported_at');
  const [sortDir, setSortDir] = useState('desc');

  // Meta options
  const [countries, setCountries] = useState<string[]>([]);
  const [industries, setIndustries] = useState<string[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [sources, setSources] = useState<string[]>([]);

  const loadMeta = async () => {
    const [c, ind, t, s] = await Promise.all([
      api.leads.meta.countries(),
      api.leads.meta.industries(),
      api.leads.meta.tags(),
      api.leads.meta.sources(),
    ]);
    setCountries(c); setIndustries(ind); setAllTags(t); setSources(s);
  };

  const loadLeads = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.leads.list({
        page, page_size: 30, sort_by: sortBy, sort_dir: sortDir,
        ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== '' && v !== undefined)),
      });
      setLeads(res.leads);
      setTotal(res.total);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [page, filters, sortBy, sortDir]);

  useEffect(() => { loadMeta(); }, []);
  useEffect(() => { loadLeads(); setSelected(new Set()); }, [loadLeads]);

  const totalPages = Math.ceil(total / 30);

  const toggleSelect = (id: number) => {
    setSelected(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const selectAll = () => {
    if (selected.size === leads.length) setSelected(new Set());
    else setSelected(new Set(leads.map(l => l.id)));
  };

  const bulkDelete = async () => {
    if (!confirm(`Delete ${selected.size} leads?`)) return;
    await api.leads.bulk({ lead_ids: [...selected], action: 'delete' });
    toast(`Deleted ${selected.size} leads`, 'success');
    loadLeads();
  };

  const bulkSetStatus = async (status: string) => {
    await api.leads.bulk({ lead_ids: [...selected], action: 'set_status', value: status });
    toast(`Updated ${selected.size} leads to ${status}`, 'success');
    loadLeads();
  };

  const deleteLead = async (id: number) => {
    await api.leads.delete(id);
    toast('Lead deleted', 'success');
    loadLeads();
  };

  const updateFilter = (key: string, val: any) => {
    setFilters(prev => ({ ...prev, [key]: val }));
    setPage(1);
  };

  const clearFilters = () => {
    setFilters({ search: '', status: '', company: '', job_title: '', country: '', industry: '', tags: '', min_score: '', not_contacted_days: '', exclude_unsubscribed: true, exclude_bounced: true });
    setPage(1);
  };

  const hasFilters = filters.search || filters.status || filters.company || filters.job_title || filters.country || filters.industry || filters.tags || filters.min_score || filters.not_contacted_days;

  return (
    <AppLayout
      title="Leads"
      subtitle={`${total.toLocaleString()} total leads`}
      actions={
        <>
          <Link href="/import" className="btn btn-secondary">
            <RefreshCw size={15} /> Import
          </Link>
          <Link href="/campaigns/new" className="btn btn-primary">
            <Mail size={15} /> New Campaign
          </Link>
        </>
      }
    >
      {/* Search + toolbar */}
      <div className="flex items-center gap-3 mb-4">
        <div style={{ position: 'relative', flex: 1, maxWidth: 420 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            className="form-input"
            style={{ paddingLeft: 34 }}
            placeholder="Search email, name, company..."
            value={filters.search}
            onChange={e => updateFilter('search', e.target.value)}
          />
        </div>
        <button className={`btn btn-secondary${showFilter ? ' active' : ''}`} onClick={() => setShowFilter(p => !p)} style={showFilter ? { borderColor: 'var(--accent-primary)', color: 'var(--accent-primary)' } : {}}>
          <SlidersHorizontal size={15} /> Filters {hasFilters && <span className="badge" style={{ background: 'var(--accent-red)', fontSize: 9, padding: '1px 5px' }}>!</span>}
        </button>
        {hasFilters && <button className="btn btn-ghost btn-sm" onClick={clearFilters}><X size={13} /> Clear</button>}

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <select className="form-select" style={{ width: 160 }} value={sortBy} onChange={e => setSortBy(e.target.value)}>
            <option value="imported_at">Date Imported</option>
            <option value="lead_score">Lead Score</option>
            <option value="last_contacted">Last Contacted</option>
            <option value="email">Email</option>
            <option value="company">Company</option>
          </select>
          <button className="btn btn-ghost btn-sm" onClick={() => setSortDir(p => p === 'asc' ? 'desc' : 'asc')}>
            {sortDir === 'desc' ? '↓' : '↑'}
          </button>
        </div>
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="animate-slide" style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 'var(--radius-md)', padding: '10px 14px', marginBottom: 12 }}>
          <span style={{ fontWeight: 600, color: 'var(--accent-primary)' }}>{selected.size} selected</span>
          <div className="divider" style={{ width: 1, height: 16, margin: '0 4px', background: 'var(--border-light)' }} />
          {STATUS_OPTIONS.slice(0, 4).map(s => (
            <button key={s} className="btn btn-ghost btn-sm" onClick={() => bulkSetStatus(s)} style={{ fontSize: 12 }}>
              Mark {s}
            </button>
          ))}
          <button className="btn btn-danger btn-sm" onClick={bulkDelete} style={{ marginLeft: 'auto' }}>
            <Trash2 size={13} /> Delete
          </button>
        </div>
      )}

      <div className="page-with-filter">
        {/* Filter Panel */}
        {showFilter && (
          <div className="filter-panel animate-slide">
            <div className="filter-panel-header">
              <span style={{ fontWeight: 700, fontSize: 14 }}>Filters</span>
              {hasFilters && <button className="btn btn-ghost btn-sm" onClick={clearFilters}>Reset</button>}
            </div>

            <div className="filter-section">
              <div className="filter-section-title">Status</div>
              <div className="filter-tags">
                {STATUS_OPTIONS.map(s => (
                  <span key={s} className={`filter-tag${filters.status === s ? ' active' : ''}`}
                    onClick={() => updateFilter('status', filters.status === s ? '' : s)}>
                    {s}
                  </span>
                ))}
              </div>
            </div>

            <div className="filter-section">
              <div className="filter-section-title">Company</div>
              <input className="form-input" value={filters.company} onChange={e => updateFilter('company', e.target.value)} placeholder="Filter by company..." />
            </div>

            <div className="filter-section">
              <div className="filter-section-title">Job Title</div>
              <input className="form-input" value={filters.job_title} onChange={e => updateFilter('job_title', e.target.value)} placeholder="CEO, CTO, Founder..." />
            </div>

            {countries.length > 0 && (
              <div className="filter-section">
                <div className="filter-section-title">Country</div>
                <select className="form-select" value={filters.country} onChange={e => updateFilter('country', e.target.value)}>
                  <option value="">All Countries</option>
                  {countries.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            )}

            {industries.length > 0 && (
              <div className="filter-section">
                <div className="filter-section-title">Industry</div>
                <select className="form-select" value={filters.industry} onChange={e => updateFilter('industry', e.target.value)}>
                  <option value="">All Industries</option>
                  {industries.map(i => <option key={i} value={i}>{i}</option>)}
                </select>
              </div>
            )}

            {allTags.length > 0 && (
              <div className="filter-section">
                <div className="filter-section-title">Tags</div>
                <div className="filter-tags">
                  {allTags.slice(0, 10).map(tag => (
                    <span key={tag} className={`filter-tag${filters.tags === tag ? ' active' : ''}`}
                      onClick={() => updateFilter('tags', filters.tags === tag ? '' : tag)}>
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="filter-section">
              <div className="filter-section-title">Min Lead Score</div>
              <input className="form-input" type="number" min="0" max="100" value={filters.min_score} onChange={e => updateFilter('min_score', e.target.value)} placeholder="0 – 100" />
            </div>

            <div className="filter-section">
              <div className="filter-section-title">Not Contacted (days)</div>
              <input className="form-input" type="number" value={filters.not_contacted_days} onChange={e => updateFilter('not_contacted_days', e.target.value)} placeholder="e.g. 30" />
            </div>

            <div className="filter-section">
              <label className="form-label" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input type="checkbox" className="form-checkbox" checked={filters.exclude_unsubscribed} onChange={e => updateFilter('exclude_unsubscribed', e.target.checked)} />
                Exclude unsubscribed
              </label>
              <label className="form-label" style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 6 }}>
                <input type="checkbox" className="form-checkbox" checked={filters.exclude_bounced} onChange={e => updateFilter('exclude_bounced', e.target.checked)} />
                Exclude bounced
              </label>
            </div>
          </div>
        )}

        {/* Table */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th><input type="checkbox" className="row-checkbox" checked={selected.size === leads.length && leads.length > 0} onChange={selectAll} /></th>
                  <th>Lead</th>
                  <th>Company</th>
                  <th>Status</th>
                  <th>Score</th>
                  <th>Tags</th>
                  <th>Last Contacted</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8}><div className="loading-overlay"><div className="spinner" /> Loading leads...</div></td></tr>
                ) : leads.length === 0 ? (
                  <tr><td colSpan={8}>
                    <div className="empty-state">
                      <div className="empty-state-icon">👥</div>
                      <div className="empty-state-title">No leads found</div>
                      <div className="empty-state-desc">Try adjusting your filters or import some leads first</div>
                    </div>
                  </td></tr>
                ) : leads.map(lead => (
                  <tr key={lead.id}>
                    <td><input type="checkbox" className="row-checkbox" checked={selected.has(lead.id)} onChange={() => toggleSelect(lead.id)} /></td>
                    <td className="primary">
                      <div style={{ fontWeight: 600, marginBottom: 2 }}>
                        {lead.first_name || lead.last_name
                          ? `${lead.first_name || ''} ${lead.last_name || ''}`.trim()
                          : <span style={{ color: 'var(--text-muted)' }}>—</span>
                        }
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{lead.email}</div>
                      {lead.job_title && <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', marginTop: 1 }}>{lead.job_title}</div>}
                    </td>
                    <td>{lead.company || <span className="text-muted">—</span>}</td>
                    <td><LeadsBadge status={lead.status} /></td>
                    <td><ScoreBar score={lead.lead_score} /></td>
                    <td>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {(lead.tags || []).slice(0, 2).map((tag: string) => (
                          <span key={tag} style={{ fontSize: 11, background: 'rgba(99,102,241,0.1)', color: 'var(--accent-primary)', padding: '1px 7px', borderRadius: 20 }}>{tag}</span>
                        ))}
                        {(lead.tags || []).length > 2 && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>+{lead.tags.length - 2}</span>}
                      </div>
                    </td>
                    <td>{lead.last_contacted ? new Date(lead.last_contacted).toLocaleDateString() : <span className="text-muted">Never</span>}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        {lead.linkedin && (
                          <a href={lead.linkedin} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm" title="LinkedIn"><ExternalLink size={13} /></a>
                        )}
                        <button className="btn btn-ghost btn-sm" onClick={() => setEditLead(lead)} title="Edit"><Edit3 size={13} /></button>
                        <button className="btn btn-danger btn-sm" onClick={() => deleteLead(lead.id)} title="Delete"><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between" style={{ marginTop: 12 }}>
            <span className="text-sm text-muted">Showing {Math.min((page - 1) * 30 + 1, total)}–{Math.min(page * 30, total)} of {total}</span>
            <div className="pagination">
              <button className="page-btn" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}><ChevronLeft size={14} /></button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const p = Math.max(1, Math.min(totalPages - 4, page - 2)) + i;
                return (
                  <button key={p} className={`page-btn${page === p ? ' active' : ''}`} onClick={() => setPage(p)}>{p}</button>
                );
              })}
              <button className="page-btn" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}><ChevronRight size={14} /></button>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Lead Modal */}
      {editLead && (
        <EditLeadModal lead={editLead} onClose={() => setEditLead(null)} onSaved={() => { setEditLead(null); loadLeads(); toast('Lead updated', 'success'); }} />
      )}
    </AppLayout>
  );
}

function EditLeadModal({ lead, onClose, onSaved }: { lead: any; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ ...lead });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    await api.leads.update(lead.id, form);
    setSaving(false);
    onSaved();
  };

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal">
        <div className="modal-header">
          <div className="modal-title">Edit Lead</div>
          <button className="btn btn-ghost btn-sm" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="modal-body">
          <div className="grid-2">
            {[
              ['First Name', 'first_name'], ['Last Name', 'last_name'],
              ['Email', 'email'], ['Company', 'company'],
              ['Job Title', 'job_title'], ['Phone', 'phone'],
              ['Country', 'country'], ['Industry', 'industry'],
              ['City', 'city'], ['LinkedIn', 'linkedin'],
            ].map(([label, key]) => (
              <div className="form-group" key={key}>
                <label className="form-label">{label}</label>
                <input className="form-input" value={form[key] || ''} onChange={e => setForm((p: any) => ({ ...p, [key]: e.target.value }))} />
              </div>
            ))}
          </div>
          <div className="form-group">
            <label className="form-label">Status</label>
            <select className="form-select" value={form.status} onChange={e => setForm((p: any) => ({ ...p, status: e.target.value }))}>
              {['cold', 'warm', 'hot', 'converted', 'unsubscribed', 'bounced'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Notes</label>
            <textarea className="form-textarea" value={form.notes || ''} onChange={e => setForm((p: any) => ({ ...p, notes: e.target.value }))} />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={save} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function LeadsPage() {
  return <ToastProvider><LeadsContent /></ToastProvider>;
}
