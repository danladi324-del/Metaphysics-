import { render } from 'preact';
import { registerSW } from 'virtual:pwa-register';
import './ui/fonts.css';
import './ui/styles.css';
import { App } from './ui/app';

registerSW({ immediate: true });
render(<App />, document.getElementById('app')!);
