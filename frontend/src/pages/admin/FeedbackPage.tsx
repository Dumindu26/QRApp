import { useEffect, useState } from 'react';
import { Lightbulb, Bug, Loader2, Send, MessageSquarePlus } from 'lucide-react';
import toast from 'react-hot-toast';
import { AdminSidebar } from '../../components/AdminSidebar';
import { AdminHeader } from '../../components/AdminHeader';
import {
  featureRequestService, type FeatureRequest, type RequestType, type RequestStatus,
} from '../../services/featureRequestService';

const STATUS_STYLE: Record<RequestStatus, { label: string; cls: string }> = {
  open:        { label: 'Open',        cls: 'bg-blue-100 text-blue-700' },
  in_progress: { label: 'In progress', cls: 'bg-amber-100 text-amber-700' },
  resolved:    { label: 'Resolved',    cls: 'bg-green-100 text-green-700' },
  declined:    { label: 'Declined',    cls: 'bg-gray-100 text-gray-500' },
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

export function FeedbackPage() {
  const [type, setType] = useState<RequestType>('feature');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [mine, setMine] = useState<FeatureRequest[]>([]);
  const [loading, setLoading] = useState(true);

  function load() {
    featureRequestService.listMine()
      .then(setMine)
      .catch(() => {})
      .finally(() => setLoading(false));
  }
  useEffect(load, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) { toast.error('Please add a short title'); return; }
    setSubmitting(true);
    try {
      const created = await featureRequestService.create({ type, title: title.trim(), description: description.trim() });
      setMine((m) => [created, ...m]);
      setTitle(''); setDescription(''); setType('feature');
      toast.success('Sent to the development team — thank you!');
    } catch {
      toast.error('Could not submit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  const input = 'w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-orange-300 focus:border-transparent transition';

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <AdminSidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <AdminHeader title="Feedback" subtitle="Request a feature or report a bug to the dev team" backTo="/admin?group=business" icon={MessageSquarePlus} />
        <main className="flex-1 overflow-y-auto mt-14 md:mt-0">
          <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-6">

            {/* Submit form */}
            <form onSubmit={submit} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-4">
              {/* Type toggle */}
              <div className="grid grid-cols-2 gap-3">
                {([
                  { key: 'feature' as RequestType, Icon: Lightbulb, label: 'Request a feature', desc: 'Suggest something new' },
                  { key: 'bug' as RequestType,     Icon: Bug,      label: 'Report a bug',      desc: 'Something not working' },
                ]).map(({ key, Icon, label, desc }) => {
                  const on = type === key;
                  return (
                    <button
                      type="button"
                      key={key}
                      onClick={() => setType(key)}
                      className={`text-left rounded-xl border-2 p-3.5 transition-colors ${on ? 'border-orange-400 bg-orange-50' : 'border-gray-200 hover:border-gray-300'}`}
                    >
                      <Icon size={20} className={on ? 'text-orange-500' : 'text-gray-400'} />
                      <p className={`font-semibold text-sm mt-1.5 ${on ? 'text-orange-700' : 'text-gray-700'}`}>{label}</p>
                      <p className="text-xs text-gray-400">{desc}</p>
                    </button>
                  );
                })}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Title</label>
                <input
                  className={input}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={160}
                  placeholder={type === 'feature' ? 'e.g. Bulk-import menu items from CSV' : 'e.g. Bill total wrong when a promo is applied'}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Details <span className="text-gray-400 font-normal">(optional but helpful)</span>
                </label>
                <textarea
                  className={`${input} resize-none`}
                  rows={5}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={type === 'feature' ? 'What should it do, and how would it help your restaurant?' : 'What happened, what did you expect, and how can we reproduce it?'}
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-orange-500 text-white font-semibold py-3 rounded-xl hover:bg-orange-600 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {submitting ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                Send to dev team
              </button>
            </form>

            {/* Past submissions */}
            <div>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Your submissions</h2>
              {loading ? (
                <div className="flex justify-center py-10"><Loader2 size={24} className="animate-spin text-orange-500" /></div>
              ) : mine.length === 0 ? (
                <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-8 text-center text-sm text-gray-400">
                  No submissions yet — your feature requests and bug reports will appear here.
                </div>
              ) : (
                <div className="space-y-3">
                  {mine.map((r) => {
                    const s = STATUS_STYLE[r.status];
                    return (
                      <div key={r.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                        <div className="flex items-start gap-3">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${r.type === 'feature' ? 'bg-orange-100 text-orange-600' : 'bg-rose-100 text-rose-600'}`}>
                            {r.type === 'feature' ? <Lightbulb size={18} /> : <Bug size={18} />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <p className="font-semibold text-gray-900 text-sm truncate">{r.title}</p>
                              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${s.cls}`}>{s.label}</span>
                            </div>
                            {r.description && <p className="text-sm text-gray-500 mt-1 whitespace-pre-wrap">{r.description}</p>}
                            {r.adminNote && (
                              <div className="mt-2 bg-gray-50 border border-gray-100 rounded-lg px-3 py-2 text-xs text-gray-600">
                                <span className="font-semibold text-gray-500">Dev team:</span> {r.adminNote}
                              </div>
                            )}
                            <p className="text-[11px] text-gray-400 mt-2">{fmtDate(r.createdAt)}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        </main>
      </div>
    </div>
  );
}
