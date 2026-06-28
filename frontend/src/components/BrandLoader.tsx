// Branded full-screen splash / loading state — a logo inside a spinning ring,
// with a gentle pulse. Used as the route Suspense fallback and while auth loads.
//
// `logo` lets customer-facing screens show the restaurant's own logo (set by
// the admin); it falls back to the Order Live app icon when not provided.
export function BrandLoader({ label = 'Loading…', logo }: { label?: string; logo?: string | null }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-5 bg-gradient-to-br from-orange-50/60 via-white to-white">
      <div className="relative w-24 h-24 flex items-center justify-center">
        {/* Spinning accent ring */}
        <span className="absolute inset-0 rounded-full border-[3px] border-orange-100 border-t-orange-500 animate-spin" />
        {/* Logo — gentle breathing pulse */}
        <img
          src={logo || '/orderlive-icon.png'}
          alt=""
          className="w-14 h-14 object-contain animate-pulse"
        />
      </div>
      <p className="text-sm font-medium text-gray-400 animate-pulse">{label}</p>
    </div>
  );
}
