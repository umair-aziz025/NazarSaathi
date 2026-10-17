# NazarSaathi 2.0 — Live Vision & Bilingual Voice Assistant

Modern React + TypeScript accessibility research prototype for Urdu and English speakers.

**Live demo:** https://nazarsaathi-web-production.up.railway.app/

## Technology
- React 19, TypeScript, Vite 6
- Lucide icons, Framer Motion animation, custom accessible responsive design
- TensorFlow.js + COCO-SSD for live in-browser object detection
- Tesseract.js for English and Urdu OCR
- Web Speech API for optional browser voice commands
- Urdu/English speech synthesis; Urdu may fall back to an online speech relay
- QR demo checkpoints
- Bun server and Railway Docker deployment

## Development
```sh
npm install
npm run dev
```
Open http://localhost:5173 for frontend development. The development server does not proxy the Urdu TTS endpoint; run the production server to test the full experience.

## Production
```sh
npm install
npm run build
bun run start
```
Open http://localhost:3000.

## Structure
- `src/App.tsx` — modern React interface
- `src/App.css` — responsive styles, visual effects and typography
- `src/engine.ts` — migrated TypeScript device/AI engine; imperative interfaces retained for compatibility
- `src/main.tsx` — React bootstrap
- `server/index.ts` — Bun static server and Urdu text-to-speech relay
- `index.html` — Vite entry point and model CDN scripts
- `Dockerfile`, `railway.json` — deployment definition
- `deploy/railway-function.ts` — previous Railway Function snapshot for rollback/reference

## Deployment
The previous live application ran as a Railway Function. The new React+TypeScript application requires a repository-based Railway Docker service. Deploy the `main` branch, verify `/api/health`, and only then migrate the public hostname. Keep the old service for rollback until the new one passes browser tests.

## Limitations and safety
**This is NOT a navigation or hazard-safety device.** Do not rely on object detections to decide whether a path or road is safe, and do not use as a substitute for a cane, guide dog, or trained human support. The QR demo represents fictional locations, not a validated building map.

Speech recognition support varies by browser and may require a third-party cloud provider. Urdu audio fallback currently relies on an unofficial external TTS endpoint and could fail. Camera imagery is processed in-browser, but models and language assets download from public CDNs.
