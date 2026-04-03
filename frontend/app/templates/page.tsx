'use client';
import { useEffect, useState } from 'react';
import AppLayout from '@/components/AppLayout';
import { ToastProvider, useToast } from '@/components/Toast';
import { api } from '@/lib/api';
import { Plus, Edit3, Trash2, Copy, X, Eye } from 'lucide-react';

const TOKENS = ['{{first_name}}', '{{last_name}}', '{{full_name}}', '{{company}}', '{{job_title}}', '{{email}}', '{{industry}}', '{{country}}'];

const DEFAULT_TEMPLATE = {
  name: '', subject: '',
  body_html: `<p>Hi {{first_name}},</p>
<p>I noticed that {{company}} is doing some incredible things in the {{industry}} space, and I wanted to reach out personally.</p>
<p>We help companies like yours [YOUR VALUE PROP]. I'd love to show you how we could help {{company}} achieve [SPECIFIC OUTCOME].</p>
<p>Would you be open to a quick 15-minute call this week?</p>
<p>Best,<br/>[YOUR NAME]</p>`,
};

function TemplateModal({ template, onClose, onSaved }: any) {
  const { toast } = useToast();
  const [form, setForm] = useState(template || DEFAULT_TEMPLATE);
  const [saving, setSaving] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  const insertToken = (token: string) => {
    setForm((p: any) => ({ ...p, body_html: p.body_html + token }));
  };

  const save = async () => {
    if (!form.name || !form.subject) { toast('Name and subject are required', 'error'); return; }
    setSaving(true);
    try {
      if (template?.id) {
        await api.templates.update(template.id, form);
        toast('Template updated', 'success');
      } else {
        await api.templates.create(form);
        toast('Template created', 'success');
      }
      onSaved();
    } catch (e: any) {
      toast(e.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal modal-lg">
        <div className="modal-header">
          <div className="modal-title">{template?.id ? 'Edit Template' : 'New Template'}</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-secondary btn-sm" onClick={() => setPreviewOpen(p => !p)}>
              <Eye size={13} /> {previewOpen ? 'Edit' : 'Preview'}
            </button>
            <button className="btn btn-ghost btn-sm" onClick={onClose}><X size={16} /></button>
          </div>
        </div>
        <div className="modal-body">
          <div className="grid-2 mb-4">
            <div className="form-group">
              <label className="form-label">Template Name *</label>
              <input className="form-input" value={form.name} onChange={e => setForm((p: any) => ({ ...p, name: e.target.value }))} placeholder="e.g. Initial Outreach" />
            </div>
            <div className="form-group">
              <label className="form-label">Subject Line *</label>
              <input className="form-input" value={form.subject} onChange={e => setForm((p: any) => ({ ...p, subject: e.target.value }))} placeholder="e.g. Quick idea for {{company}}" />
            </div>
          </div>

          {/* Tokens */}
          <div style={{ marginBottom: 12 }}>
            <div className="filter-section-title mb-2">Insert Personalization Token</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {TOKENS.map(t => (
                <button key={t} className="btn btn-ghost btn-sm" onClick={() => insertToken(t)}
                  style={{ fontSize: 11.5, padding: '3px 9px', fontFamily: 'monospace', color: 'var(--accent-primary)', border: '1px solid rgba(99,102,241,0.2)', background: 'rgba(99,102,241,0.05)' }}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          {previewOpen ? (
            <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
              <div style={{ background: 'var(--bg-elevated)', padding: '10px 16px', fontSize: 12.5, borderBottom: '1px solid var(--border)' }}>
                <strong>Subject:</strong> {form.subject.replace('{{first_name}}', 'John').replace('{{company}}', 'Acme Corp').replace('{{full_name}}', 'John Doe')}
              </div>
              <div style={{ padding: 20, background: '#fff', color: '#111', fontFamily: 'Arial, sans-serif', fontSize: 14, lineHeight: 1.6 }}
                dangerouslySetInnerHTML={{ __html: form.body_html.replace(/{{first_name}}/g, 'John').replace(/{{last_name}}/g, 'Doe').replace(/{{full_name}}/g, 'John Doe').replace(/{{company}}/g, 'Acme Corp').replace(/{{job_title}}/g, 'CEO').replace(/{{industry}}/g, 'SaaS').replace(/{{email}}/g, 'john@acmecorp.com').replace(/{{country}}/g, 'USA') }}
              />
            </div>
          ) : (
            <div className="form-group">
              <label className="form-label">Email Body (HTML supported)</label>
              <textarea
                className="form-textarea"
                style={{ minHeight: 280, fontFamily: 'monospace', fontSize: 13 }}
                value={form.body_html}
                onChange={e => setForm((p: any) => ({ ...p, body_html: e.target.value }))}
                placeholder="Write your email here..."
              />
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Plain Text Version (optional)</label>
            <textarea className="form-textarea" style={{ minHeight: 80 }} value={form.body_text || ''} onChange={e => setForm((p: any) => ({ ...p, body_text: e.target.value }))} placeholder="Plain text fallback..." />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={save} disabled={saving}>
            {saving ? 'Saving...' : template?.id ? 'Update Template' : 'Create Template'}
          </button>
        </div>
      </div>
    </div>
  );
}

function TemplatesContent() {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editTemplate, setEditTemplate] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);

  const load = async () => {
    const data = await api.templates.list();
    setTemplates(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this template?')) return;
    await api.templates.delete(id);
    toast('Template deleted', 'success');
    load();
  };

  const handleDuplicate = async (t: any) => {
    await api.templates.create({ name: `${t.name} (Copy)`, subject: t.subject, body_html: t.body_html, body_text: t.body_text });
    toast('Template duplicated', 'success');
    load();
  };

  const openNew = () => { setEditTemplate(null); setShowModal(true); };
  const openEdit = (t: any) => { setEditTemplate(t); setShowModal(true); };
  const closeModal = () => { setShowModal(false); setEditTemplate(null); };
  const onSaved = () => { closeModal(); load(); };

  return (
    <AppLayout
      title="Email Templates"
      subtitle="Create and manage reusable email templates"
      actions={<button className="btn btn-primary" onClick={openNew}><Plus size={15} /> New Template</button>}
    >
      {loading ? (
        <div className="loading-overlay"><div className="spinner" /></div>
      ) : templates.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '80px 40px' }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>✉️</div>
          <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>No templates yet</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>Create your first email template with personalization tokens.</p>
          <button className="btn btn-primary" onClick={openNew}><Plus size={15} /> Create Template</button>
        </div>
      ) : (
        <div className="grid-2">
          {templates.map(t => (
            <div key={t.id} className="card" style={{ transition: 'border-color 0.2s, transform 0.2s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-light)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLElement).style.transform = ''; }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{t.name}</div>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => handleDuplicate(t)} title="Duplicate"><Copy size={13} /></button>
                  <button className="btn btn-ghost btn-sm" onClick={() => openEdit(t)} title="Edit"><Edit3 size={13} /></button>
                  <button className="btn btn-danger btn-sm" onClick={() => handleDelete(t.id)} title="Delete"><Trash2 size={13} /></button>
                </div>
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', marginBottom: 6 }}>
                <span style={{ color: 'var(--text-muted)', marginRight: 6 }}>Subject:</span>{t.subject}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>
                {t.body_html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()}
              </div>
              <div style={{ marginTop: 10, fontSize: 11, color: 'var(--text-muted)' }}>
                Updated {new Date(t.updated_at).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      )}
      {showModal && <TemplateModal template={editTemplate} onClose={closeModal} onSaved={onSaved} />}
    </AppLayout>
  );
}

export default function TemplatesPage() {
  return <ToastProvider><TemplatesContent /></ToastProvider>;
}
