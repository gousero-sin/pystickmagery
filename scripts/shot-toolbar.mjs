import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';

const OUT = fileURLToPath(new URL('../verify-shots/', import.meta.url));
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1000, height: 700 }, deviceScaleFactor: 2 });
await p.goto('http://localhost:5173/arcane-modular.html?school=2&autostart=1', { waitUntil: 'networkidle' });
await p.waitForTimeout(2000);
await (await p.$('#toolbar')).screenshot({ path: OUT + 'toolbar-vellum.png' });
await (await p.$('#hud')).screenshot({ path: OUT + 'hud-vellum.png' });
await b.close();
console.log('ok');
