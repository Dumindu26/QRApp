// Branded full-screen splash / loading state. Used as the route Suspense
// fallback and while auth loads.
//
// `logo` lets customer-facing screens show the restaurant's own logo (set by
// the admin); it falls back to the wide Order Live landing logo when not
// provided.
export function BrandLoader({ label = 'Loading…', logo }: { label?: string; logo?: string | null }) {
  const hasRestaurantLogo = Boolean(logo);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-5 bg-gradient-to-br from-orange-50/60 via-white to-white px-6">
      <div
        className={
          hasRestaurantLogo
            ? 'relative flex h-28 w-28 items-center justify-center rounded-3xl bg-white shadow-lg ring-1 ring-orange-100 brand-loader-blink'
            : 'relative flex w-full max-w-sm items-center justify-center brand-loader-blink'
        }
      >
        <img
          src={logo || '/orderlive-logo.png'}
          alt=""
          className={hasRestaurantLogo ? 'h-20 w-20 object-contain' : 'h-auto w-full object-contain'}
        />
      </div>
      <p className="brand-loader-text text-sm font-medium text-gray-400">{label}</p>
    </div>
  );
}
