import { useState } from 'react';
import { Link } from 'react-router-dom';
import { RequestDemoModal } from './RequestDemoModal';

export function BrandLogo({ className = 'h-7 sm:h-8' }: { className?: string }) {
  return (
    <Link to="/" className="inline-flex items-center" aria-label="Order Live">
      <img src="/orderlive-logo.png" alt="orderlive.online" className={`${className} w-auto object-contain`} />
    </Link>
  );
}

export function MarketingNav() {
  const [demoOpen, setDemoOpen] = useState(false);
  return (
    <>
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur border-b border-gray-100">
        <nav className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
          <BrandLogo />
          <div className="flex items-center gap-1 sm:gap-3 text-sm font-medium">
            <Link to="/pricing" className="px-3 py-2 text-gray-600 hover:text-gray-900">Pricing</Link>
            <button onClick={() => setDemoOpen(true)} className="hidden sm:inline-block px-3 py-2 text-gray-600 hover:text-gray-900">Request a demo</button>
            <Link to="/login" className="px-3 py-2 text-gray-600 hover:text-gray-900">Log in</Link>
            <Link to="/signup" className="px-4 py-2 rounded-full bg-orange-500 text-white hover:bg-orange-600 transition-colors">Start free</Link>
          </div>
        </nav>
      </header>
      {/* Rendered outside <header>: its backdrop-blur would otherwise become the
          containing block for this fixed-position modal and trap it in the nav. */}
      <RequestDemoModal open={demoOpen} onClose={() => setDemoOpen(false)} />
    </>
  );
}

export function MarketingFooter() {
  return (
    <footer className="border-t border-gray-100 mt-20">
      <div className="max-w-6xl mx-auto px-5 py-10 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-400">
        <span>© {new Date().getFullYear()} Order Live · QR ordering &amp; POS for restaurants · orderlive.online</span>
        <div className="flex gap-4">
          <Link to="/pricing" className="hover:text-gray-600">Pricing</Link>
          <Link to="/login" className="hover:text-gray-600">Log in</Link>
          <Link to="/signup" className="hover:text-gray-600">Sign up</Link>
        </div>
      </div>
    </footer>
  );
}
