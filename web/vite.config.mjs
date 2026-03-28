import fs from 'node:fs';
import path from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

function externalAssetsPlugin(entries) {
  const routeMap = new Map();

  for (const entry of expandEntries(entries)) {
    routeMap.set(entry.routePath, entry.sourceFile);
  }

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

        res.setHeader('Content-Type', getContentType(sourceFile));
        fs.createReadStream(sourceFile).pipe(res);
      });
    },
    buildStart() {
      for (const entry of routeMap.entries()) {
        const sourceFile = entry[1];
        if (!fs.existsSync(sourceFile)) {
          this.error(`Missing asset required by Web MVP: ${sourceFile}`);
        }
        this.addWatchFile(sourceFile);
      }
    },
    generateBundle() {
      for (const entry of routeMap.entries()) {
        const routePath = entry[0];
        const sourceFile = entry[1];
        this.emitFile({
          type: 'asset',
          fileName: routePath.replace(/^\//, ''),
          source: fs.readFileSync(sourceFile)
        });
      }
    }
  };
}

function expandEntries(entries) {
  return entries.flatMap((entry) => {
    if (entry.sourceFile) {
      return [entry];
    }

    if (!entry.sourceDir || !entry.routePrefix) {
      throw new Error(`Unsupported asset entry: ${JSON.stringify(entry)}`);
    }

    return walkFiles(entry.sourceDir).map((sourceFile) => {
      const relativePath = path.relative(entry.sourceDir, sourceFile).split(path.sep).join('/');
      return {
        routePath: `${entry.routePrefix}${relativePath}`,
        sourceFile
      };
    });
  });
}

function walkFiles(sourceDir) {
  const entries = fs.readdirSync(sourceDir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(sourceDir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkFiles(fullPath));
      continue;
    }

    if (entry.isFile()) {
      files.push(fullPath);
    }
  }

  return files.sort();
}

function getContentType(sourceFile) {
  const extension = path.extname(sourceFile).toLowerCase();

  switch (extension) {
    case '.json':
      return 'application/json';
    case '.webp':
      return 'image/webp';
    default:
      return 'application/octet-stream';
  }
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
  },
  {
    routePrefix: '/models/hhuc-lod/',
    sourceDir: path.join(rootDir, 'outputs', 'iteration-004-sog-opt', 'lod')
  }
];

export default defineConfig({
  plugins: [tailwindcss(), react(), externalAssetsPlugin(assetEntries)],
  server: {
    host: '0.0.0.0'
  },
  preview: {
    host: '0.0.0.0'
  }
});
