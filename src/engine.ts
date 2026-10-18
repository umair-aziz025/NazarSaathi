/* NazarSaathi browser CV + speech engine, migrated into a TypeScript module.
   Existing imperative device orchestration is retained until the complete hooks-based
   refactor. All screen elements are rendered by React and styled with modern CSS.
   Browser AI dependencies load from script tags in index.html.
*/
// @ts-nocheck
import { parseVoiceControl } from './voiceCommands';
import { shouldNarrateScene } from './narrationPolicy';

export function initializeEngine(): void {
'use strict';
const $=id=>document.getElementById(id);
let mode='look', previousMode='look', image=null, detector=null, response=null;
let language='ur',asr=null,micEnabled=false,micOn=false,speakingNow=false,asrRetry=null,lastRecognized='',lastRecognizedAt=0,recentObjects=[],objectsAt=0,micBlocked=false;
let cameraStream=null, liveTimer=null, liveRun=0, liveBusy=false, liveFrameNumber=0, livePreviousSignature='', liveCandidate='', liveCandidateCount=0, liveLastSaid=0, liveLastStatus=0, liveClock=0, detectorPromise=null;
const names={gate:['Welcome Point','استقبالیہ گیٹ'],lobby:['Reception','استقبالیہ'],library:['Library','لائبریری'],helpdesk:['Help Desk','مدد کا کاؤنٹر'],lab:['Computer Lab','کمپیوٹر لیب']};
const paths={gate:['lobby'],lobby:['gate','library','helpdesk','lab'],library:['lobby'],helpdesk:['lobby'],lab:['lobby']};
let modelType='lite_mobilenet_v2',modelPromise=null,classificationModel=null,classificationBusy=false;
const isMobileDevice=()=>/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
let lastFocusPass=0,zeroDetectionSince=0,backendRecoveryAttempted=false,previewCanvas=null;
let micRestartFailures=0,micErrors=0,micLastActivity=0,speechWatchdog=null;
function mobileVisionStatus(text){const el=$('visionDiagnostic');if(el&&el.textContent!==text)el.textContent=text;}
function browserDiagnosis(){
 const ua=navigator.userAgent||'';
 const inApp=/FBAN|FBAV|Instagram|WhatsApp|; wv\)|Line\/|Snapchat/i.test(ua);
 const engine=window.SpeechRecognition||window.webkitSpeechRecognition;
 let browser=inApp?'In-app browser':/CriOS|Chrome|Chromium/i.test(ua)?'Chrome':/Safari/i.test(ua)?'Safari':'Other browser';
 return {browser,inApp,engine:!!engine,secure:window.isSecureContext,camera:!!navigator.mediaDevices?.getUserMedia,
  tf:!!window.tf,model:!!window.cocoSsd,backend:window.tf?.getBackend?.()||'not initialized'};
}
function updateMobileCapabilities(){
 const d=browserDiagnosis(),el=$('deviceStatus');
 if(!el)return;
 el.textContent='Browser: '+d.browser+' · Camera API: '+(d.camera?'yes':'unavailable')+
  ' · Voice recognition: '+(d.engine?'available':'not supported')+' · AI library: '+(d.tf&&d.model?'loaded':'missing')+
  ' · AI backend: '+d.backend+'.'+(d.inApp?' In-app browsers may block microphone and model downloads; open the link directly in Chrome or Safari.':'');
 if(!d.engine&&$('micStatus'))micStatus('Voice recognition API unavailable here. Open in Chrome on Android or Safari on iOS. Typed commands still work.');
}
async function loadAlternateScript(src){
 return new Promise((resolve,reject)=>{
  const script=document.createElement('script');
  const timer=setTimeout(()=>{script.remove();reject(Error('Alternative AI library timeout'));},11000);
  script.onload=()=>{clearTimeout(timer);resolve();};
  script.onerror=()=>{clearTimeout(timer);reject(Error('Alternative AI library blocked'));};
  script.src=src;script.defer=true;document.head.appendChild(script);
 });
}
async function ensureVisionLibraries(){
 // Some mobile networks fail loading jsDelivr even when Railway itself loads correctly.
 if(!window.tf){
  mobileVisionStatus('Primary TensorFlow.js CDN unavailable. Trying another source…');
  await loadAlternateScript('https://unpkg.com/@tensorflow/tfjs@4.22.0/dist/tf.min.js');
 }
 if(!window.cocoSsd){
  mobileVisionStatus('Primary COCO-SSD CDN unavailable. Trying another source…');
  await loadAlternateScript('https://unpkg.com/@tensorflow-models/coco-ssd@2.2.3/dist/coco-ssd.min.js');
 }
 if(!window.tf||!window.cocoSsd)throw Error('AI libraries are blocked. Use Chrome/Safari and check connectivity.');
 await window.tf.ready();
 updateMobileCapabilities();
}
async function mobileDetectorInference(video){
 const w=video.videoWidth,h=video.videoHeight;
 // Avoid decoding full 1080p/4K video directly into WebGL tensors on a memory-limited phone.
 const maxEdge=isMobileDevice()?640:960;
 if(!previewCanvas)previewCanvas=document.createElement('canvas');
 const scale=Math.min(1,maxEdge/Math.max(w,h));
 const outW=Math.max(1,Math.round(w*scale)),outH=Math.max(1,Math.round(h*scale));
 if(previewCanvas.width!==outW)previewCanvas.width=outW;
 if(previewCanvas.height!==outH)previewCanvas.height=outH;
 previewCanvas.getContext('2d',{alpha:false}).drawImage(video,0,0,previewCanvas.width,previewCanvas.height);
 const results=await detector.detect(previewCanvas);
 if(scale===1)return results;
 return results.map(d=>({...d,bbox:d.bbox.map((v,i)=>v/scale)}));
}
async function recoverMobileBackend(err){
 if(backendRecoveryAttempted||!window.tf)return false;
 backendRecoveryAttempted=true;
 mobileVisionStatus('AI GPU error detected. Switching to slower CPU recognition: '+String(err?.message||err).slice(0,120));
 status('Mobile AI fallback: CPU');
 try{
  if(!await window.tf.setBackend('cpu'))return false;
  await window.tf.ready();detector=null;detectorPromise=null;
  detector=await window.cocoSsd.load({base:'lite_mobilenet_v2'});modelType='lite_mobilenet_v2';
  $('visionModel').value=modelType;
  updateMobileCapabilities();return true;
 }catch(e){mobileVisionStatus('AI recovery failed: '+String(e?.message||e));return false;}
}
async function detectCenterCrop(video,detector,threshold){
 const vw=video.videoWidth,vh=video.videoHeight;if(!vw||!vh)return [];
 const cw=Math.round(vw*.63),ch=Math.round(vh*.63),left=Math.round((vw-cw)/2),top=Math.round((vh-ch)/2);
 const cv=document.createElement('canvas');cv.width=Math.min(768,cw);cv.height=Math.round(cv.width*ch/cw);
 cv.getContext('2d').drawImage(video,left,top,cw,ch,0,0,cv.width,cv.height);
 const all=await detector.detect(cv),sx=cw/cv.width,sy=ch/cv.height;
 return all.filter(d=>d.score>=threshold).map(d=>({...d,bbox:[left+d.bbox[0]*sx,top+d.bbox[1]*sy,d.bbox[2]*sx,d.bbox[3]*sy],focusAssisted:true}));
}
async function changeHardwareZoom(direction){
 const track=cameraStream?.getVideoTracks()?.[0];
 if(!track?.getCapabilities||!track?.applyConstraints){respond('کیمرہ زوم دستیاب نہیں۔','Camera zoom is unavailable. Improve the light or try a nearer object, with assistance.');return;}
 try{
  const cap=track.getCapabilities().zoom;
  if(!cap||typeof cap.min!=='number'){respond('یہ کیمرہ زوم نہیں دے رہا۔','This mobile camera does not offer browser zoom control.');return;}
  const old=track.getSettings().zoom||cap.min,step=Math.max(cap.step||.1,(cap.max-cap.min)/5);
  const value=direction==='reset'?cap.min:Math.min(cap.max,Math.max(cap.min,old+(direction==='in'?step:-step)));
  await track.applyConstraints({advanced:[{zoom:value}]});
  respond('کیمرہ زوم تبدیل ہو گیا ہے۔','Camera zoom changed to '+(Math.round(value*10)/10)+'. This is not a safety or distance estimate.');
 }catch(e){respond('کیمرہ زوم تبدیل نہیں ہو سکا۔','Your browser could not change camera zoom.');}
}
const labels={person:'شخص',chair:'کرسی','dining table':'میز',bottle:'بوتل',cup:'کپ',book:'کتاب','cell phone':'موبائل فون',laptop:'لیپ ٹاپ',backpack:'بیگ',keyboard:'کی بورڈ',mouse:'ماؤس',car:'گاڑی',bus:'بس',dog:'کتا',cat:'بلی','potted plant':'گملے کا پودا',bench:'بینچ',handbag:'ہینڈ بیگ',bicycle:'سائیکل',clock:'گھڑی',tv:'ٹی وی',umbrella:'چھتری',apple:'سیب'};
const posUr={left:'بائیں جانب',center:'درمیان',right:'دائیں جانب'};
function status(t){$('resultState').textContent=t}
function show(ur,en,extra){
 response={ur,en};
 $('urdu').textContent=ur;$('english').textContent=en;
 $('details').textContent=extra||'';$('details').hidden=!extra;
 $('speak').disabled=false;
 status('Analysis complete');
 // Direct answers take priority over live narration. Do not immediately talk over them.
 if(cameraStream && mode==='look'){liveLastSaid=Date.now();livePreviousSignature=liveCandidate;}
 say();
}
let voiceAudio=null,voiceAudioUrl=null,voiceSeq=0;
function resumeMic(delay=700){
 clearTimeout(asrRetry);
 if(!micEnabled||speakingNow||micOn||document.hidden||micBlocked)return;
 asrRetry=setTimeout(()=>{if(micEnabled&&!speakingNow&&!micOn)startListening()},delay);
}
function muteMicForSpeech(){if(micOn&&asr){try{asr.abort()}catch(e){}}}
function updateNarrationStatus(){
 const live=$('speechLive');
 const line=$('narrationStatus');
 if(!live||!line)return;
 const on=live.checked;
 line.textContent=on
  ? 'Continuous descriptions ON — NazarSaathi announces stable new objects and occasional recaps, not every video frame.'
  : 'Continuous descriptions PAUSED — say "describe continuously" or "مسلسل بتاؤ" to resume.';
 line.dataset.active=on?'true':'false';
}
function endSpeech(seq){
 if(seq!==voiceSeq)return;
 if(speechWatchdog){clearTimeout(speechWatchdog);speechWatchdog=null;}
 speakingNow=false;resumeMic(650);
}
function armSpeechWatchdog(seq){
 if(speechWatchdog)clearTimeout(speechWatchdog);
 speechWatchdog=setTimeout(()=>{
  if(seq!==voiceSeq||!speakingNow)return;
  // Some mobile browsers omit synthesis onend, leaving recognition disabled forever.
  window.speechSynthesis?.cancel();endSpeech(seq);
 },19000);
}
function stopSpeech(resume=true){
 voiceSeq++;if(speechWatchdog){clearTimeout(speechWatchdog);speechWatchdog=null;}window.speechSynthesis?.cancel();
 if(voiceAudio){voiceAudio.pause();voiceAudio.src='';voiceAudio=null}
 if(voiceAudioUrl){URL.revokeObjectURL(voiceAudioUrl);voiceAudioUrl=null}
 speakingNow=false;if(resume)resumeMic(600);
}
async function say(){
 if(!response)return;
 stopSpeech(false);const seq=voiceSeq;speakingNow=true;muteMicForSpeech();armSpeechWatchdog(seq);
 if(language==='en'){
  const t=new SpeechSynthesisUtterance(response.en||'No result yet.');t.lang='en-US';t.rate=.89;
  const voice=(window.speechSynthesis?.getVoices()||[]).find(v=>/^en[-_]/i.test(v.lang));if(voice)t.voice=voice;
  t.onend=()=>endSpeech(seq);t.onerror=()=>endSpeech(seq);
  if(window.speechSynthesis){window.speechSynthesis.speak(t);$('voiceNote').textContent='English voice enabled.'}
  else{endSpeech(seq);$('voiceNote').textContent='No speech support in browser.'}
  return;
 }
 const t=response.ur||'میں ابھی کوئی چیز شناخت نہیں کر سکا۔';
 const v=(window.speechSynthesis?.getVoices()||[]).find(v=>/^ur([-_]|$)/i.test(v.lang));
 if(v){
  const msg=new SpeechSynthesisUtterance(t);msg.lang='ur-PK';msg.voice=v;msg.rate=.87;
  msg.onend=()=>endSpeech(seq);msg.onerror=()=>endSpeech(seq);
  window.speechSynthesis.speak(msg);$('voiceNote').textContent='Urdu voice: '+v.name;return;
 }
 $('voiceNote').textContent='Loading Urdu narration…';
 try{
  const r=await fetch('/api/urdu-tts?text='+encodeURIComponent(t.slice(0,200)),{signal:AbortSignal.timeout(12000)});
  if(seq!==voiceSeq)return;
  if(!r.ok)throw Error('Audio service unavailable');
  const blob=await r.blob();if(!blob.type.startsWith('audio/'))throw Error('Invalid audio');
  voiceAudioUrl=URL.createObjectURL(blob);
  const a=new Audio(voiceAudioUrl);voiceAudio=a;
  a.onended=()=>{if(seq!==voiceSeq)return;voiceAudio=null;if(voiceAudioUrl){URL.revokeObjectURL(voiceAudioUrl);voiceAudioUrl=null;}endSpeech(seq)};
  a.onerror=()=>{endSpeech(seq);$('voiceNote').textContent='Unable to play Urdu narration.'};
  await a.play();$('voiceNote').textContent='Urdu narration enabled.';
 }catch(e){if(seq!==voiceSeq)return;$('voiceNote').textContent='Urdu voice unavailable. Check internet or install Urdu TTS.';endSpeech(seq);}
}
$('speak').onclick=say;$('stop').onclick=()=>stopSpeech();
$('speechLanguage').onchange=()=>changeLanguage($('speechLanguage').value,true);

document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{if(cameraStream)stopLive(true);if(mode!==b.dataset.mode)previousMode=mode;mode=b.dataset.mode;document.querySelectorAll('[data-mode]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));$('readOptions').hidden=mode!=='read';$('guideOptions').hidden=mode!=='guide';const titles={look:'Look & Listen',read:'Read for Me',guide:'Campus Checkpoints'};const tips={look:'Start the camera for continuous object detection, or upload a photo.',read:'Take a close, clear photo of printed English or Urdu text.',guide:'Take a picture of one of our example QR markers.'};$('modeHeading').textContent=titles[mode];$('modeHint').textContent=tips[mode];$('analyze').textContent=mode==='guide'?'Scan checkpoint →':mode==='read'?'Read printed text →':'Analyze image →';status('Ready for live camera or photo');$('details').hidden=true;});
$('photo').onchange=async e=>{let f=e.target.files&&e.target.files[0];if(!f)return;if(!['image/png','image/jpeg','image/webp'].includes(f.type)||f.size>8*1024*1024){alert('Choose a PNG, JPEG or WebP under 8MB');return;}const url=URL.createObjectURL(f);try{let img=new Image();await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject;img.src=url});image=img;const canvas=document.createElement('canvas');const factor=Math.min(1,1600/Math.max(img.naturalWidth,img.naturalHeight));canvas.width=Math.max(1,Math.round(img.naturalWidth*factor));canvas.height=Math.max(1,Math.round(img.naturalHeight*factor));canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);$('preview').src=canvas.toDataURL('image/jpeg',.88);$('preview').style.display='block';$('analyze').disabled=false;status('Image selected');}catch(err){alert('Image could not be loaded.');}finally{URL.revokeObjectURL(url)}};
function path(src,dest){let q=[[src]],seen=new Set([src]);while(q.length){let a=q.shift(),v=a[a.length-1];if(v===dest)return a;for(let n of paths[v]||[])if(!seen.has(n)){seen.add(n);q.push(a.concat(n))}}return null}
async function readQR(img){const can=document.createElement('canvas');can.width=img.naturalWidth||img.videoWidth;can.height=img.naturalHeight||img.videoHeight;let cx=can.getContext('2d',{willReadFrequently:true});cx.drawImage(img,0,0);if('BarcodeDetector' in window){try{const bar=new BarcodeDetector({formats:['qr_code']});let hits=await bar.detect(can);if(hits.length)return hits[0].rawValue}catch(e){}}if(typeof jsQR==='function'){let d=cx.getImageData(0,0,can.width,can.height);let x=jsQR(d.data,d.width,d.height);if(x)return x.data;}throw Error('QR scanner unavailable or no readable QR code found. Use a sharper image.')}
async function run(){const b=$('analyze');if(!image)return;b.disabled=true;status('Working…');$('urdu').textContent='تجزیہ جاری ہے…';$('english').textContent='Analyzing on your device. Please wait…';$('details').hidden=true;try{
if(mode==='guide'){let code=await readQR(image);if(!code.startsWith('NAZARSAATHI:DEMO:'))throw Error('Not a NazarSaathi demo marker.');reportCheckpoint(code);}
else if(mode==='read'){if(!window.Tesseract)throw Error('Text model library unavailable. Check your internet connection.');status('Downloading OCR model / recognizing text…');let result=await Tesseract.recognize($('preview').src,$('ocrLang').value,{logger:m=>{if(m.status&&m.progress)status(m.status+' '+Math.round(m.progress*100)+'%')}});let txt=(result.data.text||'').trim();if(!txt){show('اس تصویر میں واضح لکھائی نہیں ملی۔','No readable printed text found. Try a sharper image.')}else{show($('ocrLang').value==='urd'?txt:'لکھائی شناخت کر لی گئی ہے۔',txt,'Detected printed text ('+$('ocrLang').value+'). Verify OCR before relying on it.');}}
else{if(!window.cocoSsd||!window.tf)throw Error('AI vision libraries could not load. Check your internet connection.');if(!detector){status('Downloading object-detection model (first use)…');detector=await cocoSsd.load({base:'lite_mobilenet_v2'});}status('Identifying objects…');let list=(await detector.detect($('preview'))).filter(o=>o.score>=.45).sort((a,b)=>b.score-a.score).slice(0,5);if(!list.length){show('مجھے کوئی چیز واضح طور پر نظر نہیں آئی۔','No recognized objects detected. Try a different photo.')}else{let found=list.map(o=>{let x=(o.bbox[0]+o.bbox[2]/2)/$('preview').naturalWidth;let position=x<1/3?'left':x>2/3?'right':'center';return {name:o.class,position:position,score:o.score}});show('مجھے یہ چیزیں نظر آ رہی ہیں: '+found.slice(0,3).map(x=>posUr[x.position]+' '+(labels[x.name]||x.name)).join('، ')+'۔','Detected: '+found.slice(0,3).map(x=>x.name+' on the '+x.position).join(', ')+'. These are not distance or safety estimates.',found.map(x=>x.name+' · '+x.position+' · '+Math.round(x.score*100)+'% model score').join('\n'));}}}catch(e){response=null;$('speak').disabled=true;status('Unable to analyze');$('urdu').textContent='تجزیہ مکمل نہیں ہو سکا۔';$('english').textContent=(e&&e.message)||String(e)}finally{b.disabled=false}}

// Continuous camera processing. Inference runs sequentially with a small delay so slow phones do not queue frames.
function publishLive(ur,en,details,signature){
 response={ur,en};
 $('urdu').textContent=ur;
 $('english').textContent=en;
 $('details').textContent=details||'';
 $('details').hidden=!details;
 $('speak').disabled=false;
 const now=Date.now();
 if(shouldNarrateScene({
    enabled:$('speechLive').checked, speaking:speakingNow, hasCamera:!!cameraStream,
    visible:!document.hidden && mode==='look',
    hasStableScene:liveCandidateCount>=(signature==='none'?14:3),
    now, lastSpokenAt:liveLastSaid,
    sceneSignature:signature,lastSpokenSignature:livePreviousSignature,
    isRecognizedScene:signature!=='none'
 })){
    // Reserve the narration slot immediately to avoid double announcements while fetching Urdu TTS.
    liveLastSaid=now;livePreviousSignature=signature;
    say();
 }
}
function drawDetections(detections, sourceWidth, sourceHeight){
 // Match object-fit exactly, including the cropping that fills a mobile camera stage.
 const canvas=$('liveOverlay'), shell=$('liveBox'), video=$('liveVideo');
 const surface=shell.getBoundingClientRect(), stageW=surface.width, stageH=surface.height;
 if(!stageW||!stageH||!sourceWidth||!sourceHeight)return;
 const dpr=Math.min(window.devicePixelRatio||1,2);
 const pixelW=Math.max(1,Math.round(stageW*dpr)),pixelH=Math.max(1,Math.round(stageH*dpr));
 if(canvas.width!==pixelW||canvas.height!==pixelH){canvas.width=pixelW;canvas.height=pixelH;}
 canvas.style.cssText='position:absolute;inset:0;width:100%;height:100%;pointer-events:none;';
 const ctx=canvas.getContext('2d');
 ctx.setTransform(dpr,0,0,dpr,0,0);
 ctx.clearRect(0,0,stageW,stageH);
 const fit=$('cameraFillMode')?.value==='contain'?'contain':'cover';
 video.style.objectFit=fit;
 const scale=fit==='cover'?Math.max(stageW/sourceWidth,stageH/sourceHeight):Math.min(stageW/sourceWidth,stageH/sourceHeight);
 const cropX=(stageW-sourceWidth*scale)/2,cropY=(stageH-sourceHeight*scale)/2;
 ctx.lineWidth=Math.max(2,stageW/340);
 ctx.lineJoin='round';ctx.font='700 '+Math.max(12,Math.min(19,stageW/34))+'px system-ui';
 for(const detection of detections){
   let [x,y,w,h]=detection.bbox;
   let left=x*scale+cropX,top=y*scale+cropY,boxW=w*scale,boxH=h*scale;
   if(left>=stageW||top>=stageH||left+boxW<=0||top+boxH<=0)continue;
   // Only draw the part that can actually be seen in the cropped video.
   const visibleLeft=Math.max(0,left),visibleTop=Math.max(0,top);
   const visibleRight=Math.min(stageW,left+boxW),visibleBottom=Math.min(stageH,top+boxH);
   const vw=visibleRight-visibleLeft,vh=visibleBottom-visibleTop;
   if(vw<3||vh<3)continue;
   ctx.strokeStyle='#57f1d0';ctx.shadowColor='#06443e';ctx.shadowBlur=4;
   ctx.strokeRect(visibleLeft+1,visibleTop+1,Math.max(1,vw-2),Math.max(1,vh-2));
   ctx.shadowBlur=0;
   const text=detection.class+' '+Math.round(detection.score*100)+'%';
   const labelPad=8,labelH=Math.max(23,Math.min(33,stageW/23));
   const labelWidth=Math.min(stageW-8,ctx.measureText(text).width+labelPad*2);
   const lx=Math.max(4,Math.min(stageW-labelWidth-4,visibleLeft));
   // Put the label *inside* the box near top so it cannot disappear under the LIVE badge.
   const ly=Math.max(4,Math.min(stageH-labelH-4,visibleTop+5));
   ctx.fillStyle='#073c37e8';ctx.beginPath();if(typeof ctx.roundRect==='function'){ctx.roundRect(lx,ly,labelWidth,labelH,5);ctx.fill();}else{ctx.fillRect(lx,ly,labelWidth,labelH);}
   ctx.fillStyle='#f3fffa';ctx.textBaseline='middle';ctx.fillText(text,lx+labelPad,ly+labelH/2);
 }
}
function stopLive(silent=false){
 recentObjects=[];objectsAt=0;
 ++liveRun;
 if(liveTimer){clearTimeout(liveTimer);liveTimer=null;}
 const v=$('liveVideo');v.pause();if(v.srcObject)v.srcObject=null;
 if(cameraStream)for(const track of cameraStream.getTracks())track.stop();
 cameraStream=null;liveBusy=false;
 $('liveBox').hidden=true;$('liveButtons').hidden=true;$('startLive').hidden=false;
 $('startLive').disabled=false;$('startLive').textContent='◉ Start Live Camera';
 const c=$('liveOverlay');c.getContext('2d').clearRect(0,0,c.width,c.height);
 if(!silent)status('Camera stopped');
}
function updateCameraMessage(err){
 const message=err&&err.name==='NotAllowedError'?'Camera permission denied. Allow camera access in your browser settings and try again.':
 err&&err.name==='NotFoundError'?'No camera found. Connect a camera or try another device.':
 err&&err.name==='NotReadableError'?'Camera busy. Close other apps using the camera and try again.':
 err&&err.name==='SecurityError'?'Camera needs a secure HTTPS page.':
 'Could not start camera: '+(err?.message||String(err));
 status(message);$('english').textContent=message;$('urdu').textContent='کیمرہ شروع نہیں ہو سکا۔';
}
async function startLive(){
 if(cameraStream)stopLive(true);
 const run=++liveRun;
 $('startLive').disabled=true;$('startLive').textContent='Starting camera...';status('Requesting camera permission…');mobileVisionStatus('Requesting camera permission…');updateMobileCapabilities();
 if(!navigator.mediaDevices?.getUserMedia){updateCameraMessage({name:'Unsupported',message:'This browser does not support getUserMedia. Open the HTTPS page in Chrome or Safari.'});$('startLive').disabled=false;$('startLive').textContent='◉ Start Live Camera';return;}
 try{
  const facing=$('cameraSide').value;
  const lowMemory=isMobileDevice() && navigator.deviceMemory && navigator.deviceMemory<4;
  const constraints={audio:false,video:{facingMode:{ideal:facing},width:{ideal:lowMemory?960:1280},height:{ideal:lowMemory?540:720},frameRate:{ideal:15,max:24}}};
  try{cameraStream=await navigator.mediaDevices.getUserMedia(constraints)}catch(error){
   if(error.name==='OverconstrainedError'||error.name==='NotReadableError')
    cameraStream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:facing},width:{ideal:640},height:{ideal:480}},audio:false});
   else throw error;
  }
  if(run!==liveRun){cameraStream?.getTracks().forEach(t=>t.stop());return;}
  const video=$('liveVideo');video.srcObject=cameraStream;await video.play();
  if(run!==liveRun)return;
  $('liveBox').hidden=false;$('liveButtons').hidden=false;$('startLive').hidden=true;
  $('cameraLabel').textContent=mode==='read'?'● LIVE · Capture text':mode==='guide'?'● LIVE · QR scanning':'● LIVE · Object detection';
  $('liveCount').textContent='Camera active';status('Camera is live');
  lastFocusPass=0;zeroDetectionSince=0;
  const cameraSettings=cameraStream.getVideoTracks()[0]?.getSettings?.()||{};
  mobileVisionStatus('Camera '+(video.videoWidth||cameraSettings.width||'?')+'×'+(video.videoHeight||cameraSettings.height||'?')+
    '. '+($('focusAssist')?.checked?'Focus assist on.':'Focus assist off.')+' Waiting for detector.');
 livePreviousSignature='';liveCandidate='';liveCandidateCount=0;liveLastSaid=0;liveClock='';liveFrameNumber=0;
 // Automatic narration defaults to on, but never override an explicit pause.
 updateNarrationStatus();
  const tracks=cameraStream.getVideoTracks();if(tracks[0])tracks[0].onended=()=>{if(cameraStream){stopLive();status('Camera was disconnected')}};
  if(mode==='look'){
   await ensureVisionLibraries();
   if(!detector){
    status('Loading AI detector. Camera is already live…');
    mobileVisionStatus('Downloading '+(modelType==='mobilenet_v2'?'detailed':'fast')+' recognition model. First load may take time on a phone.');
    try{
     if(window.tf?.ready)await window.tf.ready();
     detectorPromise ||= cocoSsd.load({base:modelType}).catch(err=>{detectorPromise=null;throw err});
     detector=await detectorPromise;
    }catch(err){
     if(isMobileDevice()&&await recoverMobileBackend(err)){
      // Model was recovered on CPU.
     }else if(modelType!=='lite_mobilenet_v2'){
      modelType='lite_mobilenet_v2';$('visionModel').value=modelType;detectorPromise=null;
      detector=await cocoSsd.load({base:modelType});
     }else throw err;
    }
   }
   if(run!==liveRun)return;
   status('Live object detection active');updateMobileCapabilities();
   mobileVisionStatus('Detector ready · backend '+(window.tf?.getBackend?.()||'unknown')+' · camera '+video.videoWidth+'×'+video.videoHeight+'.');
  }else if(mode==='guide'){status('Live QR scanning active');}
  else{status('Camera active. Tap Capture & analyze frame to read printed text.');}
  processLive(run);
 }catch(err){
  if(run===liveRun){
   const issue=String(err?.message||err);
   if(cameraStream&&$('liveVideo').readyState>=2){
    // Camera permission succeeded: keep the live preview instead of hiding it on AI failure.
    status('Camera working · AI unavailable');
    mobileVisionStatus('Camera OK, but AI unavailable: '+issue+'. Try Retry AI, or open in Chrome / Safari.');
    $('english').textContent='Camera is active but AI detection could not start: '+issue;
   }else{stopLive(true);updateCameraMessage(err);mobileVisionStatus('Camera could not start: '+issue);}
 }
 }
}
async function processLive(run){
 if(run!==liveRun||!cameraStream||document.hidden){if(run===liveRun&&cameraStream)liveTimer=setTimeout(()=>processLive(run),600);return;}
 const video=$('liveVideo');if(video.readyState<2||!video.videoWidth){liveTimer=setTimeout(()=>processLive(run),350);return;}
 try{
  const w=video.videoWidth,h=video.videoHeight;
  if(mode==='look'){
   const minScore=Number($('detectSensitivity')?.value||0.35);
   let rawDetections;
   try{rawDetections=await mobileDetectorInference(video);}
   catch(err){
    if(isMobileDevice()&&await recoverMobileBackend(err))rawDetections=await mobileDetectorInference(video);
    else throw err;
   }
   let detections=rawDetections.filter(d=>d.score>=minScore).sort((a,b)=>b.score-a.score).slice(0,10);
   if(run!==liveRun)return;
   if(!detections.length&&$('focusAssist')?.checked&&Date.now()-lastFocusPass>3500){
    lastFocusPass=Date.now();
    try{
     const center=await detectCenterCrop(video,detector,Math.max(.27,minScore-.035));
     if(run!==liveRun)return;
     if(center.length)detections=center.sort((a,b)=>b.score-a.score).slice(0,8);
    }catch(err){console.warn('Focus assist pass failed',err);}
   }
   if(!detections.length){
    if(!zeroDetectionSince)zeroDetectionSince=Date.now();
    if(Date.now()-zeroDetectionSince>4500)
     mobileVisionStatus('No supported object confidently recognized. Improve lighting, hold the phone steady or center the object. This does not mean the way is clear.');
   }else{
    zeroDetectionSince=0;
    if(liveFrameNumber%15===0)mobileVisionStatus((detections.some(d=>d.focusAssisted)?'Focus-assisted':'Standard')+' detection: '+detections.length+' object(s) · camera '+w+'×'+h+'.');
   }
   recentObjects=detections.map(d=>({...d,side:(d.bbox[0]+d.bbox[2]/2)/w<.33?'left':(d.bbox[0]+d.bbox[2]/2)/w>.67?'right':'center'}));objectsAt=Date.now();
   drawDetections(detections,w,h);++liveFrameNumber;
   $('liveCount').textContent=detections.length+' object'+(detections.length===1?'':'s')+' · frame '+liveFrameNumber;
   const brief=detections.slice(0,3).map(d=>{let center=(d.bbox[0]+d.bbox[2]/2)/w;return {name:d.class,position:center<.33?'left':center>.67?'right':'center',score:d.score}});
   let sig=brief.map(d=>d.name+':'+d.position).sort().join('|')||'none';
   if(sig===liveCandidate)liveCandidateCount++;else{liveCandidate=sig;liveCandidateCount=1;}
   // Wait for a stable view so a single noisy frame does not trigger an announcement.
   // Keep revisiting unchanged scenes so narration really continues while the camera is open.
   if(liveCandidateCount>=(brief.length?3:14)){
     const now=Date.now();
     const canSpeak=shouldNarrateScene({
       enabled:$('speechLive').checked,speaking:speakingNow,hasCamera:!!cameraStream,
       visible:!document.hidden && mode==='look',hasStableScene:true,now,
       lastSpokenAt:liveLastSaid,sceneSignature:sig,
       lastSpokenSignature:livePreviousSignature,isRecognizedScene:brief.length>0
     });
     if((sig!==liveClock&&!speakingNow)||canSpeak){
       liveClock=sig;
       if(brief.length){
         const en='I can see '+brief.map(d=>d.name+' on the '+d.position).join(', ')+'.';
         const ur='مجھے نظر آ رہا ہے: '+brief.map(d=>posUr[d.position]+' '+(labels[d.name]||d.name)).join('، ')+'۔';
         const extra=brief.map(d=>d.name+' · '+d.position+' · '+Math.round(d.score*100)+'% model score').join('\n');
         publishLive(ur,en,extra,sig);
       }else{
         // No confident detection does NOT mean an empty or safe path.
         publishLive('اس وقت میں کسی چیز کو یقین سے نہیں پہچان سکا۔ اس کا یہ مطلب نہیں کہ راستہ محفوظ ہے۔',
           'I cannot confidently recognize an object right now. This does not mean the area is clear or safe.','',sig);
       }
     }
   }
   const now=Date.now();if(now-liveLastStatus>=2000){status(detections.length?'LIVE · '+detections.length+' object(s) recognized':'LIVE · Searching for supported objects');liveLastStatus=now;}
  }else if(mode==='guide'){
   try{
    const code=await readQR(video);if(run!==liveRun)return;
    if(code.startsWith('NAZARSAATHI:DEMO:')&&code!==liveClock){liveClock=code;reportCheckpoint(code);}
   }catch(e){}
   $('liveCount').textContent='Live QR scanner';
  }else{$('liveCount').textContent='Live preview · Capture text';}
 }catch(err){
  if(run===liveRun){status('Live detection error');const issue=String(err?.message||err);$('english').textContent='Detection failed: '+issue;mobileVisionStatus('AI inference failed: '+issue+'. Try Retry AI or switch to Chrome/Safari.');}
 }
 if(run===liveRun&&cameraStream)liveTimer=setTimeout(()=>processLive(run),mode==='read'?1200:mode==='guide'?550:300);
}
async function captureLiveFrame(){
 const video=$('liveVideo');if(!cameraStream||!video.videoWidth)return;
 const canvas=document.createElement('canvas');canvas.width=video.videoWidth;canvas.height=video.videoHeight;canvas.getContext('2d').drawImage(video,0,0);
 const data=canvas.toDataURL('image/jpeg',.91);const img=new Image();
 await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject;img.src=data;});
 image=img;$('preview').src=data;$('preview').style.display='block';$('analyze').disabled=false;
 await run(); // Keep the live camera running after a spoken photo capture.
}
function reportCheckpoint(code){
 const loc=code.slice('NAZARSAATHI:DEMO:'.length).toLowerCase();
 if(!names[loc])throw Error('Unrecognized demo marker.');
 const dest=$('destination').value,route=path(loc,dest);
 if(!route)throw Error('Demo route unavailable.');
 if(route.length===1)show('آپ '+names[loc][1]+' پر پہنچ گئے ہیں۔','You are at '+names[loc][0]+'.','Verified demo checkpoint: '+names[loc][0]);
 else show('آپ '+names[loc][1]+' پر ہیں۔ اگلا نشان '+names[route[1]][1]+' ہے۔ براہ کرم کسی شخص سے راستے کی تصدیق کریں۔','You are at '+names[loc][0]+'. Next checkpoint: '+names[route[1]][0]+'. Ask a person to confirm the route.','Demo route: '+route.map(n=>names[n][0]).join(' → '));
}
$('startLive').onclick=startLive;
$('stopLive').onclick=()=>stopLive();
$('captureFrame').onclick=captureLiveFrame;
$('cameraSide').onchange=()=>{if(cameraStream){stopLive(true);startLive();}};
$('cameraFillMode').onchange=()=>{const video=$('liveVideo');video.style.objectFit=$('cameraFillMode').value;if(cameraStream&&video.videoWidth)drawDetections(recentObjects,video.videoWidth,video.videoHeight);};
window.addEventListener('resize',()=>{const video=$('liveVideo');if(cameraStream&&video.videoWidth)drawDetections(recentObjects,video.videoWidth,video.videoHeight);},{passive:true});
if(isMobileDevice()){
 $('detectSensitivity').value='0.28'; // Wider recall at the cost of more possible false positives.
 mobileVisionStatus('Mobile detection ready: rear camera preferred, higher resolution requested, more results selected. These predictions can be wrong.');
}
$('focusAssist').onchange=()=>mobileVisionStatus($('focusAssist').checked?'Center-focused retry enabled for difficult detections.':'Focus assist off.');
$('zoomIn').onclick=()=>changeHardwareZoom('in');
$('zoomOut').onclick=()=>changeHardwareZoom('out');
document.addEventListener('visibilitychange',()=>{if(document.hidden){window.speechSynthesis?.cancel();if(cameraStream)status('Camera paused while tab is hidden');}});

function micStatus(s){$('micStatus').textContent=s}
function changeLanguage(lang,announce=false){
 language=lang==='en'?'en':'ur';$('speechLanguage').value=language;
 $('voiceExamples').innerHTML=language==='ur'?
 '<b>بولیں:</b> ”نظر ساتھی، سامنے کیا ہے؟“<div>”بوتل کہاں ہے؟“ · ”یہ پڑھو“</div><div>”انگریزی بولو“ · ”اردو بولو“ · ”مدد کرو“</div>':
 '<b>Say:</b> “NazarSaathi, what is in front of me?”<div>“Where is my bottle?” · “Read this”</div><div>“Speak Urdu” · “Speak English” · “Help”</div>';
 if(micEnabled&&asr){try{asr.abort()}catch(e){}micOn=false;resumeMic(850)}
 if(announce)respond('زبان اردو منتخب کر لی گئی ہے۔','Language switched to '+(language==='ur'?'Urdu.':'English.'));
}
function setMicButton(){
 $('assistantToggle').textContent=micEnabled?'■ Stop Voice Assistant':'🎙 Start Hands-Free Assistant';
 $('assistantToggle').setAttribute('aria-pressed',String(micEnabled));
 $('assistantToggle').classList.toggle('active',micEnabled);
}
function startListening(){
 if(!micEnabled||micOn||speakingNow||document.hidden)return;
 const SpeechEngine=window.SpeechRecognition||window.webkitSpeechRecognition;
 if(!SpeechEngine){
  micEnabled=false;setMicButton();
  micStatus('Voice recognition unavailable in this browser. Open this URL in Chrome on Android or Safari on iPhone; do not use an in-app browser. Typed commands still work.');
  updateMobileCapabilities();
  return;
 }
 if(!asr){
  asr=new SpeechEngine();
  // Repeating short recognition sessions is more compatible with mobile Safari and Android.
  asr.continuous=!isMobileDevice();
  asr.interimResults=false;
  asr.maxAlternatives=1;
  asr.onstart=()=>{
   micOn=true;micRestartFailures=0;micErrors=0;micLastActivity=Date.now();
   micStatus('🎤 Listening in '+(language==='ur'?'Urdu':'English')+' — say a command.');
  };
  asr.onresult=e=>{
   if(!micEnabled||speakingNow)return;
   micLastActivity=Date.now();
   let heard=false;
   for(let n=e.resultIndex;n<e.results.length;n++){
    if(!e.results[n].isFinal)continue;
    const phrase=(e.results[n][0]?.transcript||'').trim();
    if(phrase){
      heard=true;$('commandInput').value=phrase;
      const transcript=$('voiceTranscript');
      if(transcript)transcript.textContent='Heard: '+phrase;
      micStatus('Heard: '+phrase);
      command(phrase);
    }
   }
   if(!heard)micStatus('Speech detected. Waiting for a complete command…');
  };
  asr.onerror=e=>{
   micOn=false;
   if(!micEnabled)return;
   const error=e.error||'unknown';
   if(['not-allowed','service-not-allowed','audio-capture'].includes(error)){
     micEnabled=false;micBlocked=true;setMicButton();
     micStatus('Microphone access blocked ('+error+'). Check site permissions in your browser and tap Retry voice.');
   }else if(error==='network'){
     micEnabled=false;micBlocked=true;setMicButton();
     micStatus('Browser speech service failed (network). Open the website directly in Chrome or Safari and try Retry voice. This device may not support this language or service.');
   }else if(error==='language-not-supported'){
     micEnabled=false;micBlocked=true;setMicButton();
     micStatus('Recognition language is unavailable. Select English and tap Retry voice.');
   }else if(error==='no-speech'){
     micStatus('No speech heard. Still ready; if listening does not resume, tap Retry voice.');
   }else if(error!=='aborted'){
     micErrors++;micStatus('Speech engine error: '+error+'. Try Retry voice.');
   }
   updateMobileCapabilities();
  };
  asr.onend=()=>{
    micOn=false;
    if(micEnabled&&!speakingNow&&!micBlocked){
      micRestartFailures++;
      if(micRestartFailures>10){
        micEnabled=false;setMicButton();
        micStatus('Recognition stopped repeatedly. Tap Retry voice to restart from a new user gesture.');
      }else{
        micStatus('Voice recognition paused; restarting…');
        resumeMic(isMobileDevice()?1300:850);
      }
    }
  };
 }
 asr.lang=language==='ur'?'ur-PK':'en-US';
 try{
  asr.start();micOn=true;
  micStatus('Requesting microphone / speech recognition permission…');
 }catch(e){
  micOn=false;micRestartFailures++;
  micStatus('Recognition could not start: '+(e?.message||String(e))+'. Tap Retry voice.');
  if(!isMobileDevice()&&micRestartFailures<3)resumeMic(1600);
 }
}
function toggleAssistant(){
 if(micEnabled){stopListening();return}
 if(!window.SpeechRecognition&&!window.webkitSpeechRecognition){micStatus('Your browser cannot recognize voice commands. Please try Chrome on Android or use the typed command box.');return}
 micBlocked=false;micEnabled=true;setMicButton();
 // Voice command listening and continuous descriptions coexist. Narration briefly pauses
 // recognition to avoid the assistant treating its own speech as a user command.
 updateNarrationStatus();
 if(!cameraStream)startLive().catch(()=>{});
 startListening();
}
function stopListening(){
 micEnabled=false;clearTimeout(asrRetry);
 if(asr){try{asr.abort()}catch(e){}}
 micOn=false;setMicButton();micStatus('Microphone stopped. Camera can remain on.');
}
function respond(ur,en,more=''){show(ur,en,more)}
function recent(){return cameraStream&&mode==='look'&&Date.now()-objectsAt<6000?recentObjects:null}
function describe(){
 // "What is in front of me?" also switches on continuing commentary.
 $('speechLive').checked=true;updateNarrationStatus();
 const objs=recent();
 if(!objs){respond('براہ کرم لائیو کیمرہ شروع کریں۔ پھر میں سامنے کی چیزیں بتاتا رہوں گا۔',
  'Please start the live camera. I will keep describing recognized objects as the view changes.');return;}
 if(!objs.length){respond('ابھی کوئی چیز واضح نہیں پہچانی۔ میں کیمرہ دیکھتا رہوں گا، لیکن اس کا مطلب نہیں کہ راستہ محفوظ ہے۔',
  'No object confidently recognized yet. I will keep checking the view, but this does not mean the area is safe.');return;}
 const arr=objs.slice(0,4);
 respond('سامنے نظر آ رہا ہے: '+arr.map(d=>posUr[d.side]+' '+(labels[d.class]||d.class)).join('، ')+'۔ منظر بدلنے پر میں بتاتا رہوں گا۔',
 'I can see '+arr.map(d=>d.class+' on the '+d.side).join(', ')+'. I will continue describing meaningful changes.',
 'Positions are relative to the camera, not directions for safe walking.');
}
const synonyms={bottle:['bottle'],'بوتل':['bottle'],phone:['cell phone'],mobile:['cell phone'],'موبائل':['cell phone'],'فون':['cell phone'],book:['book'],'کتاب':['book'],chair:['chair'],'کرسی':['chair'],table:['dining table'],'میز':['dining table'],cup:['cup'],'کپ':['cup'],laptop:['laptop'],'لیپ ٹاپ':['laptop'],person:['person'],'آدمی':['person'],dog:['dog'],'کتا':['dog'],cat:['cat'],'بلی':['cat'],bag:['backpack','handbag'],'بیگ':['backpack','handbag'],car:['car'],'گاڑی':['car'],keyboard:['keyboard'],door:[],stairs:[],'دروازہ':[],'سیڑھی':[]};
function findItem(key,cats){
 if(!cats.length){respond('یہ چیز میرے موجودہ ماڈل میں قابل اعتماد انداز میں پہچانی نہیں جاتی۔','This type of object is not supported by the current detector.');return}
 const objs=recent();
 if(!objs){respond('پہلے لائیو کیمرہ چلائیں۔','Please start the live camera before searching for an object.');return}
 const item=objs.filter(o=>cats.includes(o.class)).sort((a,b)=>b.score-a.score)[0];
 if(!item){respond('ابھی مجھے یہ چیز تصویر میں نہیں ملی۔ یہ آس پاس پھر بھی ہو سکتی ہے۔','I cannot see '+key+' in the current frame, but it may still be nearby.');return}
 respond((labels[item.class]||item.class)+' '+posUr[item.side]+' نظر آ رہی ہے۔','I see '+item.class+' on the '+item.side+'. This is camera-relative, not a walking direction.');
}
async function readByVoice(ocrLang){
 if(!cameraStream||!$('liveVideo').videoWidth){respond('کیمرہ شروع کریں اور لکھی ہوئی عبارت کی طرف کریں۔','Start your camera and point it at printed text.');return}
 if(!window.Tesseract){respond('متن پڑھنے والا نظام دستیاب نہیں۔','Text-reading engine unavailable.');return}
 const v=$('liveVideo'),c=document.createElement('canvas');c.width=v.videoWidth;c.height=v.videoHeight;c.getContext('2d').drawImage(v,0,0);
 micStatus('Reading text. Please wait…');
 try{const result=await Tesseract.recognize(c,ocrLang);const t=(result.data.text||'').trim().slice(0,420);
  if(!t)respond('واضح الفاظ نہیں ملے۔ دوبارہ کوشش کریں۔','No clear text found. Please try again.');
  else respond('یہ لکھا ہے: '+t,'The text says: '+t,'OCR may make mistakes.');
 }catch(e){respond('ابھی لکھائی پڑھنا ممکن نہیں۔','Text recognition failed.');}
}
async function scanByVoice(){
 if(!cameraStream){respond('پہلے کیمرہ چلائیں۔','Start the camera to scan a checkpoint.');return}
 try{const qr=await readQR($('liveVideo'));if(!qr.startsWith('NAZARSAATHI:DEMO:'))throw Error('unsupported');reportCheckpoint(qr)}
 catch(e){respond('مجھے ڈیمو کیو آر نشان نہیں ملا۔','No supported demo QR checkpoint was visible.');}
}

/* Voice navigation for every primary user-facing feature.
   Confirm actions out loud; retain one previous setting for "undo".
   A browser's microphone permission cannot be bypassed, even by this router. */
let lastVoiceSetting=null;
const voiceAcknowledge=(ur,en,extra='')=>respond(ur,en,extra);
function voiceSetting(label,oldValue,restore){
 lastVoiceSetting={label,oldValue,restore};
}
function voiceSet(id,value,eventName='change'){
 const target=$(id);
 if(!target)return false;
 const oldValue=target.type==='checkbox'?target.checked:target.value;
 voiceSetting(id,oldValue,()=>{
   if(target.type==='checkbox')target.checked=oldValue;else target.value=oldValue;
   target.dispatchEvent(new Event(eventName,{bubbles:true}));
 });
 if(target.type==='checkbox')target.checked=value;else target.value=value;
 target.dispatchEvent(new Event(eventName,{bubbles:true}));
 return true;
}
function voiceChangeMode(id){
 const button=document.querySelector('[data-mode="'+id+'"]');
 if(!button)return;
 const previous=mode,wasLive=!!cameraStream;
 voiceSetting('mode',previous,()=>{
   document.querySelector('[data-mode="'+previous+'"]')?.click();
   if(wasLive)startLive();
 });
 button.click();
 if(wasLive)startLive();
}
function voiceFocus(selector,ur,en){
 const el=document.querySelector(selector);
 if(!el){voiceAcknowledge('یہ حصہ ابھی دستیاب نہیں۔','That section is currently unavailable.');return;}
 if(!el.hasAttribute('tabindex'))el.setAttribute('tabindex','-1');
 el.focus({preventScroll:true});
 el.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'center'});
 voiceAcknowledge(ur,en);
}
function currentVoiceStatus(){
 const m={look:'live vision',read:'text reading',guide:'demo checkpoints'};
 const mu={look:'چیزوں کی شناخت',read:'لکھائی پڑھنا',guide:'ڈیمو چیک پوائنٹ'};
 const fit=$('cameraFillMode').value==='cover'?'fill frame':'entire image';
 const urfit=$('cameraFillMode').value==='cover'?'مکمل فریم':'مکمل تصویر';
 voiceAcknowledge(
  'موجودہ موڈ '+mu[mode]+' ہے۔ کیمرہ '+(cameraStream?'چالو':'بند')+' ہے۔ تصویر '+urfit+' میں ہے۔ آواز کی زبان '+(language==='ur'?'اردو':'انگریزی')+' ہے۔',
  'Mode: '+m[mode]+'. Camera: '+(cameraStream?'on':'off')+'. View: '+fit+'. Speech: '+(language==='ur'?'Urdu':'English')+'. Microphone: '+(micEnabled?'on.':'off.')
 );
}
function performVoiceControl(intent){
 const value=intent.value;
 switch(intent.action){
  case 'language':changeLanguage(value,true);return;
  case 'listening':
   if(value==='start'){
     if(micEnabled)voiceAcknowledge('مائیکروفون پہلے ہی چل رہا ہے۔','Microphone is already on.');
     else toggleAssistant();
     return;
   }
   stopListening();voiceAcknowledge('مائیکروفون بند کر دیا گیا ہے۔ اسے دوبارہ چلانے کے لیے وائس اسسٹنٹ کا بڑا بٹن دبائیں۔','Microphone is off. Press the large voice assistant button to enable listening again.');return;
  case 'action':
   switch(value){
    case 'undo':
      if(!lastVoiceSetting){voiceAcknowledge('کوئی پچھلی سیٹنگ موجود نہیں۔','There is no previous setting to restore.');return;}
      const u=lastVoiceSetting;lastVoiceSetting=null;
      try{u.restore();voiceAcknowledge('پچھلی سیٹنگ بحال کر دی گئی ہے۔','Previous setting restored.');}catch(err){voiceAcknowledge('سیٹنگ واپس نہیں ہو سکی۔','Could not restore that setting.');}return;
    case 'status':currentVoiceStatus();return;
    case 'features':
      voiceAcknowledge('میں کیمرہ، تصویر کا منظر، سامنے یا پیچھے والا کیمرہ، شناخت کا ماڈل، حساسیت، آواز، اردو یا انگریزی، پڑھنے کا موڈ، چیک پوائنٹ اور تھیم تبدیل کر سکتا ہوں۔ کہیں: مدد کرو۔',
      'You can control camera on or off, camera view, front or back camera, vision and reading mode, model, sensitivity, auto narration, Urdu or English speech, themes and demo checkpoints. Say help for example commands.');return;
    case 'help':
      voiceAcknowledge('کہیں: سامنے کیا ہے؟ پوری تصویر دکھاؤ۔ کیمرہ فل کرو۔ سامنے والا کیمرہ۔ اردو بولو۔ لکھائی پڑھو۔ زیادہ نتائج۔ یا پچھلی سیٹنگ۔',
      'Try: what is in front of me; show entire image; fill camera frame; front camera; speak Urdu; reading mode; more detections; or undo last change.');return;
    case 'describe':describe();return;
    case 'startVision':
      {const liveBefore=!!cameraStream;if(mode!=='look')voiceChangeMode('look');if(!liveBefore&&!cameraStream)startLive();}
      voiceAcknowledge('لائیو ویژن شروع ہو رہا ہے۔ میں سامنے نظر آنے والی چیزوں کے بارے میں بتاؤں گا۔','Live vision is starting. I will describe recognized objects.');
      return;
    case 'startReading':
      {const liveBefore=!!cameraStream;if(mode!=='read')voiceChangeMode('read');if(!liveBefore&&!cameraStream)startLive();}
      voiceAcknowledge('لکھائی پڑھنے کا موڈ شروع ہو رہا ہے۔ کہیں: یہ پڑھو۔','Reading mode starting. Say read this while pointing the camera at text.');
      return;
    case 'nextMode':{
      const modes=['look','read','guide'],next=modes[(modes.indexOf(mode)+1)%modes.length];
      voiceChangeMode(next);voiceAcknowledge('اگلا موڈ منتخب ہو گیا۔','Next mode selected: '+next+'.');return;
    }
    case 'previousMode':{
      const prior=previousMode;
      if(prior===mode){voiceAcknowledge('پچھلا موڈ دستیاب نہیں۔','No previous mode to return to.');return;}
      voiceChangeMode(prior);voiceAcknowledge('پچھلا موڈ بحال کر دیا ہے۔','Returned to previous mode: '+prior+'.');return;
    }
    case 'captureRead':{
      // The entire action should work from one utterance on the phone.
      // Read a live frame, or a previously selected photo when no camera is active.
      if(cameraStream || (mode!=='read'&&$('liveVideo')?.srcObject)){
        const changed=mode!=='read';
        if(changed)voiceChangeMode('read');
        // Wait for the newly selected reading camera to become playable.
        (async()=>{
          for(let i=0;i<32;i++){
            if(mode!=='read')return;
            if(cameraStream&&$('liveVideo')?.readyState>=2&&$('liveVideo').videoWidth){
              await readByVoice($('ocrLang').value);
              return;
            }
            await new Promise(resolve=>setTimeout(resolve,250));
          }
          voiceAcknowledge('کیمرہ ابھی تیار نہیں۔ دوبارہ کوشش کریں۔','The camera is not ready to read text. Please try again.');
        })();
      }else if(image){
        if(mode!=='read')voiceChangeMode('read');
        run();
      }else voiceAcknowledge('متن پڑھنے کے لیے کیمرہ شروع کریں۔','Start the camera or upload a photo to read text.');
      return;
    }
    case 'capture':
      if(!cameraStream)voiceAcknowledge('فریم لینے کے لیے کیمرہ چلائیں۔','Start the camera before capturing a frame.');
      else captureLiveFrame();
      return;
    case 'identify':
      if(!cameraStream)voiceAcknowledge('مزید شناخت کے لیے کیمرہ چلائیں۔','Start the camera before identifying more categories.');
      else identifyMore();return;
    case 'analyze':
      if(!$('analyze').disabled)run();
      else voiceAcknowledge('پہلے تصویر منتخب کرنا ضروری ہے۔ بغیر تصویر منتخب کیے بھی لائیو کیمرہ استعمال کر سکتے ہیں۔','Please select an uploaded photo first, or use the live camera instead.');return;
    case 'scan':scanByVoice();return;
    case 'read':readByVoice($('ocrLang').value);return;
    case 'readUrdu':voiceSet('ocrLang','urd');readByVoice('urd');return;
   }return;
  case 'focusAssist':
    voiceSet('focusAssist',value==='on');
    voiceAcknowledge(value==='on'?'چھوٹی چیزوں کے لیے اضافی مرکز والی شناخت چالو ہوئی ہے۔':'اضافی فوکس شناخت بند ہوئی ہے۔',
      value==='on'?'Center-focused detection is enabled for difficult objects.':'Center-focused detection disabled.');return;
  case 'camera':
    if(value==='zoomIn'||value==='zoomOut'||value==='zoomReset'){
      changeHardwareZoom(value==='zoomIn'?'in':value==='zoomOut'?'out':'reset');return;
    }
    if(value==='start'){if(cameraStream)voiceAcknowledge('کیمرہ پہلے ہی چل رہا ہے۔','The camera is already running.');else{startLive();voiceAcknowledge('کیمرہ شروع کیا جا رہا ہے۔','Starting the camera.');}return;}
    if(value==='stop'){if(cameraStream)stopLive();voiceAcknowledge('کیمرہ بند کر دیا گیا ہے۔','Camera stopped.');return;}
    if(value==='front'||value==='back'){
      voiceSet('cameraSide',value==='front'?'user':'environment');
      voiceAcknowledge(value==='front'?'سامنے والا کیمرہ منتخب ہو گیا ہے۔':'پیچھے والا کیمرہ منتخب ہو گیا ہے۔',value==='front'?'Front camera selected.':'Back camera selected.');return;
    }
    if(value==='fill'||value==='entire'){
      voiceSet('cameraFillMode',value==='fill'?'cover':'contain');
      voiceAcknowledge(value==='fill'?'کیمرہ اب پورے فریم میں نظر آئے گا، کنارے کٹ سکتے ہیں۔':'پوری کیمرہ تصویر دکھائی جائے گی، اطراف میں خالی جگہ ہو سکتی ہے۔',
       value==='fill'?'Camera now fills the frame. Some edges may be cropped.':'Entire camera image enabled. Side bars may appear.');return;
    }return;
  case 'mode':
    voiceChangeMode(value);
    voiceAcknowledge(value==='look'?'چیزیں دیکھنے کا موڈ شروع کیا۔':value==='read'?'لکھائی پڑھنے کا موڈ منتخب ہوا۔':'ڈیمو چیک پوائنٹ موڈ منتخب ہوا۔',
      value==='look'?'Object recognition mode selected.':value==='read'?'Text reading mode selected.':'Demo checkpoint mode selected.');return;
  case 'speech':
    if(value==='repeat'){say();return;}
    if(value==='stop'){stopSpeech();$('speechLive').checked=false;updateNarrationStatus();micStatus('Narration stopped; microphone controls remain enabled.');return;}
    voiceSet('speechLive',value==='on');
    voiceAcknowledge(value==='on'?'لائیو منظر کی مسلسل وضاحت شروع ہو گئی ہے۔ کیمرہ حرکت دینے پر نئی چیزوں کے بارے میں بتاؤں گا۔':'لائیو منظر کی مسلسل آواز بند کر دی گئی ہے۔',
      value==='on'?'Continuous live descriptions enabled. I will announce changes as the camera moves.':'Continuous live descriptions paused.');return;
  case 'model':
    voiceSet('visionModel',value==='fast'?'lite_mobilenet_v2':'mobilenet_v2');
    voiceAcknowledge(value==='fast'?'تیز ماڈل منتخب ہوا۔':'تفصیلی ماڈل منتخب ہوا۔ یہ سست ہو سکتا ہے۔',
      value==='fast'?'Fast detection model selected.':'Detailed detection model selected. This may run more slowly.');return;
  case 'sensitivity':{
    const v=value==='more'?'0.28':value==='confidence'?'0.5':'0.35';
    voiceSet('detectSensitivity',v);
    voiceAcknowledge(value==='more'?'زیادہ چیزیں شناخت کرنے کی کوشش ہو گی، غلط نتائج بڑھ سکتے ہیں۔':value==='confidence'?'زیادہ یقین والے نتائج منتخب ہوئے۔':'متوازن شناخت منتخب ہوئی۔',
      value==='more'?'Sensitivity increased. More false detections are possible.':value==='confidence'?'Higher confidence detections selected.':'Balanced sensitivity selected.');return;}
  case 'ocrLanguage':
    voiceSet('ocrLang',value);
    voiceAcknowledge(value==='urd'?'متن پڑھنے کی زبان اردو منتخب ہوئی۔':'متن پڑھنے کی زبان انگریزی منتخب ہوئی۔',
      value==='urd'?'OCR language set to Urdu.':'OCR language set to English.');return;
  case 'theme':{
    const name={'daylight':'Daylight','sea-glass':'Sea Glass','midnight':'Midnight','contrast':'Contrast'}[value];
    const button=document.querySelector('[aria-label="Use '+name+' theme"]');
    if(!button){voiceAcknowledge('تھیم کا بٹن نہیں ملا۔','Theme button not available.');return;}
    const current=document.querySelector('.theme-choice[aria-pressed="true"]');
    const previous=current?.getAttribute('aria-label');
    voiceSetting('theme',previous,()=>{if(previous)document.querySelector('[aria-label="'+previous+'"]')?.click();});
    button.click();
    voiceAcknowledge('تھیم '+name+' منتخب ہو گیا ہے۔','Theme changed to '+name+'.');return;}
  case 'destination':{
    voiceChangeMode('guide');
    voiceSet('destination',value);
    const labels={gate:'Welcome Point',lobby:'Reception',library:'Library',helpdesk:'Help Desk',lab:'Computer Lab'};
    voiceAcknowledge('ڈیمو منزل '+labels[value]+' منتخب ہوئی ہے۔ یہ اصلی راستہ نہیں ہے۔',
      'Demo destination set to '+labels[value]+'. This is a fictional checkpoint demo, not real navigation.');return;}
  case 'focus':
    switch(value){
     case 'camera':voiceFocus('.studio-panel','کیمرہ کنٹرول والا حصہ کھول دیا ہے۔','Focused camera controls.');return;
     case 'voice':voiceFocus('.assistant-console','وائس اسسٹنٹ کا حصہ کھول دیا ہے۔','Focused voice assistant controls.');return;
     case 'results':voiceFocus('.response-panel','نتائج کا حصہ کھول دیا ہے۔ کہیں: سامنے کیا ہے؟','Focused results. Say what is in front of me for a new scene description.');return;
     case 'settings':voiceFocus('.recognition-settings','شناخت کی سیٹنگز کا حصہ کھول دیا ہے۔','Focused recognition settings.');return;
     case 'checkpoints':voiceFocus('.checkpoints-panel','ڈیمو چیک پوائنٹ والا حصہ کھول دیا ہے۔','Focused the demo checkpoints section.');return;
    }return;
 }
}

function command(raw){
 const t=(raw||'').trim().toLowerCase();if(!t)return;
 const tm=Date.now();if(t===lastRecognized&&tm-lastRecognizedAt<1700)return;lastRecognized=t;lastRecognizedAt=tm;
 const control=parseVoiceControl(raw);
 if(control){performVoiceControl(control);return;}
 const has=(...words)=>words.some(w=>t.includes(w));
 if(has('stop listening','stop assistant','مائیک بند','سننا بند')){stopListening();respond('اب میں سننا بند کر رہا ہوں۔','I stopped listening.');return}
 if(has('speak english','switch to english','english please','انگریزی بولو','انگلش بولو','انگریزی میں')){changeLanguage('en',true);return}
 if(has('speak urdu','switch to urdu','urdu please','اردو بولو','اردو میں','اردو زبان')){changeLanguage('ur',true);return}
 if(has('help','commands','مدد')){respond('آپ کہہ سکتے ہیں: سامنے کیا ہے؟ بوتل کہاں ہے؟ یہ پڑھو، یا انگریزی بولو۔','Try: What do you see? Where is my bottle? Read this. Speak Urdu. Speak English.');return}
 if(has('repeat','again please','say again','دوبارہ')){say();return}
 if(has('stop speaking','be quiet','خاموش')){stopSpeech();$('speechLive').checked=false;return}
 if(has('stop camera','camera off','کیمرہ بند')){stopLive();respond('کیمرہ بند ہے۔','The camera is now off.');return}
 if(has('start camera','open camera','کیمرہ چالو')){if(!cameraStream)startLive().catch(()=>{});respond('کیمرہ شروع کر رہا ہوں۔','Trying to start the camera. You may have to tap Start Live Camera.');return}
 if(has('is it safe','can i cross','safe to walk','clear path','محفوظ ہے','راستہ صاف')){respond('میں یہ نہیں بتا سکتا کہ راستہ چلنے کے لیے محفوظ ہے۔ اپنا موبیلٹی ایڈ اور قابل اعتماد انسان کی مدد استعمال کریں۔','I cannot judge whether it is safe to walk or cross. Use your mobility aid or ask a trusted person.');return}
 if(has('read urdu','urdu text','اردو پڑھ')){readByVoice('urd');return}
 if(has('read this','read text','read the sign','what does it say','یہ پڑھ','پڑھ کر','کیا لکھا','لکھا ہے')){readByVoice($('ocrLang').value||'eng');return}
 if(has('scan qr','scan checkpoint','qr code','where am i','کیو آر','نشان اسکین','میں کہاں ہوں')){scanByVoice();return}
 if(has('what do you see','what can you see','what is in front','what is ahead','look around','describe','tell me what','what is around','i can not see','i cannot see','سامنے کیا','کیا نظر','آس پاس','مجھے بتاؤ','کیا دیکھ')){describe();return}
 const found=Object.keys(synonyms).sort((a,b)=>b.length-a.length).find(key=>t.includes(key));
 if(found){findItem(found,synonyms[found]);return}
 respond('میں ابھی اس سوال کو نہیں سمجھ سکا۔ آپ پوچھ سکتے ہیں: سامنے کیا ہے، یا بوتل کہاں ہے۔','I did not understand that request. Ask what I see, find an object, or read a sign.');
}

async function identifyMore(){
 if(classificationBusy)return;
 if(!cameraStream||!$('liveVideo')?.videoWidth){respond('پہلے کیمرہ شروع کریں۔','Start the live camera before identifying more objects.');return;}
 if(!window.mobilenet){respond('مزید شناخت کا ماڈل ابھی لوڈ نہیں ہوا۔','The supplementary classification model is unavailable. Check your internet connection.');return;}
 classificationBusy=true;$('identifyMore').disabled=true;status('Loading broader image classification model…');
 try{
   classificationModel ||= await window.mobilenet.load({version:2,alpha:0.75});
   const predictions=await classificationModel.classify($('liveVideo'),4);
   const items=predictions.filter(x=>x.probability>=.12).slice(0,3);
   if(!items.length){respond('میں تصویر کی واضح شناخت نہیں کر سکا۔','I could not classify this camera image.');return;}
   const names=items.map(x=>x.className.split(',')[0]);
   respond('ممکنہ چیزیں: '+names.join('، ')+'۔ یہ اندازہ ہے، تصدیق نہیں۔',
     'Possible image categories: '+names.join(', ')+'. These are whole-image guesses, not located objects.',
     items.map(x=>x.className+' · '+Math.round(x.probability*100)+'% classifier score').join('\n'));
 }catch(e){respond('مزید شناخت ابھی دستیاب نہیں۔','Additional recognition is temporarily unavailable.');}
 finally{classificationBusy=false;$('identifyMore').disabled=false;}
}
$('identifyMore').onclick=identifyMore;
$('visionModel').onchange=()=>{
 modelType=$('visionModel').value;
 detector=null;detectorPromise=null;
 if(cameraStream){stopLive(true);startLive();}
};
window.addEventListener('nazarsaathi:hear-invitation',async()=>{
 // This action comes from an explicit tap, not silent autoplay.
 stopSpeech(false);
 const speak=(t,lang)=>new Promise(resolve=>{
   if(!window.speechSynthesis){resolve();return;}
   const u=new SpeechSynthesisUtterance(t);u.lang=lang;u.rate=.84;
   u.onend=resolve;u.onerror=resolve;
   window.speechSynthesis.speak(u);
 });
 await speak('Welcome to NazarSaathi. Would you like to enable the hands free voice assistant and camera? Tap the large start button to continue.','en-US');
 await speak('نظر ساتھی میں خوش آمدید۔ کیا آپ آواز کی سہولت اور کیمرہ شروع کرنا چاہتے ہیں؟','ur-PK');
});
window.addEventListener('nazarsaathi:guided-start',()=>{
 // This event is dispatched synchronously from the first consent tap.
 micBlocked=false;
 language='en';$('speechLanguage').value='en';$('speechLive').checked=true;updateNarrationStatus();
 const hasASR=!!(window.SpeechRecognition||window.webkitSpeechRecognition);
 if(hasASR){micEnabled=true;setMicButton();startListening();}
 else micStatus('This browser does not support speech recognition. Camera and typed commands are still available.');
 startLive();
 // Use the same narration pathway as all other commands: pause microphone
 // while speaking to avoid transcribing the assistant's own voice.
 respond('نظر ساتھی شروع ہو گیا ہے۔ دستیاب آپشن سننے کے لیے کہیں: اختیارات بتاؤ۔ انگریزی یا اردو کا انتخاب آواز سے کریں۔',
         'NazarSaathi is starting. Say available functions to hear all voice commands. Say speak Urdu to change language.');
});

$('speechLive').onchange=()=>{
 updateNarrationStatus();
 if($('speechLive').checked){
   liveLastSaid=0;livePreviousSignature='';liveClock='';
 }
};
updateNarrationStatus();
$('retryVoice').onclick=()=>{
 // This direct click provides the user gesture required by many mobile recognition engines.
 micBlocked=false;micEnabled=true;micRestartFailures=0;micErrors=0;
 clearTimeout(asrRetry);
 if(asr){try{asr.abort()}catch(e){}}
 asr=null;micOn=false;
 stopSpeech(false);setMicButton();
 micStatus('Starting a new microphone recognition session…');
 startListening();
};
$('assistantToggle').onclick=toggleAssistant;
$('voiceForm').onsubmit=e=>{e.preventDefault();command($('commandInput').value)};
window.addEventListener('pagehide',()=>stopListening());
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&micEnabled)resumeMic(1000)});

$('retryAI').onclick=()=>{
  if(!cameraStream){startLive();return;}
  backendRecoveryAttempted=false;
  if(window.tf?.getBackend?.()==='webgl'&&isMobileDevice())window.tf.setBackend('cpu').then(()=>window.tf.ready()).then(()=>{detector=null;detectorPromise=null;startLive()}).catch(err=>mobileVisionStatus('CPU retry failed: '+String(err)));
  else {detector=null;detectorPromise=null;startLive();}
};
$('deviceCheck').onclick=()=>{
 updateMobileCapabilities();
 mobileVisionStatus('Camera '+(cameraStream?$('liveVideo').videoWidth+'×'+$('liveVideo').videoHeight:'not started')+
  ', AI backend '+(window.tf?.getBackend?.()||'unavailable')+
  ', recognition '+((window.SpeechRecognition||window.webkitSpeechRecognition)?'available':'unsupported')+
  '. Try the separate Test microphone button to verify speech-to-text.');
};
updateMobileCapabilities();
window.addEventListener('pagehide',()=>stopLive(true));

$('analyze').onclick=run;
document.querySelectorAll('[data-marker]').forEach(button=>button.onclick=()=>{let name=button.dataset.marker,el=$('qrout');el.textContent='';let box=document.createElement('div');box.style.cssText='background:white;color:#132536;border-radius:10px;padding:12px;display:grid;justify-items:center;gap:6px';let target=document.createElement('canvas');box.append(target);let text=document.createElement('b');text.textContent=names[name][0];box.append(text);el.append(box);if(window.QRCode&&window.QRCode.toCanvas){QRCode.toCanvas(target,'NAZARSAATHI:DEMO:'+name.toUpperCase(),{width:160,margin:2},function(error){if(error)text.textContent='QR generation failed. Use markers from ZIP.'});}else{text.textContent='QR library unavailable. Use marker files from project ZIP.'}});window.speechSynthesis?.getVoices();

}
