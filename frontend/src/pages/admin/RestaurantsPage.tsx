import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Pencil, Check, X, Store, LogOut, CheckCircle2, CircleSlash,
  ChevronDown, ChevronUp, LogIn, Users, SlidersHorizontal, Trash2, Search,
  MessageSquarePlus, ScrollText, CreditCard, Loader2, CalendarClock,
} from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import type { RestaurantFeatures } from '../../context/AuthContext';
import { subscriptionService, type PlanCode, type SubscriptionStatus } from '../../services/subscriptionService';

const PLAN_CODES: PlanCode[] = ['free', 'starter', 'pro'];
const STATUSES: SubscriptionStatus[] = ['trialing', 'active', 'past_due', 'canceled'];

const FEATURE_LABELS: { key: keyof RestaurantFeatures; label: string; description: string }[] = [
  { key: 'combos',          label: 'Combo Deals',       description: 'Bundle menu items into combo packages' },
  { key: 'menuSchedules',   label: 'Menu Schedules',    description: 'Time-based menus (breakfast, lunch, dinner)' },
  { key: 'bills',           label: 'Bills',             description: 'Bill management and payment processing' },
  { key: 'roomCharges',     label: 'Room Charges',      description: 'Charge orders to hotel room accounts' },
  { key: 'promoCodes',      label: 'Promo Codes',       description: 'Discount codes and promotional offers' },
  { key: 'reports',         label: 'Reports',           description: 'Sales analytics and revenue reports' },
  { key: 'shiftReport',     label: 'Shift Report',      description: 'End-of-shift summary and close reports' },
  { key: 'tableStatus',     label: 'Table Status',      description: 'Live table occupancy overview' },
  { key: 'kitchenDisplay',  label: 'Kitchen Display',   description: 'KDS screen for kitchen staff' },
  { key: 'readyDisplay',    label: 'Ready Display',     description: 'Order-ready notification screen' },
  { key: 'promoScreens',    label: 'Promo Screens',     description: 'Customer-facing promotional display screens' },
  { key: 'staffPerformance',label: 'Staff Performance', description: 'Staff productivity and tips tracking' },
  { key: 'roster',          label: 'Roster',            description: 'Staff shift scheduling' },
];
const ALL_FEATURES_ON: RestaurantFeatures = {
  combos: true, menuSchedules: true, roomCharges: true, promoCodes: true,
  reports: true, roster: true, shiftReport: true, staffPerformance: true,
  tableStatus: true, readyDisplay: true, kitchenDisplay: true, promoScreens: true, bills: true,
};

const PLAN_BADGE: Record<string, string> = {
  free:    'bg-gray-100 text-gray-600',
  starter: 'bg-blue-100 text-blue-700',
  pro:     'bg-emerald-100 text-emerald-700',
};
const ROLE_BADGE: Record<string, string> = {
  admin:   'bg-violet-100 text-violet-700',
  manager: 'bg-blue-100 text-blue-700',
  cashier: 'bg-amber-100 text-amber-700',
  waiter:  'bg-emerald-100 text-emerald-700',
  kitchen: 'bg-rose-100 text-rose-700',
};

interface Restaurant {
  id: string; name: string; slug: string; active: boolean; createdAt: string;
  city?: string | null; features?: RestaurantFeatures; plan?: PlanCode;
  subscriptionStatus?: SubscriptionStatus; trialEndsAt?: string | null; currentPeriodEnd?: string | null;
}
interface RestaurantUser { id: string; username: string; name: string; role: string; }
interface CreatePayload { name: string; adminUsername: string; adminPassword: string; adminName: string; city: string; }

type PlanFilter = 'all' | PlanCode;
type StatusFilter = 'all' | 'active' | 'inactive';

function Switch({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <button onClick={onChange}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${on ? 'bg-green-500' : 'bg-gray-300'}`}
      title={on ? 'Active — click to deactivate' : 'Inactive — click to activate'}>
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${on ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  );
}

export function RestaurantsPage() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState<PlanFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const [expandedId, setExpandedId] = useState<string | null>(null); // accounts panel
  const [manageId, setManageId] = useState<string | null>(null);     // settings panel
  const [usersMap, setUsersMap] = useState<Record<string, RestaurantUser[]>>({});
  const [usersLoading, setUsersLoading] = useState(false);
  const [impersonating, setImpersonating] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editCity, setEditCity] = useState('');
  const [togglingFeature, setTogglingFeature] = useState<string | null>(null);
  const [billingDraft, setBillingDraft] = useState<{ plan: PlanCode; status: SubscriptionStatus; trialDays: string }>({ plan: 'pro', status: 'active', trialDays: '14' });
  const [savingBilling, setSavingBilling] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Restaurant | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<CreatePayload>({ name: '', adminUsername: '', adminPassword: '', adminName: '', city: '' });

  const load = () =>
    axios.get<Restaurant[]>('/api/restaurants')
      .then((r) => setRestaurants(r.data))
      .catch(() => toast.error('Failed to load restaurants'))
      .finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  async function toggleExpand(id: string) {
    setManageId(null);
    if (expandedId === id) { setExpandedId(null); return; }
    setExpandedId(id);
    if (usersMap[id]) return;
    setUsersLoading(true);
    try {
      const res = await axios.get<RestaurantUser[]>(`/api/restaurants/${id}/users`);
      setUsersMap((p) => ({ ...p, [id]: res.data }));
    } catch { toast.error('Failed to load users'); }
    finally { setUsersLoading(false); }
  }

  function openManage(r: Restaurant) {
    setExpandedId(null);
    if (manageId === r.id) { setManageId(null); return; }
    setBillingDraft({ plan: r.plan ?? 'pro', status: r.subscriptionStatus ?? 'active', trialDays: '14' });
    setManageId(r.id);
  }

  async function toggleActive(r: Restaurant) {
    const next = !r.active;
    try {
      await axios.patch(`/api/restaurants/${r.id}/active`, { active: next });
      setRestaurants((p) => p.map((x) => x.id === r.id ? { ...x, active: next } : x));
      toast.success(`"${r.name}" ${next ? 'activated' : 'deactivated'}`);
    } catch { toast.error('Failed to update status'); }
  }

  async function toggleFeature(r: Restaurant, key: keyof RestaurantFeatures) {
    const current = r.features ?? ALL_FEATURES_ON;
    const next = !current[key];
    setTogglingFeature(`${r.id}:${key}`);
    try {
      const res = await axios.patch<{ features: RestaurantFeatures }>(`/api/restaurants/${r.id}/features`, { [key]: next });
      setRestaurants((p) => p.map((x) => x.id === r.id ? { ...x, features: res.data.features } : x));
    } catch { toast.error('Failed to update feature'); }
    finally { setTogglingFeature(null); }
  }

  async function saveBilling(r: Restaurant) {
    setSavingBilling(true);
    try {
      await subscriptionService.adminSet(r.id, billingDraft.plan, billingDraft.status, parseInt(billingDraft.trialDays, 10) || undefined);
      const active = billingDraft.status === 'trialing' || billingDraft.status === 'active';
      setRestaurants((p) => p.map((x) => x.id === r.id ? { ...x, plan: billingDraft.plan, subscriptionStatus: billingDraft.status, active } : x));
      toast.success('Subscription updated');
    } catch { toast.error('Failed to update subscription'); }
    finally { setSavingBilling(false); }
  }

  function startEdit(r: Restaurant) { setEditingId(r.id); setEditName(r.name); setEditCity(r.city ?? ''); }
  async function saveEdit(id: string) {
    if (!editName.trim()) return;
    const city = editCity.trim();
    try {
      await axios.put(`/api/restaurants/${id}`, { name: editName.trim(), city });
      setRestaurants((p) => p.map((r) => r.id === id ? { ...r, name: editName.trim(), city: city || null } : r));
      setEditingId(null);
      toast.success('Restaurant updated');
    } catch { toast.error('Failed to update'); }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await axios.delete(`/api/restaurants/${deleteTarget.id}`);
      setRestaurants((p) => p.filter((x) => x.id !== deleteTarget.id));
      toast.success(`"${deleteTarget.name}" deleted`);
      setDeleteTarget(null);
    } catch { toast.error('Failed to delete restaurant'); }
    finally { setDeleting(false); }
  }

  async function loginAs(userId: string, username: string) {
    setImpersonating(userId);
    try {
      const res = await axios.post<{ token: string; user: { role: string } }>(`/api/restaurants/impersonate/${userId}`);
      localStorage.setItem('qra_token', res.data.token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${res.data.token}`;
      toast.success(`Logged in as ${username}`);
      window.location.href = res.data.user.role === 'kitchen' ? '/kitchen' : '/admin';
    } catch { toast.error('Failed to impersonate user'); }
    finally { setImpersonating(null); }
  }

  async function handleCreate() {
    if (!form.name.trim() || !form.adminUsername.trim() || !form.adminPassword.trim()) {
      toast.error('Name, admin username and password are required'); return;
    }
    try {
      const res = await axios.post<Restaurant>('/api/restaurants', {
        name: form.name, adminUsername: form.adminUsername,
        adminPassword: form.adminPassword, adminName: form.adminName || undefined,
        city: form.city || undefined,
      });
      setRestaurants((p) => [...p, res.data]);
      setForm({ name: '', adminUsername: '', adminPassword: '', adminName: '', city: '' });
      setShowForm(false);
      toast.success(`"${res.data.name}" created`);
    } catch { toast.error('Failed to create restaurant'); }
  }

  const activeCount = restaurants.filter((r) => r.active).length;
  const s = search.trim().toLowerCase();
  const filtered = restaurants.filter((r) =>
    (planFilter === 'all' || (r.plan ?? 'pro') === planFilter) &&
    (statusFilter === 'all' || (statusFilter === 'active' ? r.active : !r.active)) &&
    (s === '' || r.name.toLowerCase().includes(s) || r.id.toLowerCase().includes(s) || (r.city ?? '').toLowerCase().includes(s)));

  const navLink = (label: string, Icon: React.ElementType, to: string) => (
    <button onClick={() => navigate(to)} className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors px-2 py-1">
      <Icon size={15} /> {label}
    </button>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top nav */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 lg:px-6 h-16 flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-orange-500 flex items-center justify-center">
              <Store size={18} className="text-white" />
            </div>
            <div className="leading-tight">
              <p className="font-bold text-gray-900">Restaurants</p>
              <p className="text-[11px] text-gray-400">Super Admin</p>
            </div>
          </div>
          <nav className="hidden md:flex items-center gap-1 ml-4">
            {navLink('Demo Requests', CalendarClock, '/admin/demo-requests')}
            {navLink('Requests', MessageSquarePlus, '/admin/requests')}
            {navLink('Logs', ScrollText, '/admin/logs')}
            {navLink('Plans & Pricing', CreditCard, '/admin/plans')}
          </nav>
          <div className="flex-1" />
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 bg-orange-500 text-white px-4 py-2 rounded-full text-sm font-semibold hover:bg-orange-600 transition-colors">
            <Plus size={15} /> New Restaurant
          </button>
          <button onClick={() => { logout(); navigate('/', { replace: true }); }}
            className="text-gray-400 hover:text-red-500 transition-colors p-1.5" title="Log out">
            <LogOut size={18} />
          </button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 lg:px-6 py-6">
        <h1 className="text-2xl font-extrabold text-gray-900">All Restaurants</h1>
        <p className="text-sm text-gray-400 mt-0.5">{restaurants.length} total · {activeCount} active</p>

        {/* Filters */}
        <div className="flex flex-col lg:flex-row lg:items-center gap-3 mt-5">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, UUID, or city…"
              className="w-full pl-9 pr-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-orange-300"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="flex gap-1 bg-white border border-gray-200 rounded-full p-1">
              {(['all', ...PLAN_CODES] as PlanFilter[]).map((p) => (
                <button key={p} onClick={() => setPlanFilter(p)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide transition-colors ${planFilter === p ? 'bg-orange-500 text-white' : 'text-gray-500 hover:text-gray-800'}`}>
                  {p === 'all' ? 'All plans' : p}
                </button>
              ))}
            </div>
            <div className="flex gap-1 bg-white border border-gray-200 rounded-full p-1">
              {(['all', 'active', 'inactive'] as StatusFilter[]).map((st) => (
                <button key={st} onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold capitalize transition-colors ${statusFilter === st ? 'bg-orange-500 text-white' : 'text-gray-500 hover:text-gray-800'}`}>
                  {st === 'all' ? 'All Status' : st}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* List */}
        <div className="mt-5 space-y-3">
          {loading ? (
            <div className="flex justify-center py-16"><Loader2 className="animate-spin text-orange-500" size={28} /></div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-gray-400 py-12">No restaurants match these filters.</p>
          ) : (
            filtered.map((r) => {
              const isExpanded = expandedId === r.id;
              const isManage = manageId === r.id;
              const users = usersMap[r.id] ?? [];
              const rFeatures = r.features ?? ALL_FEATURES_ON;
              return (
                <div key={r.id} className={`bg-white rounded-2xl border shadow-sm ${r.active ? 'border-gray-100' : 'border-gray-100'}`}>
                  {/* Row */}
                  <div className="flex items-center gap-3 p-4">
                    <div className="w-11 h-11 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                      <Store size={20} className="text-emerald-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      {editingId === r.id ? (
                        <div className="flex flex-col sm:flex-row gap-2 max-w-md">
                          <input autoFocus value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(r.id); if (e.key === 'Escape') setEditingId(null); }}
                            placeholder="Name"
                            className="flex-1 border border-orange-300 rounded-lg px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-orange-400" />
                          <input value={editCity}
                            onChange={(e) => setEditCity(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(r.id); if (e.key === 'Escape') setEditingId(null); }}
                            placeholder="City (e.g. New York, NY)"
                            className="flex-1 border border-gray-200 rounded-lg px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-orange-300" />
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-bold text-gray-900">{r.name}</p>
                          <span className={`text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded ${PLAN_BADGE[r.plan ?? 'pro'] ?? 'bg-gray-100 text-gray-600'}`}>{r.plan ?? 'pro'}</span>
                          <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-1.5 py-0.5 rounded-full ${r.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                            {r.active ? <CheckCircle2 size={11} /> : <CircleSlash size={11} />}{r.active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      )}
                      <p className="text-xs text-gray-400 mt-0.5 font-mono select-all truncate">
                        {r.id}{r.city ? <span className="font-sans"> · {r.city}</span> : null}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Switch on={r.active} onChange={() => toggleActive(r)} />
                      {editingId === r.id ? (
                        <>
                          <button onClick={() => saveEdit(r.id)} className="p-1.5 text-green-500 hover:text-green-600"><Check size={16} /></button>
                          <button onClick={() => setEditingId(null)} className="p-1.5 text-gray-400 hover:text-gray-600"><X size={16} /></button>
                        </>
                      ) : (
                        <button onClick={() => startEdit(r)} className="p-1.5 text-gray-400 hover:text-blue-500 transition-colors" title="Rename"><Pencil size={16} /></button>
                      )}
                      <button onClick={() => openManage(r)} className={`p-1.5 transition-colors ${isManage ? 'text-orange-500' : 'text-gray-400 hover:text-orange-500'}`} title="Manage plan & features"><SlidersHorizontal size={16} /></button>
                      <button onClick={() => setDeleteTarget(r)} className="p-1.5 text-gray-400 hover:text-red-500 transition-colors" title="Delete"><Trash2 size={16} /></button>
                      <button onClick={() => toggleExpand(r.id)} className="p-1.5 text-gray-400 hover:text-gray-700 transition-colors" title="View accounts">
                        {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </button>
                    </div>
                  </div>

                  {/* Accounts panel */}
                  {isExpanded && (
                    <div className="border-t border-gray-100 px-4 pb-4 pt-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Users size={13} className="text-gray-400" />
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex-1">Accounts</p>
                        {usersMap[r.id] && <span className="text-xs text-gray-400">{users.length} users</span>}
                      </div>
                      {usersLoading && !usersMap[r.id] ? (
                        <div className="flex justify-center py-4"><Loader2 className="animate-spin text-orange-400" size={18} /></div>
                      ) : users.length === 0 ? (
                        <p className="text-xs text-gray-400 text-center py-2">No users found</p>
                      ) : (
                        <div className="divide-y divide-gray-50">
                          {users.map((u) => (
                            <div key={u.id} className="flex items-center gap-3 py-2.5">
                              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full w-20 text-center shrink-0 ${ROLE_BADGE[u.role] ?? 'bg-gray-100 text-gray-600'}`}>{u.role}</span>
                              <span className="flex-1 text-sm text-gray-800 truncate">{u.name || u.username}</span>
                              <button onClick={() => loginAs(u.id, u.username)} disabled={impersonating === u.id}
                                className="inline-flex items-center gap-1.5 border border-gray-200 text-gray-600 px-2.5 py-1 rounded-lg text-xs font-medium hover:bg-gray-50 hover:text-orange-600 hover:border-orange-200 transition-colors disabled:opacity-50">
                                {impersonating === u.id ? <Loader2 size={12} className="animate-spin" /> : <LogIn size={12} />} Login As
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Manage panel: subscription + features */}
                  {isManage && (
                    <div className="border-t border-gray-100 px-4 pb-4 pt-3 space-y-4">
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Subscription</p>
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                          <select value={billingDraft.plan} onChange={(e) => setBillingDraft((d) => ({ ...d, plan: e.target.value as PlanCode }))}
                            className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-orange-300 bg-white capitalize">
                            {PLAN_CODES.map((c) => <option key={c} value={c}>{c}</option>)}
                          </select>
                          <select value={billingDraft.status} onChange={(e) => setBillingDraft((d) => ({ ...d, status: e.target.value as SubscriptionStatus }))}
                            className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-orange-300 bg-white capitalize">
                            {STATUSES.map((st) => <option key={st} value={st}>{st.replace('_', ' ')}</option>)}
                          </select>
                          <input type="number" min="0" value={billingDraft.trialDays} onChange={(e) => setBillingDraft((d) => ({ ...d, trialDays: e.target.value }))}
                            disabled={billingDraft.status !== 'trialing'} placeholder="Trial days"
                            className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-orange-300 disabled:bg-gray-50 disabled:text-gray-300" />
                          <button onClick={() => saveBilling(r)} disabled={savingBilling}
                            className="bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 disabled:opacity-60 flex items-center justify-center gap-1.5 px-3 py-1.5">
                            {savingBilling ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} Save
                          </button>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Features</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {FEATURE_LABELS.map(({ key, label, description }) => {
                            const enabled = rFeatures[key] !== false;
                            return (
                              <div key={key} className={`flex items-center gap-3 rounded-xl px-3 py-2 border ${enabled ? 'bg-orange-50/40 border-orange-100' : 'bg-gray-50 border-gray-100'}`}>
                                <div className="flex-1 min-w-0">
                                  <p className={`text-sm font-medium truncate ${enabled ? 'text-gray-900' : 'text-gray-400'}`}>{label}</p>
                                  <p className="text-xs text-gray-400 truncate">{description}</p>
                                </div>
                                <button onClick={() => toggleFeature(r, key)} disabled={togglingFeature === `${r.id}:${key}`}
                                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors shrink-0 disabled:opacity-50 ${enabled ? 'bg-orange-500' : 'bg-gray-300'}`}>
                                  <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${enabled ? 'translate-x-[18px]' : 'translate-x-[3px]'}`} />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Create modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">New Restaurant</h2>
              <button onClick={() => setShowForm(false)}><X size={20} className="text-gray-400" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-sm text-gray-600 mb-1 block">Restaurant Name *</label>
                <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. The Grand Bistro"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-orange-300" />
              </div>
              <div>
                <label className="text-sm text-gray-600 mb-1 block">City</label>
                <input value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} placeholder="e.g. New York, NY"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-orange-300" />
              </div>
              <div className="border-t border-gray-100 pt-3">
                <p className="text-xs text-gray-400 mb-2 uppercase tracking-wide font-medium">Initial Admin Account</p>
                <div className="space-y-2">
                  <input value={form.adminName} onChange={(e) => setForm((f) => ({ ...f, adminName: e.target.value }))} placeholder="Full name (optional)"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-orange-300" />
                  <input value={form.adminUsername} onChange={(e) => setForm((f) => ({ ...f, adminUsername: e.target.value }))} placeholder="Username *"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-orange-300" />
                  <input type="password" value={form.adminPassword} onChange={(e) => setForm((f) => ({ ...f, adminPassword: e.target.value }))} placeholder="Password *"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-orange-300" />
                </div>
              </div>
            </div>
            <button onClick={handleCreate} className="w-full bg-orange-500 text-white py-3 rounded-2xl font-semibold hover:bg-orange-600 transition-colors">Create Restaurant</button>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => !deleting && setDeleteTarget(null)}>
          <div className="bg-white rounded-3xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
            <div className="w-12 h-12 rounded-2xl bg-red-100 flex items-center justify-center mb-4"><Trash2 size={22} className="text-red-600" /></div>
            <h2 className="text-lg font-bold text-gray-900">Delete “{deleteTarget.name}”?</h2>
            <p className="text-sm text-gray-500 mt-1.5">
              This permanently removes the restaurant and <span className="font-semibold">all of its data</span> — menu, orders, accounts, bills and history. This cannot be undone.
            </p>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setDeleteTarget(null)} disabled={deleting}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-semibold hover:bg-gray-50 disabled:opacity-50">Cancel</button>
              <button onClick={confirmDelete} disabled={deleting}
                className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-60 flex items-center justify-center gap-2">
                {deleting ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />} Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
