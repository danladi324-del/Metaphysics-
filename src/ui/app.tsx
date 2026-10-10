import { useEffect, useState } from 'preact/hooks';
import { TabBar, type Route } from './components/TabBar';
import { Charts } from './screens/Charts';
import { Lab } from './screens/Lab';
import { Placeholder } from './screens/Placeholder';
import { ProfileForm } from './screens/ProfileForm';
import { StoreProvider, useStore } from './store';

const ROUTES: Route[] = ['today', 'charts', 'draw', 'readings', 'journal', 'lab'];

function parse(hash: string): { route: Route; rest: string[] } {
  const parts = hash.replace(/^#\/?/, '').split('/');
  const r = parts[0] as Route;
  return { route: ROUTES.includes(r) ? r : 'today', rest: parts.slice(1) };
}

export function App() {
  return (
    <StoreProvider>
      <Router />
    </StoreProvider>
  );
}

function Router() {
  const [loc, setLoc] = useState(parse(location.hash));
  const { profiles } = useStore();
  useEffect(() => {
    const on = () => {
      setLoc(parse(location.hash));
      scrollTo(0, 0);
    };
    addEventListener('hashchange', on);
    return () => removeEventListener('hashchange', on);
  }, []);

  let screen;
  if (loc.route === 'lab' && loc.rest[0] === 'profile') {
    const id = loc.rest[1];
    const existing = profiles.find((p) => p.id === id) ?? null;
    screen = <ProfileForm key={id} existing={existing} onDone={() => (location.hash = '#/charts')} />;
  } else if (profiles.length === 0 && loc.route !== 'lab') {
    screen = <ProfileForm key="first" existing={null} onDone={() => (location.hash = '#/charts')} />;
  } else if (loc.route === 'charts') screen = <Charts />;
  else if (loc.route === 'lab') screen = <Lab />;
  else screen = <Placeholder route={loc.route} />;

  return (
    <>
      {screen}
      <TabBar current={loc.route} />
    </>
  );
}
