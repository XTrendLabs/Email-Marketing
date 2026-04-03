'use client';
import { useEffect, useState } from 'react';
import AppLayout from '@/components/AppLayout';
import { ToastProvider, useToast } from '@/components/Toast';
import { api } from '@/lib/api';
import { useRouter } from 'next/navigation';
import {
  ChevronRight, ChevronLeft, Plus, Trash2, Users,
  CheckCircle2, Loader2, Eye
} from 'lucide-react';

const STEPS_LABELS = ['Audience', 'Sequence', 'Review & Launch'];
const STATUS_OPTIONS = ['cold', 'warm', 'hot', 'converted'];
const TOKENS = ['{{first_name}}', '{{last_name}}', '{{full_name}}', '{{company}}', '{{job_title}}', '{{email}}', '{{industry}}'];

function NewCampaignContent() {
  const router = useRouter();
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [templates, setTemplates] = useState<any[]>([]);
  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [previewSample, setPreviewSample] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: '',
    from_name: '',
    reply_to: '',
    tracking_enabled: true,
    segment_filters: {} as Record<string, any>,
    steps: [{ template_id: 0, step_number: 1, delay_days: 0, subject_override: '' }],
  });

  const [filters, setFilters] = useState({
    status: [] as string[],
    not_contacted_days: '',
    min_score: '',
    country: '',
    industry: '',
    tags: '',
    exclude_unsubscribed: true,
    exclude_bounced: true,
  });

  useEffect(() => { api.templates.list().then(setTemplates); }, []);

  const updateFilter = (key: string, val: any) => setFilters(p => ({ ...p, [key]: val }));
  const toggleStatus = (s: string) => setFilters(p => ({
    ...p,
    status: p.status.includes(s) ? p.status.filter(x => x !== s) : [...p.status, s],
  }));

  const previewLeads = async () => {
    const f = buildFilters();
    const res = await api.campaigns.previewLeads(f);
    setPreviewCount(res.count);
    setPreviewSample(res.sample);
  };

  const buildFilters = () => {
    const f: Record<string, any> = { ...filters };
    if (filters.status.length === 0) delete f.status;
    else f.status = filters.status;
    if (!f.not_contacted_days) delete f.not_contacted_days;
    if (!f.min_score) delete f.min_score;
    if (!f.country) delete f.country;
    if (!f.industry) delete f.industry;
    if (!f.tags) delete f.tags;
    return f;
  };

  const addStep = () => {
    setForm(p => ({
      ...p,
      steps: [...p.steps, { template_id: 0, step_number: p.steps.length + 1, delay_days: 3, subject_override: '' }],
    }));
  };

  const removeStep = (i: number) => {
    setForm(p => ({ ...p, steps: p.steps.filter((_, idx) => idx !== i).map((s, idx) => ({ ...s, step_number: idx + 1 })) }));
  };

  const updateStep = (i: number, key: string, val: any) => {
    setForm(p => ({ ...p, steps: p.steps.map((s, idx) => idx === i ? { ...s, [key]: val } : s) }));
  };

  const validate = () => {
    if (!form.name.trim()) { toast('Campaign name is required', 'error'); return false; }
    if (form.steps.some(s => !s.template_id)) { toast('Please select a template for each step', 'error'); return false; }
    return true;
  };

  const handleLaunch = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const campaign = await api.campaigns.create({
        ...form,
        segment_filters: buildFilters(),
        steps: form.steps.map(s => ({ ...s, template_id: Number(s.template_id) })),
      });
      toast('Campaign created! Launching...', 'success');
      await api.campaigns.send(campaign.id);
      toast('🚀 Campaign is sending!', 'success');
      router.push('/campaigns');
    } catch (e: any) {
      toast(e.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!form.name.trim()) { toast('Campaign name is required', 'error'); return; }
    setSaving(true);
    try {
      await api.campaigns.create({ ...form, segment_filters: buildFilters(), steps: form.steps.map(s => ({ ...s, template_id: Number(s.template_id) })) });
      toast('Saved as draft', 'success');
      router.push('/campaigns');
    } catch (e: any) {
      toast(e.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppLayout title="New Campaign" subtitle="Build a targeted email outreach campaign">
      {/* Wizard steps */}
      <div className="card mb-6">
        <div className="wizard-steps">
          {STEPS_LABELS.map((label, i) => (
            <div key={label} className="flex items-center gap-2" style={{ flex: i < STEPS_LABELS.length - 1 ? 1 : 0 }}>
              <div className="wizard-step">
                <div className={`step-circle${step > i ? ' done' : step === i ? ' active' : ' pending'}`}>
                  {step > i ? <CheckCircle2 size={14} /> : i + 1}
                </div>
                <span className={`step-label${step === i ? ' active' : ''}`}>{label}</span>
              </div>
              {i < STEPS_LABELS.length - 1 && <div className={`step-connector${step > i ? ' done' : ''}`} />}
            </div>
          ))}
        </div>
      </div>

      {/* Step 0: Audience */}
      {step === 0 && (
        <div className="grid-2 animate-fade" style={{ gap: 20 }}>
          <div>
            <div className="card mb-4">
              <div className="card-title" style={{ marginBottom: 16 }}>Campaign Details</div>
              <div className="form-group">
                <label className="form-label">Campaign Name *</label>
                <input className="form-input" placeholder="e.g. SaaS CTOs Outreach Q2" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">From Name</label>
                <input className="form-input" placeholder="Your name or company" value={form.from_name} onChange={e => setForm(p => ({ ...p, from_name: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Reply-To Email</label>
                <input className="form-input" type="email" placeholder="replies@yourcompany.com" value={form.reply_to} onChange={e => setForm(p => ({ ...p, reply_to: e.target.value }))} />
              </div>
              <label className="form-label" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input type="checkbox" className="form-checkbox" checked={form.tracking_enabled} onChange={e => setForm(p => ({ ...p, tracking_enabled: e.target.checked }))} />
                Enable open & click tracking
              </label>
            </div>

            <div className="card">
              <div className="card-title" style={{ marginBottom: 16 }}>Audience Filters</div>
              <div style={{ marginBottom: 12 }}>
                <div className="filter-section-title">Lead Status</div>
                <div className="filter-tags">
                  {STATUS_OPTIONS.map(s => (
                    <span key={s} className={`filter-tag${filters.status.includes(s) ? ' active' : ''}`} onClick={() => toggleStatus(s)}>{s}</span>
                  ))}
                </div>
              </div>

              <div className="grid-2" style={{ gap: 10 }}>
                <div className="form-group">
                  <label className="form-label">Country</label>
                  <input className="form-input" placeholder="e.g. USA" value={filters.country} onChange={e => updateFilter('country', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Industry</label>
                  <input className="form-input" placeholder="e.g. SaaS" value={filters.industry} onChange={e => updateFilter('industry', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Min Lead Score</label>
                  <input className="form-input" type="number" min="0" max="100" value={filters.min_score} onChange={e => updateFilter('min_score', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Not Contacted (days)</label>
                  <input className="form-input" type="number" value={filters.not_contacted_days} onChange={e => updateFilter('not_contacted_days', e.target.value)} placeholder="e.g. 30" />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Tags</label>
                <input className="form-input" placeholder="comma, separated, tags" value={filters.tags} onChange={e => updateFilter('tags', e.target.value)} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {[['exclude_unsubscribed', 'Exclude unsubscribed leads'], ['exclude_bounced', 'Exclude bounced leads']].map(([key, label]) => (
                  <label key={key} className="form-label" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input type="checkbox" className="form-checkbox" checked={(filters as any)[key]} onChange={e => updateFilter(key, e.target.checked)} />
                    {label}
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Audience preview */}
          <div>
            <div className="card" style={{ position: 'sticky', top: 'calc(var(--header-h) + 24px)' }}>
              <div className="card-title" style={{ marginBottom: 12 }}>Audience Preview</div>
              <button className="btn btn-secondary w-full mb-4" onClick={previewLeads}>
                <Eye size={14} /> Preview Matching Leads
              </button>
              {previewCount !== null && (
                <div className="animate-fade">
                  <div style={{ textAlign: 'center', padding: '20px 0', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', marginBottom: 12 }}>
                    <div style={{ fontSize: 36, fontWeight: 800, color: 'var(--accent-primary)' }}>{previewCount}</div>
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>leads will receive this campaign</div>
                  </div>
                  {previewSample.map((lead, i) => (
                    <div key={i} style={{ display: 'flex', flexDirection: 'column', padding: '8px 0', borderBottom: i < previewSample.length - 1 ? '1px solid var(--border)' : 'none' }}>
                      <span style={{ fontWeight: 600, fontSize: 13 }}>{lead.name || lead.email}</span>
                      {lead.company && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{lead.company}</span>}
                      <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{lead.email}</span>
                    </div>
                  ))}
                  {previewCount > 5 && <div className="text-sm text-muted" style={{ marginTop: 8 }}>+{previewCount - 5} more</div>}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Step 1: Sequence */}
      {step === 1 && (
        <div className="animate-fade">
          <div className="card">
            <div className="card-header">
              <div className="card-title">Email Sequence</div>
              <div className="card-subtitle">Add follow-up steps (optional)</div>
            </div>
            {form.steps.map((s, i) => (
              <div key={i} style={{ position: 'relative', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', padding: 16, marginBottom: 10, border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                  <span style={{ fontWeight: 600, color: 'var(--accent-primary)' }}>Step {i + 1}</span>
                  {i > 0 && <button className="btn btn-danger btn-sm" onClick={() => removeStep(i)}><Trash2 size={13} /></button>}
                </div>
                <div className="grid-2" style={{ gap: 12 }}>
                  <div className="form-group">
                    <label className="form-label">Email Template *</label>
                    <select className="form-select" value={s.template_id} onChange={e => updateStep(i, 'template_id', e.target.value)}>
                      <option value={0}>— Select Template —</option>
                      {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                    {templates.length === 0 && (
                      <div className="form-hint">No templates yet. <a href="/templates" style={{ color: 'var(--accent-primary)' }}>Create one →</a></div>
                    )}
                  </div>
                  {i > 0 && (
                    <div className="form-group">
                      <label className="form-label">Send after (days)</label>
                      <input className="form-input" type="number" min="1" value={s.delay_days} onChange={e => updateStep(i, 'delay_days', Number(e.target.value))} />
                    </div>
                  )}
                  <div className="form-group" style={{ gridColumn: i === 0 ? '2' : '1/-1' }}>
                    <label className="form-label">Subject Override (optional)</label>
                    <input className="form-input" placeholder="Leave blank to use template subject" value={s.subject_override} onChange={e => updateStep(i, 'subject_override', e.target.value)} />
                  </div>
                </div>
              </div>
            ))}
            <button className="btn btn-secondary" onClick={addStep} style={{ width: '100%' }}>
              <Plus size={14} /> Add Follow-up Step
            </button>

            {/* Token reference */}
            <div style={{ marginTop: 20, padding: '14px 16px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontWeight: 600, fontSize: 12.5, color: 'var(--text-secondary)', marginBottom: 8 }}>📌 Personalization Tokens</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {TOKENS.map(t => (
                  <code key={t} style={{ fontSize: 11.5, background: 'rgba(99,102,241,0.1)', color: 'var(--accent-primary)', padding: '2px 8px', borderRadius: 4, border: '1px solid rgba(99,102,241,0.2)' }}>{t}</code>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Review */}
      {step === 2 && (
        <div className="animate-fade">
          <div className="card mb-4">
            <div className="card-title" style={{ marginBottom: 16 }}>Review & Launch</div>
            <div className="grid-2" style={{ gap: 12 }}>
              <div style={{ background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', padding: 16 }}>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>CAMPAIGN</div>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>{form.name}</div>
                {form.from_name && <div className="text-sm text-secondary">From: {form.from_name}</div>}
                {form.reply_to && <div className="text-sm text-secondary">Reply-to: {form.reply_to}</div>}
                <div className="text-sm text-secondary">Tracking: {form.tracking_enabled ? '✅ Enabled' : '❌ Disabled'}</div>
              </div>
              <div style={{ background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', padding: 16 }}>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>AUDIENCE</div>
                {previewCount !== null ? (
                  <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--accent-primary)', marginBottom: 4 }}>{previewCount}</div>
                ) : (
                  <button className="btn btn-secondary btn-sm" onClick={previewLeads}><Eye size={13} /> Preview count</button>
                )}
                {filters.status.length > 0 && <div className="text-sm text-secondary">Status: {filters.status.join(', ')}</div>}
                {filters.country && <div className="text-sm text-secondary">Country: {filters.country}</div>}
              </div>
            </div>

            <div className="divider" />

            <div>
              <div style={{ fontWeight: 600, marginBottom: 8 }}>{form.steps.length} Email{form.steps.length > 1 ? 's' : ''} in Sequence</div>
              {form.steps.map((s, i) => {
                const template = templates.find(t => t.id === Number(s.template_id));
                return (
                  <div key={i} style={{ display: 'flex', gap: 12, padding: '8px 0', borderBottom: i < form.steps.length - 1 ? '1px solid var(--border)' : 'none' }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(99,102,241,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: 'var(--accent-primary)', flexShrink: 0 }}>{i + 1}</div>
                    <div>
                      <div style={{ fontWeight: 600 }}>{template?.name || <span style={{ color: 'var(--accent-red)' }}>No template selected</span>}</div>
                      <div className="text-sm text-muted">{i === 0 ? 'Sends immediately' : `Sends ${s.delay_days} day${s.delay_days > 1 ? 's' : ''} after previous step`}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
        <button className="btn btn-secondary" onClick={() => setStep(p => Math.max(0, p - 1))} disabled={step === 0}>
          <ChevronLeft size={15} /> Back
        </button>
        <div style={{ display: 'flex', gap: 10 }}>
          {step === STEPS_LABELS.length - 1 ? (
            <>
              <button className="btn btn-secondary" onClick={handleSaveDraft} disabled={saving}>Save Draft</button>
              <button className="btn btn-primary" onClick={handleLaunch} disabled={saving}>
                {saving ? <><Loader2 size={14} style={{ animation: 'spin 0.7s linear infinite' }} /> Launching...</> : <>🚀 Launch Campaign</>}
              </button>
            </>
          ) : (
            <button className="btn btn-primary" onClick={() => setStep(p => Math.min(STEPS_LABELS.length - 1, p + 1))}>
              Next <ChevronRight size={15} />
            </button>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

export default function NewCampaignPage() {
  return <ToastProvider><NewCampaignContent /></ToastProvider>;
}
