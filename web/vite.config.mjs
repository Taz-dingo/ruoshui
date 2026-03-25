import fs from 'node:fs';
import path from 'node:path';
import { defineConfig } from 'vite';

function externalAssetPlugin(routePath, sourceFile) {
  return {
    name: 'ruoshui-external-asset',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const requestPath = req.url?.split('?')[0];

        if (requestPath !== routePath) {
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
      if (!fs.existsSync(sourceFile)) {
        this.error(`Missing asset required by Web MVP: ${sourceFile}`);
      }

      this.addWatchFile(sourceFile);
    },
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: routePath.replace(/^\//, ''),
        source: fs.readFileSync(sourceFile)
      });
    }
  };
}

const hhucAsset = path.resolve(__dirname, '..', 'assets', 'hhuc.sog');

export default defineConfig({
  plugins: [externalAssetPlugin('/models/hhuc.sog', hhucAsset)],
  server: {
    host: '0.0.0.0'
  },
  preview: {
    host: '0.0.0.0'
  }
});
