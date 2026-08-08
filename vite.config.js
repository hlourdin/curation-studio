import { defineConfig } from 'vite';
import basicSsl from '@vitejs/plugin-basic-ssl';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { buildStaticSite } from './scripts/export-site.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
    exportSiteApiPlugin()
  ],
  server: {
    host: '127.0.0.1',
    https: true,
    port: 5173,
    strictPort: true
  }
});
