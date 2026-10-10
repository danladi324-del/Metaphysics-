import { useEffect, useState } from 'preact/hooks';
import { TabBar, type Route } from './components/TabBar';
import { Placeholder } from './screens/Placeholder';

const ROUTES: Route[] = ['today', 'charts', 'draw', 'readings', 'journal', 'lab'];

function parseRoute(hash: string): Route {
  const r = hash.replace(/^#\/?/, '').split('/')[0] as Route;
  return ROUTES.includes(r) ? r : 'today';
}

export function App() {
  const [route, setRoute] = useState<Route>(parseRoute(location.hash));
  useEffect(() => {
    const on = () => setRoute(parseRoute(location.hash));
    addEventListener('hashchange', on);
    return () => removeEventListener('hashchange', on);
  }, []);
  return (
    <>
      <Placeholder route={route} />
      <TabBar current={route} />
    </>
  );
}
