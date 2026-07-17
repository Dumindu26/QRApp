import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import {
  Plus, Trash2, QrCode, Printer,
  BedDouble, Table2, ShoppingBag, Download, Copy, Check, Pencil, X, Truck, ExternalLink,
} from 'lucide-react';
import { QRCodeSVG, QRCodeCanvas } from 'qrcode.react';
import type { Table, Room } from '../../types';
import { tableService } from '../../services/tableService';
import { roomService } from '../../services/roomService';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const API_BASE = `${import.meta.env.VITE_API_URL ?? ''}/api`;
import { AdminSidebar } from '../../components/AdminSidebar';
import { AdminHeader } from '../../components/AdminHeader';
import { useConfirm } from '../../components/ConfirmModal';

type Tab = 'tables' | 'rooms' | 'takeaway' | 'delivery';
type ServiceQrKind = 'takeaway' | 'delivery';
type ServiceQrActivity = Partial<Record<ServiceQrKind, { printedAt?: string; downloadedAt?: string }>>;
const SERVICE_QR_ACTIVITY_KEY = 'locations-service-qr-activity';

// â”€â”€ Shared print helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const PRINT_STYLES = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; background: #fff; }
  .card {
    display: flex; flex-direction: column; align-items: center;
    justify-content: center; text-align: center;
    padding: 32px 24px; page-break-after: always; min-height: 100vh;
  }
  .card:last-child { page-break-after: avoid; }
  .label   { font-size: 13px; color: #6b7280; letter-spacing: .08em; text-transform: uppercase; margin-bottom: 12px; }
  .title   { font-size: 48px; font-weight: 800; color: #111827; line-height: 1; }
  .subtitle{ font-size: 14px; color: #9ca3af; margin-top: 6px; margin-bottom: 28px; }
  .qr svg  { width: 220px !important; height: 220px !important; }
  .url     { margin-top: 16px; font-size: 9px; color: #d1d5db; word-break: break-all; max-width: 260px; }
  @page    { margin: 12mm; }
`;

function tableCardHtml(num: number, seats: number, url: string, svg: string) {
  return `<div class="card"><div class="label">Scan to Order</div><div class="title">Table ${num}</div><div class="subtitle">${seats} seat${seats !== 1 ? 's' : ''}</div><div class="qr">${svg}</div><div class="url">${url}</div></div>`;
}
function roomCardHtml(num: number, name: string | null | undefined, url: string, svg: string) {
  return `<div class="card"><div class="label">Scan to Order</div><div class="title">Room ${num}</div><div class="subtitle">${name ?? '&nbsp;'}</div><div class="qr">${svg}</div><div class="url">${url}</div></div>`;
}
function takeawayCardHtml(url: string, svg: string) {
  return `<div class="card"><div class="label">Takeaway Orders</div><div class="title" style="font-size:32px">Scan to Order</div><div class="subtitle">Takeaway &amp; Pickup</div><div class="qr">${svg}</div><div class="url">${url}</div></div>`;
}
function deliveryCardHtml(url: string, svg: string) {
  return `<div class="card"><div class="label">Delivery Orders</div><div class="title" style="font-size:32px">Scan to Order</div><div class="subtitle">Delivery</div><div class="qr">${svg}</div><div class="url">${url}</div></div>`;
}

function openPrintWindow(html: string, title = 'QR Codes') {
  const win = window.open('', '_blank', 'width=520,height=700');
  if (!win) { toast.error('Allow pop-ups to print'); return; }
  win.document.write(`<!DOCTYPE html><html><head><title>${title}</title><style>${PRINT_STYLES}</style></head><body>${html}</body></html>`);
  win.document.close();
  win.onload = () => { win.focus(); win.print(); };
  setTimeout(() => { try { win.focus(); win.print(); } catch { /* already printed */ } }, 400);
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function LocationsPage() {
  const { confirm, modal } = useConfirm();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();

  const [activeTab, setActiveTab] = useState<Tab>(() => {
    const fromUrl = searchParams.get('tab') as Tab | null;
    if (fromUrl === 'tables' || fromUrl === 'rooms' || fromUrl === 'takeaway' || fromUrl === 'delivery') return fromUrl;
    return (localStorage.getItem('locations-tab') as Tab) ?? 'tables';
  });

  // â”€â”€ Tables state â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [tables, setTables]         = useState<Table[]>([]);
  const [tableNum, setTableNum]     = useState('');
  const [tableSeats, setTableSeats] = useState('4');
  const [tableQrPreview, setTableQrPreview] = useState<Table | null>(null);
  const [takeawayQrOpen, setTakeawayQrOpen] = useState(false);
  const [deliveryQrOpen, setDeliveryQrOpen] = useState(false);
  const [editingTable, setEditingTable] = useState<{ id: string; number: string; seats: string } | null>(null);

  // â”€â”€ Rooms state â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [rooms, setRooms]         = useState<Room[]>([]);
  const [roomNum, setRoomNum]     = useState('');
  const [roomName, setRoomName]   = useState('');
  const [roomQrPreview, setRoomQrPreview] = useState<Room | null>(null);

  // â”€â”€ Refs for hidden QR renders â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const tableQrRefs         = useRef<Map<string, HTMLDivElement>>(new Map());
  const roomQrRefs          = useRef<Map<string, HTMLDivElement>>(new Map());
  const takeawayQrRef       = useRef<HTMLDivElement>(null);
  const deliveryQrRef       = useRef<HTMLDivElement>(null);
  // Canvas refs for PNG download
  const tableCanvasRefs     = useRef<Map<string, HTMLDivElement>>(new Map());
  const roomCanvasRefs      = useRef<Map<string, HTMLDivElement>>(new Map());
  const takeawayCanvasRef   = useRef<HTMLDivElement>(null);
  const deliveryCanvasRef   = useRef<HTMLDivElement>(null);
  // Copy-to-clipboard feedback
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [serviceQrActivity, setServiceQrActivity] = useState<ServiceQrActivity>(() => {
    try {
      return JSON.parse(localStorage.getItem(SERVICE_QR_ACTIVITY_KEY) ?? '{}') as ServiceQrActivity;
    } catch {
      return {};
    }
  });

  const origin = window.location.origin;

  // user.restaurantId can be null in production if the DB row has no restaurant_id set.
  // Fall back to fetching the restaurants list (works for super_admin and linked admins).
  const [resolvedRestaurantId, setResolvedRestaurantId] = useState<string | null>(
    user?.restaurantId ?? null,
  );

  useEffect(() => {
    if (!user?.restaurantId) {
      axios
        .get<{ id: string }[]>(`${API_BASE}/restaurants`)
        .then((r) => { if (r.data[0]?.id) setResolvedRestaurantId(r.data[0].id); })
        .catch(() => {});
    }
  }, [user?.restaurantId]);

  const takeawayUrl = resolvedRestaurantId ? `${origin}/takeaway/${resolvedRestaurantId}` : '';
  const deliveryUrl = resolvedRestaurantId ? `${origin}/delivery/${resolvedRestaurantId}` : '';

  function recordServiceQrAction(kind: ServiceQrKind, action: 'printedAt' | 'downloadedAt') {
    setServiceQrActivity((prev) => {
      const next = {
        ...prev,
        [kind]: { ...(prev[kind] ?? {}), [action]: new Date().toISOString() },
      };
      localStorage.setItem(SERVICE_QR_ACTIVITY_KEY, JSON.stringify(next));
      return next;
    });
  }

  function formatActivityTime(value?: string) {
    if (!value) return 'Never';
    return new Date(value).toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function switchTab(tab: Tab) {
    setActiveTab(tab);
    localStorage.setItem('locations-tab', tab);
  }

  useEffect(() => { tableService.getTables().then(setTables).catch(() => {}); }, []);
  useEffect(() => { roomService.getRooms().then(setRooms).catch(() => {}); }, []);

  // â”€â”€ SVG getters â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const getTableSvg    = (id: string) => tableQrRefs.current.get(id)?.querySelector('svg')?.outerHTML ?? '';
  const getRoomSvg     = (id: string) => roomQrRefs.current.get(id)?.querySelector('svg')?.outerHTML ?? '';
  const getTakeawaySvg = ()           => takeawayQrRef.current?.querySelector('svg')?.outerHTML ?? '';
  const getDeliverySvg = ()           => deliveryQrRef.current?.querySelector('svg')?.outerHTML ?? '';

  // â”€â”€ PNG download helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  function downloadPng(containerRef: HTMLDivElement | null | undefined, filename: string) {
    const canvas = containerRef?.querySelector('canvas') as HTMLCanvasElement | null;
    if (!canvas) { toast.error('QR not ready, try again'); return false; }
    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png');
    link.download = filename;
    link.click();
    return true;
  }
  function downloadTableQr(table: Table)  { downloadPng(tableCanvasRefs.current.get(table.id), `table-${table.number}-qr.png`); }
  function downloadRoomQr(room: Room)     { downloadPng(roomCanvasRefs.current.get(room.id),   `room-${room.number}-qr.png`); }
  function downloadTakeawayQr()           { if (downloadPng(takeawayCanvasRef.current,          'takeaway-qr.png')) recordServiceQrAction('takeaway', 'downloadedAt'); }
  function downloadDeliveryQr()           { if (downloadPng(deliveryCanvasRef.current,          'delivery-qr.png')) recordServiceQrAction('delivery', 'downloadedAt'); }

  // â”€â”€ Copy URL helper â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  function copyUrl(url: string) {
    navigator.clipboard.writeText(url)
      .then(() => { setCopiedUrl(url); setTimeout(() => setCopiedUrl(null), 2000); toast.success('URL copied!'); })
      .catch(() => toast.error('Copy failed'));
  }

  // â”€â”€ Table actions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  async function addTable() {
    const n = parseInt(tableNum), s = parseInt(tableSeats);
    if (!n || !s) return toast.error('Enter valid number and seats');
    if (tables.some((t) => t.number === n)) return toast.error('Table number already exists');
    try {
      const t = await tableService.createTable(n, s);
      setTables((p) => [...p, t].sort((a, b) => a.number - b.number));
      setTableNum('');
      toast.success(`Table ${n} added`);
    } catch { toast.error('Failed to add table'); }
  }

  async function delTable(id: string, num: number) {
    const ok = await confirm({ title: `Delete Table ${num}?`, confirmLabel: 'Delete' });
    if (!ok) return;
    try {
      await tableService.deleteTable(id);
      setTables((p) => p.filter((t) => t.id !== id));
      toast.success('Deleted');
    } catch { toast.error('Failed to delete'); }
  }

  async function saveTable() {
    if (!editingTable) return;
    const n = parseInt(editingTable.number), s = parseInt(editingTable.seats);
    if (!n || !s) return toast.error('Enter valid number and seats');
    const dup = tables.find((t) => t.number === n && t.id !== editingTable.id);
    if (dup) return toast.error('Table number already exists');
    try {
      const updated = await tableService.updateTable(editingTable.id, { number: n, seats: s });
      setTables((p) => p.map((t) => t.id === updated.id ? updated : t).sort((a, b) => a.number - b.number));
      setEditingTable(null);
      toast.success(`Table ${n} updated`);
    } catch { toast.error('Failed to update table'); }
  }

  function printOneTable(table: Table) {
    const svg = getTableSvg(table.id);
    if (!svg) return toast.error('QR not ready, try again');
    openPrintWindow(tableCardHtml(table.number, table.seats, `${origin}/welcome/${table.id}`, svg), 'Table QR');
  }

  function printAllTables() {
    if (!tables.length) return toast.error('No tables to print');
    openPrintWindow(
      tables.map((t) => { const s = getTableSvg(t.id); return s ? tableCardHtml(t.number, t.seats, `${origin}/welcome/${t.id}`, s) : ''; }).join(''),
      'Table QR Codes',
    );
  }

  function printTakeaway() {
    const svg = getTakeawaySvg();
    if (!svg || !takeawayUrl) return toast.error('QR not ready, try again');
    openPrintWindow(takeawayCardHtml(takeawayUrl, svg), 'Takeaway QR');
    recordServiceQrAction('takeaway', 'printedAt');
  }

  function printDelivery() {
    const svg = getDeliverySvg();
    if (!svg || !deliveryUrl) return toast.error('QR not ready, try again');
    openPrintWindow(deliveryCardHtml(deliveryUrl, svg), 'Delivery QR');
    recordServiceQrAction('delivery', 'printedAt');
  }

  // â”€â”€ Room actions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  async function addRoom() {
    const n = parseInt(roomNum);
    if (!n) return toast.error('Enter a valid room number');
    if (rooms.some((r) => r.number === n)) return toast.error('Room number already exists');
    try {
      const r = await roomService.createRoom(n, roomName.trim() || undefined);
      setRooms((p) => [...p, r].sort((a, b) => a.number - b.number));
      setRoomNum(''); setRoomName('');
      toast.success(`Room ${n} added`);
    } catch { toast.error('Failed to add room'); }
  }

  async function delRoom(id: string, num: number) {
    const ok = await confirm({ title: `Delete Room ${num}?`, confirmLabel: 'Delete' });
    if (!ok) return;
    try {
      await roomService.deleteRoom(id);
      setRooms((p) => p.filter((r) => r.id !== id));
      toast.success('Deleted');
    } catch { toast.error('Failed to delete'); }
  }

  function printOneRoom(room: Room) {
    const svg = getRoomSvg(room.id);
    if (!svg) return toast.error('QR not ready, try again');
    openPrintWindow(roomCardHtml(room.number, room.name, `${origin}/room/${room.id}`, svg), 'Room QR');
  }

  function printAllRooms() {
    if (!rooms.length) return toast.error('No rooms to print');
    openPrintWindow(
      rooms.map((r) => { const s = getRoomSvg(r.id); return s ? roomCardHtml(r.number, r.name, `${origin}/room/${r.id}`, s) : ''; }).join(''),
      'Room QR Codes',
    );
  }

  // â”€â”€ Shared input style â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const inp = (focus: string) =>
    `border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-1 ${focus} bg-white`;
  const locationTabs = [
    { key: 'tables' as const, label: 'Tables', Icon: Table2, count: tables.length },
    { key: 'rooms' as const, label: 'Rooms', Icon: BedDouble, count: rooms.length },
    { key: 'takeaway' as const, label: 'Takeaway', Icon: ShoppingBag, count: takeawayUrl ? 1 : 0 },
    { key: 'delivery' as const, label: 'Delivery', Icon: Truck, count: deliveryUrl ? 1 : 0 },
  ];

  const canPrintActive =
    activeTab === 'tables' ? tables.length > 0
      : activeTab === 'rooms' ? rooms.length > 0
      : activeTab === 'takeaway' ? Boolean(takeawayUrl)
      : Boolean(deliveryUrl);

  function printActiveTab() {
    if (activeTab === 'tables') printAllTables();
    else if (activeTab === 'rooms') printAllRooms();
    else if (activeTab === 'takeaway') printTakeaway();
    else printDelivery();
  }

  function renderServiceQrCard(kind: 'takeaway' | 'delivery') {
    const isTakeaway = kind === 'takeaway';
    const url = isTakeaway ? takeawayUrl : deliveryUrl;
    const activity = serviceQrActivity[kind] ?? {};
    const Icon = isTakeaway ? ShoppingBag : Truck;
    const title = isTakeaway ? 'Takeaway QR Code' : 'Delivery QR Code';
    const description = isTakeaway ? 'One QR - many pickup orders' : 'One QR - many delivery orders';
    const accent = isTakeaway
      ? {
        border: 'border-purple-100',
        icon: 'text-purple-500',
        link: 'text-purple-500 hover:text-purple-700',
        preview: 'bg-purple-50 text-purple-600 hover:bg-purple-100',
      }
      : {
        border: 'border-teal-100',
        icon: 'text-teal-500',
        link: 'text-teal-500 hover:text-teal-700',
        preview: 'bg-teal-50 text-teal-600 hover:bg-teal-100',
      };

    if (!url) {
      return (
        <div className="bg-white rounded-2xl border border-amber-100 p-6 text-center">
          <Icon size={40} className="mx-auto mb-3 text-amber-300" />
          <p className="text-sm font-semibold text-amber-700">Missing restaurant link</p>
          <p className="text-xs text-gray-400 mt-1">Connect this admin account to a restaurant before sharing this QR.</p>
        </div>
      );
    }

    return (
      <div className={`bg-white rounded-2xl p-4 shadow-sm border ${accent.border}`}>
        <div className="flex flex-col sm:flex-row sm:items-start gap-3 mb-4">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Icon size={16} className={accent.icon} />
            <div className="min-w-0">
              <h2 className="font-semibold text-gray-700 text-sm">{title}</h2>
              <p className="text-xs text-gray-400">{description}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1 rounded-lg border border-green-100 bg-green-50 px-2.5 py-1 font-semibold text-green-700">
              <Check size={12} /> Ready
            </span>
          </div>
        </div>
        <div className="grid gap-4 lg:grid-cols-[auto_minmax(0,1fr)]">
          <button
            type="button"
            className="cursor-pointer flex-shrink-0 justify-self-start"
            onClick={() => isTakeaway ? setTakeawayQrOpen(true) : setDeliveryQrOpen(true)}
            aria-label={`Preview ${title}`}
          >
            <QRCodeSVG value={url} size={96} />
          </button>
          <div className="flex-1 min-w-0">
            <a href={url} target="_blank" rel="noopener noreferrer" className={`block rounded-md py-2 text-xs ${accent.link} hover:underline break-all mb-3`}>{url}</a>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3">
              <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Status</p>
                <p className="text-xs font-semibold text-green-700">Ready</p>
              </div>
              <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Last printed</p>
                <p className="text-xs font-semibold text-gray-700">{formatActivityTime(activity.printedAt)}</p>
              </div>
              <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Last downloaded</p>
                <p className="text-xs font-semibold text-gray-700">{formatActivityTime(activity.downloadedAt)}</p>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <a href={url} target="_blank" rel="noopener noreferrer" role="button" className="flex items-center gap-1.5 text-xs bg-gray-900 text-white px-3 py-2 rounded-lg hover:bg-gray-800 transition-colors font-semibold">
                <ExternalLink size={12} /> Open customer page
              </a>
              <button onClick={() => isTakeaway ? setTakeawayQrOpen(true) : setDeliveryQrOpen(true)} className={`flex items-center gap-1 text-xs px-3 py-1.5 rounded-full transition-colors font-medium ${accent.preview}`}>
                <QrCode size={12} /> Preview
              </button>
              <button onClick={isTakeaway ? printTakeaway : printDelivery} className="flex items-center gap-1 text-xs bg-gray-100 text-gray-600 px-3 py-1.5 rounded-full hover:bg-gray-200 transition-colors font-medium">
                <Printer size={12} /> Print
              </button>
              <button onClick={isTakeaway ? downloadTakeawayQr : downloadDeliveryQr} className="flex items-center gap-1 text-xs bg-blue-50 text-blue-600 px-3 py-1.5 rounded-full hover:bg-blue-100 transition-colors font-medium">
                <Download size={12} /> PNG
              </button>
              <button onClick={() => copyUrl(url)} className="flex items-center gap-1 text-xs bg-gray-50 text-gray-600 px-3 py-1.5 rounded-full hover:bg-gray-100 transition-colors font-medium">
                {copiedUrl === url ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
                {copiedUrl === url ? 'Copied' : 'Copy URL'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {modal}
      <AdminSidebar />
      <main className="flex-1 overflow-y-auto mt-14 md:mt-0">

      {/* Hidden QR renders  -  SVG for print, Canvas for PNG download */}
      <div className="hidden" aria-hidden>
        {tables.map((t) => (
          <div key={t.id}>
            <div ref={(el) => { if (el) tableQrRefs.current.set(t.id, el); else tableQrRefs.current.delete(t.id); }}>
              <QRCodeSVG value={`${origin}/welcome/${t.id}`} size={220} />
            </div>
            <div ref={(el) => { if (el) tableCanvasRefs.current.set(t.id, el); else tableCanvasRefs.current.delete(t.id); }}>
              <QRCodeCanvas value={`${origin}/welcome/${t.id}`} size={512} />
            </div>
          </div>
        ))}
        {takeawayUrl && (
          <>
            <div ref={takeawayQrRef}><QRCodeSVG value={takeawayUrl} size={220} /></div>
            <div ref={takeawayCanvasRef}><QRCodeCanvas value={takeawayUrl} size={512} /></div>
          </>
        )}
        {deliveryUrl && (
          <>
            <div ref={deliveryQrRef}><QRCodeSVG value={deliveryUrl} size={220} /></div>
            <div ref={deliveryCanvasRef}><QRCodeCanvas value={deliveryUrl} size={512} /></div>
          </>
        )}
        {rooms.map((r) => (
          <div key={r.id}>
            <div ref={(el) => { if (el) roomQrRefs.current.set(r.id, el); else roomQrRefs.current.delete(r.id); }}>
              <QRCodeSVG value={`${origin}/room/${r.id}`} size={220} />
            </div>
            <div ref={(el) => { if (el) roomCanvasRefs.current.set(r.id, el); else roomCanvasRefs.current.delete(r.id); }}>
              <QRCodeCanvas value={`${origin}/room/${r.id}`} size={512} />
            </div>
          </div>
        ))}
      </div>

      {/* â”€â”€ Header â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <AdminHeader title="Locations & QR Codes" backTo="/admin?group=menu-qr" />

      <div className="flex items-start">
        <aside className="w-[216px] shrink-0 self-stretch border-r border-gray-100 bg-white p-3">
          <nav className="space-y-2" aria-label="Location sections">
            {locationTabs.map(({ key, label, Icon, count }) => {
              const active = activeTab === key;
              return (
                <button
                  key={key}
                  onClick={() => switchTab(key)}
                  className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors ${
                    active
                      ? 'bg-green-700 text-white shadow-sm'
                      : 'bg-gray-50 text-gray-500 hover:bg-gray-100 hover:text-gray-800'
                  }`}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <Icon size={15} className="shrink-0" />
                    <span className="truncate">{label}</span>
                  </span>
                  <span className={`shrink-0 text-xs font-bold tabular-nums ${active ? 'text-white/80' : 'text-gray-400'}`}>{count}</span>
                </button>
              );
            })}
          </nav>
          <button
            onClick={printActiveTab}
            disabled={!canPrintActive}
            className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg bg-gray-900 px-3 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-gray-800 disabled:opacity-40"
          >
            <Printer size={14} /> {activeTab === 'tables' || activeTab === 'rooms' ? 'Print All' : 'Print QR'}
          </button>
        </aside>

        <div className="flex-1 min-w-0 px-3 sm:px-4 lg:px-6 py-4 space-y-4">

        {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• TABLES TAB â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
        {activeTab === 'tables' && (
          <>
            {/* Add table */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <h2 className="font-semibold text-gray-700 mb-3 text-sm">Add Table</h2>
              <div className="flex gap-2 flex-wrap">
                <label className="flex w-24 flex-col gap-1 text-xs font-semibold text-gray-500">
                  Table #
                  <input type="number" value={tableNum} onChange={(e) => setTableNum(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addTable()} placeholder="1"
                    className={inp('focus:ring-orange-300')} />
                </label>
                <label className="flex w-24 flex-col gap-1 text-xs font-semibold text-gray-500">
                  Seats
                  <input type="number" value={tableSeats} onChange={(e) => setTableSeats(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addTable()} placeholder="4"
                    className={inp('focus:ring-orange-300')} />
                </label>
                <button onClick={addTable} className="flex items-center gap-1 bg-orange-500 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-orange-600 transition-colors">
                  <Plus size={14} /> Add
                </button>
              </div>
            </div>

            {/* Tables grid */}
            {tables.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <Table2 size={40} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">No tables yet. Add your first table above.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
                {tables.map((table) => (
                  <div key={table.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 text-center">
                    {editingTable?.id === table.id ? (
                      <>
                        <div className="flex gap-1.5 mb-2">
                          <input
                            type="number"
                            value={editingTable.number}
                            onChange={(e) => setEditingTable({ ...editingTable, number: e.target.value })}
                            onKeyDown={(e) => { if (e.key === 'Enter') saveTable(); if (e.key === 'Escape') setEditingTable(null); }}
                            placeholder="Table #"
                            className="w-full border border-gray-200 rounded-lg px-2 py-1 text-sm text-center focus:outline-none focus:ring-2 focus:ring-orange-300"
                            autoFocus
                          />
                          <input
                            type="number"
                            value={editingTable.seats}
                            onChange={(e) => setEditingTable({ ...editingTable, seats: e.target.value })}
                            onKeyDown={(e) => { if (e.key === 'Enter') saveTable(); if (e.key === 'Escape') setEditingTable(null); }}
                            placeholder="Seats"
                            className="w-full border border-gray-200 rounded-lg px-2 py-1 text-sm text-center focus:outline-none focus:ring-2 focus:ring-orange-300"
                          />
                        </div>
                        <div className="flex gap-1.5 justify-center">
                          <button onClick={saveTable} className="flex items-center gap-1 text-xs bg-orange-500 text-white px-3 py-1 rounded-full hover:bg-orange-600 transition-colors font-medium">
                            <Check size={11} /> Save
                          </button>
                          <button onClick={() => setEditingTable(null)} className="flex items-center text-xs bg-gray-100 text-gray-500 px-2.5 py-1 rounded-full hover:bg-gray-200 transition-colors" aria-label={`Cancel editing table ${table.number}`}>
                            <X size={11} />
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <p className="text-2xl font-bold text-gray-900 mb-0.5">{table.number}</p>
                        <p className="text-xs text-gray-400 mb-3">{table.seats} seats</p>
                        <div className="flex justify-center gap-1.5 flex-wrap">
                          <button onClick={() => setTableQrPreview(table)} className="flex items-center gap-1 text-xs bg-orange-50 text-orange-600 px-2.5 py-1 rounded-full hover:bg-orange-100 transition-colors">
                            <QrCode size={12} /> QR
                          </button>
                          <button onClick={() => printOneTable(table)} className="flex items-center gap-1 text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full hover:bg-gray-200 transition-colors">
                            <Printer size={12} /> Print
                          </button>
                          <button onClick={() => downloadTableQr(table)} className="flex items-center gap-1 text-xs bg-blue-50 text-blue-600 px-2.5 py-1 rounded-full hover:bg-blue-100 transition-colors">
                            <Download size={12} /> PNG
                          </button>
                          <button onClick={() => setEditingTable({ id: table.id, number: String(table.number), seats: String(table.seats) })} className="flex items-center text-xs bg-amber-50 text-amber-600 px-2.5 py-1 rounded-full hover:bg-amber-100 transition-colors" aria-label={`Edit table ${table.number}`} title={`Edit table ${table.number}`}>
                            <Pencil size={12} />
                          </button>
                          <button onClick={() => delTable(table.id, table.number)} className="flex items-center text-xs bg-red-50 text-red-500 px-2.5 py-1 rounded-full hover:bg-red-100 transition-colors" aria-label={`Delete table ${table.number}`} title={`Delete table ${table.number}`}>
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• ROOMS TAB â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
        {activeTab === 'rooms' && (
          <>
            {/* Add room */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <h2 className="font-semibold text-gray-700 mb-3 text-sm">Add Room</h2>
              <div className="flex gap-2 flex-wrap">
                <label className="flex w-24 flex-col gap-1 text-xs font-semibold text-gray-500">
                  Room #
                  <input type="number" value={roomNum} onChange={(e) => setRoomNum(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addRoom()} placeholder="101"
                    className={inp('focus:ring-blue-300')} />
                </label>
                <label className="flex flex-1 min-w-32 flex-col gap-1 text-xs font-semibold text-gray-500">
                  Room name
                  <input type="text" value={roomName} onChange={(e) => setRoomName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addRoom()} placeholder="Optional"
                    className={inp('focus:ring-blue-300')} />
                </label>
                <button onClick={addRoom} className="flex items-center gap-1 bg-blue-500 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors">
                  <Plus size={14} /> Add
                </button>
              </div>
            </div>

            {/* Rooms grid */}
            {rooms.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <BedDouble size={40} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">No rooms yet. Add your first room above.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
                {rooms.map((room) => (
                  <div key={room.id} className="bg-white rounded-2xl shadow-sm border border-blue-50 p-4 text-center">
                    <div className="flex items-center justify-center gap-1.5 mb-0.5">
                      <BedDouble size={14} className="text-blue-400" />
                      <p className="text-2xl font-bold text-gray-900">{room.number}</p>
                    </div>
                    {room.name
                      ? <p className="text-xs text-gray-400 mb-3 truncate">{room.name}</p>
                      : <div className="mb-3" />}
                    <div className="flex justify-center gap-1.5 flex-wrap">
                      <button onClick={() => setRoomQrPreview(room)} className="flex items-center gap-1 text-xs bg-blue-50 text-blue-600 px-2.5 py-1 rounded-full hover:bg-blue-100 transition-colors">
                        <QrCode size={12} /> QR
                      </button>
                      <button onClick={() => printOneRoom(room)} className="flex items-center gap-1 text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full hover:bg-gray-200 transition-colors">
                        <Printer size={12} /> Print
                      </button>
                      <button onClick={() => downloadRoomQr(room)} className="flex items-center gap-1 text-xs bg-indigo-50 text-indigo-600 px-2.5 py-1 rounded-full hover:bg-indigo-100 transition-colors">
                        <Download size={12} /> PNG
                      </button>
                      <button onClick={() => delRoom(room.id, room.number)} className="flex items-center text-xs bg-red-50 text-red-500 px-2.5 py-1 rounded-full hover:bg-red-100 transition-colors">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === 'takeaway' && renderServiceQrCard('takeaway')}

        {activeTab === 'delivery' && renderServiceQrCard('delivery')}
        </div>
      </div>

      {/* â”€â”€ Takeaway QR modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {takeawayQrOpen && takeawayUrl && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setTakeawayQrOpen(false)}>
          <div className="bg-white rounded-3xl p-6 flex flex-col items-center gap-4 w-full max-w-xs" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2">
              <ShoppingBag size={18} className="text-purple-500" />
              <h2 className="font-bold text-gray-900 text-lg">Takeaway QR</h2>
            </div>
            <p className="text-xs text-gray-400 -mt-2 text-center">Customers scan this to place takeaway orders</p>
            <a href={takeawayUrl} target="_blank" rel="noopener noreferrer" title="Open link" className="p-3 bg-gray-50 rounded-2xl">
              <QRCodeSVG value={takeawayUrl} size={200} />
            </a>
            <button onClick={() => copyUrl(takeawayUrl)} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 transition-colors">
              {copiedUrl === takeawayUrl ? <Check size={13} className="text-green-500" /> : <Copy size={13} />}
              {copiedUrl === takeawayUrl ? 'Copied!' : <span className="truncate max-w-[220px]">{takeawayUrl}</span>}
            </button>
            <div className="grid grid-cols-3 gap-2 w-full">
              <button onClick={() => { printTakeaway(); setTakeawayQrOpen(false); }} className="flex flex-col items-center gap-1 bg-purple-600 text-white py-2.5 rounded-xl text-xs font-medium hover:bg-purple-700 transition-colors">
                <Printer size={15} /> Print
              </button>
              <button onClick={downloadTakeawayQr} className="flex flex-col items-center gap-1 bg-blue-600 text-white py-2.5 rounded-xl text-xs font-medium hover:bg-blue-700 transition-colors">
                <Download size={15} /> Download
              </button>
              <button onClick={() => setTakeawayQrOpen(false)} className="flex flex-col items-center gap-1 bg-gray-100 text-gray-700 py-2.5 rounded-xl text-xs font-medium hover:bg-gray-200 transition-colors">
                <Check size={15} className="opacity-0" /> Close
              </button>
            </div>
          </div>
        </div>
      )}

      {deliveryQrOpen && deliveryUrl && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setDeliveryQrOpen(false)}>
          <div className="bg-white rounded-3xl p-6 flex flex-col items-center gap-4 w-full max-w-xs" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2">
              <Truck size={18} className="text-teal-500" />
              <h2 className="font-bold text-gray-900 text-lg">Delivery QR</h2>
            </div>
            <p className="text-xs text-gray-400 -mt-2 text-center">Customers scan this to place delivery orders</p>
            <a href={deliveryUrl} target="_blank" rel="noopener noreferrer" title="Open link" className="p-3 bg-gray-50 rounded-2xl">
              <QRCodeSVG value={deliveryUrl} size={200} />
            </a>
            <button onClick={() => copyUrl(deliveryUrl)} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 transition-colors">
              {copiedUrl === deliveryUrl ? <Check size={13} className="text-green-500" /> : <Copy size={13} />}
              {copiedUrl === deliveryUrl ? 'Copied!' : <span className="truncate max-w-[220px]">{deliveryUrl}</span>}
            </button>
            <div className="grid grid-cols-3 gap-2 w-full">
              <button onClick={() => { printDelivery(); setDeliveryQrOpen(false); }} className="flex flex-col items-center gap-1 bg-teal-600 text-white py-2.5 rounded-xl text-xs font-medium hover:bg-teal-700 transition-colors">
                <Printer size={15} /> Print
              </button>
              <button onClick={downloadDeliveryQr} className="flex flex-col items-center gap-1 bg-blue-600 text-white py-2.5 rounded-xl text-xs font-medium hover:bg-blue-700 transition-colors">
                <Download size={15} /> Download
              </button>
              <button onClick={() => setDeliveryQrOpen(false)} className="flex flex-col items-center gap-1 bg-gray-100 text-gray-700 py-2.5 rounded-xl text-xs font-medium hover:bg-gray-200 transition-colors">
                <Check size={15} className="opacity-0" /> Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* â”€â”€ Table QR modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {tableQrPreview && (() => {
        const tableUrl = `${origin}/welcome/${tableQrPreview.id}`;
        return (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setTableQrPreview(null)}>
            <div className="bg-white rounded-3xl p-6 flex flex-col items-center gap-4 w-full max-w-xs" onClick={(e) => e.stopPropagation()}>
              <div className="text-center">
                <h2 className="font-bold text-gray-900 text-lg">Table {tableQrPreview.number}</h2>
                <p className="text-xs text-gray-400">{tableQrPreview.seats} seats</p>
              </div>
              <a href={tableUrl} target="_blank" rel="noopener noreferrer" title="Open link" className="p-3 bg-gray-50 rounded-2xl">
                <QRCodeSVG value={tableUrl} size={200} />
              </a>
              <button onClick={() => copyUrl(tableUrl)} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 transition-colors">
                {copiedUrl === tableUrl ? <Check size={13} className="text-green-500" /> : <Copy size={13} />}
                {copiedUrl === tableUrl ? 'Copied!' : <span className="truncate max-w-[220px]">{tableUrl}</span>}
              </button>
              <div className="grid grid-cols-3 gap-2 w-full">
                <button onClick={() => { printOneTable(tableQrPreview); setTableQrPreview(null); }} className="flex flex-col items-center gap-1 bg-gray-800 text-white py-2.5 rounded-xl text-xs font-medium hover:bg-gray-900 transition-colors">
                  <Printer size={15} /> Print
                </button>
                <button onClick={() => downloadTableQr(tableQrPreview)} className="flex flex-col items-center gap-1 bg-blue-600 text-white py-2.5 rounded-xl text-xs font-medium hover:bg-blue-700 transition-colors">
                  <Download size={15} /> Download
                </button>
                <button onClick={() => setTableQrPreview(null)} className="flex flex-col items-center gap-1 bg-gray-100 text-gray-700 py-2.5 rounded-xl text-xs font-medium hover:bg-gray-200 transition-colors">
                  <Check size={15} className="opacity-0" /> Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* â”€â”€ Room QR modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {roomQrPreview && (() => {
        const roomUrl = `${origin}/room/${roomQrPreview.id}`;
        return (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setRoomQrPreview(null)}>
            <div className="bg-white rounded-3xl p-6 flex flex-col items-center gap-4 w-full max-w-xs" onClick={(e) => e.stopPropagation()}>
              <div className="text-center">
                <div className="flex items-center justify-center gap-2">
                  <BedDouble size={20} className="text-blue-500" />
                  <h2 className="font-bold text-gray-900 text-lg">Room {roomQrPreview.number}</h2>
                </div>
                {roomQrPreview.name && <p className="text-xs text-gray-400">{roomQrPreview.name}</p>}
              </div>
              <a href={roomUrl} target="_blank" rel="noopener noreferrer" title="Open link" className="p-3 bg-gray-50 rounded-2xl">
                <QRCodeSVG value={roomUrl} size={200} />
              </a>
              <button onClick={() => copyUrl(roomUrl)} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 transition-colors">
                {copiedUrl === roomUrl ? <Check size={13} className="text-green-500" /> : <Copy size={13} />}
                {copiedUrl === roomUrl ? 'Copied!' : <span className="truncate max-w-[220px]">{roomUrl}</span>}
              </button>
              <div className="grid grid-cols-3 gap-2 w-full">
                <button onClick={() => { printOneRoom(roomQrPreview); setRoomQrPreview(null); }} className="flex flex-col items-center gap-1 bg-blue-600 text-white py-2.5 rounded-xl text-xs font-medium hover:bg-blue-700 transition-colors">
                  <Printer size={15} /> Print
                </button>
                <button onClick={() => downloadRoomQr(roomQrPreview)} className="flex flex-col items-center gap-1 bg-indigo-600 text-white py-2.5 rounded-xl text-xs font-medium hover:bg-indigo-700 transition-colors">
                  <Download size={15} /> Download
                </button>
                <button onClick={() => setRoomQrPreview(null)} className="flex flex-col items-center gap-1 bg-gray-100 text-gray-700 py-2.5 rounded-xl text-xs font-medium hover:bg-gray-200 transition-colors">
                  <Check size={15} className="opacity-0" /> Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}
      </main>
    </div>
  );
}
