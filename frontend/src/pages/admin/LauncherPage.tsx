import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AdminSidebar } from '../../components/AdminSidebar';
import { AdminHeader } from '../../components/AdminHeader';
import {
  LayoutDashboard, ShoppingCart, UtensilsCrossed,
  QrCode, MapPin, MonitorPlay, ChefHat, ImagePlus,
  Receipt, Users, Warehouse, BarChart2,
  Settings, Star, CreditCard, MessageSquarePlus,
  ClipboardList, BriefcaseBusiness, SlidersHorizontal,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import type { RestaurantFeatures } from '../../context/AuthContext';
import type { PermissionKey } from '../../lib/permissions';
import { useSubscriptionConfig } from '../../context/SubscriptionConfigContext';

type NavLeaf = {
  label: string;
  icon: React.ElementType;
  to: string;
  color: string;
  featureKey?: keyof RestaurantFeatures;
  perm?: PermissionKey;
  adminOnly?: boolean;
};
type NavGroup = { id: string; label: string; icon: React.ElementType; color: string; children: NavLeaf[] };
type NavEntry = ({ type: 'item' } & NavLeaf) | ({ type: 'group' } & NavGroup);

const TOP_NAV: NavEntry[] = [
  { type: 'item', label: 'Orders', icon: ShoppingCart, to: '/admin/orders', color: 'bg-orange-50 text-orange-600', perm: 'orders' },
  { type: 'item', label: 'Kitchen', icon: ChefHat, to: '/kitchen', color: 'bg-red-50 text-red-600', featureKey: 'kitchenDisplay', perm: 'kitchenDisplay' },
  { type: 'item', label: 'Ready Display', icon: MonitorPlay, to: '/admin/ready-display', color: 'bg-red-50 text-red-600', featureKey: 'readyDisplay', perm: 'readyDisplay' },
  {
    type: 'group',
    id: 'service',
    label: 'Service',
    icon: ClipboardList,
    color: 'bg-orange-50 text-orange-600',
    children: [
      { label: 'Dashboard', icon: LayoutDashboard, to: '/admin/dashboard', color: 'bg-blue-50 text-blue-600' },
      { label: 'Floor', icon: MapPin, to: '/admin/floor', color: 'bg-purple-50 text-purple-600', perm: 'locations' },
    ],
  },
  {
    type: 'group',
    id: 'menu-qr',
    label: 'Menu & QR',
    icon: QrCode,
    color: 'bg-green-50 text-green-600',
    children: [
      { label: 'Menu', icon: UtensilsCrossed, to: '/admin/menu', color: 'bg-green-50 text-green-600', perm: 'menu' },
      { label: 'Locations & QR', icon: QrCode, to: '/admin/locations', color: 'bg-purple-50 text-purple-600', perm: 'locations' },
      { label: 'Promo Screens', icon: ImagePlus, to: '/admin/promo-screens', color: 'bg-sky-50 text-sky-600', featureKey: 'promoScreens', perm: 'promoScreens' },
    ],
  },
  {
    type: 'group',
    id: 'operations',
    label: 'Operations',
    icon: Warehouse,
    color: 'bg-amber-50 text-amber-600',
    children: [
      { label: 'Stock', icon: Warehouse, to: '/admin/stock', color: 'bg-amber-50 text-amber-600', perm: 'stock' },
      { label: 'Staff', icon: Users, to: '/admin/users', color: 'bg-indigo-50 text-indigo-600', adminOnly: true },
    ],
  },
  {
    type: 'group',
    id: 'business',
    label: 'Business',
    icon: BriefcaseBusiness,
    color: 'bg-teal-50 text-teal-600',
    children: [
      { label: 'Bills & Payments', icon: Receipt, to: '/admin/finance', color: 'bg-teal-50 text-teal-600', featureKey: 'bills', perm: 'bills' },
      { label: 'Loyalty', icon: Star, to: '/admin/loyalty', color: 'bg-amber-50 text-amber-600', adminOnly: true },
      { label: 'Reports', icon: BarChart2, to: '/admin/reports', color: 'bg-gray-100 text-gray-600', featureKey: 'reports', perm: 'reports' },
      { label: 'Feedback', icon: MessageSquarePlus, to: '/admin/feedback', color: 'bg-sky-50 text-sky-600', adminOnly: true },
    ],
  },
  {
    type: 'group',
    id: 'setup',
    label: 'Setup',
    icon: SlidersHorizontal,
    color: 'bg-gray-100 text-gray-600',
    children: [
      { label: 'Subscription', icon: CreditCard, to: '/admin/billing', color: 'bg-pink-50 text-pink-600', adminOnly: true },
      { label: 'Settings', icon: Settings, to: '/admin/settings', color: 'bg-gray-100 text-gray-600', adminOnly: true },
    ],
  },
];

function findGroup(id: string | null): NavGroup | null {
  if (!id) return null;
  const entry = TOP_NAV.find((e) => e.type === 'group' && e.id === id);
  return entry && entry.type === 'group' ? entry : null;
}

function Tile({ label, icon: Icon, color, onClick, to, disabled }: {
  label: string; icon: React.ElementType; color: string;
  onClick?: () => void; to?: string; disabled?: boolean;
}) {
  const inner = (
    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-2 ${color}`}>
      <Icon size={26} />
    </div>
  );
  const enabledCls = 'hover:shadow-md hover:-translate-y-0.5 group cursor-pointer';
  const disabledCls = 'opacity-40 grayscale cursor-not-allowed select-none';
  const cls = `flex flex-col items-center p-4 bg-white rounded-2xl shadow-sm transition-all ${disabled ? disabledCls : enabledCls}`;

  if (disabled) {
    return (
      <div className={cls} aria-disabled="true" title={`${label} — no permission`}>
        {inner}
        <span className="text-xs font-medium text-gray-400 text-center leading-tight">{label}</span>
      </div>
    );
  }

  if (to) {
    return (
      <Link to={to} className={cls}>
        {inner}
        <span className="text-xs font-medium text-gray-600 text-center leading-tight group-hover:text-gray-900">{label}</span>
      </Link>
    );
  }
  return (
    <div onClick={onClick} className={cls}>
      {inner}
      <span className="text-xs font-medium text-gray-600 text-center leading-tight group-hover:text-gray-900">{label}</span>
    </div>
  );
}

export function LauncherPage() {
  const { user, features, hasPermission } = useAuth();
  const { enabled: subsEnabled } = useSubscriptionConfig();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeGroup, setActiveGroup] = useState<NavGroup | null>(() => findGroup(searchParams.get('group')));
  const isStaff = !!user && user.role !== 'admin' && user.role !== 'super_admin';

  function isDisabled(item: NavLeaf): boolean {
    if (item.featureKey && features[item.featureKey] === false) return true;
    if (item.to === '/admin/billing' && !subsEnabled) return true;
    if (item.adminOnly && isStaff) return true;
    return !!(isStaff && item.perm && !hasPermission(item.perm));
  }

  useEffect(() => {
    setActiveGroup(findGroup(searchParams.get('group')));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.get('group')]);

  function closeGroup() {
    setActiveGroup(null);
    setSearchParams((prev) => {
      prev.delete('group');
      return prev;
    }, { replace: true });
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <AdminSidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <AdminHeader title={activeGroup ? activeGroup.label : 'Launcher'} onBack={activeGroup ? closeGroup : undefined} />
        <main className="flex-1 overflow-y-auto p-6 flex flex-col">

          {activeGroup ? (
            <>
              {/* Sub-group view */}
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
                {activeGroup.children.map((child) => (
                  <Tile key={child.to} {...child} disabled={isDisabled(child)} />
                ))}
              </div>
            </>
          ) : (
            /* Top-level grid */
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
              {TOP_NAV.map((entry) =>
                entry.type === 'item' ? (
                  <Tile key={entry.to} label={entry.label} icon={entry.icon} color={entry.color} to={entry.to} disabled={isDisabled(entry)} />
                ) : (
                  <Tile
                    key={entry.label}
                    label={entry.label}
                    icon={entry.icon}
                    color={entry.color}
                    onClick={() => setActiveGroup(entry)}
                    disabled={entry.children.every(isDisabled)}
                  />
                )
              )}
            </div>
          )}

        </main>
      </div>
    </div>
  );
}
