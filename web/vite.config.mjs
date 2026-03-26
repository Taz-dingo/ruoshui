import fs from 'node:fs';
import path from 'node:path';
import { defineConfig } from 'vite';

function externalAssetsPlugin(entries) {
  const routeMap = new Map(entries.map((entry) => [entry.routePath, entry.sourceFile]));

  return {
    name: 'ruoshui-external-assets',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const requestPath = req.url?.split('?')[0];
        const sourceFile = requestPath ? routeMap.get(requestPath) : null;

        if (!sourceFile) {
          next();
          return;
        }

        if (!fs.existsSync(sourceFile)) {
          res.statusCode = 404;
          res.end(`Missing asset: ${sourceFile}`);
          return;
        }

        res.setHeader('Content-Type', 'application/octet-stream');
        fs.createReadStream(sourceFile).pipe(res);
      });
    },
    buildStart() {
      for (const entry of entries) {
        if (!fs.existsSync(entry.sourceFile)) {
          this.error(`Missing asset required by Web MVP: ${entry.sourceFile}`);
        }
        this.addWatchFile(entry.sourceFile);
      }
    },
    generateBundle() {
      for (const entry of entries) {
        this.emitFile({
          type: 'asset',
          fileName: entry.routePath.replace(/^\//, ''),
          source: fs.readFileSync(entry.sourceFile)
        });
      }
    }
  };
}

const rootDir = path.resolve(__dirname, '..');
const assetEntries = [
  {
    routePath: '/models/hhuc-original.sog',
    sourceFile: path.join(rootDir, 'assets', 'hhuc.sog')
  },
  {
    routePath: '/models/hhuc-h0.sog',
    sourceFile: path.join(rootDir, 'outputs', 'iteration-004-sog-opt', 'hhuc-h0.sog')
  },
  {
    routePath: '/models/hhuc-h0-opacity01.sog',
    sourceFile: path.join(rootDir, 'outputs', 'iteration-004-sog-opt', 'hhuc-h0-opacity01.sog')
  },
  {
    routePath: '/models/hhuc-h0-dec75.sog',
    sourceFile: path.join(rootDir, 'outputs', 'iteration-004-sog-opt', 'hhuc-h0-dec75.sog')
  },
  {
    routePath: '/models/hhuc-h0-dec50.sog',
    sourceFile: path.join(rootDir, 'outputs', 'iteration-004-sog-opt', 'hhuc-h0-dec50.sog')
  }
];

export default defineConfig({
  plugins: [externalAssetsPlugin(assetEntries)],
  server: {
    host: '0.0.0.0'
  },
  preview: {
    host: '0.0.0.0'
  }
});
