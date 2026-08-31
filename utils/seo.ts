// ── SEO Utilities ─────────────────────────────────────────────
// Lightweight head manager: sets document.title, meta tags, and
// JSON-LD structured data. Runs at runtime for SPA navigation and
// is also used at build time for prerendered pages.

export interface SeoConfig {
  title: string;
  description: string;
  /** Absolute canonical URL for this page (defaults to site root + path). */
  canonical?: string;
  /** OpenGraph / Twitter image (absolute URL recommended). Falls back to site og:image. */
  image?: string;
  /** Human-readable type for og:type. */
  ogType?: 'website' | 'article';
  /** JSON-LD structured data blocks to inject. */
  jsonLd?: object[];
  /** Robots directives. */
  robots?: string;
}

const SITE_NAME = 'محمد عطا';
const SITE_DEFAULT_DESC =
  'محمد عطا لتعليم مادة Science للصفوف من الرابع الابتدائي حتى الأول الثانوي. شرح مبسط، تجارب علمية، امتحانات، وخطة دراسية مخصصة.';

function currentOrigin(): string {
  const domain = (import.meta.env?.VITE_DOMAIN as string) || '';
  if (domain) {
    const d = domain.replace(/^https?:\/\//, '').replace(/\/+$/, '');
    if (d) return `https://${d}`;
  }
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  return 'https://mohamed-atta.com';
}

export const SEO = {
  siteName: SITE_NAME,
  defaultDescription: SITE_DEFAULT_DESC,

  buildTitle(title?: string): string {
    if (!title) return SITE_NAME;
    if (title.includes(SITE_NAME)) return title;
    return `${title} | ${SITE_NAME}`;
  },

  absolute(url?: string): string {
    if (!url) return `${currentOrigin()}/assets/logo.svg`;
    if (/^https?:\/\//i.test(url)) return url;
    if (url.startsWith('/')) return `${currentOrigin()}${url}`;
    return `${currentOrigin()}/${url}`;
  },
};

function upsertMeta(attr: 'name' | 'property', key: string, content: string) {
  if (!content) return;
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function upsertLink(rel: string, href: string) {
  if (!href) return;
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

let lastJsonLd: HTMLScriptElement[] = [];

function injectJsonLd(blocks: object[]) {
  // Remove previously injected structured data
  lastJsonLd.forEach(s => s.remove());
  lastJsonLd = [];
  blocks.forEach(block => {
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.text = JSON.stringify(block);
    document.head.appendChild(script);
    lastJsonLd.push(script);
  });
}

export function applySeo(config: SeoConfig) {
  if (typeof document === 'undefined') return;

  document.title = SEO.buildTitle(config.title);

  const canonical = config.canonical || `${currentOrigin()}${window.location.pathname}`;
  upsertLink('canonical', canonical);

  upsertMeta('name', 'description', config.description);
  upsertMeta('property', 'og:title', SEO.buildTitle(config.title));
  upsertMeta('property', 'og:description', config.description);
  upsertMeta('property', 'og:type', config.ogType || 'website');
  upsertMeta('property', 'og:url', canonical);
  upsertMeta('property', 'og:site_name', SITE_NAME);
  upsertMeta('property', 'og:image', config.image ? SEO.absolute(config.image) : SEO.absolute('/assets/logo.svg'));

  upsertMeta('name', 'twitter:title', SEO.buildTitle(config.title));
  upsertMeta('name', 'twitter:description', config.description);
  upsertMeta('name', 'twitter:image', config.image ? SEO.absolute(config.image) : SEO.absolute('/assets/logo.svg'));

  const robots = config.robots || 'index, follow';
  upsertMeta('name', 'robots', robots);

  // Canonical JSON-LD: Organization + WebSite always present
  const baseLd: object[] = [
    {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: SITE_NAME,
      url: currentOrigin(),
      logo: SEO.absolute('/assets/logo.svg'),
      sameAs: [],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: SITE_NAME,
      url: currentOrigin(),
      potentialAction: {
        '@type': 'SearchAction',
        target: `${currentOrigin()}/courses?q={search_term_string}`,
        'query-input': 'required name=search_term_string',
      },
    },
  ];

  injectJsonLd([...baseLd, ...(config.jsonLd || [])]);
}