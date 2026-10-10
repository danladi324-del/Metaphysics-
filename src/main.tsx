import { render } from 'preact';
import { registerSW } from 'virtual:pwa-register';
import './ui/fonts.css';
import './ui/styles.css';
import { App } from './ui/app';

const update = registerSW({
  immediate: true,
  onNeedRefresh() {
    // A new version is cached. Ask before reloading so nothing being typed is lost.
    const bar = document.createElement('div');
    bar.setAttribute('role', 'status');
    bar.style.cssText = 'position:fixed;left:12px;right:12px;bottom:96px;z-index:20;background:#1B2A36;border:1px solid #7CC3D6;border-radius:12px;padding:12px;display:flex;gap:12px;align-items:center;color:#E9E5D9;font:15px system-ui';
    bar.textContent = 'An update is ready.';
    const btn = document.createElement('button');
    btn.textContent = 'Reload';
    btn.style.cssText = 'margin-left:auto;min-height:44px;padding:0 16px;border-radius:10px;border:0;background:#7CC3D6;color:#0F1820;font-weight:600';
    btn.onclick = () => void update(true);
    bar.append(btn);
    document.body.append(bar);
  }
});
render(<App />, document.getElementById('app')!);
