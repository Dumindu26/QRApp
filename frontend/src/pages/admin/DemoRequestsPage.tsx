import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, Inbox, Send, Ban, Mail, Phone, PenSquare, X } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { demoRequestService, type DemoRequestRecord, type DemoRequestStatus } from '../../services/demoRequestService';

const TEMPLATE_PLACEHOLDERS = ['name', 'firstName', 'email', 'restaurantName', 'username', 'password', 'note'];

function errorMessage(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err) && typeof err.response?.data?.error === 'string') return err.response.data.error;
  return fallback;
}

const STATUSES: { key: DemoRequestStatus; label: string; cls: string }[] = [
  { key: 'open',     label: 'Open',     cls: 'bg-blue-100 text-blue-700' },
  { key: 'sent',     label: 'Sent',     cls: 'bg-green-100 text-green-700' },
  { key: 'declined', label: 'Declined', cls: 'bg-gray-100 text-gray-500' },
];
const STATUS_CLS = Object.fromEntries(STATUSES.map((s) => [s.key, s.cls])) as Record<DemoRequestStatus, string>;

type StatusFilter = 'all' | DemoRequestStatus;

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function DemoRequestsPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<DemoRequestRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('open');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [forms, setForms] = useState<Record<string, { username: string; password: string; note: string }>>({});

  const [showTemplate, setShowTemplate] = useState(false);
  const [templateLoading, setTemplateLoading] = useState(false);
  const [templateSaving, setTemplateSaving] = useState(false);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');

  function openTemplateEditor() {
    setShowTemplate(true);
    setTemplateLoading(true);
    demoRequestService.getEmailTemplate()
      .then((t) => { setSubject(t.subject); setBody(t.body); })
      .catch(() => toast.error('Failed to load email template'))
      .finally(() => setTemplateLoading(false));
  }

  async function saveTemplate() {
    if (!subject.trim() || !body.trim()) {
      toast.error('Subject and body are required');
      return;
    }
    setTemplateSaving(true);
    try {
      await demoRequestService.setEmailTemplate(subject, body);
      toast.success('Email template saved');
      setShowTemplate(false);
    } catch (err) {
      toast.error(errorMessage(err, 'Failed to save template'));
    } finally {
      setTemplateSaving(false);
    }
  }

  function load() {
    setLoading(true);
    demoRequestService.listAll()
      .then(setItems)
      .catch(() => toast.error('Failed to load demo requests'))
      .finally(() => setLoading(false));
  }
  useEffect(load, []);

  function setField(id: string, key: 'username' | 'password' | 'note', value: string) {
    setForms((f) => {
      const current = f[id] ?? { username: '', password: '', note: '' };
      return { ...f, [id]: { ...current, [key]: value } };
    });
  }

  async function send(r: DemoRequestRecord) {
    const f = forms[r.id];
    if (!f?.username.trim() || !f?.password.trim()) {
      toast.error('Enter a username and password first');
      return;
    }
    setSavingId(r.id);
    try {
      const updated = await demoRequestService.sendCredentials(r.id, f);
      setItems((list) => list.map((x) => x.id === r.id ? updated : x));
      toast.success(`Credentials emailed to ${r.email}`);
    } catch (err) {
      toast.error(errorMessage(err, 'Failed to send email'));
    } finally {
      setSavingId(null);
    }
  }

  async function decline(r: DemoRequestRecord) {
    setSavingId(r.id);
    try {
      const updated = await demoRequestService.decline(r.id);
      setItems((list) => list.map((x) => x.id === r.id ? updated : x));
      toast.success('Marked declined');
    } catch {
      toast.error('Failed to update');
    } finally {
      setSavingId(null);
    }
  }

  const filtered = items.filter((r) => statusFilter === 'all' || r.status === statusFilter);
  const openCount = items.filter((r) => r.status === 'open').length;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="px-4 lg:px-6 py-4 flex items-center gap-3 max-w-5xl mx-auto">
          <button onClick={() => navigate('/admin/restaurants')} className="text-gray-600"><ArrowLeft size={20} /></button>
          <h1 className="text-xl font-bold text-gray-900 flex-1">Demo requests</h1>
          {openCount > 0 && (
            <span className="text-xs font-semibold bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full">{openCount} open</span>
          )}
          <button
            onClick={openTemplateEditor}
            className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors px-2 py-1"
          >
            <PenSquare size={15} /> Edit email template
          </button>
        </div>
      </header>

      <div className="px-4 lg:px-6 py-6 max-w-5xl mx-auto space-y-5">
        {showTemplate && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">Demo credentials email template</h2>
              <button onClick={() => setShowTemplate(false)} className="text-gray-400 hover:text-gray-700"><X size={18} /></button>
            </div>
            {templateLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="animate-spin text-orange-500" size={24} /></div>
            ) : (
              <>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Subject</label>
                  <input
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-300 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Body (HTML)</label>
                  <textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    rows={10}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm font-mono outline-none focus:ring-2 focus:ring-orange-300 focus:border-transparent resize-y"
                  />
                </div>
                <p className="text-xs text-gray-400">
                  Placeholders: {TEMPLATE_PLACEHOLDERS.map((p) => `{{${p}}}`).join(', ')}
                </p>
                <button
                  onClick={saveTemplate}
                  disabled={templateSaving}
                  className="inline-flex items-center gap-1.5 bg-orange-500 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-orange-600 transition-colors disabled:opacity-50"
                >
                  {templateSaving ? <Loader2 size={15} className="animate-spin" /> : 'Save template'}
                </button>
              </>
            )}
          </div>
        )}

        <div className="flex gap-1 bg-white border border-gray-200 rounded-full p-1 w-fit">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${statusFilter === 'all' ? 'bg-orange-500 text-white' : 'text-gray-500 hover:text-gray-800'}`}
          >
            All
          </button>
          {STATUSES.map((s) => (
            <button
              key={s.key}
              onClick={() => setStatusFilter(s.key)}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${statusFilter === s.key ? 'bg-orange-500 text-white' : 'text-gray-500 hover:text-gray-800'}`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="animate-spin text-orange-500" size={28} /></div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-12 text-center text-gray-400">
            <Inbox size={32} className="mx-auto mb-3 text-gray-300" />
            No demo requests match this filter.
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((r) => {
              const f = forms[r.id] ?? { username: '', password: '', note: '' };
              return (
                <div key={r.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900">{r.restaurantName}</p>
                      <p className="text-sm text-gray-600">{r.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span className="flex items-center gap-1"><Mail size={12} />{r.email}</span>
                        {r.phone && <span className="flex items-center gap-1"><Phone size={12} />{r.phone}</span>}
                        <span>{fmtDate(r.createdAt)}</span>
                      </p>
                    </div>
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${STATUS_CLS[r.status]}`}>
                      {STATUSES.find((s) => s.key === r.status)?.label}
                    </span>
                  </div>

                  {r.message && <p className="text-sm text-gray-600 mt-3 whitespace-pre-wrap">{r.message}</p>}

                  {r.status === 'sent' ? (
                    <p className="text-xs text-gray-400 mt-3">
                      Sent to {r.email} with username <span className="font-medium text-gray-600">{r.demoUsername}</span>
                      {r.sentAt && ` on ${fmtDate(r.sentAt)}`}.
                    </p>
                  ) : r.status === 'open' ? (
                    <div className="mt-3 grid sm:grid-cols-2 gap-2">
                      <input
                        value={f.username}
                        onChange={(e) => setField(r.id, 'username', e.target.value)}
                        placeholder="Demo username"
                        className="border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-300 focus:border-transparent"
                      />
                      <input
                        value={f.password}
                        onChange={(e) => setField(r.id, 'password', e.target.value)}
                        placeholder="Demo password"
                        className="border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-300 focus:border-transparent"
                      />
                      <input
                        value={f.note}
                        onChange={(e) => setField(r.id, 'note', e.target.value)}
                        placeholder="Note to include in the email (optional)"
                        className="border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-300 focus:border-transparent sm:col-span-2"
                      />
                      <div className="flex gap-2 sm:col-span-2">
                        <button
                          onClick={() => send(r)}
                          disabled={savingId === r.id}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 bg-orange-500 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-orange-600 transition-colors disabled:opacity-50"
                        >
                          {savingId === r.id ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                          Send credentials
                        </button>
                        <button
                          onClick={() => decline(r)}
                          disabled={savingId === r.id}
                          className="inline-flex items-center justify-center gap-1.5 border border-gray-200 text-gray-500 text-sm font-medium px-4 py-2 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
                        >
                          <Ban size={15} /> Decline
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
