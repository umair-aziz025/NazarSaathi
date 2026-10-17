# NazarSaathi

Live bilingual vision assistant prototype.

**Website:** https://nazarsaathi-web-production.up.railway.app/

## Features
- Live object detection with TensorFlow.js and COCO-SSD
- Urdu/English text-to-speech and language selector
- Browser speech commands (describe current scene, find supported objects, read text)
- English/Urdu OCR using Tesseract.js
- Demo QR checkpoints using jsQR

## Start
Install Bun, then run `bun run start` and visit http://localhost:3000.

## Repository layout
- `public/index.html`: interface
- `public/styles.css`: design
- `public/app.js`: camera, object detection, OCR, audio, voice commands
- `src/server.ts`: Bun server, static files and Urdu speech relay
- `deploy/railway-function.ts`: **exact snapshot of the deployed Railway Function** (source of truth at export time)
- `Dockerfile`, `railway.json`: Railway deployment configuration

**Important:** The original live Railway service is a Function. Changes pushed to this repository do not automatically modify that Function. For continuous deployment, create a separate GitHub-connected service and validate it before switching domains.

## Browser prerequisites
Camera and microphone access require a secure origin (HTTPS, except localhost). SpeechRecognition support depends on browser and device; Chrome on Android is recommended. AI model downloads and speech recognition may require internet.

## Privacy
Images are processed on the client; libraries and AI weights download from third-party CDNs. Urdu audio may use an **unofficial Google Translate TTS endpoint** via the backend, and microphone recognition may use external browser-provider speech services. This is not an offline-only service.

## Safety
**Not an independent mobility or navigation aid.** Object detection is incomplete and can be wrong; do not rely on this prototype to identify hazards or judge when to walk or cross roads. Checkpoint locations are fictional demonstration data, not mapped MUST routes. It has not undergone accessibility user testing or safety certification.
