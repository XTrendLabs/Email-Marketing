'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import AppLayout from '@/components/AppLayout';
import { api } from '@/lib/api';
import { ToastProvider, useToast } from '@/components/Toast';
import Link from 'next/link';
import {
  Upload, X, ChevronRight, ChevronLeft, CheckCircle2,
  FileText, AlertCircle, Loader2, ArrowRight
} from 'lucide-react';

const LEAD_FIELDS = [
  { value: '__skip__', label: '— Skip this column —' },
  { value: 'email', label: 'Email *' },
  { value: 'first_name', label: 'First Name' },
  { value: 'last_name', label: 'Last Name' },
  { value: 'company', label: 'Company' },
  { value: 'job_title', label: 'Job Title' },
  { value: 'phone', label: 'Phone' },
  { value: 'linkedin', label: 'LinkedIn URL' },
  { value: 'website', label: 'Website' },
  { value: 'country', label: 'Country' },
  { value: 'industry', label: 'Industry' },
  { value: 'city', label: 'City' },
  { value: 'notes', label: 'Notes' },
  { value: 'tags', label: 'Tags (comma-separated)' },
];

// Auto-detect field from column name
function autoDetect(colName: string): string {
  const lower = colName.toLowerCase().replace(/[\s_-]+/g, '');
  if (lower.includes('email')) return 'email';
  if (lower.includes('firstname') || lower === 'fname') return 'first_name';
  if (lower.includes('lastname') || lower === 'lname') return 'last_name';
  if (lower.includes('company') || lower.includes('org') || lower.includes('business')) return 'company';
  if (lower.includes('jobtitle') || lower.includes('title') || lower.includes('position') || lower.includes('role')) return 'job_title';
  if (lower.includes('phone') || lower.includes('mobile') || lower.includes('tel')) return 'phone';
  if (lower.includes('linkedin')) return 'linkedin';
  if (lower.includes('website') || lower.includes('domain') || lower.includes('url')) return 'website';
  if (lower.includes('country')) return 'country';
  if (lower.includes('industry') || lower.includes('sector') || lower.includes('vertical')) return 'industry';
  if (lower.includes('city') || lower.includes('location')) return 'city';
  if (lower.includes('note')) return 'notes';
  if (lower.includes('tag')) return 'tags';
  return '__skip__';
}

function ImportContent() {
  const { toast } = useToast();
  const [step, setStep] = useState<number>(1);
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [csvColumns, setCsvColumns] = useState<string[]>([]);
  const [csvPreview, setCsvPreview] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [sourceName, setSourceName] = useState('');
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [result, setResult] = useState<any>(null);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const parseCSVPreview = (text: string) => {
    const lines = text.split('\n').filter(l => l.trim());
    if (lines.length === 0) return;
    const headers = lines[0].split(',').map(h => h.replace(/^"|"$/g, '').trim());
    setCsvColumns(headers);

    const auto: Record<string, string> = {};
    headers.forEach(h => { auto[h] = autoDetect(h); });
    setMapping(auto);

    const rows = lines.slice(1, 4).map(line => {
      const vals = line.split(',').map(v => v.replace(/^"|"$/g, '').trim());
      const row: Record<string, string> = {};
      headers.forEach((h, i) => { row[h] = vals[i] || ''; });
      return row;
    });
    setCsvPreview(rows);
  };

  const handleFile = (f: File) => {
    setFile(f);
    setSourceName(f.name.replace('.csv', ''));
    const reader = new FileReader();
    reader.onload = (e) => parseCSVPreview(e.target?.result as string);
    reader.readAsText(f);
    setStep(2);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f?.name.endsWith('.csv')) handleFile(f);
    else toast('Please upload a CSV file', 'error');
  }, []);

  const handleImport = async () => {
    if (!file) return;
    const filteredMapping: Record<string, string> = {};
    Object.entries(mapping).forEach(([col, field]) => {
      if (field && field !== '__skip__') filteredMapping[col] = field;
    });

    if (!Object.values(filteredMapping).includes('email')) {
      toast('You must map at least one column to Email', 'error');
      return;
    }

    setImporting(true);
    try {
      const res = await api.leads.import(file, {
        mappings: filteredMapping,
        source_name: sourceName || file.name,
        skip_duplicates: skipDuplicates,
      });
      setResult(res);
      setStep(3);
      toast(`✅ Imported ${res.created} leads successfully!`, 'success');
    } catch (e: any) {
      toast(e.message || 'Import failed', 'error');
    } finally {
      setImporting(false);
    }
  };

  const reset = () => {
    setStep(1); setFile(null); setCsvColumns([]); setCsvPreview([]);
    setMapping({}); setResult(null); setSourceName('');
  };

  return (
    <AppLayout title="Import Leads" subtitle="Upload CSV from Google Sheets or any source">
      {/* Wizard */}
      <div className="card mb-6">
        <div className="wizard-steps">
          {['Upload File', 'Map Fields', 'Done'].map((label, i) => {
            const num = i + 1;
            const isDone = step > num;
            const isActive = step === num;
            return (
              <div key={label} className="flex items-center gap-2" style={{ flex: i < 2 ? 1 : 0 }}>
                <div className="wizard-step">
                  <div className={`step-circle${isDone ? ' done' : isActive ? ' active' : ' pending'}`}>
                    {isDone ? <CheckCircle2 size={14} /> : num}
                  </div>
                  <span className={`step-label${isActive ? ' active' : ''}`}>{label}</span>
                </div>
                {i < 2 && <div className={`step-connector${isDone ? ' done' : ''}`} />}
              </div>
            );
          })}
        </div>
      </div>

      {/* Step 1: Upload */}
      {step === 1 && (
        <div className="card animate-fade">
          <div
            className="card-body"
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
            style={{
              border: `2px dashed ${dragging ? 'var(--accent-primary)' : 'var(--border-light)'}`,
              borderRadius: 'var(--radius-lg)',
              padding: '60px 40px',
              textAlign: 'center',
              cursor: 'pointer',
              background: dragging ? 'rgba(99,102,241,0.05)' : 'transparent',
              transition: 'all 0.2s ease',
            }}
          >
            <div style={{ fontSize: 48, marginBottom: 16 }}>📊</div>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, color: 'var(--text-primary)' }}>
              Drop your CSV file here
            </h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 20 }}>
              Export your Google Sheet as .csv and upload it here
            </p>
            <button className="btn btn-primary" style={{ pointerEvents: 'none' }}>
              <Upload size={15} /> Choose CSV File
            </button>
            <p className="text-sm text-muted" style={{ marginTop: 16 }}>
              Only Email is required — all other fields are optional
            </p>
          </div>
          <input ref={fileRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }} />

          {/* Tips */}
          <div style={{ marginTop: 24, background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', padding: '16px 20px' }}>
            <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 10 }}>💡 Pro Tips</div>
            <ul style={{ color: 'var(--text-secondary)', fontSize: 13, lineHeight: 2, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 4 }}>
              <li>✅ Open Google Sheets → File → Download → Comma Separated Values (.csv)</li>
              <li>✅ Column headers are automatically detected (Email, First Name, Company...)</li>
              <li>✅ Missing fields are fine — only Email is needed to import a lead</li>
              <li>✅ Duplicate emails are automatically skipped (configurable)</li>
            </ul>
          </div>
        </div>
      )}

      {/* Step 2: Map Fields */}
      {step === 2 && (
        <div className="animate-fade" style={{ display: 'flex', gap: 20 }}>
          <div style={{ flex: 1 }}>
            <div className="card mb-4">
              <div className="card-header">
                <div>
                  <div className="card-title">Map CSV Columns → Lead Fields</div>
                  <div className="card-subtitle">{csvColumns.length} columns detected from {file?.name}</div>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Import Source Name</label>
                <input className="form-input" value={sourceName} onChange={e => setSourceName(e.target.value)} placeholder="e.g. Google Sheets - Sheet 1" />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input type="checkbox" className="form-checkbox" checked={skipDuplicates} onChange={e => setSkipDuplicates(e.target.checked)} />
                  Skip duplicate emails (recommended)
                </label>
              </div>

              <div className="divider" />

              <div style={{ marginBottom: 8 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 32px 1fr', gap: 8, padding: '6px 12px', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>
                  <span>CSV Column</span><span></span><span>Maps To</span>
                </div>
                {csvColumns.map(col => (
                  <div key={col} className="mapper-row">
                    <div style={{ color: 'var(--text-primary)', fontWeight: 500, fontSize: 13 }}>
                      <FileText size={12} style={{ marginRight: 6, opacity: 0.5 }} />
                      {col}
                    </div>
                    <div className="mapper-arrow"><ArrowRight size={16} color="var(--text-muted)" /></div>
                    <select
                      className="form-select"
                      value={mapping[col] || '__skip__'}
                      onChange={e => setMapping(prev => ({ ...prev, [col]: e.target.value }))}
                    >
                      {LEAD_FIELDS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                    </select>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <button className="btn btn-secondary" onClick={() => setStep(1)}>
                <ChevronLeft size={15} /> Back
              </button>
              <button className="btn btn-primary" onClick={handleImport} disabled={importing}>
                {importing ? <><Loader2 size={15} className="spinner" style={{ border: 'none', borderTop: 'none', animation: 'spin 0.7s linear infinite' }} /> Importing...</> : <><Upload size={15} /> Import Leads</>}
              </button>
            </div>
          </div>

          {/* Preview */}
          {csvPreview.length > 0 && (
            <div style={{ width: 360 }}>
              <div className="card">
                <div className="card-header">
                  <div className="card-title">Preview</div>
                  <div className="card-subtitle">First 3 rows</div>
                </div>
                {csvPreview.map((row, i) => (
                  <div key={i} style={{ padding: '10px 0', borderBottom: i < csvPreview.length - 1 ? '1px solid var(--border)' : 'none' }}>
                    {Object.entries(row).slice(0, 5).map(([col, val]) => (
                      val ? (
                        <div key={col} style={{ display: 'flex', gap: 8, fontSize: 12.5, marginBottom: 3 }}>
                          <span style={{ color: 'var(--text-muted)', minWidth: 90 }}>{col}:</span>
                          <span style={{ color: 'var(--text-primary)' }} className="truncate">{val}</span>
                        </div>
                      ) : null
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Step 3: Success */}
      {step === 3 && result && (
        <div className="card animate-slide" style={{ textAlign: 'center', padding: '60px 40px' }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>🎉</div>
          <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8, color: 'var(--text-primary)' }}>
            Import Complete!
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 32 }}>
            Your leads have been imported successfully.
          </p>

          <div className="grid-3" style={{ maxWidth: 500, margin: '0 auto 32px' }}>
            <div style={{ background: 'rgba(16,185,129,0.1)', borderRadius: 'var(--radius-md)', padding: '20px', border: '1px solid rgba(16,185,129,0.2)' }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--accent-green)' }}>{result.created}</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Imported</div>
            </div>
            <div style={{ background: 'rgba(245,158,11,0.1)', borderRadius: 'var(--radius-md)', padding: '20px', border: '1px solid rgba(245,158,11,0.2)' }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--accent-orange)' }}>{result.skipped}</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Skipped</div>
            </div>
            <div style={{ background: 'rgba(239,68,68,0.1)', borderRadius: 'var(--radius-md)', padding: '20px', border: '1px solid rgba(239,68,68,0.2)' }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--accent-red)' }}>{result.errors?.length ?? 0}</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Errors</div>
            </div>
          </div>

          {result.errors?.length > 0 && (
            <div style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 'var(--radius-md)', padding: 16, textAlign: 'left', maxWidth: 500, margin: '0 auto 24px' }}>
              <div style={{ fontWeight: 600, color: 'var(--accent-red)', marginBottom: 8 }}><AlertCircle size={14} style={{ marginRight: 6 }} />Errors</div>
              {result.errors.slice(0, 5).map((e: string, i: number) => (
                <div key={i} style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>{e}</div>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button onClick={reset} className="btn btn-secondary">
              <Upload size={15} /> Import Another
            </button>
            <Link href="/leads" className="btn btn-primary">
              <ChevronRight size={15} /> View Leads
            </Link>
          </div>
        </div>
      )}
    </AppLayout>
  );
}

export default function ImportPage() {
  return <ToastProvider><ImportContent /></ToastProvider>;
}
