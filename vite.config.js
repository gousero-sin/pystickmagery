import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();

// The vanilla canvas game (arcane-modular.html + js/ + assets/ + colors_and_type.css)
// must be served RAW, exactly like `python3 -m http.server`, so Vite never
// transforms its `?v=N` module imports or injects HMR into it. The React shell
// loads the game through an <iframe> at /arcane-modular.html.
const LEGACY_FILES = new Set(['/arcane-modular.html', '/game.html', '/colors_and_type.css']);
const LEGACY_DIRS = ['/js/', '/assets/'];

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
};

function isLegacy(url) {
  return LEGACY_FILES.has(url) || LEGACY_DIRS.some((d) => url.startsWith(d));
}

function serveLegacyFile(req, res, next) {
  const url = decodeURIComponent(req.url.split('?')[0]);
  if (!isLegacy(url)) return next();
  const filePath = path.join(ROOT, url);
  if (!filePath.startsWith(ROOT) || !fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    return next();
  }
  const ext = path.extname(filePath).toLowerCase();
  res.setHeader('Content-Type', MIME[ext] || 'application/octet-stream');
  res.setHeader('Cache-Control', 'no-cache');
  fs.createReadStream(filePath).pipe(res);
}

// Serves the legacy game untouched in both `vite dev` and `vite preview`.
function legacyGamePlugin() {
  return {
    name: 'serve-legacy-game',
    configureServer(server) {
      server.middlewares.use(serveLegacyFile);
    },
    configurePreviewServer(server) {
      server.middlewares.use(serveLegacyFile);
    },
  };
}

export default defineConfig({
  root: ROOT,
  plugins: [react(), legacyGamePlugin()],
  server: { port: 5173, open: false },
});
