'use client';
import { useEffect, useState } from 'react';
import AppLayout from '@/components/AppLayout';
import { ToastProvider, useToast } from '@/components/Toast';
import { api } from '@/lib/api';
import { Save, RefreshCw, Send, CheckCircle2, AlertCircle } from 'lucide-react';

function SettingsContent() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<any>(null);
  const [form, setForm] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [testEmailTo, setTestEmailTo] = useState('');

  useEffect(() => {
    api.settings.get().then(s => {
      setSettings(s);
      setForm({ ...s, smtp_password: '' });
    });
  }, []);

  const update = (key: string, val: any) => setForm((p: any) => ({ ...p, [key]: val }));

  const save = async () => {
    setSaving(true);
    try {
      const payload: any = { ...form };
      if (!payload.smtp_password) delete payload.smtp_password;
      await api.settings.update(payload);
      toast('Settings saved!', 'success');
    } catch (e: any) {
      toast(e.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const testSmtp = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await api.email.testSmtp();
      setTestResult({ ok: true, message: res.message });
    } catch (e: any) {
      setTestResult({ ok: false, message: e.message });
    } finally {
      setTesting(false);
    }
  };

  const sendTest = async () => {
    if (!testEmailTo) { toast('Enter a recipient email', 'error'); return; }
    try {
      const res = await api.email.sendTest(testEmailTo);
      toast(res.message, 'success');
    } catch (e: any) {
      toast(e.message, 'error');
    }
  };

  if (!settings) return (
    <AppLayout title="Settings"><div className="loading-overlay"><div className="spinner" /></div></AppLayout>
  );

  return (
    <AppLayout
      title="Settings"
      subtitle="Configure Outlook SMTP and platform preferences"
      actions={
        <button className="btn btn-primary" onClick={save} disabled={saving}>
          <Save size={15} /> {saving ? 'Saving...' : 'Save Settings'}
        </button>
      }
    >
      <div style={{ maxWidth: 760, display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* SMTP Config */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">📧 Outlook SMTP Configuration</div>
              <div className="card-subtitle">Connect your Outlook or Microsoft 365 account</div>
            </div>
          </div>

          <div style={{ background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 'var(--radius-md)', padding: '12px 16px', marginBottom: 20 }}>
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6 }}>💡 How to set this up</div>
            <ol style={{ color: 'var(--text-secondary)', fontSize: 12.5, lineHeight: 2, paddingLeft: 16 }}>
              <li>Go to <strong>account.microsoft.com</strong> → Security → Advanced security options</li>
              <li>Enable <strong>App passwords</strong> (requires 2FA to be on)</li>
              <li>Create a new app password and paste it below</li>
              <li>For Microsoft 365, ensure <strong>SMTP AUTH</strong> is enabled in admin center</li>
            </ol>
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">SMTP Host</label>
              <input className="form-input" value={form.smtp_host || ''} onChange={e => update('smtp_host', e.target.value)} placeholder="smtp.office365.com" />
              <div className="form-hint">Outlook: smtp.office365.com · Hotmail: smtp-mail.outlook.com</div>
            </div>
            <div className="form-group">
              <label className="form-label">SMTP Port</label>
              <input className="form-input" type="number" value={form.smtp_port || 587} onChange={e => update('smtp_port', Number(e.target.value))} />
              <div className="form-hint">Use 587 (STARTTLS) or 465 (SSL)</div>
            </div>
            <div className="form-group">
              <label className="form-label">Your Outlook Email</label>
              <input className="form-input" type="email" value={form.smtp_user || ''} onChange={e => update('smtp_user', e.target.value)} placeholder="you@outlook.com" />
            </div>
            <div className="form-group">
              <label className="form-label">App Password</label>
              <input className="form-input" type="password" value={form.smtp_password || ''} onChange={e => update('smtp_password', e.target.value)} placeholder="Your app password (stored locally)" />
            </div>
          </div>

          <div className="divider" />

          {/* Test Connection */}
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <button className="btn btn-secondary" onClick={testSmtp} disabled={testing}>
              <RefreshCw size={14} style={{ animation: testing ? 'spin 1s linear infinite' : 'none' }} />
              {testing ? 'Testing...' : 'Test Connection'}
            </button>
            {testResult && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                {testResult.ok ? <CheckCircle2 size={14} color="var(--accent-green)" /> : <AlertCircle size={14} color="var(--accent-red)" />}
                <span style={{ color: testResult.ok ? 'var(--accent-green)' : 'var(--accent-red)' }}>{testResult.message}</span>
              </div>
            )}
          </div>
        </div>

        {/* From Details */}
        <div className="card">
          <div className="card-title" style={{ marginBottom: 16 }}>Sender Details</div>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">From Name</label>
              <input className="form-input" value={form.from_name || ''} onChange={e => update('from_name', e.target.value)} placeholder="e.g. John from Acme" />
            </div>
            <div className="form-group">
              <label className="form-label">From Email</label>
              <input className="form-input" type="email" value={form.from_email || ''} onChange={e => update('from_email', e.target.value)} placeholder="Same as SMTP user usually" />
            </div>
          </div>
        </div>

        {/* Sending Limits */}
        <div className="card">
          <div className="card-title" style={{ marginBottom: 16 }}>Sending Limits & Safety</div>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Daily Send Limit</label>
              <input className="form-input" type="number" min="1" max="2000" value={form.daily_send_limit || 200} onChange={e => update('daily_send_limit', Number(e.target.value))} />
              <div className="form-hint">Outlook free allows ~300/day. M365 allows up to 10,000.</div>
            </div>
            <div className="form-group">
              <label className="form-label">Delay Between Emails (seconds)</label>
              <input className="form-input" type="number" min="1" value={form.send_delay_seconds || 3} onChange={e => update('send_delay_seconds', Number(e.target.value))} />
              <div className="form-hint">A small delay (3–10s) reduces spam detection risk.</div>
            </div>
          </div>
          <label className="form-label" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input type="checkbox" className="form-checkbox" checked={form.unsubscribe_enabled ?? true} onChange={e => update('unsubscribe_enabled', e.target.checked)} />
            Auto-inject unsubscribe link in every email (recommended)
          </label>
        </div>

        {/* Tracking */}
        <div className="card">
          <div className="card-title" style={{ marginBottom: 16 }}>Open & Click Tracking</div>
          <div className="form-group">
            <label className="form-label">Tracking Base URL</label>
            <input className="form-input" value={form.tracking_base_url || 'http://localhost:8000'} onChange={e => update('tracking_base_url', e.target.value)} />
            <div className="form-hint">Used for open/click tracking. Use your server's public URL for remote access.</div>
          </div>
        </div>

        {/* Test Email */}
        <div className="card">
          <div className="card-title" style={{ marginBottom: 16 }}>🧪 Send Test Email</div>
          <div style={{ display: 'flex', gap: 10 }}>
            <input className="form-input" style={{ flex: 1 }} type="email" placeholder="your@email.com" value={testEmailTo} onChange={e => setTestEmailTo(e.target.value)} />
            <button className="btn btn-primary" onClick={sendTest}><Send size={14} /> Send Test</button>
          </div>
        </div>

      </div>
    </AppLayout>
  );
}

export default function SettingsPage() {
  return <ToastProvider><SettingsContent /></ToastProvider>;
}
