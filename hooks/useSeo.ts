import { useEffect, useMemo } from 'react';
import { applySeo, SeoConfig } from '../utils/seo';

/**
 * Applies SEO metadata (title, meta, JSON-LD) whenever `config`
 * changes. Safe for SPA navigation — runs on the client.
 * During build-time prerender, the same function can be called
 * synchronously before rendering HTML.
 */
export function useSeo(config: SeoConfig) {
  const serialized = useMemo(() => JSON.stringify(config), [config]);
  useEffect(() => {
    applySeo(config);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serialized]);
}
