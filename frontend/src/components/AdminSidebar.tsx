import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, ShoppingCart, UtensilsCrossed, BarChart2,
  Users, Settings, ChefHat, MonitorPlay,
  Receipt, QrCode, CreditCard, ImagePlus,
  Warehouse, Menu, X, MapPin, Star, MessageSquarePlus,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import type { RestaurantFeatures } from '../context/AuthContext';
import type { PermissionKey } from '../lib/permissions';
import { useSubscriptionConfig } from '../context/SubscriptionConfigContext';
import { useTheme } from '../context/ThemeContext';
import { useNavMode } from '../context/NavModeContext';
import { orderService } from '../services/orderService';
import { stockService } from '../services/stockService';

interface NavItem {
  type: 'item';
  label: string;
  icon: React.ElementType;
  to: string;
  exact?: boolean;
  badge?: boolean;
  matchPrefix?: string;
  featureKey?: keyof RestaurantFeatures;
  perm?: PermissionKey;
  adminOnly?: boolean;
}

const NAV: NavItem[] = [
  { type: 'item', label: 'Dashboard',    icon: LayoutDashboard, to: '/admin',              exact: true },
  { type: 'item', label: 'Orders',       icon: ShoppingCart,    to: '/admin/orders',        badge: true, perm: 'orders' },
  { type: 'item', label: 'Menu',         icon: UtensilsCrossed, to: '/admin/menu',          perm: 'menu' },
  { type: 'item', label: 'Locations & QR', icon: QrCode,        to: '/admin/locations',     perm: 'locations' },
  { type: 'item', label: 'Floor',        icon: MapPin,          to: '/admin/floor',         perm: 'locations' },
  { type: 'item', label: 'Kitchen',      icon: ChefHat,         to: '/kitchen',             featureKey: 'kitchenDisplay', perm: 'kitchenDisplay' },
  { type: 'item', label: 'Ready Display',icon: MonitorPlay,     to: '/admin/ready-display', featureKey: 'readyDisplay', perm: 'readyDisplay' },
  { type: 'item', label: 'Promo Screens',icon: ImagePlus,       to: '/admin/promo-screens', featureKey: 'promoScreens', perm: 'promoScreens' },
  { type: 'item', label: 'Bills & Payments', icon: Receipt,     to: '/admin/finance',       featureKey: 'bills', perm: 'bills' },
  { type: 'item', label: 'Staff',        icon: Users,           to: '/admin/users',         adminOnly: true },
  { type: 'item', label: 'Stock',        icon: Warehouse,       to: '/admin/stock',         perm: 'stock' },
  { type: 'item', label: 'Loyalty',      icon: Star,            to: '/admin/loyalty',       adminOnly: true },
  { type: 'item', label: 'Reports',      icon: BarChart2,       to: '/admin/reports',       featureKey: 'reports', perm: 'reports' },
  { type: 'item', label: 'Subscription', icon: CreditCard,      to: '/admin/billing',       adminOnly: true },
  { type: 'item', label: 'Feedback',     icon: MessageSquarePlus, to: '/admin/feedback',    adminOnly: true },
  { type: 'item', label: 'Settings',     icon: Settings,        to: '/admin/settings',      adminOnly: true },
];

function isItemActive(item: NavItem, pathname: string) {
  return item.exact
    ? pathname === item.to
    : pathname.startsWith(item.matchPrefix ?? item.to);
}

export function AdminSidebar() {
  const { navMode } = useNavMode();
  const { user, features, hasPermission } = useAuth();
  const location = useLocation();
  const { enabled: subsEnabled } = useSubscriptionConfig();
  useTheme();
  const [activeCount,   setActiveCount]   = useState(0);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem('qra-sidebar-collapsed') === '1'
  );

  const isStaff = !!user && user.role !== 'admin' && user.role !== 'super_admin';
  const canViewOrders = !isStaff || hasPermission('orders');

  function isDisabled(item: NavItem): boolean {
    if (item.featureKey && features[item.featureKey] === false) return true;
    if (item.to === '/admin/billing' && !subsEnabled) return true;
    if (item.adminOnly && isStaff) return true;
    return !!(isStaff && item.perm && !hasPermission(item.perm));
  }

  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  useEffect(() => {
    if (!canViewOrders) {
      setActiveCount(0);
      return;
    }
    const fetch = () =>
      orderService.getOrders()
        .then((orders) => setActiveCount(orders.filter((o) => o.status !== 'cancelled').length))
        .catch(() => {});
    fetch();
    const id = setInterval(fetch, 10_000);
    return () => clearInterval(id);
  }, [canViewOrders]);

  useEffect(() => {
    if (isStaff) return;
    const fetchLow = () =>
      stockService.getLow()
        .then((items) => setLowStockCount(items.length))
        .catch(() => {});
    fetchLow();
    const id = setInterval(fetchLow, 60_000);
    return () => clearInterval(id);
  }, [isStaff]);

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('qra-sidebar-collapsed', next ? '1' : '0');
      return next;
    });
  }

  function NavLinks({ iconSize = 16 }: { iconSize?: number }) {
    return (
      <>
        {NAV.map((item) => {
          const disabled = isDisabled(item);
          const active = isItemActive(item, location.pathname);
          const content = (
            <>
              <item.icon size={iconSize} className={disabled ? 'text-gray-300' : active ? 'text-orange-600' : 'text-gray-400'} />
              {!collapsed && <span className="flex-1">{item.label}</span>}
              {!disabled && item.badge && activeCount > 0 && (
                <span className={`font-bold bg-orange-500 text-white rounded-full text-center leading-none ${
                  collapsed
                    ? 'absolute -top-0.5 -right-0.5 text-[9px] min-w-[16px] px-1 py-0 leading-4'
                    : 'text-xs min-w-[20px] px-1.5 py-0.5'
                }`}>
                  {activeCount}
                </span>
              )}
              {!disabled && item.to === '/admin/stock' && lowStockCount > 0 && (
                <span className={`font-bold bg-amber-400 text-white rounded-full text-center leading-none ${
                  collapsed
                    ? 'absolute -top-0.5 -right-0.5 text-[9px] min-w-[16px] px-1 py-0 leading-4'
                    : 'text-xs min-w-[20px] px-1.5 py-0.5'
                }`}>
                  {lowStockCount}
                </span>
              )}
            </>
          );
          const className = `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors relative ${
            disabled
              ? 'text-gray-300 opacity-60 cursor-not-allowed select-none'
              : active
                ? 'bg-orange-50 text-orange-600'
                : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
          }`;

          if (disabled) {
            return (
              <div
                key={item.label}
                title={`${item.label} — no permission`}
                aria-label={`${item.label} — no permission`}
                aria-disabled="true"
                className={className}
              >
                {content}
              </div>
            );
          }
          return (
            <Link
              key={item.label}
              to={item.to}
              title={item.label}
              aria-label={item.label}
              className={className}
            >
              {content}
            </Link>
          );
        })}
      </>
    );
  }

  if (navMode === 'launcher') return null;

  return (
    <>
      {/* ── Mobile top bar ───────────────────────────────────────────────────── */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-white border-b border-gray-100 z-40 flex items-center px-4 gap-3">
        <button
          onClick={() => setMobileOpen(true)}
          className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>
        <div className="flex-1">
          <p className="text-sm font-bold text-gray-900 leading-tight">Order Live</p>
          <p className="text-[10px] text-gray-400">orderlive.online</p>
        </div>
        {canViewOrders && activeCount > 0 && (
          <Link to="/admin/orders">
            <span className="text-xs font-bold bg-orange-500 text-white rounded-full min-w-[22px] px-1.5 py-0.5 text-center leading-none block">
              {activeCount}
            </span>
          </Link>
        )}
      </div>

      {/* ── Mobile drawer backdrop ───────────────────────────────────────────── */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 bg-black/40 z-40" onClick={() => setMobileOpen(false)} />
      )}

      {/* ── Mobile drawer ────────────────────────────────────────────────────── */}
      <div className={`md:hidden fixed top-0 left-0 h-full w-64 bg-white z-50 flex flex-col shadow-xl
        transform transition-transform duration-300 ease-in-out
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="px-5 py-5 border-b border-gray-100 flex items-center justify-between flex-none">
          <div>
            <p className="text-base font-bold text-gray-900 leading-tight">Order Live</p>
            <p className="text-xs text-gray-400 mt-0.5">orderlive.online</p>
          </div>
          <button onClick={() => setMobileOpen(false)} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors" aria-label="Close menu">
            <X size={18} />
          </button>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          <NavLinks />
        </nav>
      </div>

      {/* ── Desktop sidebar ──────────────────────────────────────────────────── */}
      <aside className={`hidden md:flex flex-none bg-white border-r border-gray-100 flex-col h-full transition-all duration-300 ease-in-out ${
        collapsed ? 'w-16' : 'w-56'
      }`}>
        <div className={`border-b border-gray-100 flex-none flex items-center ${collapsed ? 'justify-center px-2 py-5' : 'px-4 py-5 justify-between'}`}>
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-base font-bold text-gray-900 leading-tight truncate">Order Live</p>
              <p className="text-xs text-gray-400 mt-0.5">orderlive.online</p>
            </div>
          )}
          <button
            onClick={toggleCollapsed}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors flex-none"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <Menu size={18} />
          </button>
        </div>

        <nav className={`flex-1 py-4 space-y-0.5 overflow-y-auto ${collapsed ? 'px-2' : 'px-3'}`}>
          <NavLinks iconSize={collapsed ? 18 : 16} />
        </nav>
      </aside>
    </>
  );
}
