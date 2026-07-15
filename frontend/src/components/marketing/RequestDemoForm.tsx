import { useState, type FormEvent } from 'react';
import { Loader2, CheckCircle2, CalendarClock } from 'lucide-react';
import { demoRequestService } from '../../services/demoRequestService';

export interface DemoRequest {
  name: string;
  email: string;
  restaurantName: string;
  phone: string;
  message: string;
}

const EMPTY: DemoRequest = { name: '', email: '', restaurantName: '', phone: '', message: '' };

const COUNTRIES = [
  { name: 'Sri Lanka', code: 'LK', dialCode: '+94', example: '+94 77 123 4567' },
  { name: 'India', code: 'IN', dialCode: '+91', example: '+91 98765 43210' },
  { name: 'United Arab Emirates', code: 'AE', dialCode: '+971', example: '+971 50 123 4567' },
  { name: 'United Kingdom', code: 'GB', dialCode: '+44', example: '+44 7400 123456' },
  { name: 'United States', code: 'US', dialCode: '+1', example: '+1 555 123 4567' },
  { name: 'Australia', code: 'AU', dialCode: '+61', example: '+61 412 345 678' },
  { name: 'Singapore', code: 'SG', dialCode: '+65', example: '+65 8123 4567' },
  { name: 'Malaysia', code: 'MY', dialCode: '+60', example: '+60 12 345 6789' },
  { name: 'Qatar', code: 'QA', dialCode: '+974', example: '+974 3312 3456' },
  { name: 'Saudi Arabia', code: 'SA', dialCode: '+966', example: '+966 50 123 4567' },
] as const;

type CountryCode = typeof COUNTRIES[number]['code'];

export function RequestDemoForm() {
  const [form, setForm] = useState<DemoRequest>(EMPTY);
  const [countryCode, setCountryCode] = useState<CountryCode>('LK');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const selectedCountry = COUNTRIES.find((country) => country.code === countryCode) ?? COUNTRIES[0];

  function set<K extends keyof DemoRequest>(key: K, value: DemoRequest[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleCountryChange(nextCode: CountryCode) {
    const nextCountry = COUNTRIES.find((country) => country.code === nextCode) ?? COUNTRIES[0];
    setCountryCode(nextCountry.code);
    setForm((current) => {
      const currentPhone = current.phone.trim();
      const currentDialCode = selectedCountry.dialCode;
      const knownDialCode = COUNTRIES.find((country) => currentPhone.startsWith(`${country.dialCode} `) || currentPhone === country.dialCode)?.dialCode;
      const dialCodeToReplace = currentPhone.startsWith(currentDialCode) ? currentDialCode : knownDialCode;
      const withoutDialCode = dialCodeToReplace
        ? currentPhone.slice(dialCodeToReplace.length).trimStart()
        : currentPhone.startsWith('+')
          ? ''
          : currentPhone;

      return {
        ...current,
        phone: withoutDialCode ? `${nextCountry.dialCode} ${withoutDialCode}` : `${nextCountry.dialCode} `,
      };
    });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (!form.name.trim() || !form.email.trim() || !form.restaurantName.trim()) {
      setError('Please fill in your name, email and restaurant name.');
      return;
    }
    setSubmitting(true);
    try {
      await demoRequestService.create(form);
      setDone(true);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  const input =
    'w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-orange-300 focus:border-transparent bg-white transition-colors';

  if (done) {
    return (
      <div className="text-center py-4">
        <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 size={28} />
        </div>
        <h3 className="text-xl font-bold text-gray-900">Request received 🎉</h3>
        <p className="text-gray-500 mt-2 max-w-sm mx-auto">
          Thanks, {form.name.split(' ')[0] || 'there'}! Our team will reach out to{' '}
          <span className="font-medium text-gray-700">{form.email}</span> shortly with your demo access.
        </p>
        <button
          onClick={() => { setForm(EMPTY); setDone(false); }}
          className="mt-6 text-sm font-semibold text-orange-600 hover:text-orange-700"
        >
          Submit another request
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-3">{error}</div>
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Full name *</label>
          <input className={input} value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Jane Perera" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Work email *</label>
          <input type="email" className={input} value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="jane@restaurant.com" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Restaurant name *</label>
          <input className={input} value={form.restaurantName} onChange={(e) => set('restaurantName', e.target.value)} placeholder="The Spice Garden" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Country</label>
          <select
            className={input}
            value={countryCode}
            onChange={(e) => handleCountryChange(e.target.value as CountryCode)}
          >
            {COUNTRIES.map((country) => (
              <option key={country.code} value={country.code}>
                {country.name} ({country.dialCode})
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone <span className="text-gray-400 font-normal">(optional)</span></label>
          <input
            type="tel"
            className={input}
            value={form.phone}
            onChange={(e) => set('phone', e.target.value)}
            onFocus={() => {
              if (!form.phone.trim()) set('phone', `${selectedCountry.dialCode} `);
            }}
            placeholder={selectedCountry.example}
          />
          <p className="mt-1.5 text-xs text-gray-400">Country code updates automatically from the selected country.</p>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Anything you'd like us to know? <span className="text-gray-400 font-normal">(optional)</span></label>
        <textarea
          className={`${input} resize-none`}
          rows={3}
          value={form.message}
          onChange={(e) => set('message', e.target.value)}
          placeholder="Number of locations, what you're hoping to solve, preferred time…"
        />
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="w-full inline-flex items-center justify-center gap-2 bg-orange-500 text-white font-semibold py-3.5 rounded-2xl shadow-lg shadow-orange-500/30 hover:bg-orange-600 transition-colors disabled:opacity-60"
      >
        {submitting ? <Loader2 size={18} className="animate-spin" /> : <CalendarClock size={18} />}
        {submitting ? 'Sending…' : 'Request a demo'}
      </button>
      <p className="text-center text-xs text-gray-400">No credit card required · We'll set up a sandbox account for you.</p>
    </form>
  );
}
