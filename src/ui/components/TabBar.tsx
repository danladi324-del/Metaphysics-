import type { ComponentChildren } from 'preact';

export type Route = 'today' | 'charts' | 'draw' | 'readings' | 'journal' | 'lab';

const icon = (d: ComponentChildren) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true">{d}</svg>
);

const TABS: { route: Route; label: string; glyph: ComponentChildren }[] = [
  { route: 'today', label: 'Today', glyph: icon(<><circle cx="12" cy="12" r="4" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" /></>) },
  { route: 'charts', label: 'Charts', glyph: icon(<><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="4" /><path d="M12 3v5M12 16v5" /></>) },
  { route: 'draw', label: 'Draw', glyph: icon(<><rect x="6" y="3" width="12" height="18" rx="2" /><path d="M12 8v5M9.5 10.5h5" /></>) },
  { route: 'readings', label: 'Readings', glyph: icon(<path d="M6 3h12v18H6zM9 8h6M9 12h6M9 16h4" />) },
  { route: 'journal', label: 'Journal', glyph: icon(<path d="M5 20l1-4L17 5l3 3L9 19l-4 1z" />) },
  { route: 'lab', label: 'Lab', glyph: icon(<path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3" />) }
];

export function TabBar({ current }: { current: Route }) {
  return (
    <nav class="tabbar" aria-label="Main">
      {TABS.map((t) => (
        <a href={`#/${t.route}`} aria-current={t.route === current ? 'page' : undefined}>
          {t.glyph}
          {t.label}
        </a>
      ))}
    </nav>
  );
}
