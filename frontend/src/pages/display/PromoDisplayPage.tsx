import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { promoScreenService, type PromoScreen, type PromoScreenItem } from '../../services/promoScreenService';

export function PromoDisplayPage() {
  const { token = '' } = useParams();
  const [screen, setScreen] = useState<PromoScreen | null>(null);
  const [items, setItems] = useState<PromoScreenItem[]>([]);
  const [index, setIndex] = useState(0);
  const [status, setStatus] = useState<'loading' | 'ready' | 'missing'>('loading');
  const refreshRef = useRef<string | null>(null);
  const rotationSeconds = Math.max(screen?.rotationSeconds || 12, 5);

  useEffect(() => {
    let alive = true;
    const load = () => {
      if (!token) return;
      promoScreenService.getPublicDisplay(token)
        .then((data) => {
          if (!alive) return;
          if (refreshRef.current && refreshRef.current !== data.screen.updatedAt) {
            window.location.reload();
            return;
          }
          refreshRef.current = data.screen.updatedAt;
          setScreen(data.screen);
          setItems(data.items);
          setStatus('ready');
          setIndex((cur) => data.items.length ? cur % data.items.length : 0);
        })
        .catch(() => alive && setStatus('missing'));
    };
    load();
    const id = setInterval(load, 5_000);
    return () => { alive = false; clearInterval(id); };
  }, [token]);

  useEffect(() => {
    if (!screen || items.length <= 1) return;
    const interval = rotationSeconds * 1000;
    const id = setInterval(() => setIndex((cur) => (cur + 1) % items.length), interval);
    return () => clearInterval(id);
  }, [rotationSeconds, items.length, screen?.id]);

  const item = items[index] ?? null;
  const clock = useMemo(() => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), [index]);

  if (status === 'loading') {
    return <div className="min-h-screen bg-black text-white grid place-items-center text-sm">Loading display...</div>;
  }

  if (status === 'missing' || !screen) {
    return <div className="min-h-screen bg-black text-white grid place-items-center text-sm">Display unavailable</div>;
  }

  return (
    <div className="relative min-h-screen overflow-hidden text-white" style={{ backgroundColor: screen.backgroundColor }}>
      {item ? (
        <>
          <img
            key={item.id}
            src={item.imageUrl}
            alt={item.title || screen.name}
            className={`absolute inset-0 h-full w-full transition-opacity duration-700 ${screen.fitMode === 'contain' ? 'object-contain' : 'object-cover'}`}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-black/35" />
          {(item.title || item.subtitle) && (
            <div className="absolute left-8 right-8 bottom-8 sm:left-12 sm:right-12 sm:bottom-12 max-w-5xl">
              {item.title && <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black leading-none drop-shadow-lg">{item.title}</h1>}
              {item.subtitle && <p className="mt-4 text-xl sm:text-3xl font-semibold text-white/90 drop-shadow">{item.subtitle}</p>}
            </div>
          )}
        </>
      ) : (
        <div className="min-h-screen grid place-items-center px-8 text-center">
          <div>
            <p className="text-3xl font-bold">{screen.name}</p>
            <p className="mt-3 text-white/60">No active promotions assigned</p>
          </div>
        </div>
      )}

      <header className="absolute inset-x-0 top-0 flex items-center justify-between px-8 py-6 text-white/85">
        <div className="flex items-center gap-3 min-w-0">
          {screen.restaurantLogo && <img src={screen.restaurantLogo} alt="" className="h-10 w-10 rounded-lg object-cover bg-white/10" />}
          <div className="min-w-0">
            <p className="text-sm uppercase tracking-widest text-white/60">{screen.restaurantName}</p>
            <p className="font-bold truncate">{screen.name}</p>
          </div>
        </div>
        <div className="text-2xl font-bold tabular-nums">{clock}</div>
      </header>

      {items.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2">
          {items.map((promo, i) => (
            <span key={promo.id} className={`h-1.5 rounded-full transition-all ${i === index ? 'w-10 bg-white' : 'w-2 bg-white/40'}`} />
          ))}
        </div>
      )}
    </div>
  );
}
