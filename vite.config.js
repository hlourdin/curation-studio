import { defineConfig } from 'vite';
import basicSsl from '@vitejs/plugin-basic-ssl';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { buildStaticSite } from './scripts/export-site.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Le dossier site/ est un site statique déjà généré, destiné à Vercel.
// Sans ce plugin, Vite le fait passer par sa chaîne de transformation et
// renvoie style.css sous forme de module JavaScript (pour le HMR) : le
// navigateur refuse alors de l'appliquer et la page s'affiche sans style.
// On sert donc /site/** tel quel, avant les middlewares internes de Vite.
const STATIC_MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8'
};

function serveStaticSitePlugin() {
  const siteDir = path.resolve(__dirname, 'site');

  return {
    name: 'serve-static-site',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = (req.url || '').split('?')[0].split('#')[0];
        if (url !== '/site' && !url.startsWith('/site/')) return next();

        let target;
        try {
          target = path.resolve(__dirname, '.' + decodeURIComponent(url));
        } catch (e) {
          return next();
        }

        // Refuser toute sortie du dossier site/ (remontées ../).
        if (target !== siteDir && !target.startsWith(siteDir + path.sep)) return next();

        if (fs.existsSync(target) && fs.statSync(target).isDirectory()) {
          target = path.join(target, 'index.html');
        }
        if (!fs.existsSync(target) || !fs.statSync(target).isFile()) return next();

        res.setHeader('Content-Type', STATIC_MIME[path.extname(target).toLowerCase()] || 'application/octet-stream');
        // L'aperçu doit toujours refléter la dernière génération.
        res.setHeader('Cache-Control', 'no-store');
        fs.createReadStream(target).pipe(res);
      });
    }
  };
}

function exportSiteApiPlugin() {
  return {
    name: 'export-site-api',
    configureServer(server) {
      server.middlewares.use('/api/export-site', (req, res) => {
        if (req.method === 'POST') {
          let body = '';
          req.on('data', chunk => { body += chunk.toString(); });
          req.on('end', () => {
            try {
              const playlistsData = JSON.parse(body);
              const dataPath = path.resolve(__dirname, 'src', 'data', 'playlists-data.json');
              fs.writeFileSync(dataPath, JSON.stringify(playlistsData, null, 2), 'utf8');
              buildStaticSite();
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true, count: Object.keys(playlistsData).length }));
            } catch (e) {
              console.error("Erreur lors de la génération du site dans site/ :", e);
              res.statusCode = 500;
              res.end(JSON.stringify({ error: e.message }));
            }
          });
        } else {
          res.statusCode = 405;
          res.end();
        }
      });
    }
  };
}

export default defineConfig({
  plugins: [
    basicSsl(),
    serveStaticSitePlugin(),
    exportSiteApiPlugin()
  ],
  server: {
    host: '127.0.0.1',
    https: true,
    port: 5173,
    strictPort: true,
    watch: {
      ignored: ['**/src/data/playlists-data.json', '**/site/**']
    }
  }
});
