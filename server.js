const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const fs = require('fs');
const path = require('path');
const Module = require('module');

const dev = process.env.NODE_ENV !== 'production';

function resolveHashedStaticAsset(staticRoot, relativePath) {
  const normalized = relativePath.replace(/^\//, '');
  const directPath = path.join(staticRoot, normalized);
  if (fs.existsSync(directPath)) {
    return directPath;
  }

  const dirname = path.dirname(normalized);
  const basename = path.basename(normalized);
  const ext = path.extname(basename);
  const nameWithoutExt = ext ? basename.slice(0, -ext.length) : basename;
  const searchDir = path.join(staticRoot, dirname === '.' ? '' : dirname);

  if (!fs.existsSync(searchDir)) {
    return null;
  }

  const candidates = fs
    .readdirSync(searchDir)
    .filter((file) => file.startsWith(`${nameWithoutExt}-`) && (!ext || file.endsWith(ext)));

  if (candidates.length === 0) {
    return null;
  }

  return path.join(searchDir, candidates[0]);
}

function serveStaticFile(filePath, res) {
  const ext = path.extname(filePath).toLowerCase();
  const contentTypes = {
    '.js': 'application/javascript; charset=UTF-8',
    '.mjs': 'application/javascript; charset=UTF-8',
    '.css': 'text/css; charset=UTF-8',
    '.json': 'application/json; charset=UTF-8',
    '.map': 'application/json; charset=UTF-8',
  };
  const contentType = contentTypes[ext] || 'application/octet-stream';

  res.statusCode = 200;
  res.setHeader('Content-Type', contentType);
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');

  fs.createReadStream(filePath).pipe(res);
}

const chunkContentCache = new Map();
function resolveServerChunkByContent(chunkName) {
  if (chunkContentCache.has(chunkName)) {
    return chunkContentCache.get(chunkName);
  }

  const chunksDir = path.join(process.cwd(), '.next', 'server', 'chunks');
  let match = null;

  if (fs.existsSync(chunksDir)) {
    const baseName = chunkName.replace(/\\/g, '/').split('/').pop() || chunkName;
    const token = baseName.replace(/\.js$/, '');

    try {
      const files = fs.readdirSync(chunksDir);
      for (const file of files) {
        const filePath = path.join(chunksDir, file);
        try {
          const content = fs.readFileSync(filePath, 'utf8');
          if (content.includes(token)) {
            match = file;
            break;
          }
        } catch (error) {
          // ignore file read errors
        }
      }
    } catch (error) {
      // ignore directory read errors
    }
  }

  chunkContentCache.set(chunkName, match);
  return match;
}

if (!dev) {
  const originalResolveFilename = Module._resolveFilename.bind(Module);
  Module._resolveFilename = function patchedResolveFilename(request, parent, isMain, options) {
    if (request.startsWith('./') && parent?.filename?.includes('.next/server/webpack-runtime.js')) {
      const chunkName = request.slice(2);
      const candidates = [
        `./${chunkName}`,
        `./chunks/${chunkName}`,
      ];

      if (chunkName.startsWith('vendor-chunks/')) {
        const vendorPath = chunkName.replace('vendor-chunks/', 'chunks/');
        candidates.push(`./${vendorPath}`);
        candidates.push(`./chunks/${chunkName.replace('vendor-chunks/', '')}`);
        candidates.push(`./vendor-chunks/${chunkName.replace('vendor-chunks/', '')}`);
      }

      for (const candidate of candidates) {
        try {
          return originalResolveFilename(candidate, parent, isMain, options);
        } catch (error) {
          // continue to next candidate
        }
      }

      const fallbackChunk = resolveServerChunkByContent(chunkName);
      if (fallbackChunk) {
        try {
          return originalResolveFilename(path.join(process.cwd(), '.next', 'server', 'chunks', fallbackChunk), parent, isMain, options);
        } catch (error) {
          // ignore and fall through
        }
      }
    }
    return originalResolveFilename(request, parent, isMain, options);
  };

  // Patch Next.js webpack runtime chunk resolver to support server chunk directory structure
  try {
    const runtime = require('./.next/server/webpack-runtime.js');
    if (runtime && typeof runtime.u === 'function') {
      console.log('[server] webpack runtime loaded');
    }
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[server] Could not load webpack runtime:', error);
    }
  }
}

const app = next({ dev });
const handle = app.getRequestHandler();

const port = process.env.PORT || 3000;

const FALLBACK_LAYOUT_CSS_PATH = path.join(process.cwd(), '.next', 'static', 'css');
let cachedLayoutCssFile = null;

function resolveLayoutCssFile() {
  try {
    const files = fs.readdirSync(FALLBACK_LAYOUT_CSS_PATH);
    const cssFiles = files
      .filter((file) => file.endsWith('.css'))
      .map((file) => ({
        file,
        mtime: fs.statSync(path.join(FALLBACK_LAYOUT_CSS_PATH, file)).mtimeMs,
      }))
      .sort((a, b) => b.mtime - a.mtime);
    if (cssFiles.length > 0) {
      cachedLayoutCssFile = path.join(FALLBACK_LAYOUT_CSS_PATH, cssFiles[0].file);
      return cachedLayoutCssFile;
    }
  } catch (error) {
    console.error('[server] Failed to resolve layout CSS fallback:', error);
  }
  cachedLayoutCssFile = null;
  return null;
}

// Protected routes that require authentication
const protectedRoutes = [
  '/dashboard',
  '/messages',
  '/profile',
  '/settings',
  '/jobs/create',
  '/proposals',
  '/verification',
  '/billing',
  '/notifications',
  '/admin'
];

// Simple cookie parser for next-auth session checking
function getSessionToken(req) {
  const cookies = req.headers.cookie?.split(';').map(c => c.trim()) || [];

  for (const cookie of cookies) {
    if (cookie.startsWith('next-auth.session-token=') ||
        cookie.startsWith('__Secure-next-auth.session-token=')) {
      return cookie.split('=')[1];
    }
  }
  return null;
}

function isProtectedRoute(pathname) {
  return protectedRoutes.some(route => pathname.startsWith(route));
}

app.prepare().then(async () => {
  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    const { pathname } = parsedUrl;

    // Serve static files from /uploads/ directory
    if (pathname.startsWith('/uploads/')) {
      const filePath = path.join(process.cwd(), pathname);

      // Check if file exists
      if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        // Get file extension and set content type
        const ext = path.extname(filePath).toLowerCase();
        const contentTypeMap = {
          '.jpg': 'image/jpeg',
          '.jpeg': 'image/jpeg',
          '.png': 'image/png',
          '.gif': 'image/gif',
          '.pdf': 'application/pdf',
          '.doc': 'application/msword',
          '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        };

        const contentType = contentTypeMap[ext] || 'application/octet-stream';
        res.setHeader('Content-Type', contentType);

        // Stream the file
        const fileStream = fs.createReadStream(filePath);
        fileStream.pipe(res);
        return;
      } else {
        res.statusCode = 404;
        res.end('File not found');
        return;
      }
    }

    if (pathname === '/_next/static/css/app/layout.css') {
      const layoutCss = cachedLayoutCssFile || resolveLayoutCssFile();
      if (layoutCss && fs.existsSync(layoutCss)) {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'text/css; charset=utf-8');
        const stream = fs.createReadStream(layoutCss);
        stream.pipe(res);
        stream.on('error', (error) => {
          console.error('[server] Failed to stream fallback layout CSS:', error);
          res.statusCode = 500;
          res.end('Failed to load stylesheet');
        });
        return;
      }
    }

    if (!dev && pathname.startsWith('/_next/static/')) {
      const relativeStaticPath = pathname.replace('/_next/static/', '');
      const staticRoot = path.join(process.cwd(), '.next', 'static');
      const resolvedAsset = resolveHashedStaticAsset(staticRoot, relativeStaticPath);
      if (resolvedAsset) {
        serveStaticFile(resolvedAsset, res);
        return;
      }
    }

    // Let Next.js middleware handle all auth - removed duplicate auth checks
    handle(req, res, parsedUrl);
  });

  // Socket.IO disabled for development - can be re-enabled later
  console.log('Running without socket.io support for development');
  // TODO: Re-enable socket.io once module issues are resolved
  
  // try {
  //   const { setupSocketIO } = await import('./dist/src/server/socket.js');
  //   setupSocketIO(httpServer);
  // } catch (error) {
  //   console.error('Failed to load socket.io setup:', error);
  //   console.log('Running without socket.io support');
  // }

  httpServer.listen(port, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://localhost:${port}`);
  });
});
