/* NazarSaathi browser CV + speech engine, migrated into a TypeScript module.
   Existing imperative device orchestration is retained until the complete hooks-based
   refactor. All screen elements are rendered by React and styled with modern CSS.
   Browser AI dependencies load from script tags in index.html.
*/
// @ts-nocheck
export function initializeEngine(): void {
'use strict';
const $=id=>document.getElementById(id);
let mode='look', image=null, detector=null, response=null;
let language='ur',asr=null,micEnabled=false,micOn=false,speakingNow=false,asrRetry=null,lastRecognized='',lastRecognizedAt=0,recentObjects=[],objectsAt=0,micBlocked=false;
let cameraStream=null, liveTimer=null, liveRun=0, liveBusy=false, liveFrameNumber=0, livePreviousSignature='', liveCandidate='', liveCandidateCount=0, liveLastSaid=0, liveLastStatus=0, liveClock=0, detectorPromise=null;
const names={gate:['Welcome Point','استقبالیہ گیٹ'],lobby:['Reception','استقبالیہ'],library:['Library','لائبریری'],helpdesk:['Help Desk','مدد کا کاؤنٹر'],lab:['Computer Lab','کمپیوٹر لیب']};
const paths={gate:['lobby'],lobby:['gate','library','helpdesk','lab'],library:['lobby'],helpdesk:['lobby'],lab:['lobby']};
let modelType='lite_mobilenet_v2',modelPromise=null,classificationModel=null,classificationBusy=false;
const labels={person:'شخص',chair:'کرسی','dining table':'میز',bottle:'بوتل',cup:'کپ',book:'کتاب','cell phone':'موبائل فون',laptop:'لیپ ٹاپ',backpack:'بیگ',keyboard:'کی بورڈ',mouse:'ماؤس',car:'گاڑی',bus:'بس',dog:'کتا',cat:'بلی','potted plant':'گملے کا پودا',bench:'بینچ',handbag:'ہینڈ بیگ',bicycle:'سائیکل',clock:'گھڑی',tv:'ٹی وی',umbrella:'چھتری',apple:'سیب'};
const posUr={left:'بائیں جانب',center:'درمیان',right:'دائیں جانب'};
function status(t){$('resultState').textContent=t}
function show(ur,en,extra){response={ur:ur,en:en};$('urdu').textContent=ur;$('english').textContent=en;$('details').textContent=extra||'';$('details').hidden=!extra;$('speak').disabled=false;status('Analysis complete');say();}
let voiceAudio=null,voiceAudioUrl=null,voiceSeq=0;
function resumeMic(delay=700){
 clearTimeout(asrRetry);
 if(!micEnabled||speakingNow||micOn||document.hidden||micBlocked)return;
 asrRetry=setTimeout(()=>{if(micEnabled&&!speakingNow&&!micOn)startListening()},delay);
}
function muteMicForSpeech(){if(micOn&&asr){try{asr.abort()}catch(e){}}}
function endSpeech(seq){if(seq!==voiceSeq)return;speakingNow=false;resumeMic(650);}
function stopSpeech(resume=true){
 voiceSeq++;window.speechSynthesis?.cancel();
 if(voiceAudio){voiceAudio.pause();voiceAudio.src='';voiceAudio=null}
 if(voiceAudioUrl){URL.revokeObjectURL(voiceAudioUrl);voiceAudioUrl=null}
 speakingNow=false;if(resume)resumeMic(600);
}
async function say(){
 if(!response)return;
 stopSpeech(false);const seq=voiceSeq;speakingNow=true;muteMicForSpeech();
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

document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{if(cameraStream)stopLive(true);mode=b.dataset.mode;document.querySelectorAll('[data-mode]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));$('readOptions').hidden=mode!=='read';$('guideOptions').hidden=mode!=='guide';const titles={look:'Look & Listen',read:'Read for Me',guide:'Campus Checkpoints'};const tips={look:'Start the camera for continuous object detection, or upload a photo.',read:'Take a close, clear photo of printed English or Urdu text.',guide:'Take a picture of one of our example QR markers.'};$('modeHeading').textContent=titles[mode];$('modeHint').textContent=tips[mode];$('analyze').textContent=mode==='guide'?'Scan checkpoint →':mode==='read'?'Read printed text →':'Analyze image →';status('Ready for live camera or photo');$('details').hidden=true;});
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
 if($('speechLive').checked && (signature!==livePreviousSignature || now-liveLastSaid>=17000) && now-liveLastSaid>=5500){
   say();liveLastSaid=now;livePreviousSignature=signature;
 }
}
function drawDetections(detections,width,height){
 const c=$('liveOverlay');if(c.width!==width||c.height!==height){c.width=width;c.height=height;}
const v=$('liveVideo');if(v&&v.videoWidth&&v.videoHeight){const ar=v.videoWidth/v.videoHeight,box=c.getBoundingClientRect(),ratio=box.width/Math.max(1,box.height);const dw=ratio>ar?box.height*ar:box.width,dh=ratio>ar?box.height:box.width/ar;c.style.width=dw+'px';c.style.height=dh+'px';c.style.left=((box.width-dw)/2)+'px';c.style.top=((box.height-dh)/2)+'px';}
 const ctx=c.getContext('2d');ctx.clearRect(0,0,width,height);
 ctx.lineWidth=Math.max(2,width/280);ctx.font='bold '+Math.max(13,Math.round(width/36))+'px system-ui';
 for(const d of detections){
  const [x,y,w,h]=d.bbox;ctx.strokeStyle='#41e0bf';ctx.strokeRect(x,y,w,h);
  const label=d.class+' '+Math.round(d.score*100)+'%';const tw=ctx.measureText(label).width;
  const boxH=Math.max(22,width/23),boxY=Math.max(0,y-boxH);ctx.fillStyle='#073b39';ctx.fillRect(x,boxY,Math.min(width-x,tw+18),boxH);
  ctx.fillStyle='#f1fffc';ctx.fillText(label,x+8,boxY+boxH-7);
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
 $('startLive').disabled=true;$('startLive').textContent='Starting camera...';status('Requesting camera permission…');
 if(!navigator.mediaDevices?.getUserMedia){updateCameraMessage({name:'Unsupported',message:'This browser does not support getUserMedia. Open the HTTPS page in Chrome or Safari.'});$('startLive').disabled=false;$('startLive').textContent='◉ Start Live Camera';return;}
 try{
  let constraints={audio:false,video:{facingMode:{ideal:$('cameraSide').value},width:{ideal:640},height:{ideal:480},frameRate:{ideal:20,max:24}}};
  try{cameraStream=await navigator.mediaDevices.getUserMedia(constraints)}catch(error){
   if(error.name==='OverconstrainedError')cameraStream=await navigator.mediaDevices.getUserMedia({video:true,audio:false});
   else throw error;
  }
  if(run!==liveRun){cameraStream?.getTracks().forEach(t=>t.stop());return;}
  const video=$('liveVideo');video.srcObject=cameraStream;await video.play();
  if(run!==liveRun)return;
  $('liveBox').hidden=false;$('liveButtons').hidden=false;$('startLive').hidden=true;
  $('cameraLabel').textContent=mode==='read'?'● LIVE · Capture text':mode==='guide'?'● LIVE · QR scanning':'● LIVE · Object detection';
  $('liveCount').textContent='Camera active';status('Camera is live');livePreviousSignature='';liveCandidate='';liveCandidateCount=0;liveLastSaid=0;liveFrameNumber=0;
  const tracks=cameraStream.getVideoTracks();if(tracks[0])tracks[0].onended=()=>{if(cameraStream){stopLive();status('Camera was disconnected')}};
  if(mode==='look'){
   if(!window.cocoSsd||!window.tf)throw Error('Vision model libraries did not load. Connect to the internet and refresh the page.');
   if(!detector){status('Loading AI detector. Camera is already live…');detectorPromise ||= cocoSsd.load({base:modelType}).catch(err=>{detectorPromise=null;throw err});detector=await detectorPromise;}
   if(run!==liveRun)return;
   status('Live object detection active');
  }else if(mode==='guide'){status('Live QR scanning active');}
  else{status('Camera active. Tap Capture & analyze frame to read printed text.');}
  processLive(run);
 }catch(err){
  if(run===liveRun){stopLive(true);updateCameraMessage(err);}
 }
}
async function processLive(run){
 if(run!==liveRun||!cameraStream||document.hidden){if(run===liveRun&&cameraStream)liveTimer=setTimeout(()=>processLive(run),600);return;}
 const video=$('liveVideo');if(video.readyState<2||!video.videoWidth){liveTimer=setTimeout(()=>processLive(run),350);return;}
 try{
  const w=video.videoWidth,h=video.videoHeight;
  if(mode==='look'){
   const minScore=Number($('detectSensitivity')?.value||0.35);
   const detections=(await detector.detect(video)).filter(d=>d.score>=minScore).sort((a,b)=>b.score-a.score).slice(0,10);
   if(run!==liveRun)return;
   recentObjects=detections.map(d=>({...d,side:(d.bbox[0]+d.bbox[2]/2)/w<.33?'left':(d.bbox[0]+d.bbox[2]/2)/w>.67?'right':'center'}));objectsAt=Date.now();
   drawDetections(detections,w,h);++liveFrameNumber;
   $('liveCount').textContent=detections.length+' object'+(detections.length===1?'':'s')+' · frame '+liveFrameNumber;
   const brief=detections.slice(0,3).map(d=>{let center=(d.bbox[0]+d.bbox[2]/2)/w;return {name:d.class,position:center<.33?'left':center>.67?'right':'center',score:d.score}});
   let sig=brief.map(d=>d.name+':'+d.position).sort().join('|')||'none';
   if(sig===liveCandidate)liveCandidateCount++;else{liveCandidate=sig;liveCandidateCount=1;}
   if(liveCandidateCount>=2&&sig!==liveClock){
     liveClock=sig;
     if(brief.length){
       const en='I can see '+brief.map(d=>d.name+' on the '+d.position).join(', ')+'.';
       const ur='مجھے نظر آ رہا ہے: '+brief.map(d=>posUr[d.position]+' '+(labels[d.name]||d.name)).join('، ')+'۔';
       const extra=brief.map(d=>d.name+' · '+d.position+' · '+Math.round(d.score*100)+'% model score').join('\n');
       publishLive(ur,en,extra,sig);
     }else{
       response=null;$('speak').disabled=true;$('urdu').textContent='اس وقت کوئی چیز شناخت نہیں ہوئی۔';$('english').textContent='No recognized objects in this frame.';$('details').hidden=true;
     }
   }
   const now=Date.now();if(now-liveLastStatus>=2000){status('LIVE · Camera detecting objects');liveLastStatus=now;}
  }else if(mode==='guide'){
   try{
    const code=await readQR(video);if(run!==liveRun)return;
    if(code.startsWith('NAZARSAATHI:DEMO:')&&code!==liveClock){liveClock=code;reportCheckpoint(code);}
   }catch(e){}
   $('liveCount').textContent='Live QR scanner';
  }else{$('liveCount').textContent='Live preview · Capture text';}
 }catch(err){
  if(run===liveRun){status('Live detection error: '+(err?.message||String(err)));$('english').textContent='Detection failed: '+(err?.message||String(err));}
 }
 if(run===liveRun&&cameraStream)liveTimer=setTimeout(()=>processLive(run),mode==='read'?1200:mode==='guide'?550:300);
}
async function captureLiveFrame(){
 const video=$('liveVideo');if(!cameraStream||!video.videoWidth)return;
 const canvas=document.createElement('canvas');canvas.width=video.videoWidth;canvas.height=video.videoHeight;canvas.getContext('2d').drawImage(video,0,0);
 const data=canvas.toDataURL('image/jpeg',.91);const img=new Image();
 await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject;img.src=data;});
 image=img;$('preview').src=data;$('preview').style.display='block';$('analyze').disabled=false;
 stopLive(true);await run();
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
 if(!SpeechEngine){micEnabled=false;setMicButton();micStatus('Speech recognition unsupported. Try Chrome on Android or use typed commands.');return}
 if(!asr){
  asr=new SpeechEngine();asr.continuous=true;asr.interimResults=false;asr.maxAlternatives=1;
  asr.onstart=()=>{micOn=true;micStatus('🎤 Listening in '+(language==='ur'?'Urdu':'English')+'. Ask a question.')};
  asr.onresult=(e)=>{
   if(!micEnabled||speakingNow)return;
   for(let n=e.resultIndex;n<e.results.length;n++){
    if(!e.results[n].isFinal)continue;
    const phrase=(e.results[n][0]?.transcript||'').trim();
    if(phrase){$('commandInput').value=phrase;command(phrase)}
   }
  };
  asr.onerror=(e)=>{
   micOn=false;
   if(!micEnabled)return;
   if(['not-allowed','service-not-allowed','audio-capture'].includes(e.error)){
    micEnabled=false;micBlocked=true;setMicButton();micStatus('Microphone unavailable or permission denied. Enable microphone permission or use typed commands.');
   }else if(e.error==='network'){micEnabled=false;micBlocked=true;setMicButton();micStatus('Speech recognition network service unavailable. Try again or type your question.');}
   else if(!['aborted','no-speech'].includes(e.error))micStatus('Voice recognition error: '+e.error);
  };
  asr.onend=()=>{micOn=false;if(micEnabled&&!speakingNow)resumeMic(900)};
 }
 asr.lang=language==='ur'?'ur-PK':'en-US';
 try{asr.start();micOn=true;micStatus('Requesting microphone permission…')}
 catch(e){micOn=false;micStatus('Microphone could not start: '+e.message);resumeMic(1200)}
}
function toggleAssistant(){
 if(micEnabled){stopListening();return}
 if(!window.SpeechRecognition&&!window.webkitSpeechRecognition){micStatus('Your browser cannot recognize voice commands. Please try Chrome on Android or use the typed command box.');return}
 micBlocked=false;micEnabled=true;setMicButton();
 $('speechLive').checked=false;
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
 const objs=recent();
 if(!objs){respond('آپ کا لائیو کیمرہ شروع نہیں ہے یا ابھی تصویر نہیں ملی۔','Please start the live camera and wait for object recognition.');return}
 if(!objs.length){respond('کوئی چیز واضح طور پر شناخت نہیں ہوئی۔ اس کا یہ مطلب نہیں کہ راستہ خالی ہے۔','No object confidently recognized. This does not mean the area is clear.');return}
 const arr=objs.slice(0,4);
 respond('سامنے نظر آ رہا ہے: '+arr.map(d=>posUr[d.side]+' '+(labels[d.class]||d.class)).join('، ')+'۔',
 'I can see '+arr.map(d=>d.class+' on the '+d.side).join(', ')+'.','Positions are relative to the camera. Not a safe route.');
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
function command(raw){
 const t=(raw||'').trim().toLowerCase();if(!t)return;
 const tm=Date.now();if(t===lastRecognized&&tm-lastRecognizedAt<1700)return;lastRecognized=t;lastRecognizedAt=tm;
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
 language='en';$('speechLanguage').value='en';$('speechLive').checked=false;
 const hasASR=!!(window.SpeechRecognition||window.webkitSpeechRecognition);
 if(hasASR){micEnabled=true;setMicButton();startListening();}
 else micStatus('This browser does not support speech recognition. Camera and typed commands are still available.');
 startLive();
 if(window.speechSynthesis){
   const u=new SpeechSynthesisUtterance('NazarSaathi started. The camera is starting. You can ask what is in front of you. Urdu is also available.');u.lang='en-US';u.rate=.86;
   u.onend=()=>{if(micEnabled)resumeMic(700);};
   window.speechSynthesis.cancel();window.speechSynthesis.speak(u);
 }
});

$('assistantToggle').onclick=toggleAssistant;
$('voiceForm').onsubmit=e=>{e.preventDefault();command($('commandInput').value)};
window.addEventListener('pagehide',()=>stopListening());
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&micEnabled)resumeMic(1000)});

window.addEventListener('pagehide',()=>stopLive(true));

$('analyze').onclick=run;
document.querySelectorAll('[data-marker]').forEach(button=>button.onclick=()=>{let name=button.dataset.marker,el=$('qrout');el.textContent='';let box=document.createElement('div');box.style.cssText='background:white;color:#132536;border-radius:10px;padding:12px;display:grid;justify-items:center;gap:6px';let target=document.createElement('canvas');box.append(target);let text=document.createElement('b');text.textContent=names[name][0];box.append(text);el.append(box);if(window.QRCode&&window.QRCode.toCanvas){QRCode.toCanvas(target,'NAZARSAATHI:DEMO:'+name.toUpperCase(),{width:160,margin:2},function(error){if(error)text.textContent='QR generation failed. Use markers from ZIP.'});}else{text.textContent='QR library unavailable. Use marker files from project ZIP.'}});window.speechSynthesis?.getVoices();

}
