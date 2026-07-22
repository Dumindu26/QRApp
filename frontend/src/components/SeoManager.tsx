import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const SITE_URL = 'https://orderlive.online';
const SOCIAL_IMAGE = `${SITE_URL}/pwa-512.png`;

type SeoConfig = {
  title: string;
  description: string;
  index: boolean;
  type?: 'website' | 'restaurant';
};

const DEFAULT_SEO: SeoConfig = {
  title: 'Order Live | QR Ordering & Restaurant POS',
  description: 'Run QR ordering, takeaway, delivery, kitchen operations and restaurant POS from one easy platform.',
  index: false,
};

function getSeo(pathname: string): SeoConfig {
  if (pathname === '/') {
    return { ...DEFAULT_SEO, index: true };
  }
  if (pathname === '/signup') {
    return {
      title: 'Start Your Free Restaurant Ordering Trial | Order Live',
      description: 'Create your Order Live account and start managing QR orders, takeaway, delivery and restaurant operations.',
      index: true,
    };
  }
  if (pathname.startsWith('/takeaway/')) {
    return {
      title: 'Order Takeaway Online | Order Live',
      description: 'Browse the restaurant menu and place a takeaway order online with Order Live.',
      index: true,
      type: 'restaurant',
    };
  }
  if (pathname.startsWith('/delivery/')) {
    return {
      title: 'Order Food Delivery Online | Order Live',
      description: 'Browse the restaurant menu and place a delivery order online with Order Live.',
      index: true,
      type: 'restaurant',
    };
  }
  return DEFAULT_SEO;
}

function setMeta(selector: string, attribute: 'name' | 'property', key: string, content: string) {
  let element = document.head.querySelector<HTMLMetaElement>(selector);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }
  element.content = content;
}

export function SeoManager() {
  const { pathname } = useLocation();

  useEffect(() => {
    const seo = getSeo(pathname);
    const canonicalUrl = `${SITE_URL}${pathname === '/' ? '' : pathname}`;
    const robots = seo.index ? 'index, follow, max-image-preview:large' : 'noindex, nofollow, noarchive';

    document.title = seo.title;
    setMeta('meta[name="description"]', 'name', 'description', seo.description);
    setMeta('meta[name="robots"]', 'name', 'robots', robots);
    setMeta('meta[name="googlebot"]', 'name', 'googlebot', robots);
    setMeta('meta[property="og:title"]', 'property', 'og:title', seo.title);
    setMeta('meta[property="og:description"]', 'property', 'og:description', seo.description);
    setMeta('meta[property="og:type"]', 'property', 'og:type', seo.type ?? 'website');
    setMeta('meta[property="og:url"]', 'property', 'og:url', canonicalUrl);
    setMeta('meta[property="og:image"]', 'property', 'og:image', SOCIAL_IMAGE);
    setMeta('meta[property="og:site_name"]', 'property', 'og:site_name', 'Order Live');
    setMeta('meta[name="twitter:card"]', 'name', 'twitter:card', 'summary_large_image');
    setMeta('meta[name="twitter:title"]', 'name', 'twitter:title', seo.title);
    setMeta('meta[name="twitter:description"]', 'name', 'twitter:description', seo.description);
    setMeta('meta[name="twitter:image"]', 'name', 'twitter:image', SOCIAL_IMAGE);

    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    canonical.href = canonicalUrl;

    const schemaId = 'order-live-structured-data';
    document.getElementById(schemaId)?.remove();
    if (seo.index) {
      const schema = document.createElement('script');
      schema.id = schemaId;
      schema.type = 'application/ld+json';
      schema.text = JSON.stringify({
        '@context': 'https://schema.org',
        '@type': pathname === '/' ? 'SoftwareApplication' : 'WebPage',
        name: pathname === '/' ? 'Order Live' : seo.title,
        url: canonicalUrl,
        description: seo.description,
        ...(pathname === '/' ? { applicationCategory: 'BusinessApplication', operatingSystem: 'Web' } : {}),
      });
      document.head.appendChild(schema);
    }
  }, [pathname]);

  return null;
}
