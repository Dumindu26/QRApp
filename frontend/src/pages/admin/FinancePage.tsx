import { useState } from 'react';
import { Receipt, CreditCard, Tag } from 'lucide-react';
import { AdminSidebar } from '../../components/AdminSidebar';
import { AdminHeader } from '../../components/AdminHeader';
import { BillsPage } from './BillsPage';
import { RoomChargesPage } from './RoomChargesPage';
import { PromoCodesPage } from './PromoCodesPage';

type FinanceTab = 'bills' | 'room-charges' | 'promo-codes';

const TABS: { key: FinanceTab; label: string; Icon: React.ElementType }[] = [
  { key: 'bills',        label: 'Bills',        Icon: Receipt    },
  { key: 'room-charges', label: 'Room Charges', Icon: CreditCard },
  { key: 'promo-codes',  label: 'Promo Codes',  Icon: Tag        },
];

export function FinancePage() {
  const [tab, setTab] = useState<FinanceTab>(
    () => (localStorage.getItem('finance-tab') as FinanceTab) ?? 'bills',
  );

  function switchTab(t: FinanceTab) {
    setTab(t);
    localStorage.setItem('finance-tab', t);
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <AdminSidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden mt-14 md:mt-0">
        <AdminHeader title="Finance" backTo="/admin" />

        <div className="flex flex-1 min-h-0 items-start">
          <aside className="w-[180px] shrink-0 self-stretch border-r border-gray-100 bg-white p-2">
            <nav className="rounded-lg border border-gray-100 bg-white p-2" aria-label="Finance sections">
              <div className="space-y-2">
                {TABS.map(({ key, label, Icon }) => {
                  const active = tab === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => switchTab(key)}
                      className={`flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${
                        active
                          ? 'border-green-500 bg-green-50 text-green-700'
                          : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <Icon size={15} className="shrink-0" />
                      <span className="truncate">{label}</span>
                    </button>
                  );
                })}
              </div>
            </nav>
          </aside>

          <div className="flex-1 min-w-0 overflow-hidden">
            {tab === 'bills'        && <BillsPage       embedded />}
            {tab === 'room-charges' && <RoomChargesPage  embedded />}
            {tab === 'promo-codes'  && <PromoCodesPage   embedded />}
          </div>
        </div>
      </div>
    </div>
  );
}
