import { useEffect } from 'react';
import { X, CalendarClock } from 'lucide-react';
import { RequestDemoForm } from './RequestDemoForm';

export function RequestDemoModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  // Close on Escape and lock background scroll while open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg my-8 bg-white rounded-3xl shadow-2xl p-6 sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 transition-colors"
        >
          <X size={20} />
        </button>

        <div className="mb-5">
          <div className="inline-flex items-center gap-2 rounded-full bg-orange-50 border border-orange-100 text-orange-600 text-xs font-semibold px-3 py-1.5">
            <CalendarClock size={13} /> See it live
          </div>
          <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-gray-900">Request a demo</h2>
          <p className="mt-1.5 text-sm text-gray-500">
            Tell us about your restaurant and we'll set you up with a guided demo and a sandbox account.
          </p>
        </div>

        <RequestDemoForm />
      </div>
    </div>
  );
}
