import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  QrCode, Smartphone, ChefHat, BarChart3,
  ArrowRight, Check, ScanLine, UtensilsCrossed, Moon, Sun,
  LayoutGrid, MessageCircle, ClipboardList, ShoppingBag, BedDouble, Truck,
  CheckCircle2, PlayCircle, BellRing, Clock3, ReceiptText, Sparkles, Table2,
  TrendingUp,
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

const HERO_NAV = ['Orders', 'Kitchen', 'Tables', 'Reports'];

const HERO_STATS = [
  { label: 'Today revenue', value: 'LKR 186K', change: '+18%' },
  { label: 'Live orders', value: '42', change: '+9 new' },
  { label: 'Avg. prep', value: '11m', change: '-3m' },
];

const HERO_ORDERS = [
  { item: 'Kottu Combo', meta: 'Table 08 · 2 items', status: 'Ready' },
  { item: 'Seafood Rice', meta: 'Takeaway · paid', status: 'Cooking' },
  { item: 'Mango Lassi', meta: 'Room 312 · add note', status: 'Queued' },
];

const HERO_MENU_ITEMS = [
  { title: 'Chicken Biryani', desc: 'Aromatic rice, raita, sambol', price: 'LKR 1,450' },
  { title: 'Paneer Tikka', desc: 'Smoky skewers, mint chutney', price: 'LKR 1,150' },
  { title: 'Falooda', desc: 'Rose, basil seeds, ice cream', price: 'LKR 650' },
];

const HERO_SLIDES = [
  {
    eyebrow: 'Restaurant command centre',
    titleStart: 'Run orders,',
    titleAccent: ' tables and kitchen',
    titleEnd: ' from one screen.',
    copy: 'Guests scan and order from their phones while your team sees live tickets, table status, bills and sales in a clean restaurant command centre.',
    visual: 'command',
    details: [
      { Icon: BellRing, label: 'Live order alerts', text: 'Kitchen and floor staff see new tickets instantly.' },
      { Icon: Clock3, label: 'Prep time visibility', text: 'Track what is queued, cooking and ready.' },
      { Icon: ReceiptText, label: 'Bill faster', text: 'Settle tables or send bills without delays.' },
    ],
  },
  {
    eyebrow: 'Guest QR ordering',
    titleStart: 'Let guests',
    titleAccent: ' scan, browse and order',
    titleEnd: ' without waiting.',
    copy: 'A polished mobile menu helps customers order dine-in, takeaway, room service or delivery while every item lands in the right workflow.',
    visual: 'guest',
    details: [
      { Icon: QrCode, label: 'Table QR codes', text: 'No app download, no account friction.' },
      { Icon: UtensilsCrossed, label: 'Live menu cards', text: 'Show popular items, notes and prices clearly.' },
      { Icon: Smartphone, label: 'Mobile-first flow', text: 'Guests can reorder and check their bill from the phone.' },
    ],
  },
  {
    eyebrow: 'Floor and analytics',
    titleStart: 'See service,',
    titleAccent: ' table status and sales',
    titleEnd: ' as they happen.',
    copy: 'Managers get one calm view of occupied tables, payment-ready orders, revenue, average prep time and the service signals that matter.',
    visual: 'insight',
    details: [
      { Icon: Table2, label: 'Live floor map', text: 'Know which tables need attention right now.' },
      { Icon: TrendingUp, label: 'Sales pulse', text: 'Watch revenue and order volume throughout service.' },
      { Icon: BarChart3, label: 'Useful reports', text: 'Turn daily activity into better menu decisions.' },
    ],
  },
] as const;

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

const PRODUCT_SCREENS = [
  {
    Icon: LayoutGrid,
    title: 'Floor and table view',
    body: 'Spot available, active and payment-ready tables without walking the room.',
  },
  {
    Icon: ChefHat,
    title: 'Kitchen tickets',
    body: 'Live prep cards with item notes, timers and ready-to-serve status.',
  },
  {
    Icon: ReceiptText,
    title: 'Fast billing',
    body: 'Close tables, print receipts or send bills straight to WhatsApp.',
  },
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

function HeroDashboard({ dark }: { dark: boolean }) {
  return (
    <div className={`landing-float-slow relative mx-auto w-full max-w-2xl rotate-[1.5deg] overflow-hidden border p-3 shadow-2xl ${dark ? 'bg-zinc-950/88 border-emerald-800/70 shadow-emerald-500/10' : 'bg-white/90 border-white shadow-orange-500/10'}`}>
      <div className={`flex h-10 items-center justify-between border-b px-3 ${dark ? 'border-emerald-900/70' : 'border-gray-100'}`}>
        <div className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
        </div>
        <span className={`text-[11px] font-bold ${dark ? 'text-emerald-100/50' : 'text-gray-400'}`}>orderlive.online/admin</span>
      </div>

      <div className={`grid min-h-[400px] overflow-hidden lg:grid-cols-[120px_1fr] ${dark ? 'bg-black' : 'bg-gray-50'}`}>
        <aside className={`hidden p-4 lg:block ${dark ? 'bg-emerald-950 text-emerald-50/70' : 'bg-gray-950 text-gray-300'}`}>
          <div className="mb-6 flex items-center gap-2 text-xs font-extrabold text-white">
            <img src="/orderlive-icon.png" alt="" className="h-7 w-7 rounded-lg bg-white p-1" />
            Order Live
          </div>
          <div className="space-y-1.5">
            {HERO_NAV.map((item, i) => (
              <div key={item} className={`flex items-center gap-2 rounded-lg px-2 py-2 text-[11px] font-semibold ${i === 0 ? 'bg-white/12 text-white' : ''}`}>
                <span className="h-4 w-4 rounded bg-white/15" />
                {item}
              </div>
            ))}
          </div>
        </aside>

        <div className="p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className={`text-[11px] font-bold uppercase tracking-wide ${dark ? 'text-emerald-300' : 'text-orange-600'}`}>Live service</p>
              <h3 className="text-base font-extrabold">Main dashboard</h3>
            </div>
            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold ${dark ? 'bg-emerald-500 text-black' : 'bg-orange-500 text-white'}`}>
              <BellRing size={13} /> 3 alerts
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            {HERO_STATS.map((stat) => (
              <div key={stat.label} className={`rounded-lg border p-3 ${dark ? 'bg-zinc-950 border-emerald-900/70' : 'bg-white border-gray-100'}`}>
                <p className={`text-[10px] font-semibold ${dark ? 'text-emerald-100/48' : 'text-gray-400'}`}>{stat.label}</p>
                <strong className="mt-1 block text-base">{stat.value}</strong>
                <small className={dark ? 'text-emerald-300' : 'text-emerald-600'}>{stat.change}</small>
              </div>
            ))}
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-[1.15fr_0.85fr]">
            <div className={`rounded-lg border p-3 ${dark ? 'bg-zinc-950 border-emerald-900/70' : 'bg-white border-gray-100'}`}>
              <div className="mb-2 flex items-center justify-between">
                <strong className="text-xs">Kitchen queue</strong>
                <span className={`text-[10px] font-semibold ${dark ? 'text-emerald-100/45' : 'text-gray-400'}`}>Updated now</span>
              </div>
              {HERO_ORDERS.map((order, i) => (
                <div key={order.item} className={`flex items-center justify-between gap-3 border-t py-2 ${dark ? 'border-emerald-900/60' : 'border-gray-100'} ${i === 0 ? 'border-t-0 pt-0' : ''}`}>
                  <div>
                    <p className="text-xs font-bold">{order.item}</p>
                    <p className={`text-[10px] ${dark ? 'text-emerald-100/45' : 'text-gray-400'}`}>{order.meta}</p>
                  </div>
                  <span className={`rounded-full px-2 py-1 text-[10px] font-extrabold ${
                    order.status === 'Ready'
                      ? dark ? 'bg-emerald-500/15 text-emerald-300' : 'bg-emerald-50 text-emerald-600'
                      : order.status === 'Cooking'
                      ? dark ? 'bg-orange-500/15 text-orange-200' : 'bg-orange-50 text-orange-600'
                      : dark ? 'bg-zinc-800 text-emerald-100/55' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {order.status}
                  </span>
                </div>
              ))}
            </div>

            <div className={`rounded-lg border p-3 ${dark ? 'bg-zinc-950 border-emerald-900/70' : 'bg-white border-gray-100'}`}>
              <div className="mb-2 flex items-center justify-between">
                <strong className="text-xs">Sales pulse</strong>
                <Clock3 size={14} className={dark ? 'text-emerald-300' : 'text-orange-600'} />
              </div>
              <div className="landing-bars flex h-28 items-end gap-1.5">
                {[35, 56, 48, 78, 66, 94, 72].map((height, i) => (
                  <span
                    key={height + i}
                    className={`flex-1 rounded-t ${dark ? 'bg-gradient-to-t from-emerald-800 to-emerald-300' : 'bg-gradient-to-t from-orange-700 to-orange-300'}`}
                    style={{ height: `${height}%`, animationDelay: `${i * 90}ms` }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function HeroPhone({ dark }: { dark: boolean }) {
  return (
    <div className={`landing-float absolute -left-3 bottom-0 z-10 hidden w-52 -rotate-6 rounded-[2rem] border p-2 shadow-2xl sm:block ${dark ? 'bg-zinc-950 border-emerald-800/70 shadow-emerald-500/10' : 'bg-gray-950 border-gray-800 shadow-gray-900/25'}`}>
      <div className={`min-h-[390px] overflow-hidden rounded-[1.55rem] p-3 ${dark ? 'bg-emerald-950/40' : 'bg-orange-50'}`}>
        <div className="mx-auto mb-3 h-4 w-16 rounded-b-xl bg-gray-950" />
        <div className="flex items-center justify-between text-[10px] font-extrabold">
          <span>Table 12</span>
          <QrCode size={16} className={dark ? 'text-emerald-300' : 'text-orange-600'} />
        </div>
        <div className={`mt-3 rounded-lg p-3 text-white ${dark ? 'bg-gradient-to-br from-emerald-700 to-emerald-950' : 'bg-gradient-to-br from-orange-700 to-orange-500'}`}>
          <small className="text-[9px] opacity-80">Welcome to</small>
          <h4 className="mt-1 text-sm font-extrabold">The Spice Garden</h4>
        </div>
        <div className="mt-3 flex gap-1.5 overflow-hidden">
          {['Popular', 'Rice', 'Drinks'].map((tab, i) => (
            <span key={tab} className={`rounded-full border px-2 py-1 text-[9px] font-bold whitespace-nowrap ${i === 0 ? (dark ? 'bg-emerald-500 text-black border-emerald-500' : 'bg-orange-500 text-white border-orange-500') : (dark ? 'bg-black border-emerald-900/70 text-emerald-100/65' : 'bg-white border-orange-100 text-gray-700')}`}>
              {tab}
            </span>
          ))}
        </div>
        <div className="mt-3 space-y-2">
          {HERO_MENU_ITEMS.map((item) => (
            <div key={item.title} className={`grid grid-cols-[44px_1fr_auto] items-center gap-2 rounded-lg p-2 shadow-sm ${dark ? 'bg-black border border-emerald-900/60' : 'bg-white'}`}>
              <span className={`h-11 rounded-lg ${dark ? 'bg-gradient-to-br from-emerald-700 via-lime-300 to-orange-300' : 'bg-gradient-to-br from-orange-200 via-emerald-100 to-amber-200'}`} />
              <span>
                <strong className="block text-[10px]">{item.title}</strong>
                <small className={`block text-[8px] leading-snug ${dark ? 'text-emerald-100/45' : 'text-gray-400'}`}>{item.desc}</small>
                <b className="text-[9px]">{item.price}</b>
              </span>
              <span className={`grid h-5 w-5 place-items-center rounded-full text-xs font-bold ${dark ? 'bg-emerald-500 text-black' : 'bg-orange-500 text-white'}`}>+</span>
            </div>
          ))}
        </div>
        <div className={`mt-3 rounded-lg py-2 text-center text-[10px] font-extrabold text-white ${dark ? 'bg-emerald-600' : 'bg-orange-600'}`}>Place order</div>
      </div>
    </div>
  );
}

function FloatingTicket({ dark }: { dark: boolean }) {
  return (
    <div className={`landing-float-reverse absolute -right-2 bottom-8 z-20 hidden w-56 rotate-[4deg] border p-4 shadow-xl backdrop-blur md:block ${dark ? 'bg-zinc-950/92 border-emerald-800/70 shadow-emerald-500/10' : 'bg-white/95 border-white shadow-gray-900/10'}`}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h4 className="text-sm font-extrabold">Order #1048</h4>
          <small className={dark ? 'text-emerald-100/50' : 'text-gray-400'}>Table 08 · 7:42 PM</small>
        </div>
        <span className={`rounded-full px-2 py-1 text-[10px] font-extrabold ${dark ? 'bg-orange-500/15 text-orange-200' : 'bg-orange-50 text-orange-600'}`}>Cooking</span>
      </div>
      {['2 × Garlic naan', '1 × Butter chicken', '1 × Lime soda'].map((item) => (
        <div key={item} className={`flex justify-between border-t border-dashed py-2 text-xs font-semibold ${dark ? 'border-emerald-900/70' : 'border-gray-200'}`}>
          <span>{item}</span>
          <Check size={13} className={dark ? 'text-emerald-300' : 'text-emerald-600'} />
        </div>
      ))}
    </div>
  );
}

function GuestOrderingVisual({ dark }: { dark: boolean }) {
  return (
    <div className="landing-slide-in relative mx-auto h-full min-h-[620px] w-full max-w-xl">
      <div className={`absolute left-1/2 top-8 h-[500px] w-72 -translate-x-1/2 rounded-[2.2rem] border p-2 shadow-2xl sm:w-80 ${dark ? 'bg-zinc-950 border-emerald-800/70 shadow-emerald-500/10' : 'bg-gray-950 border-gray-800 shadow-gray-900/25'}`}>
        <div className={`h-full overflow-hidden rounded-[1.75rem] p-4 ${dark ? 'bg-emerald-950/45 text-white' : 'bg-orange-50 text-gray-950'}`}>
          <div className="mx-auto mb-4 h-5 w-20 rounded-b-2xl bg-gray-950" />
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-[11px] font-bold uppercase ${dark ? 'text-emerald-300' : 'text-orange-700'}`}>Table 12</p>
              <h3 className="text-lg font-extrabold">The Spice Garden</h3>
            </div>
            <QrCode size={28} className={dark ? 'text-emerald-300' : 'text-orange-700'} />
          </div>
          <div className={`mt-4 rounded-lg p-4 text-white ${dark ? 'bg-gradient-to-br from-emerald-700 to-emerald-950' : 'bg-gradient-to-br from-orange-700 to-orange-500'}`}>
            <p className="text-xs opacity-80">Today special</p>
            <h4 className="mt-1 text-xl font-extrabold">Sri Lankan rice bowl</h4>
            <p className="mt-1 text-xs opacity-80">Ready in 12 minutes</p>
          </div>
          <div className="mt-4 flex gap-2 overflow-hidden">
            {['Popular', 'Mains', 'Drinks'].map((tab, i) => (
              <span key={tab} className={`rounded-full border px-3 py-1.5 text-xs font-bold whitespace-nowrap ${i === 0 ? (dark ? 'bg-emerald-500 text-black border-emerald-500' : 'bg-orange-500 text-white border-orange-500') : (dark ? 'bg-black border-emerald-900/70 text-emerald-100/65' : 'bg-white border-orange-100 text-gray-700')}`}>
                {tab}
              </span>
            ))}
          </div>
          <div className="mt-4 space-y-3">
            {HERO_MENU_ITEMS.map((item) => (
              <div key={item.title} className={`grid grid-cols-[56px_1fr_auto] items-center gap-3 rounded-lg p-3 shadow-sm ${dark ? 'bg-black border border-emerald-900/60' : 'bg-white'}`}>
                <span className={`h-14 rounded-lg ${dark ? 'bg-gradient-to-br from-emerald-700 via-lime-300 to-orange-300' : 'bg-gradient-to-br from-orange-200 via-emerald-100 to-amber-200'}`} />
                <span>
                  <strong className="block text-xs">{item.title}</strong>
                  <small className={`block text-[10px] leading-snug ${dark ? 'text-emerald-100/45' : 'text-gray-400'}`}>{item.desc}</small>
                  <b className="text-[11px]">{item.price}</b>
                </span>
                <span className={`grid h-7 w-7 place-items-center rounded-full text-sm font-bold ${dark ? 'bg-emerald-500 text-black' : 'bg-orange-500 text-white'}`}>+</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className={`landing-float-reverse absolute right-0 top-20 hidden w-48 rounded-lg border p-4 shadow-xl sm:block ${dark ? 'bg-zinc-950/92 border-emerald-800/70' : 'bg-white/95 border-white'}`}>
        <div className="flex items-center gap-3">
          <span className={`grid h-11 w-11 place-items-center rounded-lg ${dark ? 'bg-emerald-500/15 text-emerald-300' : 'bg-emerald-50 text-emerald-700'}`}>
            <QrCode size={22} />
          </span>
          <div>
            <p className="text-sm font-extrabold">Scan to order</p>
            <p className={`text-xs ${dark ? 'text-emerald-100/50' : 'text-gray-400'}`}>No app required</p>
          </div>
        </div>
      </div>

      <div className={`landing-float absolute bottom-16 left-0 hidden w-56 -rotate-3 rounded-lg border p-4 shadow-xl md:block ${dark ? 'bg-zinc-950/92 border-emerald-800/70' : 'bg-white/95 border-white'}`}>
        <p className={`text-xs font-bold uppercase ${dark ? 'text-emerald-300' : 'text-orange-600'}`}>Cart ready</p>
        <div className="mt-2 flex items-center justify-between">
          <strong className="text-sm">3 items</strong>
          <strong className={dark ? 'text-emerald-300' : 'text-emerald-700'}>LKR 3,250</strong>
        </div>
        <div className={`mt-3 rounded-lg py-2 text-center text-xs font-extrabold text-white ${dark ? 'bg-emerald-600' : 'bg-orange-600'}`}>Send to kitchen</div>
      </div>
    </div>
  );
}

function InsightVisual({ dark }: { dark: boolean }) {
  return (
    <div className="landing-slide-in relative mx-auto h-full min-h-[620px] w-full max-w-2xl">
      <div className={`landing-float-slow relative overflow-hidden border p-4 shadow-2xl ${dark ? 'bg-zinc-950/90 border-emerald-800/70 shadow-emerald-500/10' : 'bg-white/95 border-white shadow-gray-900/10'}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className={`text-xs font-bold uppercase ${dark ? 'text-emerald-300' : 'text-orange-600'}`}>Manager live view</p>
            <h3 className="text-xl font-extrabold">Floor and sales pulse</h3>
          </div>
          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ${dark ? 'bg-emerald-500/15 text-emerald-300' : 'bg-emerald-50 text-emerald-700'}`}>
            <span className={`h-2 w-2 rounded-full ${dark ? 'bg-emerald-300' : 'bg-emerald-600'}`} /> Live
          </span>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_0.85fr]">
          <div className={`rounded-lg border p-4 ${dark ? 'bg-black border-emerald-900/70' : 'bg-gray-50 border-gray-100'}`}>
            <div className="mb-4 flex items-center justify-between">
              <strong className="text-sm">Main dining area</strong>
              <span className={`text-xs font-semibold ${dark ? 'text-emerald-100/50' : 'text-gray-400'}`}>8 tables</span>
            </div>
            <div className="grid grid-cols-4 gap-2.5">
              {FLOOR_TABLES.map((table) => (
                <div key={table.n} className={`rounded-lg border p-3 text-center ${dark ? 'bg-zinc-950 border-emerald-900/60' : 'bg-white border-gray-100'}`}>
                  <span className={`mx-auto mb-1.5 block h-2.5 w-2.5 rounded-full ${dark ? statusDotDark[table.status] : statusDot[table.status]}`} />
                  <p className="text-xs font-extrabold">T{table.n}</p>
                  <p className={`mt-1 text-[9px] ${dark ? 'text-emerald-100/45' : 'text-gray-400'}`}>{table.status === 'preparing' ? table.note : statusLabel[table.status]}</p>
                </div>
              ))}
            </div>
          </div>

          <div className={`rounded-lg border p-4 ${dark ? 'bg-black border-emerald-900/70' : 'bg-gray-50 border-gray-100'}`}>
            <div className="grid grid-cols-2 gap-3">
              {ANALYTICS_STATS.slice(0, 2).map((stat) => (
                <div key={stat.label} className={`rounded-lg border p-3 ${dark ? 'bg-zinc-950 border-emerald-900/60' : 'bg-white border-gray-100'}`}>
                  <p className={`text-[10px] ${dark ? 'text-emerald-100/45' : 'text-gray-400'}`}>{stat.label}</p>
                  <strong className="mt-1 block text-base">{stat.value}</strong>
                </div>
              ))}
            </div>
            <div className="landing-bars mt-5 flex h-44 items-end gap-2">
              {[42, 58, 51, 76, 68, 92, 82, 96].map((height, i) => (
                <span
                  key={height + i}
                  className={`flex-1 rounded-t ${dark ? 'bg-gradient-to-t from-emerald-800 to-emerald-300' : 'bg-gradient-to-t from-orange-700 to-orange-300'}`}
                  style={{ height: `${height}%`, animationDelay: `${i * 80}ms` }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className={`landing-float absolute -bottom-2 right-6 hidden w-56 rotate-3 rounded-lg border p-4 shadow-xl md:block ${dark ? 'bg-zinc-950/92 border-emerald-800/70' : 'bg-white/95 border-white'}`}>
        <p className={`text-xs font-bold uppercase ${dark ? 'text-emerald-300' : 'text-orange-600'}`}>Payment ready</p>
        <div className="mt-2 flex items-center justify-between">
          <span className="text-sm font-bold">Table 05</span>
          <span className={dark ? 'text-emerald-300' : 'text-emerald-700'}>LKR 8,450</span>
        </div>
        <p className={`mt-1 text-xs ${dark ? 'text-emerald-100/50' : 'text-gray-400'}`}>Bill sent on WhatsApp</p>
      </div>
    </div>
  );
}

function HeroSlideVisual({ dark, visual }: { dark: boolean; visual: typeof HERO_SLIDES[number]['visual'] }) {
  if (visual === 'guest') return <GuestOrderingVisual dark={dark} />;
  if (visual === 'insight') return <InsightVisual dark={dark} />;
  return (
    <div className="landing-slide-in relative h-full min-h-[620px]">
      <HeroDashboard dark={dark} />
      <HeroPhone dark={dark} />
      <FloatingTicket dark={dark} />
    </div>
  );
}

export function LandingPage() {
  const [demoOpen, setDemoOpen] = useState(false);
  const [activeHeroSlide, setActiveHeroSlide] = useState(0);
  const [heroPaused, setHeroPaused] = useState(false);
  const [theme, setTheme] = useState<LandingTheme>(() =>
    (localStorage.getItem('orderlive_landing_theme') as LandingTheme | null) ?? 'light'
  );
  const dark = theme === 'dark';
  const heroSlide = HERO_SLIDES[activeHeroSlide];

  useEffect(() => {
    localStorage.setItem('orderlive_landing_theme', theme);
  }, [theme]);

  useEffect(() => {
    if (heroPaused) return;
    const id = window.setInterval(() => {
      setActiveHeroSlide((current) => (current + 1) % HERO_SLIDES.length);
    }, 5500);
    return () => window.clearInterval(id);
  }, [heroPaused]);

  useEffect(() => {
    const sections = Array.from(document.querySelectorAll<HTMLElement>('.landing-scroll-reveal'));
    if (!sections.length) return;

    if (!('IntersectionObserver' in window)) {
      sections.forEach((section) => section.classList.add('is-visible'));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        });
      },
      { rootMargin: '0px 0px -12% 0px', threshold: 0.14 }
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

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
    <div className={`min-h-screen overflow-x-hidden transition-colors ${dark ? 'bg-black text-white' : 'bg-white text-gray-900'}`}>
      <MarketingNav variant={dark ? 'dark' : 'light'} themeSwitcher={switcher} sectionLinks={NAV_LINKS} />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className={`pointer-events-none absolute inset-0 ${dark ? 'bg-[radial-gradient(circle_at_8%_16%,rgba(16,185,129,0.16),transparent_30%),radial-gradient(circle_at_88%_20%,rgba(132,204,22,0.11),transparent_28%)]' : 'bg-[radial-gradient(circle_at_8%_16%,rgba(42,115,68,0.12),transparent_30%),radial-gradient(circle_at_88%_20%,rgba(16,185,129,0.12),transparent_28%)]'}`} />

        <div
          className="relative max-w-6xl mx-auto px-5 pt-16 pb-12 sm:pt-24 sm:pb-16 grid h-[1220px] sm:h-[1260px] lg:h-[1034px] lg:grid-cols-[0.9fr_1.1fr] gap-12 items-center"
          onMouseEnter={() => setHeroPaused(true)}
          onMouseLeave={() => setHeroPaused(false)}
        >
          <div className="flex min-h-[540px] flex-col justify-center text-center lg:min-h-[640px] lg:text-left">
            <SectionBadge dark={dark}>{heroSlide.eyebrow}</SectionBadge>
            <h1 key={heroSlide.titleAccent} className="landing-slide-copy mt-5 min-h-[9.5rem] text-4xl sm:min-h-[10.5rem] sm:text-5xl lg:min-h-[13.75rem] lg:text-7xl font-extrabold tracking-tight leading-[0.98]">
              {heroSlide.titleStart}
              <span className={dark ? 'text-emerald-400' : 'text-orange-500'}>{heroSlide.titleAccent}</span>
              {heroSlide.titleEnd}
            </h1>
            <p key={heroSlide.copy} className={`landing-slide-copy mt-5 min-h-[7rem] text-lg max-w-xl mx-auto lg:min-h-[5.5rem] lg:mx-0 ${dark ? 'text-emerald-50/68' : 'text-gray-500'}`}>
              {heroSlide.copy}
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

            <div className="mt-7 grid min-h-[270px] gap-3 sm:min-h-[180px] sm:grid-cols-3 lg:min-h-[170px]">
              {heroSlide.details.map(({ Icon, label, text }) => (
                <div key={label} className={`landing-slide-copy rounded-lg border p-4 text-left ${dark ? 'bg-black/45 border-emerald-900/70' : 'bg-white/80 border-gray-100 shadow-sm'}`}>
                  <div className={`mb-3 grid h-9 w-9 place-items-center rounded-lg ${dark ? 'bg-emerald-500/14 text-emerald-300' : 'bg-orange-100 text-orange-600'}`}>
                    <Icon size={18} />
                  </div>
                  <h3 className="text-sm font-extrabold">{label}</h3>
                  <p className={`mt-1 text-xs leading-relaxed ${dark ? 'text-emerald-100/55' : 'text-gray-500'}`}>{text}</p>
                </div>
              ))}
            </div>

            <div className="mt-7 flex min-h-[10px] items-center justify-center gap-2 lg:justify-start" aria-label="Hero slides">
              {HERO_SLIDES.map((slide, index) => {
                const active = activeHeroSlide === index;
                return (
                  <button
                    key={slide.eyebrow}
                    type="button"
                    onClick={() => setActiveHeroSlide(index)}
                    className={`h-2.5 rounded-full transition-all ${active ? 'w-9' : 'w-2.5'} ${active ? (dark ? 'bg-emerald-400' : 'bg-orange-500') : (dark ? 'bg-emerald-900' : 'bg-gray-300')}`}
                    aria-label={`Show ${slide.eyebrow}`}
                    aria-current={active ? 'true' : undefined}
                  />
                );
              })}
            </div>
          </div>

          <div key={heroSlide.visual} className="relative h-[620px] min-h-[620px] overflow-visible">
            <HeroSlideVisual dark={dark} visual={heroSlide.visual} />
          </div>
        </div>
      </section>

      {/* Everything your restaurant needs — strip */}
      <section className={`landing-scroll-reveal border-y ${dark ? 'border-emerald-900/70' : 'border-gray-100'}`}>
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
      <section className={`landing-scroll-reveal ${dark ? 'bg-emerald-950/20' : 'bg-gray-50/60'}`}>
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
      <section id="features" className="landing-scroll-reveal max-w-6xl mx-auto px-5 py-16 sm:py-24 scroll-mt-16">
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
              className={`group landing-reveal rounded-lg border p-6 hover:shadow-xl hover:-translate-y-1 transition-all ${dark ? 'bg-zinc-950 border-emerald-900/70 hover:shadow-emerald-500/10' : 'bg-white border-gray-100'}`}
            >
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform ${dark ? 'bg-emerald-500/14 text-emerald-300' : 'bg-orange-100 text-orange-600'}`}>
                <Icon size={22} />
              </div>
              <h3 className="font-bold text-lg">{title}</h3>
              <p className={`text-sm mt-1.5 leading-relaxed ${dark ? 'text-emerald-100/58' : 'text-gray-500'}`}>{blurb}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Product screenshots */}
      <section className={`landing-scroll-reveal scroll-mt-16 ${dark ? 'bg-emerald-950/20' : 'bg-gray-50/70'}`}>
        <div className="max-w-6xl mx-auto px-5 py-16 sm:py-24">
          <div className="grid gap-10 lg:grid-cols-[1.08fr_0.92fr] lg:items-center">
            <div className={`relative overflow-hidden rounded-lg border p-4 shadow-2xl ${dark ? 'bg-zinc-950 border-emerald-900/70 shadow-emerald-500/10' : 'bg-white border-gray-100 shadow-gray-900/10'}`}>
              <div className={`mb-4 flex items-center justify-between rounded-lg px-4 py-3 ${dark ? 'bg-black border border-emerald-900/70' : 'bg-gray-50 border border-gray-100'}`}>
                <div>
                  <p className={`text-xs font-bold uppercase ${dark ? 'text-emerald-300' : 'text-orange-600'}`}>Screenshot preview</p>
                  <h3 className="text-lg font-extrabold">Order Live command centre</h3>
                </div>
                <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ${dark ? 'bg-emerald-500/15 text-emerald-300' : 'bg-emerald-50 text-emerald-700'}`}>
                  <Sparkles size={14} /> Live
                </span>
              </div>
              <HeroDashboard dark={dark} />
            </div>

            <div>
              <SectionBadge dark={dark}>Screens your team will actually use</SectionBadge>
              <h2 className="mt-5 text-3xl sm:text-4xl font-extrabold tracking-tight">A landing page that shows the product, not just the promise.</h2>
              <p className={`mt-4 ${dark ? 'text-emerald-100/62' : 'text-gray-500'}`}>
                The reference layout worked because it made Order Live feel tangible. This section keeps that same rhythm with clear screenshots for the daily restaurant workflow.
              </p>
              <div className="mt-7 space-y-3">
                {PRODUCT_SCREENS.map(({ Icon, title, body }) => (
                  <div key={title} className={`landing-reveal flex gap-4 rounded-lg border p-4 ${dark ? 'bg-black border-emerald-900/70' : 'bg-white border-gray-100'}`}>
                    <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-lg ${dark ? 'bg-emerald-500/14 text-emerald-300' : 'bg-orange-100 text-orange-600'}`}>
                      <Icon size={20} />
                    </div>
                    <div>
                      <h3 className="font-bold">{title}</h3>
                      <p className={`mt-1 text-sm leading-relaxed ${dark ? 'text-emerald-100/58' : 'text-gray-500'}`}>{body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Live table status */}
      <section id="table-status" className={`landing-scroll-reveal scroll-mt-16 ${dark ? 'bg-gradient-to-b from-emerald-950/35 to-black' : 'bg-gradient-to-b from-orange-50/60 to-white'}`}>
        <div className="max-w-6xl mx-auto px-5 py-16 sm:py-24 grid lg:grid-cols-2 gap-12 items-center">
          <div className="min-w-0 text-center lg:text-left">
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
      <section id="how-it-works" className="landing-scroll-reveal max-w-6xl mx-auto px-5 py-16 sm:py-24 scroll-mt-16">
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
      <section id="order-types" className={`landing-scroll-reveal scroll-mt-16 ${dark ? 'bg-emerald-950/20' : 'bg-gray-50/60'}`}>
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

          <div className={`min-w-0 rounded-[2rem] border p-6 shadow-xl ${dark ? 'bg-zinc-950 border-emerald-900/70' : 'bg-white border-gray-100'}`}>
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
      <section id="analytics" className="landing-scroll-reveal max-w-6xl mx-auto px-5 py-16 sm:py-24 scroll-mt-16">
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
      <section className="landing-scroll-reveal max-w-6xl mx-auto px-5 py-16 sm:py-24">
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
      <section className="landing-scroll-reveal max-w-6xl mx-auto px-5 pb-20">
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
