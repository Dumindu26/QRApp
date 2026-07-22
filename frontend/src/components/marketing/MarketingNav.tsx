import { useState } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { RequestDemoModal } from './RequestDemoModal';

export function BrandLogo({ className = 'h-7 sm:h-8' }: { className?: string }) {
  return (
    <Link to="/" className="inline-flex items-center" aria-label="Order Live">
      <img src="/orderlive-logo.png" alt="orderlive.online" className={`${className} w-auto object-contain`} />
    </Link>
  );
}

export function MarketingNav({
  variant = 'light',
  themeSwitcher,
  sectionLinks,
}: {
  variant?: 'light' | 'dark';
  themeSwitcher?: ReactNode;
  sectionLinks?: { label: string; href: string }[];
}) {
  const [demoOpen, setDemoOpen] = useState(false);
  const dark = variant === 'dark';
  return (
    <>
      <header className={`sticky top-0 z-40 backdrop-blur border-b ${dark ? 'bg-black/78 border-emerald-900/70' : 'bg-white/80 border-gray-100'}`}>
        <nav className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between gap-4">
          <div className={`shrink-0 ${dark ? 'rounded-xl bg-white px-2.5 py-1 shadow-sm shadow-emerald-500/10' : ''}`}>
            <BrandLogo />
          </div>
          {sectionLinks && sectionLinks.length > 0 && (
            <div className={`hidden xl:flex items-center gap-5 text-sm font-medium whitespace-nowrap ${dark ? 'text-emerald-100/75' : 'text-gray-600'}`}>
              {sectionLinks.map((l) => (
                <a key={l.href} href={l.href} className={`shrink-0 ${dark ? 'hover:text-white' : 'hover:text-gray-900'}`}>{l.label}</a>
              ))}
            </div>
          )}
          <div className="flex items-center gap-1 sm:gap-2 text-sm font-medium shrink-0 whitespace-nowrap">
            {themeSwitcher}
            <button onClick={() => setDemoOpen(true)} className={`hidden lg:inline-block px-3 py-2 ${dark ? 'text-emerald-100/80 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}>Request a demo</button>
            <Link to="/login" className={`hidden sm:inline-block px-3 py-2 ${dark ? 'text-emerald-100/80 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}>Log in</Link>
            <Link to="/signup" className={`px-4 py-2 rounded-full text-white transition-colors ${dark ? 'bg-emerald-500 hover:bg-emerald-400' : 'bg-orange-500 hover:bg-orange-600'}`}>Start free</Link>
          </div>
        </nav>
      </header>
      {/* Rendered outside <header>: its backdrop-blur would otherwise become the
          containing block for this fixed-position modal and trap it in the nav. */}
      <RequestDemoModal open={demoOpen} onClose={() => setDemoOpen(false)} />
    </>
  );
}

export function MarketingFooter({ variant = 'light' }: { variant?: 'light' | 'dark' }) {
  const dark = variant === 'dark';
  return (
    <footer className={`border-t mt-20 ${dark ? 'border-emerald-900/70 bg-black' : 'border-gray-100'}`}>
      <div className={`max-w-6xl mx-auto px-5 py-10 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm ${dark ? 'text-emerald-100/50' : 'text-gray-400'}`}>
        <span>© {new Date().getFullYear()} Order Live · QR ordering &amp; POS for restaurants · orderlive.online</span>
        <div className="flex gap-4">
          <Link to="/login" className={dark ? 'hover:text-emerald-200' : 'hover:text-gray-600'}>Log in</Link>
          <Link to="/signup" className={dark ? 'hover:text-emerald-200' : 'hover:text-gray-600'}>Sign up</Link>
        </div>
      </div>
    </footer>
  );
}
