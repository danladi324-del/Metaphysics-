import type { Route } from '../components/TabBar';

export function Placeholder({ route }: { route: Route }) {
  return (
    <main>
      <header>
        <h1>{route[0]!.toUpperCase() + route.slice(1)}</h1>
        <div class="sub">Not built yet.</div>
      </header>
      <p class="note">This screen is a scaffold. Nothing here is calculated.</p>
    </main>
  );
}
