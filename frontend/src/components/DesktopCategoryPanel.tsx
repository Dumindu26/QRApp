import type { Category, MenuItem } from '../types';

interface Props {
  categories: Category[];
  items: MenuItem[];
  active: string;
  onChange: (id: string) => void;
}

export function DesktopCategoryPanel({ categories, items, active, onChange }: Props) {
  const entries = [{ id: 'all', name: 'All' }, ...categories];
  const countFor = (id: string) => id === 'all' ? items.length : items.filter((item) => item.category === id).length;
  return (
    <aside className="fixed bottom-0 left-0 top-[132px] z-30 hidden w-52 overflow-y-auto border-r border-gray-100 bg-gray-50 p-3 md:block">
      <div className="rounded-xl border border-gray-200 bg-white p-3">
      <div className="flex items-center justify-between px-1 pb-3">
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-gray-500">Categories</p>
        <span className="text-xs font-semibold text-gray-400">{items.length}</span>
      </div>
      <nav className="space-y-1" aria-label="Menu categories">
        {entries.map((category) => {
          const selected = active === category.id;
          return (
            <button
              key={category.id}
              type="button"
              onClick={() => onChange(category.id)}
              aria-pressed={selected}
              className={`flex w-full items-center justify-between rounded-lg border px-3 py-2.5 text-left text-sm font-semibold transition-colors ${
                selected ? 'border-green-600 bg-green-50 text-green-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <span className="truncate">{category.name}</span>
              <span className={`text-xs ${selected ? 'text-green-600' : 'text-gray-400'}`}>{countFor(category.id)}</span>
            </button>
          );
        })}
      </nav>
      </div>
    </aside>
  );
}
