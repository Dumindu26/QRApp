import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { useConfirm } from '../../components/ConfirmModal';
import { useNavigate } from 'react-router-dom';
import { Plus, Minus, Trash2, ShoppingBag, UtensilsCrossed, Check, Loader2, BedDouble, Truck, Tag, X, LayoutGrid, List, Search, Heart } from 'lucide-react';
import type { Category, MenuItem } from '../../types';
import type { Table, Room } from '../../types';
import type { SelectedTopping } from '../../types/Order';
import type { CartItem } from '../../types/Order';
import { effectivePrice } from '../../types/MenuItem';
import { menuService } from '../../services/menuService';
import { orderService } from '../../services/orderService';
import { promoCodeService, type ValidateResult } from '../../services/promoCodeService';
import { tableService } from '../../services/tableService';
import { roomService } from '../../services/roomService';
import { sessionService } from '../../services/sessionService';
import { useAuth } from '../../context/AuthContext';
import { useCurrency } from '../../context/CurrencyContext';
import { ToppingSelectionModal } from '../../components/ToppingSelectionModal';
import toast from 'react-hot-toast';
import { AdminSidebar } from '../../components/AdminSidebar';
import { AdminHeader } from '../../components/AdminHeader';
import { useFavourites } from '../../hooks/useFavourites';

type OrderMode = 'takeaway' | 'dine-in' | 'room-service' | 'delivery';
type Size = 'regular' | 'large';

const MIN_ORDER_DETAILS_WIDTH = 280;
const MAX_ORDER_DETAILS_WIDTH = 520;
const DEFAULT_ORDER_DETAILS_WIDTH = 340;

const toppingKey = (toppings?: SelectedTopping[]) => (toppings ?? []).map((t) => t.id).sort().join(',');
const cartKey = (menuItemId: string, size?: Size, toppings?: SelectedTopping[]) =>
  `${menuItemId}|${size ?? 'regular'}|${toppingKey(toppings)}`;

type CartAction =
  | { type: 'ADD';       item: MenuItem; size?: Size; toppings?: SelectedTopping[]; notes?: string }
  | { type: 'INC';       key: string }
  | { type: 'DEC';       key: string }
  | { type: 'REMOVE';    key: string }
  | { type: 'SET_NOTES'; key: string; notes: string }
  | { type: 'CLEAR' };

function cartReducer(state: CartItem[], action: CartAction): CartItem[] {
  switch (action.type) {
    case 'ADD': {
      const key = cartKey(action.item.id, action.size, action.toppings);
      const price = effectivePrice(action.item, action.size);
      const exists = state.find((c) => cartKey(c.menuItemId, c.size, c.toppings) === key);
      if (exists) return state.map((c) => cartKey(c.menuItemId, c.size, c.toppings) === key ? { ...c, quantity: c.quantity + 1 } : c);
      return [...state, { menuItemId: action.item.id, name: action.item.name, price, quantity: 1, size: action.size, toppings: action.toppings, notes: action.notes }];
    }
    case 'INC':
      return state.map((c) => cartKey(c.menuItemId, c.size, c.toppings) === action.key ? { ...c, quantity: c.quantity + 1 } : c);
    case 'DEC':
      return state.map((c) => cartKey(c.menuItemId, c.size, c.toppings) === action.key ? { ...c, quantity: c.quantity - 1 } : c).filter((c) => c.quantity > 0);
    case 'REMOVE':
      return state.filter((c) => cartKey(c.menuItemId, c.size, c.toppings) !== action.key);
    case 'SET_NOTES':
      return state.map((c) => cartKey(c.menuItemId, c.size, c.toppings) === action.key ? { ...c, notes: action.notes || undefined } : c);
    case 'CLEAR': return [];
    default: return state;
  }
}

export function NewOrderPage() {
  const { confirm, modal } = useConfirm();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { fmt } = useCurrency();

  const [mode, setMode] = useState<OrderMode>('takeaway');
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [activeCategory, setActiveCategory] = useState('all');
  const [loading, setLoading] = useState(true);

  const [cart, dispatch] = useReducer(cartReducer, []);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryFee, setDeliveryFee] = useState('');
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [placing, setPlacing] = useState(false);
  const [mobileCartOpen, setMobileCartOpen] = useState(false);
  const [toppingModal, setToppingModal] = useState<{ item: MenuItem } | null>(null);
  const [editingNotesKey, setEditingNotesKey] = useState<string | null>(null);

  const [promoInput, setPromoInput]       = useState('');
  const [appliedPromo, setAppliedPromo]   = useState<ValidateResult | null>(null);
  const [promoLoading, setPromoLoading]   = useState(false);
  const [promoError, setPromoError]       = useState('');
  const [view, setView] = useState<'grid' | 'list'>(() =>
    (localStorage.getItem('qra_neworder_view') as 'grid' | 'list' | null) ?? 'grid'
  );
  const [search, setSearch] = useState(() => localStorage.getItem('qra_neworder_search') ?? '');
  const [searchOpen, setSearchOpen] = useState(() => Boolean(localStorage.getItem('qra_neworder_search')));
  const [showFavourites, setShowFavourites] = useState(false);
  const [orderDetailsWidth, setOrderDetailsWidth] = useState(() => {
    const saved = Number(localStorage.getItem('qra_neworder_order_details_width'));
    return Number.isFinite(saved)
      ? Math.min(MAX_ORDER_DETAILS_WIDTH, Math.max(MIN_ORDER_DETAILS_WIDTH, saved))
      : DEFAULT_ORDER_DETAILS_WIDTH;
  });
  const [resizingOrderDetails, setResizingOrderDetails] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const resizeStartRef = useRef({ x: 0, width: DEFAULT_ORDER_DETAILS_WIDTH });
  const { isFavourite, toggle: toggleFavourite, favourites } = useFavourites(user?.restaurantId ?? '');

  useEffect(() => {
    Promise.allSettled([
      menuService.getCategories(),
      menuService.getItems(),
      tableService.getTables(),
      roomService.getRooms(),
    ]).then(([cats, menuItems, tbls, rms]) => {
      if (cats.status === 'fulfilled')      setCategories(cats.value);
      if (menuItems.status === 'fulfilled') setItems(menuItems.value.filter((i) => i.available));
      if (tbls.status === 'fulfilled')      setTables(tbls.value.sort((a, b) => a.number - b.number));
      if (rms.status === 'fulfilled')       setRooms(rms.value.sort((a, b) => a.number - b.number));
      if (cats.status === 'rejected' || menuItems.status === 'rejected') {
        toast.error('Failed to load menu');
      }
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (searchOpen) searchRef.current?.focus();
  }, [searchOpen]);

  useEffect(() => {
    if (!resizingOrderDetails) return;

    function handlePointerMove(event: PointerEvent) {
      const delta = resizeStartRef.current.x - event.clientX;
      const nextWidth = Math.min(
        MAX_ORDER_DETAILS_WIDTH,
        Math.max(MIN_ORDER_DETAILS_WIDTH, resizeStartRef.current.width + delta),
      );
      setOrderDetailsWidth(nextWidth);
    }

    function handlePointerUp() {
      setResizingOrderDetails(false);
    }

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    return () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [resizingOrderDetails]);

  useEffect(() => {
    localStorage.setItem('qra_neworder_order_details_width', String(Math.round(orderDetailsWidth)));
  }, [orderDetailsWidth]);

  // Clear cart and selection when switching mode
  async function switchMode(m: OrderMode) {
    if (m === mode) return;
    if (cart.length > 0) {
      const ok = await confirm({ title: 'Switching order type will clear your current cart. Continue?', danger: false });
      if (!ok) return;
    }
    setMode(m);
    dispatch({ type: 'CLEAR' });
    setSelectedTable(null);
    setSelectedRoom(null);
    setCustomerName('');
    setCustomerPhone('');
    setDeliveryAddress('');
    setDeliveryFee('');
    setDeliveryNotes('');
    setAppliedPromo(null);
    setPromoInput('');
    setPromoError('');
  }

  const total      = cart.reduce((s, c) => s + (c.price + (c.toppings ?? []).reduce((t, tp) => t + tp.price, 0)) * c.quantity, 0);
  const discount   = appliedPromo?.discountAmount ?? 0;
  const finalTotal = Math.max(0, total - discount);

  async function handleApplyPromo() {
    const code = promoInput.trim().toUpperCase();
    if (!code || !user?.restaurantId) return;
    setPromoLoading(true);
    setPromoError('');
    try {
      const result = await promoCodeService.validate(code, user.restaurantId, total);
      if (result.valid) {
        setAppliedPromo(result);
        setPromoInput('');
      } else {
        setPromoError(result.message ?? 'Invalid promo code');
        setAppliedPromo(null);
      }
    } catch {
      setPromoError('Failed to validate promo code');
    } finally {
      setPromoLoading(false);
    }
  }

  function removePromo() {
    setAppliedPromo(null);
    setPromoInput('');
    setPromoError('');
  }

  const searchQ = search.trim().toLowerCase();
  const filtered = items
    .filter((i) => activeCategory === 'all' || i.category === activeCategory)
    .filter((i) => !showFavourites || isFavourite(i.id))
    .filter((i) => !searchQ || i.name.toLowerCase().includes(searchQ) || (i.description ?? '').toLowerCase().includes(searchQ));
  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of items) {
      counts.set(item.category, (counts.get(item.category) ?? 0) + 1);
    }
    return counts;
  }, [items]);
  const activeCategoryName = activeCategory === 'all'
    ? 'All Items'
    : categories.find((category) => category.id === activeCategory)?.name ?? 'Items';

  function handleSearch(v: string) {
    setSearch(v);
    localStorage.setItem('qra_neworder_search', v);
  }

  function clearSearch() {
    setSearch('');
    localStorage.removeItem('qra_neworder_search');
    searchRef.current?.focus();
  }
  const itemCount = cart.reduce((s, c) => s + c.quantity, 0);
  const modeRequirementLabel =
    mode === 'dine-in' ? 'Table required'
    : mode === 'room-service' ? 'Room required'
    : mode === 'delivery' ? 'Address and phone required'
    : 'Customer details optional';
  const modeRequirementComplete =
    mode === 'dine-in' ? Boolean(selectedTable)
    : mode === 'room-service' ? Boolean(selectedRoom)
    : mode === 'delivery' ? Boolean(deliveryAddress.trim() && customerPhone.trim())
    : true;

  function handleAddItem(item: MenuItem) {
    const hasLarge = (item.largePrice ?? 0) > 0;
    const hasToppings = (item.toppings ?? []).some((t) => t.available);
    if (hasLarge || hasToppings) {
      setToppingModal({ item });
    } else {
      dispatch({ type: 'ADD', item });
    }
  }

  async function handlePlace() {
    if (cart.length === 0) { toast.error('Add at least one item'); return; }
    if (mode === 'dine-in' && !selectedTable) { toast.error('Select a table'); return; }
    if (mode === 'room-service' && !selectedRoom) { toast.error('Select a room'); return; }
    if (mode === 'delivery' && !deliveryAddress.trim()) { toast.error('Enter a delivery address'); return; }
    if (mode === 'delivery' && !customerPhone.trim()) { toast.error('Enter a phone number for the rider'); return; }

    setPlacing(true);
    try {
      const code = appliedPromo?.code;
      const phone = customerPhone.trim() || undefined;
      if (mode === 'takeaway') {
        await orderService.placeTakeawayOrder(cart, customerName.trim() || undefined, user?.restaurantId ?? undefined, code, phone);
        toast.success('Takeaway order placed!');
        navigate('/admin/orders');
      } else if (mode === 'dine-in') {
        const table = selectedTable!;
        const restaurantId = user?.restaurantId ?? '';
        const session = await sessionService.getOrCreate(table.id, table.number, restaurantId);
        await orderService.placeOrder(table.id, table.number, cart, session.id, restaurantId, code, phone);
        toast.success(`Dine-in order placed for Table ${table.number}!`);
        navigate('/admin/orders');
      } else if (mode === 'room-service') {
        const room = selectedRoom!;
        const restaurantId = user?.restaurantId ?? '';
        await orderService.placeRoomOrder(room.id, room.number, cart, customerName.trim() || undefined, restaurantId, code, phone);
        toast.success(`Room service order placed for Room ${room.number}!`);
        navigate('/admin/orders');
      } else {
        const restaurantId = user?.restaurantId ?? '';
        const fee = deliveryFee.trim() ? Number(deliveryFee) : undefined;
        await orderService.placeDeliveryOrder(cart, deliveryAddress.trim(), customerPhone.trim(), customerName.trim() || undefined, restaurantId, code, fee, deliveryNotes.trim() || undefined);
        toast.success('Delivery order placed!');
        navigate('/admin/orders');
      }
      setMobileCartOpen(false);
    } catch {
      toast.error('Failed to place order');
    } finally {
      setPlacing(false);
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {modal}
      <AdminSidebar />
      <main className="flex-1 overflow-y-auto mt-14 md:mt-0">
      <AdminHeader title="New Order" backTo="/admin">
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => switchMode('takeaway')}
            className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-semibold whitespace-nowrap transition-colors ${
              mode === 'takeaway' ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-200 text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <ShoppingBag size={13} /> Takeaway
          </button>
          <button
            onClick={() => switchMode('dine-in')}
            className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-semibold whitespace-nowrap transition-colors ${
              mode === 'dine-in' ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-200 text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <UtensilsCrossed size={13} /> Dine-in
          </button>
          <button
            onClick={() => switchMode('room-service')}
            className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-semibold whitespace-nowrap transition-colors ${
              mode === 'room-service' ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-200 text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <BedDouble size={13} /> Room Service
          </button>
          <button
            onClick={() => switchMode('delivery')}
            className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-semibold whitespace-nowrap transition-colors ${
              mode === 'delivery' ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-200 text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <Truck size={13} /> Delivery
          </button>
        </div>

        {/* Grid / List toggle */}
        <div className="flex items-center bg-gray-50 border border-gray-200 rounded-lg p-0.5 shrink-0">
          <button
            onClick={() => { setView('grid'); localStorage.setItem('qra_neworder_view', 'grid'); }}
            className={`p-1.5 rounded-md transition-colors ${view === 'grid' ? 'bg-white text-orange-600' : 'text-gray-400 hover:text-gray-600'}`}
            title="Grid view"
            aria-label="Show menu as grid"
          >
            <LayoutGrid size={15} />
          </button>
          <button
            onClick={() => { setView('list'); localStorage.setItem('qra_neworder_view', 'list'); }}
            className={`p-1.5 rounded-md transition-colors ${view === 'list' ? 'bg-white text-orange-600' : 'text-gray-400 hover:text-gray-600'}`}
            title="List view"
            aria-label="Show menu as list"
          >
            <List size={15} />
          </button>
        </div>
      </AdminHeader>

      <div
        className="px-3 sm:px-4 lg:px-6 py-4 pb-28 lg:pb-4 flex flex-col lg:grid gap-4 lg:gap-x-3 items-start"
        style={{ gridTemplateColumns: `200px minmax(0, 1fr) 10px ${orderDetailsWidth}px` }}
      >
        {/* Categories */}
        {!loading && (
          <aside className="w-full lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto">
            <div className="bg-white lg:rounded-lg lg:border lg:border-gray-100 lg:p-3">
              <div className="hidden lg:flex items-center justify-between px-1 pb-3">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Categories</p>
                <span className="text-xs font-semibold text-gray-400">{items.length}</span>
              </div>
              <div className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-visible pb-1 lg:pb-0">
                <button
                  onClick={() => setActiveCategory('all')}
                  className={`shrink-0 lg:w-full flex items-center justify-between gap-3 px-3 py-2 rounded-lg border text-sm font-semibold transition-colors ${
                    activeCategory === 'all' ? 'border-green-600 bg-green-50 text-green-700' : 'border-gray-200 bg-white text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <span>All</span>
                  <span className={`text-xs ${activeCategory === 'all' ? 'text-green-600' : 'text-gray-400'}`}>{items.length}</span>
                </button>
                {categories.map((c) => {
                  const count = categoryCounts.get(c.id) ?? 0;
                  return (
                    <button
                      key={c.id}
                      onClick={() => setActiveCategory(c.id)}
                      className={`shrink-0 lg:w-full flex items-center justify-between gap-3 px-3 py-2 rounded-lg border text-sm font-semibold transition-colors ${
                        activeCategory === c.id ? 'border-green-600 bg-green-50 text-green-700' : 'border-gray-200 bg-white text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                      }`}
                    >
                      <span className="truncate">{c.name}</span>
                      <span className={`text-xs ${activeCategory === c.id ? 'text-green-600' : 'text-gray-400'}`}>{count}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </aside>
        )}
        {/* â”€â”€ Menu grid â”€â”€ */}
        <div className="flex-1 min-w-0">
          {!loading && (
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-gray-900">{showFavourites ? 'Favourites' : activeCategoryName}</h2>
                <p className="text-xs text-gray-400">
                  {filtered.length} {filtered.length === 1 ? 'item' : 'items'} available
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className={`relative transition-all duration-200 ${searchOpen ? 'w-56 xl:w-72' : 'w-10'}`}>
                  {searchOpen ? (
                    <>
                      <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        ref={searchRef}
                        id="new-order-search"
                        type="search"
                        value={search}
                        onChange={(e) => handleSearch(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Escape' && !search) setSearchOpen(false); }}
                        placeholder="Search menu..."
                        aria-label="Search menu items"
                        className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-9 text-sm outline-none focus:border-green-400 focus:ring-1 focus:ring-green-200"
                      />
                      <button onClick={() => search ? clearSearch() : setSearchOpen(false)} className="absolute right-2.5 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full bg-gray-200 text-gray-500" aria-label={search ? 'Clear menu item search' : 'Close menu item search'}>
                        <X size={11} />
                      </button>
                    </>
                  ) : (
                    <button onClick={() => setSearchOpen(true)} className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 hover:border-green-400 hover:text-green-700" title="Search menu">
                      <Search size={17} />
                    </button>
                  )}
                </div>
                <button
                  onClick={() => setShowFavourites((value) => !value)}
                  className={`relative flex h-10 w-10 items-center justify-center rounded-xl border transition-colors ${
                    showFavourites ? 'border-red-400 bg-red-50 text-red-500' : 'border-gray-200 bg-white text-gray-500 hover:border-red-300 hover:text-red-500'
                  }`}
                  title="Favourite items"
                  aria-pressed={showFavourites}
                >
                  <Heart size={17} className={showFavourites ? 'fill-current' : ''} />
                  {favourites.size > 0 && <span className="absolute -right-1 -top-1 min-w-4 rounded-full bg-red-500 px-1 text-[9px] font-bold leading-4 text-white">{favourites.size}</span>}
                </button>
              </div>
            </div>
          )}
          {loading ? (
            <div className="flex justify-center pt-16">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center pt-12">
              <p className="text-gray-400">
                {searchQ ? `No results for "${search}"` : 'No items'}
              </p>
              {searchQ && (
                <button onClick={clearSearch} className="mt-2 text-sm text-orange-500 hover:underline">
                  Clear search
                </button>
              )}
            </div>
          ) : view === 'list' ? (
            /* â”€â”€ LIST VIEW â”€â”€ */
            <div className="flex flex-col gap-2">
              {filtered.map((item) => {
                const hasLarge = (item.largePrice ?? 0) > 0;
                const hasToppings = (item.toppings ?? []).some((t) => t.available);
                const regPrice = effectivePrice(item, 'regular');
                const lrgPrice = hasLarge ? effectivePrice(item, 'large') : 0;
                const regDisc = item.discountPct > 0;
                const totalInCart = cart.filter((c) => c.menuItemId === item.id).reduce((s, c) => s + c.quantity, 0);

                return (
                  <div
                    key={item.id}
                    className={`bg-white rounded-2xl border shadow-sm flex items-center gap-3 px-3 py-2.5 transition-colors ${
                      totalInCart > 0 ? 'border-orange-200' : 'border-gray-100'
                    }`}
                  >
                    {/* Thumbnail */}
                    <div className="relative shrink-0">
                      {item.image
                        ? <img src={item.image} alt={item.name} className="w-14 h-14 object-cover rounded-xl" />
                        : <div className="w-14 h-14 bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl flex items-center justify-center text-2xl">🍽️</div>}
                      {totalInCart > 0 && (
                        <span className="absolute -top-1 -left-1 bg-orange-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                          {totalInCart}
                        </span>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-semibold text-gray-800 text-sm leading-tight truncate">{item.name}</span>
                        {(hasToppings || hasLarge) && (
                          <span className="shrink-0 text-[10px] bg-orange-100 text-orange-600 font-semibold px-1.5 py-0.5 rounded-full">
                            {hasToppings ? '+Extras' : 'R/L'}
                          </span>
                        )}
                      </div>
                      <div className="flex items-baseline gap-1 mt-0.5">
                        {regDisc && <span className="text-[11px] text-gray-400 line-through">{fmt(item.price)}</span>}
                        <span className={`text-sm font-bold ${regDisc ? 'text-green-600' : 'text-orange-600'}`}>{fmt(regPrice)}</span>
                        {hasLarge && <span className="text-[11px] text-gray-400">/ L {fmt(lrgPrice)}</span>}
                        {regDisc && <span className="text-[10px] bg-red-100 text-red-600 font-bold px-1.5 py-0.5 rounded-full">{item.discountPct}% OFF</span>}
                      </div>
                    </div>

                    {/* Add button */}
                    <button onClick={() => toggleFavourite(item.id)} className="shrink-0 text-gray-300 hover:text-red-500" title="Toggle favourite">
                      <Heart size={16} className={isFavourite(item.id) ? 'fill-red-500 text-red-500' : ''} />
                    </button>
                    <button
                      onClick={() => handleAddItem(item)}
                      className={`shrink-0 flex items-center justify-center gap-1 px-3 py-2 rounded-full text-sm font-medium transition-colors ${
                        totalInCart > 0 ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-green-700 text-white hover:bg-green-800'
                      }`}
                    >
                      {totalInCart > 0 ? <span className="font-bold text-sm w-5 text-center">{totalInCart}</span> : <Plus size={16} />}
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            /* â”€â”€ GRID VIEW â”€â”€ */
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4 gap-3">
              {filtered.map((item) => {
                const hasLarge = (item.largePrice ?? 0) > 0;
                const hasToppings = (item.toppings ?? []).some((t) => t.available);
                const regPrice = effectivePrice(item, 'regular');
                const lrgPrice = hasLarge ? effectivePrice(item, 'large') : 0;
                const regDisc = item.discountPct > 0;
                const totalInCart = cart.filter((c) => c.menuItemId === item.id).reduce((s, c) => s + c.quantity, 0);

                return (
                  <div
                    key={item.id}
                    className={`bg-white rounded-2xl border shadow-sm p-3 flex flex-col transition-colors ${
                      totalInCart > 0 ? 'border-orange-200' : 'border-gray-100'
                    }`}
                  >
                    <div className="relative w-full h-28 rounded-xl bg-orange-50 overflow-hidden mb-2">
                      {item.image
                        ? <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center text-3xl">🍽️</div>}
                      {(hasToppings || hasLarge) && (
                        <span className="absolute bottom-1 right-1 bg-green-700 text-white text-xs font-semibold px-1.5 py-0.5 rounded-full">
                          {hasToppings ? '+ Extras' : 'R / L'}
                        </span>
                      )}
                      <button
                        onClick={(event) => { event.stopPropagation(); toggleFavourite(item.id); }}
                        className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-gray-400 shadow-sm hover:text-red-500"
                        title="Toggle favourite"
                      >
                        <Heart size={14} className={isFavourite(item.id) ? 'fill-red-500 text-red-500' : ''} />
                      </button>
                      {totalInCart > 0 && (
                        <span className="absolute top-1 left-1 bg-orange-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                          {totalInCart}
                        </span>
                      )}
                    </div>
                    <p className="font-semibold text-gray-800 text-sm leading-tight mb-1">{item.name}</p>
                    {regDisc
                      ? <div className="flex flex-wrap items-center gap-x-1 gap-y-0.5 mb-1">
                          <span className="text-xs text-gray-400 line-through">{fmt(item.price)}</span>
                          <span className="text-green-700 text-sm font-semibold">{fmt(regPrice)}</span>
                          <span className="text-xs bg-red-100 text-red-600 font-bold px-1.5 py-0.5 rounded-full">{item.discountPct}% OFF</span>
                        </div>
                      : <p className="text-green-700 text-sm font-medium mb-1">{fmt(regPrice)}{hasLarge ? ` / L ${fmt(lrgPrice)}` : ''}</p>}
                    <div className="mt-auto">
                      <button
                        onClick={() => handleAddItem(item)}
                        className={`w-full flex items-center justify-center gap-1 py-2 rounded-xl text-sm font-medium transition-colors ${
                          totalInCart > 0 ? 'bg-green-100 text-green-700' : 'bg-green-700 text-white hover:bg-green-800'
                        }`}
                      >
                        <Plus size={14} /> {totalInCart > 0 ? 'Add more' : 'Add'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize order details"
          title="Drag to resize order details"
          onPointerDown={(event) => {
            resizeStartRef.current = { x: event.clientX, width: orderDetailsWidth };
            setResizingOrderDetails(true);
          }}
          className={`hidden lg:flex h-[calc(100vh-7rem)] sticky top-24 cursor-col-resize items-stretch justify-center rounded-full transition-colors ${
            resizingOrderDetails ? 'bg-green-100' : 'hover:bg-green-50'
          }`}
        >
          <span className={`my-2 w-1 rounded-full transition-colors ${
            resizingOrderDetails ? 'bg-green-600' : 'bg-gray-200'
          }`} />
        </div>

        {/* â”€â”€ Sidebar / mobile cart drawer â”€â”€ */}
        <div
          className={`w-full lg:w-full md:shrink-0 space-y-3 ${
            mobileCartOpen
              ? 'fixed inset-x-0 bottom-0 z-50 max-h-[88vh] overflow-y-auto rounded-t-2xl bg-gray-50 p-3 shadow-2xl'
              : 'hidden'
          } lg:sticky lg:top-20 lg:block lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto lg:rounded-none lg:bg-transparent lg:p-0 lg:shadow-none`}
        >
          <div className="lg:hidden flex items-center justify-between px-1 pb-1">
            <div>
              <p className="text-sm font-bold text-gray-900">Order Summary</p>
              <p className="text-xs text-gray-500">{modeRequirementLabel}</p>
            </div>
            <button onClick={() => setMobileCartOpen(false)} className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700">
              <X size={18} />
            </button>
          </div>

          {/* Table selector  -  dine-in only */}
          {mode === 'dine-in' && (
            <div className={`bg-white rounded-xl border p-4 ${selectedTable ? 'border-orange-100' : 'border-orange-300 ring-1 ring-orange-100'}`}>
              <div className="flex items-center justify-between gap-2 mb-3">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Select Table</p>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${selectedTable ? 'bg-green-50 text-green-700' : 'bg-orange-50 text-orange-700'}`}>
                  Required
                </span>
              </div>
              {tables.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">No tables found</p>
              ) : (
                <div className="grid grid-cols-4 gap-2">
                  {tables.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setSelectedTable(selectedTable?.id === t.id ? null : t)}
                      className={`h-12 rounded-xl font-bold text-sm transition-colors ${
                        selectedTable?.id === t.id
                          ? 'bg-orange-500 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-orange-100 hover:text-orange-600'
                      }`}
                    >
                      {t.number}
                    </button>
                  ))}
                </div>
              )}
              {selectedTable && (
                <p className="text-xs text-orange-600 font-medium mt-2 text-center">
                  Table {selectedTable.number}  .  {selectedTable.seats} seats
                </p>
              )}
            </div>
          )}

          {/* Room selector  -  room-service only */}
          {mode === 'room-service' && (
            <div className={`bg-white rounded-xl border p-4 ${selectedRoom ? 'border-blue-100' : 'border-blue-300 ring-1 ring-blue-100'}`}>
              <div className="flex items-center justify-between gap-2 mb-3">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Select Room</p>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${selectedRoom ? 'bg-green-50 text-green-700' : 'bg-blue-50 text-blue-700'}`}>
                  Required
                </span>
              </div>
              {rooms.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">No rooms found</p>
              ) : (
                <div className="grid grid-cols-4 gap-2">
                  {rooms.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => setSelectedRoom(selectedRoom?.id === r.id ? null : r)}
                      title={r.name ?? undefined}
                      className={`h-12 rounded-xl font-bold text-sm transition-colors ${
                        selectedRoom?.id === r.id
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-blue-50 hover:text-blue-600'
                      }`}
                    >
                      {r.number}
                    </button>
                  ))}
                </div>
              )}
              {selectedRoom && (
                <p className="text-xs text-blue-600 font-medium mt-2 text-center">
                  Room {selectedRoom.number}{selectedRoom.name ? `  -  ${selectedRoom.name}` : ''}
                </p>
              )}
            </div>
          )}

          {/* Delivery details  -  delivery only */}
          {mode === 'delivery' && (
            <div className={`bg-white rounded-xl border p-4 space-y-3 ${deliveryAddress.trim() && customerPhone.trim() ? 'border-teal-100' : 'border-teal-300 ring-1 ring-teal-100'}`}>
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Delivery Details</p>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${deliveryAddress.trim() && customerPhone.trim() ? 'bg-green-50 text-green-700' : 'bg-teal-50 text-teal-700'}`}>
                  Required
                </span>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">
                  Address <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  placeholder="House no., street, city"
                  rows={2}
                  className={`w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-teal-300 resize-none ${deliveryAddress.trim() ? 'border-gray-200' : 'border-teal-300'}`}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">
                  Delivery Fee
                </label>
                <input
                  type="number"
                  min="0"
                  value={deliveryFee}
                  onChange={(e) => setDeliveryFee(e.target.value)}
                  placeholder="0"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-teal-300"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">
                  Notes
                </label>
                <input
                  type="text"
                  value={deliveryNotes}
                  onChange={(e) => setDeliveryNotes(e.target.value)}
                  placeholder="e.g. gate code, landmark (optional)"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-teal-300"
                />
              </div>
            </div>
          )}

          {/* Customer / guest name & phone */}
          <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-3">
              {mode !== 'dine-in' && (
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">
                    {mode === 'room-service' ? 'Guest Name' : 'Customer Name'}
                  </label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="e.g. John (optional)"
                    className={`w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none ${
                      mode === 'room-service' ? 'focus:ring-1 focus:ring-blue-300' : mode === 'delivery' ? 'focus:ring-1 focus:ring-teal-300' : 'focus:ring-1 focus:ring-purple-300'
                    }`}
                  />
                </div>
              )}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">
                  WhatsApp / Phone {mode === 'delivery' && <span className="text-red-500">*</span>}
                </label>
                <input
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder={mode === 'delivery' ? 'e.g. 0771234567' : 'e.g. 0771234567 (optional)'}
                  className={`w-full border rounded-lg px-3 py-2 text-sm outline-none ${
                    mode === 'delivery' && !customerPhone.trim() ? 'border-teal-300' : 'border-gray-200'
                  } ${
                    mode === 'room-service' ? 'focus:ring-1 focus:ring-blue-300' : mode === 'dine-in' ? 'focus:ring-1 focus:ring-orange-300' : mode === 'delivery' ? 'focus:ring-1 focus:ring-teal-300' : 'focus:ring-1 focus:ring-purple-300'
                  }`}
                />
              </div>
            </div>

          {/* Cart */}
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
              <div className="flex-1">
                <span className="font-semibold text-gray-900">Order Summary</span>
                <p className={`text-xs ${modeRequirementComplete ? 'text-green-600' : 'text-orange-600'}`}>
                  {modeRequirementComplete ? 'Ready for checkout' : modeRequirementLabel}
                </p>
              </div>
              {itemCount > 0 && (
                <span className="bg-orange-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                  {itemCount}
                </span>
              )}
            </div>

            {cart.length === 0 ? (
              <p className="text-center text-gray-400 text-sm py-8">No items yet</p>
            ) : (
              <ul className="divide-y divide-gray-50 max-h-72 lg:max-h-[34vh] overflow-y-auto">
                {cart.map((c) => {
                  const key = cartKey(c.menuItemId, c.size, c.toppings);
                  const toppingsTotal = (c.toppings ?? []).reduce((s, t) => s + t.price, 0);
                  return (
                    <li key={key} className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-sm font-medium text-gray-800 truncate">{c.name}</p>
                            {c.size && (
                              <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full shrink-0 ${
                                c.size === 'large' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'
                              }`}>
                                {c.size === 'large' ? 'L' : 'R'}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-400">{fmt(c.price + toppingsTotal)} x {c.quantity}</p>
                        </div>
                        <span className="text-sm font-semibold text-gray-700 shrink-0">
                          {fmt((c.price + toppingsTotal) * c.quantity)}
                        </span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button onClick={() => dispatch({ type: 'DEC', key })} className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center hover:bg-gray-200 active:scale-95 transition-all" aria-label={`Decrease quantity for ${c.name}`}>
                            <Minus size={13} />
                          </button>
                          <span className="text-xs font-bold w-5 text-center">{c.quantity}</span>
                          <button onClick={() => dispatch({ type: 'INC', key })} className="w-8 h-8 rounded-lg bg-orange-500 text-white flex items-center justify-center hover:bg-orange-600 active:scale-95 transition-all" aria-label={`Increase quantity for ${c.name}`}>
                            <Plus size={13} />
                          </button>
                          <button onClick={() => dispatch({ type: 'REMOVE', key })} className="text-gray-300 hover:text-red-400 ml-1" aria-label={`Remove ${c.name} from cart`}>
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                      {(c.toppings ?? []).length > 0 && (
                        <ul className="ml-2 mt-0.5 space-y-0.5">
                          {c.toppings!.map((t, ti) => (
                            <li key={ti} className="text-xs text-gray-400">+ {t.name}{t.price > 0 ? ` (+${fmt(t.price)})` : ''}</li>
                          ))}
                        </ul>
                      )}
                      {/* Inline notes */}
                      <div className="mt-1">
                        {editingNotesKey === key ? (
                          <input
                            autoFocus
                            type="text"
                            value={c.notes ?? ''}
                            onChange={(e) => dispatch({ type: 'SET_NOTES', key, notes: e.target.value })}
                            onBlur={() => setEditingNotesKey(null)}
                            placeholder="e.g. no onions, less spicy…"
                            className="w-full text-xs border border-orange-200 rounded-lg px-2 py-1 outline-none focus:ring-1 focus:ring-orange-300"
                          />
                        ) : (
                          <button
                            onClick={() => setEditingNotesKey(key)}
                            className="text-xs text-orange-400 hover:text-orange-600"
                          >
                            {c.notes ? `📝 ${c.notes}` : '+ Add note'}
                          </button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}

            {/* Promo code */}
            {cart.length > 0 && (
              <div className="px-4 py-3 border-t border-gray-50">
                {appliedPromo ? (
                  <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-3 py-2">
                    <Tag size={13} className="text-green-600 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-green-700">{appliedPromo.code}</p>
                      <p className="text-xs text-green-600">
                        {appliedPromo.type === 'percentage' ? `${appliedPromo.value}%` : fmt(appliedPromo.value!)} off  .  saving {fmt(discount)}
                      </p>
                    </div>
                    <button onClick={removePromo} className="text-green-400 hover:text-red-400 transition-colors" aria-label="Remove promo code">
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <label htmlFor="promo-code" className="block text-xs font-semibold text-gray-500">
                      Promo code
                    </label>
                    <div className="flex gap-2">
                      <input
                        id="promo-code"
                        type="text"
                        value={promoInput}
                        onChange={(e) => { setPromoInput(e.target.value.toUpperCase()); setPromoError(''); }}
                        onKeyDown={(e) => e.key === 'Enter' && handleApplyPromo()}
                        placeholder="Promo code"
                        className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-orange-300 uppercase tracking-wide"
                      />
                      <button
                        onClick={handleApplyPromo}
                        disabled={!promoInput.trim() || promoLoading}
                        className="px-3 py-2 bg-orange-500 text-white rounded-xl text-sm font-medium hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
                      >
                        {promoLoading ? <Loader2 size={14} className="animate-spin" /> : <><Tag size={13} /> Apply</>}
                      </button>
                    </div>
                    {promoError && <p className="text-xs text-red-500">{promoError}</p>}
                  </div>
                )}
              </div>
            )}

            <div className="px-4 py-3 border-t border-gray-100">
              <div className="space-y-1 mb-3">
                {discount > 0 && (
                  <>
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>Subtotal</span><span>{fmt(total)}</span>
                    </div>
                    <div className="flex justify-between text-xs text-green-600 font-semibold">
                      <span>Discount ({appliedPromo?.code})</span><span>-{fmt(discount)}</span>
                    </div>
                  </>
                )}
                <div className="flex justify-between text-sm font-semibold text-gray-900">
                  <span>Total</span>
                  <span>{fmt(finalTotal)}</span>
                </div>
              </div>
              <button
                onClick={handlePlace}
                disabled={
                  cart.length === 0 || placing ||
                  (mode === 'dine-in' && !selectedTable) ||
                  (mode === 'room-service' && !selectedRoom) ||
                  (mode === 'delivery' && (!deliveryAddress.trim() || !customerPhone.trim()))
                }
                className={`w-full flex items-center justify-center gap-2 py-3 rounded-2xl font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  mode === 'takeaway'
                    ? 'bg-purple-600 text-white hover:bg-purple-700'
                    : mode === 'room-service'
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : mode === 'delivery'
                    ? 'bg-teal-600 text-white hover:bg-teal-700'
                    : 'bg-orange-500 text-white hover:bg-orange-600'
                }`}
              >
                {placing
                  ? <><Loader2 size={16} className="animate-spin" /> Placing…</>
                  : mode === 'takeaway'
                  ? <><Check size={16} /> Place Takeaway Order</>
                  : mode === 'room-service'
                  ? <><Check size={16} /> Place Room Service Order{selectedRoom ? `  .  Room ${selectedRoom.number}` : ''}</>
                  : mode === 'delivery'
                  ? <><Check size={16} /> Place Delivery Order</>
                  : <><Check size={16} /> Place Dine-in Order{selectedTable ? `  .  Table ${selectedTable.number}` : ''}</>
                }
              </button>
            </div>
          </div>
        </div>
      </div>

      {mobileCartOpen && (
        <button
          type="button"
          aria-label="Close cart drawer"
          onClick={() => setMobileCartOpen(false)}
          className="fixed inset-0 z-40 bg-black/30 lg:hidden"
        />
      )}

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white px-3 py-2 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] lg:hidden">
        <button
          type="button"
          onClick={() => setMobileCartOpen(true)}
          className="w-full flex items-center gap-3 rounded-xl bg-gray-900 px-3 py-3 text-white"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10">
            <ShoppingBag size={18} />
          </span>
          <span className="min-w-0 flex-1 text-left">
            <span className="block text-sm font-bold">
              {itemCount} item{itemCount !== 1 ? 's' : ''} · {fmt(finalTotal)}
            </span>
            <span className={`block text-xs ${modeRequirementComplete ? 'text-green-200' : 'text-orange-200'}`}>
              {modeRequirementComplete ? 'Ready to place order' : modeRequirementLabel}
            </span>
          </span>
          <span className="rounded-lg bg-orange-500 px-3 py-2 text-xs font-bold">
            Cart
          </span>
        </button>
      </div>

      {toppingModal && (
        <ToppingSelectionModal
          item={toppingModal.item}
          onConfirm={(toppings, size, notes) => {
            dispatch({ type: 'ADD', item: toppingModal.item, size, toppings, notes });
            setToppingModal(null);
          }}
          onClose={() => setToppingModal(null)}
        />
      )}
      </main>
    </div>
  );
}
