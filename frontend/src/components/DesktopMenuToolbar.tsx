import { useEffect, useRef, useState } from 'react';
import { Heart, Search, X } from 'lucide-react';

interface Props {
  search: string;
  onSearchChange: (value: string) => void;
  favouritesActive: boolean;
  onToggleFavourites: () => void;
  favouriteCount: number;
}

export function DesktopMenuToolbar({
  search,
  onSearchChange,
  favouritesActive,
  onToggleFavourites,
  favouriteCount,
}: Props) {
  const [open, setOpen] = useState(Boolean(search));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  return (
    <div className="hidden items-center gap-2 md:flex">
      <div className={`relative transition-all duration-200 ${open ? 'w-56 xl:w-72' : 'w-10'}`}>
        {open ? (
          <>
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              ref={inputRef}
              type="search"
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              onKeyDown={(event) => { if (event.key === 'Escape' && !search) setOpen(false); }}
              placeholder="Search menu..."
              aria-label="Search menu"
              className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-9 text-sm outline-none focus:border-green-400 focus:ring-1 focus:ring-green-200"
            />
            <button
              onClick={() => search ? onSearchChange('') : setOpen(false)}
              className="absolute right-2.5 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full bg-gray-200 text-gray-500"
              aria-label={search ? 'Clear search' : 'Close search'}
            >
              <X size={11} />
            </button>
          </>
        ) : (
          <button
            onClick={() => setOpen(true)}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 hover:border-green-400 hover:text-green-700"
            title="Search menu"
            aria-label="Search menu"
          >
            <Search size={17} />
          </button>
        )}
      </div>
      <button
        onClick={onToggleFavourites}
        className={`relative flex h-10 w-10 items-center justify-center rounded-xl border transition-colors ${
          favouritesActive
            ? 'border-red-400 bg-red-50 text-red-500'
            : 'border-gray-200 bg-white text-gray-500 hover:border-red-300 hover:text-red-500'
        }`}
        title="Favourite items"
        aria-label="Favourite items"
        aria-pressed={favouritesActive}
      >
        <Heart size={17} className={favouritesActive ? 'fill-current' : ''} />
        {favouriteCount > 0 && (
          <span className="absolute -right-1 -top-1 min-w-4 rounded-full bg-red-500 px-1 text-[9px] font-bold leading-4 text-white">
            {favouriteCount}
          </span>
        )}
      </button>
    </div>
  );
}
