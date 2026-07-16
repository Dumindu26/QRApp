import { useState } from 'react';
import { MapPin, CalendarDays, LayoutGrid } from 'lucide-react';
import { AdminSidebar } from '../../components/AdminSidebar';
import { AdminHeader } from '../../components/AdminHeader';
import { FloorPlanPage } from './FloorPlanPage';
import { ReservationsPage } from './ReservationsPage';
import { TableStatusPage } from './TableStatusPage';

type FloorTab = 'floor-plan' | 'reservations' | 'table-status';

const TABS: { key: FloorTab; label: string; Icon: React.ElementType }[] = [
  { key: 'floor-plan',   label: 'Floor Plan',   Icon: MapPin       },
  { key: 'reservations', label: 'Reservations', Icon: CalendarDays },
  { key: 'table-status', label: 'Table Status', Icon: LayoutGrid   },
];

export function FloorPage() {
  const [tab, setTab] = useState<FloorTab>(
    () => (localStorage.getItem('floor-tab') as FloorTab) ?? 'floor-plan',
  );

  function switchTab(t: FloorTab) {
    setTab(t);
    localStorage.setItem('floor-tab', t);
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <AdminSidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden mt-14 md:mt-0">
        <AdminHeader title="Floor" backTo="/admin" />

        <div className="flex-1 min-h-0 flex items-start overflow-hidden">
          <aside className="w-[216px] shrink-0 self-stretch border-r border-gray-100 bg-white p-3">
            <nav className="space-y-2" aria-label="Floor sections">
              {TABS.map(({ key, label, Icon }) => {
                const active = tab === key;
                return (
                  <button
                    key={key}
                    onClick={() => switchTab(key)}
                    className={`flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors ${
                      active
                        ? 'bg-green-700 text-white shadow-sm'
                        : 'bg-gray-50 text-gray-500 hover:bg-gray-100 hover:text-gray-800'
                    }`}
                  >
                    <Icon size={15} className="shrink-0" />
                    <span className="truncate">{label}</span>
                  </button>
                );
              })}
            </nav>
          </aside>

          {/* Tab content — each panel scrolls internally */}
          <div className="flex-1 min-w-0 self-stretch overflow-hidden">
            {tab === 'floor-plan'   && <FloorPlanPage   embedded />}
            {tab === 'reservations' && <ReservationsPage embedded />}
            {tab === 'table-status' && <TableStatusPage  embedded />}
          </div>
        </div>
      </div>
    </div>
  );
}
