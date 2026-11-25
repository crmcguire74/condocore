import 'dotenv/config';
import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const isProd = process.env.NODE_ENV === 'production';

function getAiClient() {
  if (!process.env.GEMINI_API_KEY) {
    return null;
  }
  return new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '25mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, service: 'condocore' });
  });

  // Spatial Camera Room & Object Scanner endpoint using Gemini 4 Hydrogen
  app.post('/api/scan-space', async (req, res) => {
    try {
      const { frames, spaceLabelHint, referenceWallFeet, ceilingHeightFeet } = req.body as {
        frames?: { mimeType: string; data: string }[];
        spaceLabelHint?: string;
        referenceWallFeet?: number;
        ceilingHeightFeet?: number;
      };

      if (!Array.isArray(frames) || frames.length === 0) {
        res.status(400).json({ error: 'Please capture or upload at least one camera frame of the space.' });
        return;
      }

      const ai = getAiClient();
      if (!ai) {
        res.status(503).json({
          error: 'Spatial vision analysis requires GEMINI_API_KEY in Settings > Secrets. You can still configure room dimensions and objects manually below.',
        });
        return;
      }

      const imageParts = frames.slice(0, 4).map((f) => ({
        inlineData: {
          mimeType: f.mimeType || 'image/jpeg',
          data: f.data,
        },
      }));

      const promptText = [
        'You are an architectural spatial surveyor for a condominium building operating system (CondoCore).',
        'Analyze the provided room/space camera frame(s) and produce a realistic architectural floorplan survey of this space.',
        spaceLabelHint ? `User hint for room/space name: "${spaceLabelHint}".` : '',
        referenceWallFeet ? `Reference known wall span: ${referenceWallFeet} feet.` : '',
        ceilingHeightFeet ? `Reference ceiling height: ${ceilingHeightFeet} feet.` : '',
        'Estimate room widthFt, lengthFt, ceilingHeightFt, and areaSqFt using standard architectural visual cues (standard 80-inch doors, 36-inch counters, brick courses, ceiling tiles, piping, or parking bays).',
        'Detect ALL visible architectural elements and objects inside the space, including: doors, windows, stairs, ladders, furniture (tables, desks, chairs, sofas, cabinets, shelving, beds), appliances, boilers/HVAC units, plumbing valves/pipes, electrical panels, fire extinguishers/sprinklers, and fixtures.',
        'Place each detected object at an accurate normalized floorplan position (xPct 5-95 left-to-right, yPct 5-95 top-to-bottom) and specify wallSide (north, south, east, west, or center).',
        'Return strictly valid JSON matching the schema.',
      ]
        .filter(Boolean)
        .join(' ');

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: {
          parts: [...imageParts, { text: promptText }],
        },
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              spaceName: { type: Type.STRING, description: 'Clear architectural name of the scanned space' },
              roomType: {
                type: Type.STRING,
                description: 'One of: mechanical, residential, corridor, lobby, garage, roof, utility, storage',
              },
              widthFt: { type: Type.NUMBER, description: 'Estimated width of the space in feet' },
              lengthFt: { type: Type.NUMBER, description: 'Estimated length/depth of the space in feet' },
              ceilingHeightFt: { type: Type.NUMBER, description: 'Estimated ceiling height in feet' },
              areaSqFt: { type: Type.NUMBER, description: 'Estimated floor area in square feet' },
              confidenceNotes: {
                type: Type.STRING,
                description: 'Brief explanation of visual cues used to estimate dimensions and layout',
              },
              detectedObjects: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING, description: 'Specific object label (e.g. Entry Door, North Window, Access Ladder, Boiler #1, Wooden Workbench)' },
                    objectType: {
                      type: Type.STRING,
                      description: 'One of: door, window, stairs, ladder, furniture, appliance, boiler_hvac, plumbing_valve, electrical_panel, fire_safety, fixture, other',
                    },
                    xPct: { type: Type.NUMBER, description: 'Horizontal position inside room 5 to 95' },
                    yPct: { type: Type.NUMBER, description: 'Vertical position inside room 5 to 95' },
                    widthFt: { type: Type.NUMBER, description: 'Approximate width in feet' },
                    depthFt: { type: Type.NUMBER, description: 'Approximate depth in feet' },
                    wallSide: {
                      type: Type.STRING,
                      description: 'One of: north, south, east, west, center',
                    },
                    notes: { type: Type.STRING, description: 'Brief condition or spatial note' },
                  },
                  required: ['name', 'objectType', 'xPct', 'yPct', 'widthFt', 'depthFt', 'wallSide'],
                },
              },
            },
            required: ['spaceName', 'roomType', 'widthFt', 'lengthFt', 'ceilingHeightFt', 'areaSqFt', 'confidenceNotes', 'detectedObjects'],
          },
        },
      });

      const rawText = (response.text ?? '').trim();
      if (!rawText) {
        res.status(502).json({ error: 'Spatial analyzer returned an empty response. Please try capturing a clearer frame.' });
        return;
      }

      const parsed = JSON.parse(rawText);
      res.json({ scan: parsed });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Spatial scan failed.';
      const status = message.includes('403') || message.includes('PERMISSION_DENIED') ? 403 : 500;
      res.status(status).json({
        error: `Could not analyze camera scan: ${message}`,
      });
    }
  });

  const httpServer = http.createServer(app);

  if (isProd) {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    const hmrDisabled = process.env.DISABLE_HMR === 'true';

    // When HMR is disabled (e.g. AI Studio preview with DISABLE_HMR=true),
    // Vite 8 still injects /@vite/client and unconditionally opens a WebSocket
    // to port 24678. Serve a lightweight compatible client module with style
    // injection and no-op HMR hooks so CSS & React load cleanly with zero WS errors.
    if (hmrDisabled) {
      app.get('/@vite/client', (_req, res) => {
        res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
        res.setHeader('Cache-Control', 'no-store');
        res.send(`
const sheetsMap = new Map();
let lastInsertedStyle;

export function updateStyle(id, content) {
  if (typeof document === 'undefined') return;
  let style = sheetsMap.get(id);
  if (!style) {
    style = document.createElement('style');
    style.setAttribute('type', 'text/css');
    style.setAttribute('data-vite-dev-id', id);
    style.textContent = content;
    if (!lastInsertedStyle) {
      document.head.appendChild(style);
      setTimeout(() => {
        lastInsertedStyle = undefined;
      }, 0);
    } else {
      lastInsertedStyle.insertAdjacentElement('afterend', style);
    }
    lastInsertedStyle = style;
  } else if (style.textContent !== content) {
    style.textContent = content;
  }
  sheetsMap.set(id, style);
}

export function removeStyle(id) {
  const style = sheetsMap.get(id);
  if (style) {
    style.remove();
    sheetsMap.delete(id);
  }
}

export function createHotContext() {
  const noop = () => {};
  return {
    data: {},
    accept: noop,
    acceptExports: noop,
    dispose: noop,
    prune: noop,
    decline: noop,
    invalidate: noop,
    on: noop,
    off: noop,
    send: noop,
  };
}

export function injectQuery(url, queryToInject) {
  if (!url || (url[0] !== '.' && url[0] !== '/')) return url;
  const pathname = url.replace(/[?#].*$/, '');
  const { search, hash } = new URL(url, 'http://vite.dev');
  return pathname + '?' + queryToInject + (search ? '&' + search.slice(1) : '') + (hash || '');
}

export class ErrorOverlay {
  constructor() {}
}
`);
      });
    }

    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        allowedHosts: true,
        hmr: hmrDisabled ? false : { server: httpServer },
        ws: hmrDisabled ? false : undefined,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`CondoCore server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
