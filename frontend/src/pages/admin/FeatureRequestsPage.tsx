import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, Lightbulb, Bug, Inbox } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  featureRequestService, type FeatureRequest, type RequestStatus, type RequestType,
} from '../../services/featureRequestService';

const STATUSES: { key: RequestStatus; label: string; cls: string }[] = [
  { key: 'open',        label: 'Open',        cls: 'bg-blue-100 text-blue-700' },
  { key: 'in_progress', label: 'In progress', cls: 'bg-amber-100 text-amber-700' },
  { key: 'resolved',    label: 'Resolved',    cls: 'bg-green-100 text-green-700' },
  { key: 'declined',    label: 'Declined',    cls: 'bg-gray-100 text-gray-500' },
];
const STATUS_CLS = Object.fromEntries(STATUSES.map((s) => [s.key, s.cls])) as Record<RequestStatus, string>;

type TypeFilter = 'all' | RequestType;
type StatusFilter = 'all' | RequestStatus;

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function FeatureRequestsPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<FeatureRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  function load() {
    setLoading(true);
    featureRequestService.listAll()
      .then((rows) => {
        setItems(rows);
        setNotes(Object.fromEntries(rows.map((r) => [r.id, r.adminNote])));
      })
      .catch(() => toast.error('Failed to load requests'))
      .finally(() => setLoading(false));
  }
  useEffect(load, []);

  async function setStatus(r: FeatureRequest, status: RequestStatus) {
    setSavingId(r.id);
    try {
      const updated = await featureRequestService.update(r.id, { status });
      setItems((list) => list.map((x) => x.id === r.id ? updated : x));
      toast.success(`Marked ${STATUSES.find((s) => s.key === status)?.label.toLowerCase()}`);
    } catch {
      toast.error('Failed to update');
    } finally {
      setSavingId(null);
    }
  }

  async function saveNote(r: FeatureRequest) {
    setSavingId(r.id);
    try {
      const updated = await featureRequestService.update(r.id, { adminNote: notes[r.id] ?? '' });
      setItems((list) => list.map((x) => x.id === r.id ? updated : x));
      toast.success('Note saved');
    } catch {
      toast.error('Failed to save note');
    } finally {
      setSavingId(null);
    }
  }

  const filtered = items.filter((r) =>
    (typeFilter === 'all' || r.type === typeFilter) &&
    (statusFilter === 'all' || r.status === statusFilter));

  const openCount = items.filter((r) => r.status === 'open').length;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="px-4 lg:px-6 py-4 flex items-center gap-3 max-w-5xl mx-auto">
          <button onClick={() => navigate('/admin/restaurants')} className="text-gray-600"><ArrowLeft size={20} /></button>
          <h1 className="text-xl font-bold text-gray-900 flex-1">Feature requests &amp; bugs</h1>
          {openCount > 0 && (
            <span className="text-xs font-semibold bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full">{openCount} open</span>
          )}
        </div>
      </header>

      <div className="px-4 lg:px-6 py-6 max-w-5xl mx-auto space-y-5">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-1 bg-white border border-gray-200 rounded-full p-1">
            {(['all', 'feature', 'bug'] as TypeFilter[]).map((t) => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`px-3 py-1 rounded-full text-sm font-medium capitalize transition-colors ${typeFilter === t ? 'bg-orange-500 text-white' : 'text-gray-500 hover:text-gray-800'}`}
              >
                {t === 'all' ? 'All types' : t === 'feature' ? 'Features' : 'Bugs'}
              </button>
            ))}
          </div>
          <div className="flex gap-1 bg-white border border-gray-200 rounded-full p-1">
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
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="animate-spin text-orange-500" size={28} /></div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-12 text-center text-gray-400">
            <Inbox size={32} className="mx-auto mb-3 text-gray-300" />
            No requests match these filters.
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((r) => (
              <div key={r.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${r.type === 'feature' ? 'bg-orange-100 text-orange-600' : 'bg-rose-100 text-rose-600'}`}>
                    {r.type === 'feature' ? <Lightbulb size={20} /> : <Bug size={20} />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-semibold text-gray-900">{r.title}</p>
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${STATUS_CLS[r.status]}`}>
                        {STATUSES.find((s) => s.key === r.status)?.label}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {r.restaurantName ?? 'Unknown restaurant'} · {r.submitterName || 'staff'} · {fmtDate(r.createdAt)}
                    </p>
                    {r.description && <p className="text-sm text-gray-600 mt-2 whitespace-pre-wrap">{r.description}</p>}

                    {/* Status actions */}
                    <div className="flex flex-wrap items-center gap-1.5 mt-3">
                      {STATUSES.map((s) => (
                        <button
                          key={s.key}
                          onClick={() => setStatus(r, s.key)}
                          disabled={savingId === r.id || r.status === s.key}
                          className={`text-xs font-medium px-2.5 py-1 rounded-full border transition-colors disabled:opacity-100 ${
                            r.status === s.key ? `${s.cls} border-transparent` : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                          }`}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>

                    {/* Admin note */}
                    <div className="mt-3 flex items-start gap-2">
                      <textarea
                        rows={2}
                        value={notes[r.id] ?? ''}
                        onChange={(e) => setNotes((n) => ({ ...n, [r.id]: e.target.value }))}
                        placeholder="Reply to the restaurant (optional)…"
                        className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-300 focus:border-transparent resize-none"
                      />
                      <button
                        onClick={() => saveNote(r)}
                        disabled={savingId === r.id || (notes[r.id] ?? '') === r.adminNote}
                        className="bg-orange-500 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-orange-600 transition-colors disabled:opacity-50 shrink-0"
                      >
                        {savingId === r.id ? <Loader2 size={15} className="animate-spin" /> : 'Save'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
