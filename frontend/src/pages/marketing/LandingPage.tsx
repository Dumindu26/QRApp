import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  QrCode, Smartphone, ChefHat, BarChart3,
  ArrowRight, Check, ScanLine, UtensilsCrossed, Moon, Sun,
  LayoutGrid, MessageCircle, ClipboardList, ShoppingBag, BedDouble, Truck,
  CheckCircle2, PlayCircle,
} from 'lucide-react';
import { MarketingNav, MarketingFooter } from '../../components/marketing/MarketingNav';
import { WhatsAppButton } from '../../components/marketing/WhatsAppButton';
import { RequestDemoModal } from '../../components/marketing/RequestDemoModal';

const NAV_LINKS = [
  { label: 'Features', href: '#features' },
  { label: 'Table status', href: '#table-status' },
  { label: 'How it works', href: '#how-it-works' },
  { label: 'Order types', href: '#order-types' },
  { label: 'Analytics', href: '#analytics' },
];

const HERO_CHECKLIST = [
  { Icon: QrCode,        label: 'QR Ordering' },
  { Icon: ChefHat,       label: 'Kitchen Display' },
  { Icon: LayoutGrid,    label: 'Live Floor Status' },
  { Icon: MessageCircle, label: 'WhatsApp Bills' },
];

const HERO_MINI_CHECKLIST = ['No app required', 'Instant kitchen alerts', 'WhatsApp billing'];

const TRUST = [
  { value: '60s',   label: 'Faster table turnover' },
  { value: '0',     label: 'Apps to download' },
  { value: '24/7',  label: 'Real-time order sync' },
  { value: '∞',     label: 'Tables & locations' },
];

const FEATURES = [
  { Icon: QrCode,        title: 'QR ordering',         blurb: 'Guests scan the table QR code, browse the live menu and order straight from their phone.' },
  { Icon: ChefHat,       title: 'Kitchen display',     blurb: 'New tickets land on the kitchen screen instantly, with item notes and time since order.' },
  { Icon: LayoutGrid,    title: 'Live table status',   blurb: 'See every table at a glance — available, in progress, ready to serve or ready to pay.' },
  { Icon: MessageCircle, title: 'WhatsApp billing',    blurb: "Send a guest's bill straight to WhatsApp — no printer, no waiting at the counter." },
  { Icon: ClipboardList, title: 'All order types',     blurb: 'Run dine-in, takeaway, room service and delivery from one organised dashboard.' },
  { Icon: BarChart3,     title: 'Restaurant analytics',blurb: 'Track revenue, order volume and top items to make faster, better-informed calls.' },
];

const TABLE_STATUS_POINTS = [
  'See occupied, available and payment-ready tables.',
  'Open a table to view its order, status and total bill.',
  'Reduce missed requests and unnecessary walking.',
];

type FloorTable = { n: string; status: 'available' | 'preparing' | 'ready'; note?: string };

const FLOOR_TABLES: FloorTable[] = [
  { n: '01', status: 'available' },
  { n: '02', status: 'preparing', note: '12 min' },
  { n: '03', status: 'ready' },
  { n: '04', status: 'available' },
  { n: '05', status: 'ready' },
  { n: '06', status: 'preparing', note: '5 min' },
  { n: '07', status: 'available' },
  { n: '08', status: 'preparing', note: 'new' },
];

const STEPS = [
  { Icon: ScanLine,        title: 'Guest scans',       blurb: 'The guest scans the QR code placed on their table.' },
  { Icon: UtensilsCrossed, title: 'Guest orders',      blurb: 'They browse the menu, customise items and place the order from their phone.' },
  { Icon: ChefHat,         title: 'Kitchen prepares',  blurb: 'The order appears instantly on the kitchen display, ready to prepare.' },
  { Icon: CheckCircle2,    title: 'Restaurant serves', blurb: 'Staff track status, serve the order and send the bill over WhatsApp.' },
];

const ORDER_TYPES = [
  { Icon: UtensilsCrossed, label: 'Dine-in' },
  { Icon: ShoppingBag,     label: 'Takeaway' },
  { Icon: BedDouble,       label: 'Room service' },
  { Icon: Truck,           label: 'Delivery' },
];

const ORDER_ROWS = [
  { id: '#OL-1048', type: 'Table 08', time: '7:42 PM', total: 'LKR 4,100', status: 'Preparing' },
  { id: '#OL-1047', type: 'Delivery', time: '7:37 PM', total: 'LKR 6,850', status: 'Ready' },
  { id: '#OL-1046', type: 'Room 312', time: '7:33 PM', total: 'LKR 3,650', status: 'Preparing' },
  { id: '#OL-1045', type: 'Takeaway', time: '7:28 PM', total: 'LKR 1,950', status: 'Ready' },
];

const ANALYTICS_STATS = [
  { label: 'Revenue',   value: 'LKR 1.28M' },
  { label: 'Orders',    value: '824' },
  { label: 'Avg. order',value: 'LKR 1,553' },
];

const ANALYTICS_CHART_PATH =
  'M0,92 C25,80 45,84 62,74 C79,64 95,48 115,52 C135,56 150,40 168,36 ' +
  'C186,32 202,44 220,40 C238,36 254,24 272,28 C290,32 306,16 324,12 L340,8';

const ROLES = [
  { label: 'Admin & Manager', blurb: 'Full dashboard — menu, orders, reports, stock and staff.' },
  { label: 'Cashier',         blurb: 'Take orders, settle bills and close tables with ease.' },
  { label: 'Waiter',          blurb: 'Live orders, table assignment and faster guest service.' },
  { label: 'Kitchen',         blurb: 'A dedicated display with live tickets and prep timers.' },
];

type LandingTheme = 'light' | 'dark';

function SectionBadge({ children, dark }: { children: string; dark: boolean }) {
  return (
    <span className={`inline-flex items-center gap-2 rounded-full border text-xs font-semibold px-3 py-1.5 ${dark ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-orange-50 border-orange-100 text-orange-600'}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dark ? 'bg-emerald-400' : 'bg-orange-500'}`} />
      {children}
    </span>
  );
}

const statusDot: Record<string, string> = {
  available: 'bg-gray-300',
  preparing: 'bg-orange-400',
  ready: 'bg-emerald-500',
};
const statusDotDark: Record<string, string> = {
  available: 'bg-zinc-700',
  preparing: 'bg-orange-400',
  ready: 'bg-emerald-400',
};
const statusLabel: Record<string, string> = {
  available: 'Available',
  preparing: 'Preparing',
  ready: 'Ready to serve',
};

export function LandingPage() {
  const [demoOpen, setDemoOpen] = useState(false);
  const [theme, setTheme] = useState<LandingTheme>(() =>
    (localStorage.getItem('orderlive_landing_theme') as LandingTheme | null) ?? 'light'
  );
  const dark = theme === 'dark';

  useEffect(() => {
    localStorage.setItem('orderlive_landing_theme', theme);
  }, [theme]);

  const switcher = (
    <div className={`hidden md:flex items-center rounded-full p-1 border ${dark ? 'bg-emerald-950 border-emerald-800' : 'bg-gray-50 border-gray-200'}`}>
      {(['light', 'dark'] as const).map((mode) => {
        const active = theme === mode;
        const Icon = mode === 'light' ? Sun : Moon;
        return (
          <button
            key={mode}
            type="button"
            onClick={() => setTheme(mode)}
            aria-pressed={active}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
              active
                ? dark ? 'bg-emerald-500 text-black' : 'bg-white text-orange-600 shadow-sm'
                : dark ? 'text-emerald-200 hover:text-white' : 'text-gray-500 hover:text-gray-900'
            }`}
            title={`${mode === 'light' ? 'Light' : 'Dark'} theme`}
          >
            <Icon size={15} />
          </button>
        );
      })}
    </div>
  );

  return (
    <div className={`min-h-screen transition-colors ${dark ? 'bg-black text-white' : 'bg-white text-gray-900'}`}>
      <MarketingNav variant={dark ? 'dark' : 'light'} themeSwitcher={switcher} sectionLinks={NAV_LINKS} />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className={`pointer-events-none absolute -top-32 -left-24 w-96 h-96 rounded-full blur-3xl ${dark ? 'bg-emerald-500/18' : 'bg-orange-200/40'}`} />
        <div className={`pointer-events-none absolute -top-10 right-0 w-96 h-96 rounded-full blur-3xl ${dark ? 'bg-lime-400/10' : 'bg-emerald-200/30'}`} />

        <div className="relative max-w-6xl mx-auto px-5 pt-16 pb-12 sm:pt-24 sm:pb-16 grid lg:grid-cols-2 gap-12 items-center">
          <div className="text-center lg:text-left">
            <SectionBadge dark={dark}>Built for modern restaurants</SectionBadge>
            <h1 className="mt-5 text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.05]">
              Smarter restaurant
              <span className={dark ? 'text-emerald-400' : 'text-orange-500'}> ordering.</span>
            </h1>
            <p className={`mt-5 text-lg max-w-xl mx-auto lg:mx-0 ${dark ? 'text-emerald-50/68' : 'text-gray-500'}`}>
              Let guests scan, order and pay from their phones while your team manages
              the kitchen, tables, billing and every order from one simple dashboard.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
              <Link
                to="/signup"
                className={`inline-flex items-center justify-center gap-2 font-semibold px-6 py-3.5 rounded-2xl shadow-lg transition-colors ${dark ? 'bg-emerald-500 text-black shadow-emerald-500/25 hover:bg-emerald-400' : 'bg-orange-500 text-white shadow-orange-500/30 hover:bg-orange-600'}`}
              >
                Start with Order Live <ArrowRight size={18} />
              </Link>
              <button
                type="button"
                onClick={() => setDemoOpen(true)}
                className={`inline-flex items-center justify-center gap-2 border font-semibold px-6 py-3.5 rounded-2xl transition-colors ${dark ? 'bg-black border-emerald-800 text-emerald-100 hover:border-emerald-500 hover:bg-emerald-950/70' : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50'}`}
              >
                <PlayCircle size={18} /> See how it works
              </button>
            </div>

            <div className={`mt-5 flex flex-wrap gap-x-5 gap-y-2 justify-center lg:justify-start text-sm ${dark ? 'text-emerald-100/70' : 'text-gray-500'}`}>
              {HERO_MINI_CHECKLIST.map((item) => (
                <span key={item} className="inline-flex items-center gap-1.5">
                  <Check size={15} className={dark ? 'text-emerald-400' : 'text-emerald-500'} /> {item}
                </span>
              ))}
            </div>
          </div>

          {/* Hero visual — stylised phone + scan card */}
          <div className="relative mx-auto w-full max-w-sm">
            <div className={`absolute inset-0 rounded-[2.5rem] rotate-3 ${dark ? 'bg-gradient-to-br from-emerald-500/28 to-lime-300/10' : 'bg-gradient-to-br from-orange-100 to-emerald-100'}`} />
            <div className={`relative rounded-[2.5rem] border shadow-2xl p-6 ${dark ? 'bg-zinc-950 border-emerald-900/70 shadow-emerald-500/10' : 'bg-white border-gray-100 shadow-orange-500/10'}`}>
              <div className="flex items-center justify-between mb-5">
                <div className={dark ? 'rounded-xl bg-white p-1' : ''}>
                  <img src="/orderlive-icon.png" alt="" className="w-10 h-10 object-contain" />
                </div>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${dark ? 'text-emerald-200 bg-emerald-500/12' : 'text-emerald-600 bg-emerald-50'}`}>● Live</span>
              </div>
              <div className={`rounded-2xl border p-5 flex flex-col items-center text-center ${dark ? 'bg-black border-emerald-900/70' : 'bg-gray-50 border-gray-100'}`}>
                <QrCode size={88} className={dark ? 'text-emerald-300' : 'text-gray-900'} />
                <p className={`mt-3 text-sm font-semibold ${dark ? 'text-white' : 'text-gray-900'}`}>Scan to order</p>
                <p className={dark ? 'text-xs text-emerald-100/50' : 'text-xs text-gray-400'}>Table 12 · The Spice Garden</p>
              </div>
              <div className="mt-4 space-y-2.5">
                {['Grilled Paneer Tikka', 'Butter Chicken', 'Garlic Naan ×2'].map((item, i) => (
                  <div key={item} className={`flex items-center justify-between border rounded-xl px-4 py-3 shadow-sm ${dark ? 'bg-black border-emerald-900/60' : 'bg-white border-gray-100'}`}>
                    <span className={`text-sm font-medium ${dark ? 'text-emerald-50' : 'text-gray-700'}`}>{item}</span>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${dark ? (i === 0 ? 'bg-emerald-500/15 text-emerald-300' : i === 1 ? 'bg-lime-400/12 text-lime-200' : 'bg-zinc-800 text-emerald-100/60') : (i === 0 ? 'bg-emerald-50 text-emerald-600' : i === 1 ? 'bg-orange-50 text-orange-600' : 'bg-gray-100 text-gray-500')}`}>
                      {i === 0 ? 'Served' : i === 1 ? 'Cooking' : 'Queued'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Everything your restaurant needs — strip */}
      <section className={`border-y ${dark ? 'border-emerald-900/70' : 'border-gray-100'}`}>
        <div className="max-w-6xl mx-auto px-5 py-6 flex flex-col sm:flex-row items-center gap-4 sm:gap-8">
          <p className={`text-sm font-semibold whitespace-nowrap ${dark ? 'text-emerald-200/70' : 'text-gray-500'}`}>
            Everything your restaurant needs:
          </p>
          <div className="flex flex-wrap justify-center gap-2.5">
            {HERO_CHECKLIST.map(({ Icon, label }) => (
              <span
                key={label}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium ${dark ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-100' : 'bg-emerald-50 border-emerald-100 text-emerald-700'}`}
              >
                <Icon size={15} className={dark ? 'text-emerald-300' : 'text-emerald-600'} />
                {label}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Trust stats */}
      <section className={dark ? 'bg-emerald-950/20' : 'bg-gray-50/60'}>
        <div className="max-w-6xl mx-auto px-5 py-8 grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
          {TRUST.map((t) => (
            <div key={t.label}>
              <div className={`text-3xl font-extrabold ${dark ? 'text-emerald-300' : 'text-gray-900'}`}>{t.value}</div>
              <div className={`text-sm mt-1 ${dark ? 'text-emerald-100/58' : 'text-gray-500'}`}>{t.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="max-w-6xl mx-auto px-5 py-16 sm:py-24 scroll-mt-16">
        <div className="text-center max-w-2xl mx-auto">
          <SectionBadge dark={dark}>One connected platform</SectionBadge>
          <h2 className="mt-5 text-3xl sm:text-4xl font-extrabold tracking-tight">From the customer's phone to the kitchen screen.</h2>
          <p className={`mt-4 ${dark ? 'text-emerald-100/62' : 'text-gray-500'}`}>
            Order Live connects every stage of the restaurant experience, helping your team
            move faster while giving customers a smoother way to order.
          </p>
        </div>
        <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map(({ Icon, title, blurb }) => (
            <div
              key={title}
              className={`group rounded-3xl border p-6 hover:shadow-xl hover:-translate-y-1 transition-all ${dark ? 'bg-zinc-950 border-emerald-900/70 hover:shadow-emerald-500/10' : 'bg-white border-gray-100'}`}
            >
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform ${dark ? 'bg-emerald-500/14 text-emerald-300' : 'bg-orange-100 text-orange-600'}`}>
                <Icon size={22} />
              </div>
              <h3 className="font-bold text-lg">{title}</h3>
              <p className={`text-sm mt-1.5 leading-relaxed ${dark ? 'text-emerald-100/58' : 'text-gray-500'}`}>{blurb}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Live table status */}
      <section id="table-status" className={`scroll-mt-16 ${dark ? 'bg-gradient-to-b from-emerald-950/35 to-black' : 'bg-gradient-to-b from-orange-50/60 to-white'}`}>
        <div className="max-w-6xl mx-auto px-5 py-16 sm:py-24 grid lg:grid-cols-2 gap-12 items-center">
          <div className="text-center lg:text-left">
            <SectionBadge dark={dark}>Live restaurant view</SectionBadge>
            <h2 className="mt-5 text-3xl sm:text-4xl font-extrabold tracking-tight">Know what is happening at every table.</h2>
            <p className={`mt-4 ${dark ? 'text-emerald-100/62' : 'text-gray-500'}`}>
              Your team gets a clear view of the entire floor, so they can respond faster
              and keep service moving without repeatedly checking each table.
            </p>
            <ul className="mt-6 space-y-2.5 text-left inline-block">
              {TABLE_STATUS_POINTS.map((point) => (
                <li key={point} className={`flex items-start gap-2.5 text-sm ${dark ? 'text-emerald-50/85' : 'text-gray-700'}`}>
                  <Check size={16} className={`mt-0.5 shrink-0 ${dark ? 'text-emerald-400' : 'text-emerald-500'}`} />
                  {point}
                </li>
              ))}
            </ul>
          </div>

          <div className={`relative rounded-[2rem] border p-6 shadow-xl ${dark ? 'bg-zinc-950 border-emerald-900/70' : 'bg-white border-gray-100'}`}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold">Main dining area</h3>
              <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${dark ? 'text-emerald-300' : 'text-emerald-600'}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${dark ? 'bg-emerald-400' : 'bg-emerald-500'}`} /> Live floor status
              </span>
            </div>
            <div className={`flex flex-wrap gap-3 mb-5 text-xs ${dark ? 'text-emerald-100/60' : 'text-gray-500'}`}>
              {(['available', 'preparing', 'ready'] as const).map((s) => (
                <span key={s} className="inline-flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${dark ? statusDotDark[s] : statusDot[s]}`} /> {statusLabel[s]}
                </span>
              ))}
            </div>
            <div className="grid grid-cols-4 gap-3">
              {FLOOR_TABLES.map((t) => (
                <div key={t.n} className={`rounded-xl border p-3 text-center ${dark ? 'bg-black border-emerald-900/60' : 'bg-gray-50 border-gray-100'}`}>
                  <span className={`mx-auto mb-1.5 block w-2.5 h-2.5 rounded-full ${dark ? statusDotDark[t.status] : statusDot[t.status]}`} />
                  <p className="text-sm font-bold">Table {t.n}</p>
                  <p className={`text-[11px] mt-0.5 ${dark ? 'text-emerald-100/50' : 'text-gray-400'}`}>
                    {t.status === 'preparing' ? (t.note === 'new' ? 'Order received' : `Preparing · ${t.note}`) : statusLabel[t.status]}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="max-w-6xl mx-auto px-5 py-16 sm:py-24 scroll-mt-16">
        <div className="text-center max-w-2xl mx-auto">
          <SectionBadge dark={dark}>Simple from start to finish</SectionBadge>
          <h2 className="mt-5 text-3xl sm:text-4xl font-extrabold tracking-tight">A faster ordering flow for guests and staff.</h2>
          <p className={`mt-4 ${dark ? 'text-emerald-100/62' : 'text-gray-500'}`}>Order Live keeps the guest, kitchen and restaurant team connected in real time.</p>
        </div>
        <div className="mt-14 grid sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-6">
          {STEPS.map(({ Icon, title, blurb }, i) => (
            <div key={title} className="relative text-center">
              {i < STEPS.length - 1 && (
                <div className={`hidden lg:block absolute top-6 left-1/2 w-full h-px ${dark ? 'bg-emerald-900/70' : 'bg-gray-200'}`} />
              )}
              <div className={`relative mx-auto w-12 h-12 rounded-2xl flex items-center justify-center font-bold ${dark ? 'bg-emerald-500 text-black' : 'bg-orange-500 text-white'}`}>
                <Icon size={22} />
              </div>
              <p className={`mt-1 text-xs font-bold ${dark ? 'text-emerald-400' : 'text-orange-500'}`}>{String(i + 1).padStart(2, '0')}</p>
              <h3 className="font-bold text-lg mt-1">{title}</h3>
              <p className={`text-sm mt-1.5 leading-relaxed ${dark ? 'text-emerald-100/58' : 'text-gray-500'}`}>{blurb}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Order types */}
      <section id="order-types" className={`scroll-mt-16 ${dark ? 'bg-emerald-950/20' : 'bg-gray-50/60'}`}>
        <div className="max-w-6xl mx-auto px-5 py-16 sm:py-24 grid lg:grid-cols-2 gap-12 items-center">
          <div className="text-center lg:text-left">
            <SectionBadge dark={dark}>Every order, one dashboard</SectionBadge>
            <h2 className="mt-5 text-3xl sm:text-4xl font-extrabold tracking-tight">Manage every way your customers order.</h2>
            <p className={`mt-4 ${dark ? 'text-emerald-100/62' : 'text-gray-500'}`}>
              Keep dine-in, takeaway, room service and delivery organised without switching
              between different systems.
            </p>
            <div className="mt-7 grid grid-cols-2 gap-3 max-w-sm mx-auto lg:mx-0">
              {ORDER_TYPES.map(({ Icon, label }) => (
                <div key={label} className={`flex items-center gap-3 rounded-2xl border px-4 py-3.5 ${dark ? 'bg-black border-emerald-900/70' : 'bg-white border-gray-100'}`}>
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${dark ? 'bg-emerald-500/14 text-emerald-300' : 'bg-orange-100 text-orange-600'}`}>
                    <Icon size={17} />
                  </div>
                  <span className="font-semibold text-sm">{label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className={`rounded-[2rem] border p-6 shadow-xl ${dark ? 'bg-zinc-950 border-emerald-900/70' : 'bg-white border-gray-100'}`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold">Orders</h3>
              <span className={`text-xs font-semibold px-3 py-1.5 rounded-full ${dark ? 'bg-emerald-500 text-black' : 'bg-orange-500 text-white'}`}>+ Add order</span>
            </div>
            <div className={`flex gap-2 mb-4 text-xs font-semibold overflow-x-auto ${dark ? 'text-emerald-100/60' : 'text-gray-500'}`}>
              {['All orders', 'Dine-in', 'Takeaway', 'Delivery'].map((t, i) => (
                <span key={t} className={`px-3 py-1.5 rounded-full whitespace-nowrap ${i === 0 ? (dark ? 'bg-emerald-500/15 text-emerald-300' : 'bg-orange-50 text-orange-600') : ''}`}>{t}</span>
              ))}
            </div>
            <div className="space-y-2">
              {ORDER_ROWS.map((o) => (
                <div key={o.id} className={`flex items-center justify-between border rounded-xl px-3.5 py-2.5 ${dark ? 'bg-black border-emerald-900/60' : 'bg-gray-50 border-gray-100'}`}>
                  <div>
                    <p className="text-sm font-semibold">{o.id} <span className={dark ? 'text-emerald-100/50 font-normal' : 'text-gray-400 font-normal'}>· {o.type}</span></p>
                    <p className={`text-[11px] ${dark ? 'text-emerald-100/45' : 'text-gray-400'}`}>{o.time}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold">{o.total}</p>
                    <p className={`text-[11px] font-semibold ${o.status === 'Ready' ? (dark ? 'text-emerald-300' : 'text-emerald-600') : (dark ? 'text-orange-300' : 'text-orange-600')}`}>{o.status}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Analytics */}
      <section id="analytics" className="max-w-6xl mx-auto px-5 py-16 sm:py-24 scroll-mt-16">
        <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-zinc-900 to-black p-8 sm:p-12 grid lg:grid-cols-2 gap-10 items-center">
          <div className={`pointer-events-none absolute -top-20 -right-10 w-72 h-72 rounded-full blur-3xl ${dark ? 'bg-emerald-500/20' : 'bg-orange-500/20'}`} />

          <div className="relative text-center lg:text-left">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/15 text-xs font-semibold px-3 py-1.5 text-white">
              <span className={`w-1.5 h-1.5 rounded-full ${dark ? 'bg-emerald-400' : 'bg-orange-400'}`} /> RESTAURANT ANALYTICS
            </span>
            <h2 className="mt-5 text-3xl sm:text-4xl font-extrabold tracking-tight text-white">Understand what is selling and when.</h2>
            <p className="mt-4 text-white/65 max-w-md mx-auto lg:mx-0">
              Track revenue, order volume, average order value and popular menu items
              from a clear, easy-to-read analytics dashboard.
            </p>
          </div>

          <div className="relative rounded-[1.75rem] bg-white/8 border border-white/10 p-5">
            <div className="grid grid-cols-3 gap-3 mb-5">
              {ANALYTICS_STATS.map((s) => (
                <div key={s.label} className="rounded-2xl bg-white/10 border border-white/10 p-4">
                  <p className="text-xs text-white/55">{s.label}</p>
                  <p className="text-lg font-bold text-white mt-1">{s.value}</p>
                </div>
              ))}
            </div>
            <div className="relative rounded-2xl border border-white/10 h-40 overflow-hidden">
              <div className="absolute inset-0 grid grid-cols-8 grid-rows-4">
                {Array.from({ length: 32 }).map((_, i) => (
                  <div key={i} className="border-r border-b border-white/5" />
                ))}
              </div>
              <svg viewBox="0 0 340 110" preserveAspectRatio="none" className="relative w-full h-full">
                <defs>
                  <linearGradient id="analyticsFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={dark ? '#34d399' : '#fb923c'} stopOpacity="0.35" />
                    <stop offset="100%" stopColor={dark ? '#34d399' : '#fb923c'} stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path d={`${ANALYTICS_CHART_PATH} L340,110 L0,110 Z`} fill="url(#analyticsFill)" />
                <path d={ANALYTICS_CHART_PATH} fill="none" stroke={dark ? '#34d399' : '#fb923c'} strokeWidth="3" strokeLinecap="round" />
              </svg>
            </div>
          </div>
        </div>
      </section>

      {/* Built for every role */}
      <section className="max-w-6xl mx-auto px-5 py-16 sm:py-24">
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Built for every role on the floor</h2>
          <p className={`mt-4 ${dark ? 'text-emerald-100/62' : 'text-gray-500'}`}>Role-based access means everyone sees exactly what they need — nothing more.</p>
        </div>
        <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {ROLES.map((r) => (
            <div key={r.label} className={`rounded-3xl border p-6 ${dark ? 'border-emerald-900/70 bg-emerald-950/20' : 'border-gray-100 bg-gray-50/60'}`}>
              <div className={`flex items-center gap-2 mb-2 ${dark ? 'text-emerald-300' : 'text-orange-600'}`}>
                <Smartphone size={18} />
                <h3 className={`font-bold ${dark ? 'text-white' : 'text-gray-900'}`}>{r.label}</h3>
              </div>
              <p className={`text-sm leading-relaxed ${dark ? 'text-emerald-100/58' : 'text-gray-500'}`}>{r.blurb}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA band */}
      <section className="max-w-6xl mx-auto px-5 pb-20">
        <div className={`relative overflow-hidden rounded-[2.5rem] px-8 py-14 sm:px-16 sm:py-20 text-center shadow-2xl ${dark ? 'bg-gradient-to-br from-emerald-500 to-emerald-800 shadow-emerald-500/20' : 'bg-gradient-to-br from-orange-500 to-orange-600 shadow-orange-500/30'}`}>
          <div className="pointer-events-none absolute -top-16 -right-10 w-72 h-72 rounded-full bg-white/10 blur-2xl" />
          <h2 className="relative text-3xl sm:text-4xl font-extrabold text-white">Ready to go live?</h2>
          <p className={`relative mt-4 max-w-xl mx-auto ${dark ? 'text-emerald-50' : 'text-orange-50'}`}>
            Set up your menu, print your QR codes and start taking orders today.
            Your free trial is one click away.
          </p>
          <div className="relative mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/signup" className={`inline-flex items-center justify-center gap-2 bg-white font-semibold px-7 py-3.5 rounded-2xl transition-colors ${dark ? 'text-emerald-700 hover:bg-emerald-50' : 'text-orange-600 hover:bg-orange-50'}`}>
              Start free trial <ArrowRight size={18} />
            </Link>
            <Link to="/login" className={`inline-flex items-center justify-center gap-2 text-white font-semibold px-7 py-3.5 rounded-2xl border border-white/30 transition-colors ${dark ? 'bg-black/25 hover:bg-black/40' : 'bg-orange-400/30 hover:bg-orange-400/50'}`}>
              Log in
            </Link>
          </div>
        </div>
      </section>

      <MarketingFooter variant={dark ? 'dark' : 'light'} />

      <WhatsAppButton />
      <RequestDemoModal open={demoOpen} onClose={() => setDemoOpen(false)} />
    </div>
  );
}
