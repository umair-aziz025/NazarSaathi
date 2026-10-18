import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Accessibility, ArrowDownRight, ArrowLeftRight, ArrowRight, AudioLines,
  BookOpenText, Camera, Check, ChevronDown, CircleHelp, Compass, Ear, Eye,
  FileImage, Globe2, Headphones, HeartHandshake, Keyboard, Layers3, LockKeyhole,
  MapPinned, Mic2, PauseCircle, Play, Scan, ScanEye, ShieldCheck, Sparkles,
  Square, Volume2, Waves, Wifi, Zap, Sun, Moon, Leaf, Contrast, Smartphone, ScanSearch, Settings2
} from 'lucide-react';
import { initializeEngine } from './engine';
import AnimatedHeadline from './components/AnimatedHeadline';
import './App.css';
import './themes.css';
import './accessibility.css';
import './voiceGuide.css';

function Orb({ variant = 'a' }: { variant?: 'a'|'b' }) {
  return <div className={'orb orb-'+variant} aria-hidden="true" />;
}

function Brand() {
  return <div className="brand">
    <div className="brand-symbol"><ScanEye size={27} strokeWidth={1.95}/><span className="symbol-spark" /></div>
    <div className="brand-type"><strong>Nazar<span>Saathi</span></strong><small>VISION THAT SPEAKS</small></div>
  </div>;
}


type ThemeName = 'daylight' | 'sea-glass' | 'midnight' | 'contrast';
const themeOptions = [
  { id: 'daylight', label: 'Daylight', Icon: Sun },
  { id: 'sea-glass', label: 'Sea Glass', Icon: Leaf },
  { id: 'midnight', label: 'Midnight', Icon: Moon },
  { id: 'contrast', label: 'Contrast', Icon: Contrast },
] as const;
function getInitialTheme(): ThemeName {
  if (typeof window === 'undefined') return 'daylight';
  try {
    const t = window.localStorage.getItem('nazarsaathi-theme');
    return themeOptions.some(v => v.id === t) ? t as ThemeName : 'daylight';
  } catch { return 'daylight'; }
}

const appear = { hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0 } };

export default function App() {
  const [theme, setTheme] = useState<ThemeName>(getInitialTheme);
  const [welcomeOpen, setWelcomeOpen] = useState(true);
  const welcomeStart = useRef<HTMLButtonElement>(null);
  useEffect(() => { initializeEngine(); }, []);
  useEffect(() => { if (welcomeOpen) welcomeStart.current?.focus(); }, [welcomeOpen]);
  function startGuided() {
    // The first explicit tap unlocks browser camera, microphone and audio permissions.
    window.dispatchEvent(new Event('nazarsaathi:guided-start'));
    setWelcomeOpen(false);
  }
  function hearInvitation() {
    window.dispatchEvent(new Event('nazarsaathi:hear-invitation'));
  }
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme === 'midnight' || theme === 'contrast' ? 'dark' : 'light';
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content',
      theme === 'midnight' ? '#07131e' : theme === 'contrast' ? '#020b13' : theme === 'sea-glass' ? '#edf6f2' : '#f7fafc');
    try { window.localStorage.setItem('nazarsaathi-theme', theme); } catch { /* private mode */ }
  }, [theme]);

  return (
    <div className="site-shell">
      {welcomeOpen && (
        <div className="welcome-backdrop">
          <section className="welcome-dialog" role="dialog" aria-modal="true" aria-labelledby="welcome-title" aria-describedby="welcome-description">
            <div className="welcome-badge"><ScanEye size={25}/> NazarSaathi · Accessible start</div>
            <h2 id="welcome-title">Welcome to NazarSaathi</h2>
            <p id="welcome-description">Would you like to enable voice recognition and start the camera? Your browser will ask for permission.</p>
            <p className="welcome-urdu" lang="ur" dir="rtl">نظر ساتھی میں خوش آمدید۔ کیا آپ آواز سے بات چیت اور کیمرہ استعمال کرنا چاہتے ہیں؟</p>
            <p className="welcome-caution">For security, your phone requires one tap before listening or speaking. We never activate the microphone silently.</p>
            <button ref={welcomeStart} type="button" className="welcome-primary" onClick={startGuided}>
              <Mic2 size={23}/> Start voice &amp; camera · آواز شروع کریں
            </button>
            <div className="welcome-actions">
              <button type="button" onClick={hearInvitation}><Volume2 size={18}/> Hear English + Urdu invitation</button>
              <button type="button" onClick={()=>setWelcomeOpen(false)}>Continue without voice</button>
            </div>
            <p className="welcome-note"><ShieldCheck size={16}/> Not intended for road crossing or obstacle avoidance. Voice recognition may use your browser provider's service.</p>
          </section>
        </div>
      )}
      <Orb/><Orb variant="b"/>
      <div className="grain" aria-hidden="true" />
      <header className="site-header">
        <div className="container header-inner">
          <Brand/>
          <div className="header-right">
            <div className="appearance-control" aria-label="Theme settings">
              <span className="appearance-label">APPEARANCE</span>
              <div className="theme-options" role="group" aria-label="Color theme">
                {themeOptions.map(({ id, label, Icon }) => (
                  <button key={id} className="theme-choice" type="button"
                    aria-label={`Use ${label} theme`} aria-pressed={theme === id}
                    title={label} onClick={() => setTheme(id)}>
                    <Icon size={16} strokeWidth={2} aria-hidden="true" />
                    <span className="theme-choice-label">{label}</span>
                  </button>
                ))}
              </div>
            </div>
            <span className="header-label"><span className="signal" /> SYSTEM ONLINE</span>
            <a className="repo-link" href="https://github.com/umair-aziz025/NazarSaathi" target="_blank" rel="noopener noreferrer">View source <ArrowRight size={16}/></a>
          </div>
        </div>
      </header>

      <main id="main">
        <section className="hero container">
          <motion.div initial="hidden" animate="show" variants={appear} transition={{duration: .65}} className="hero-copy">
            <div className="eyebrow"><span className="eyebrow-rule"/><Sparkles size={14}/> AI-POWERED ACCESSIBILITY <span className="eyebrow-dot">✳</span> MADE FOR EVERYONE</div>
            <AnimatedHeadline/>
            <p>Your everyday surroundings, translated into words. Real-time visual understanding, natural voice interaction, and familiar languages—right from your browser.</p>
            <div className="hero-chips"><span><Waves size={15}/> Live vision</span><span><AudioLines size={15}/> Voice-first</span><span><Globe2 size={15}/> اردو + English</span></div>
          </motion.div>
          <motion.div initial={{opacity:0,scale:.92,y:15}} animate={{opacity:1,scale:1,y:0}} transition={{duration:.7,delay:.13}} className="hero-visual" aria-hidden="true">
            <div className="vision-disc">
              <div className="disc-inner"><ScanEye size={87} strokeWidth={.75}/></div>
              <div className="disc-ring ring1"/><div className="disc-ring ring2"/>
              <span className="scan-beam" />
              <div className="vision-point point-one"/><div className="vision-point point-two"/><div className="vision-point point-three"/>
            </div>
            <div className="float-label float-label-a"><span className="float-icon"><Eye size={17}/></span><div><strong>Object found</strong><small>Live recognition</small></div><Check size={16}/></div>
            <div className="float-label float-label-b"><span className="wave-mini">▂▅▃▇▅▂</span><span>آواز میں جواب</span></div>
            <div className="visual-caption">INTELLIGENCE IN EVERY FRAME <span>01 / 03</span></div>
          </motion.div>
        </section>

        <section className="app-section container">
          <div className="section-intro">
            <div className="section-heading"><span className="section-kicker">YOUR CONTROL CENTER</span><h2>Your world, <em>reimagined.</em></h2></div>
            <div className="section-aside">A seamless companion for what you see, what you need to know, and what you want to ask.</div>
          </div>

          <div className="app-grid">
            <section className="studio-panel" aria-label="Live camera and vision controls">
              <div className="panel-topline"><div className="panel-name"><span className="panel-icon"><Scan size={20}/></span><div><span className="panel-overline">VISION ENGINE</span><h3>Live experience</h3></div></div><span className="engine-badge"><span className="live-pulse"/> READY TO SCAN</span></div>
              <div className="mode-bar" role="group" aria-label="Vision mode">
                <button type="button" className="mode" data-mode="look" aria-pressed="true"><Eye size={19}/><span>Live vision</span></button>
                <button type="button" className="mode" data-mode="read" aria-pressed="false"><BookOpenText size={19}/><span>Read text</span></button>
                <button type="button" className="mode" data-mode="guide" aria-pressed="false"><MapPinned size={19}/><span>Checkpoints</span></button>
              </div>

              <div className="context-row"><div><h4 id="modeHeading">Look &amp; Listen</h4><p id="modeHint">Start the camera for continuous object detection, or upload a photo.</p></div><span className="context-icon"><Zap size={17}/></span></div>

              <div className="camera-stage">
                <div className="camera-shell" id="liveBox" hidden>
                  <video id="liveVideo" autoPlay playsInline muted aria-label="Live camera image with object detections" />
                  <canvas id="liveOverlay" aria-hidden="true"/>
                  <span className="camera-info" id="cameraLabel"><span className="live-pulse"/> LIVE · Starting...</span>
                  <span className="cam-bottom" id="liveCount">Starting...</span>
                </div>
                <div className="stage-empty" aria-hidden="true">
                  <span className="stage-corner corner-a"/><span className="stage-corner corner-b"/><span className="stage-corner corner-c"/><span className="stage-corner corner-d"/>
                  <div className="empty-art"><ScanEye size={74} strokeWidth={1}/><span className="empty-art-ring"/></div>
                  <strong>See what NazarSaathi sees.</strong>
                  <span>Your camera becomes your window to the world.</span>
                  <div className="reticle-lines"><span/><span/><span/></div>
                </div>
              </div>

              <button id="startLive" type="button" className="live-action"><Camera size={21}/> Start Live Camera <ArrowRight size={19}/></button>
              <div className="live-buttons" id="liveButtons" hidden>
                <button id="captureFrame" type="button"><FileImage size={16}/> Capture &amp; analyze</button>
                <button id="identifyMore" type="button"><ScanSearch size={16}/> Identify more</button>
                <button id="zoomIn" type="button" aria-label="Zoom in on the camera if supported">Zoom +</button>
                <button id="zoomOut" type="button" aria-label="Zoom out on the camera if supported">Zoom −</button>
                <button id="stopLive" type="button"><Square size={15}/> Stop camera</button>
              </div>

              <div className="recognition-settings" role="group" aria-label="Object recognition model and sensitivity controls">
                <label htmlFor="visionModel"><Settings2 size={16}/> Recognition model
                  <select id="visionModel" defaultValue="lite_mobilenet_v2">
                    <option value="lite_mobilenet_v2">Fast · Mobile</option>
                    <option value="mobilenet_v2">Detailed · Slower</option>
                  </select>
                </label>
                <label htmlFor="detectSensitivity">Detection sensitivity
                  <select id="detectSensitivity" defaultValue="0.35">
                    <option value="0.28">More results</option>
                    <option value="0.35">Balanced</option>
                    <option value="0.5">Higher confidence</option>
                  </select>
                </label>
              </div>
              <label htmlFor="focusAssist" className="focus-assist-control">
                 <input id="focusAssist" type="checkbox" defaultChecked />
                 <span><ScanSearch size={18}/> <strong>Focus assist</strong> <small>When no object is found, inspect the central area more closely. Experimental; may be slower.</small></span>
               </label>
               <p id="visionDiagnostic" className="vision-diagnostic" aria-live="off">Camera ready. For better results, use the rear camera in good light.</p>
               <p className="recognition-disclaimer">Mobile cameras now request higher resolution when available. Focus assist can help some small centered objects, but not every object is supported and nothing here establishes a safe path.</p>
              <div className="camera-layout-option"><label htmlFor="cameraFillMode">Camera view</label><select id="cameraFillMode" defaultValue="cover"><option value="cover">Fill frame · full width</option><option value="contain">Show entire image</option></select></div>
              <div className="live-options">
                <label htmlFor="cameraSide" className="field-label"><ArrowLeftRight size={16}/> Camera <span className="select-box"><select id="cameraSide" defaultValue="environment"><option value="environment">Back camera</option><option value="user">Front camera</option></select><ChevronDown size={13}/></span></label>
                <label htmlFor="speechLive" className="checkbox-label"><input id="speechLive" type="checkbox" defaultChecked/><span className="faux-check"><Check size={12}/></span><Volume2 size={15}/> Describe continuously</label>
              </div>
              <p id="narrationStatus" className="narration-status" role="status">
                Continuous descriptions ON — NazarSaathi announces stable new objects and occasional recaps, not every video frame.
              </p>

              <div className="live-help" id="liveHelp"><ShieldCheck size={17}/><span>Visual analysis runs in your browser. AI models may require an internet connection.</span></div>
              <div className="section-divider"><span>OR USE A PHOTO</span></div>
              <label className="upload" htmlFor="photo"><span className="upload-icon"><FileImage size={22}/></span><span className="upload-text"><strong>Upload an image</strong><small>Tap to choose a file or take a photo</small></span><ArrowRight size={18} className="upload-arrow"/><input type="file" id="photo" accept="image/jpeg,image/png,image/webp" capture="environment"/></label>
              <img id="preview" alt="Selected photo preview"/>
              <div className="option-group" id="readOptions" hidden><label htmlFor="ocrLang">Printed language</label><select id="ocrLang" defaultValue="eng"><option value="eng">English</option><option value="urd">Urdu (اردو)</option></select></div>
              <div className="option-group" id="guideOptions" hidden><label htmlFor="destination">Choose destination</label><select id="destination" defaultValue="library"><option value="library">Library</option><option value="helpdesk">Help Desk</option><option value="lab">Computer Lab</option><option value="gate">Welcome Point</option><option value="lobby">Reception</option></select><p>Fictional demo checkpoints, not real mapped MUST routes.</p></div>
              <button id="analyze" type="button" className="secondary-action" disabled><Scan size={16}/> Analyze uploaded image <ArrowRight size={16}/></button>
            </section>

            <div className="right-column">
              <section className="assistantPanel assistant-console" aria-label="NazarSaathi voice assistant">
                <div className="panel-topline"><div className="panel-name"><span className="panel-icon assistant-icon"><Mic2 size={20}/></span><div><span className="panel-overline">CONVERSATIONAL AI</span><h3>Voice companion</h3></div></div><span className="assistant-star"><Sparkles size={18}/></span></div>
                <p className="assistant-intro">Live descriptions are on by default. Ask questions or say “Pause descriptions” whenever you want quiet.</p>
                <div className="langRow"><label htmlFor="speechLanguage"><Globe2 size={17}/> Speaking language</label><div className="lang-select"><select id="speechLanguage" defaultValue="ur"><option value="ur">اردو · Urdu</option><option value="en">English</option></select><ChevronDown size={15}/></div></div>
                <button id="assistantToggle" type="button" className="assistbtn" aria-pressed="false"><Mic2 size={19}/> Start Hands-Free Assistant</button>
                <div id="micStatus" className="micstate" role="status" aria-live="polite"><span className="muted-dot"/> Microphone off. Tap once to start listening.</div>
                <div id="voiceExamples" className="excommands"><span className="examples-title"><Sparkles size={14}/> THINGS YOU CAN SAY</span><div>“Enable vision” · “Select reading”</div><div>“Take a picture and read”</div><div>“Zoom in” · “Focus assist on”</div><div>“Next mode” · “Previous mode”</div><div>“Help” · “Speak Urdu”</div></div>
                <details className="voice-command-guide">
                  <summary>All voice controls / تمام وائس کمانڈز <ChevronDown size={17}/></summary>
                  <div className="voice-guide-body">
                    <p><strong>To hear the full menu:</strong> say “Available functions” or “اختیارات بتاؤ”. Say “Current settings” to hear the current state, or “Undo last change” to go back.</p>
                    <div className="voice-guide-grid">
                      <div lang="en">
                        <strong>English</strong>
                        <p>“Show entire image” · “Fill camera frame” · “Front camera” · “Back camera”</p>
                        <p>“Enable vision” · “Select vision” · “Start reading” · “Reading mode” · “Next mode” · “Previous mode”</p>
                        <p>“Fast model” · “Detailed model” · “More detections” · “Focus assist on” · “Zoom in”</p>
                        <p>“Describe continuously” · “Pause descriptions” · “Speak Urdu” · “Speak English”</p>
                        <p>“White theme” · “Dark theme” · “Capture and analyze” · “Take a picture and read” · “Read this” · “Help”</p>
                      </div>
                      <div lang="ur" dir="rtl">
                        <strong>اردو</strong>
                        <p>”پوری تصویر دکھاؤ“ · ”کیمرہ فل کرو“ · ”فرنٹ کیمرہ“ · ”بیک کیمرہ“</p>
                        <p>”ویژن چالو“ · ”پڑھنا شروع کرو“ · ”شناخت والا موڈ“ · ”اگلا موڈ“ · ”پچھلا موڈ“</p>
                        <p>”تیز ماڈل“ · ”بہتر ماڈل“ · ”زیادہ چیزیں“ · ”چھوٹی چیزیں تلاش“ · ”زوم بڑھاؤ“</p>
                        <p>”مسلسل بتاؤ“ · ”بتانا بند کرو“ · ”انگریزی بولو“</p>
                        <p>”سفید تھیم“ · ”تصویر کھینچو“ · ”کیمرے سے پڑھو“ · ”پچھلی سیٹنگ“ · ”سامنے کیا ہے؟“</p>
                      </div>
                    </div>
                    <p className="voice-guide-note">Speech recognition supports one language at a time. Say “Speak Urdu” while English is active, or “انگریزی بولو” while Urdu recognition is active. Accuracy varies by browser and network. Changes are confirmed aloud.</p>
                  </div>
                </details>
                <form id="voiceForm" className="assistform"><label htmlFor="commandInput" className="srOnly">Ask NazarSaathi</label><input id="commandInput" type="text" placeholder="Type a command..." autoComplete="off"/><button type="submit" aria-label="Send command"><ArrowRight size={20}/></button></form>
                <div className="assistant-foot"><LockKeyhole size={15}/> Your camera frames are not uploaded to our server. Voice recognition and online Urdu TTS may use third-party services.</div>
              </section>

              <section className="response-panel" aria-label="Spoken results and analysis">
                <div className="response-heading"><span className="response-icon"><Headphones size={20}/></span><div><span className="panel-overline">WHAT NAZARSAATHI SAYS</span><h3>Live insights</h3></div><span className="waveform" aria-hidden="true"><i/><i/><i/><i/><i/><i/><i/></span></div>
                <div className="insight-status"><span className="status-mini"/><span id="resultState" role="status">Waiting for an image</span></div>
                <div className="response-content"><div className="urdu" id="urdu" lang="ur" dir="rtl" aria-live="polite">اپنی تصویر منتخب کریں۔</div><div className="english" id="english" aria-live="polite">Start the camera for live detection, or choose a photo.</div><div className="details" id="details" hidden /></div>
                <div className="response-toolbar"><button id="speak" type="button" disabled><Volume2 size={16}/> Speak again</button><button id="stop" type="button"><PauseCircle size={16}/> Stop audio</button></div>
                <p id="voiceNote" className="voiceNote">Choose Urdu or English above. Urdu uses an installed voice or online narration; English uses your browser voice.</p>
              </section>
            </div>
          </div>

          <div className="lower-grid">
            <section className="checkpoints-panel" aria-label="Demo QR checkpoint options">
              <div className="mini-icon"><Compass size={23}/></div><div className="checkpoint-main"><h3>Explore checkpoints</h3><p>Test QR-based location announcements with fictional campus markers. A safe way to demonstrate structured wayfinding.</p>
              <div className="markerbtns"><button type="button" data-marker="gate">Welcome Point</button><button type="button" data-marker="lobby">Reception</button><button type="button" data-marker="library">Library</button><button type="button" data-marker="helpdesk">Help Desk</button><button type="button" data-marker="lab">Computer Lab</button></div><div id="qrout"/></div>
            </section>
            <section className="safety-panel"><div className="mini-icon safety-icon"><HeartHandshake size={23}/></div><div><h3>Built with responsibility</h3><p>NazarSaathi is a research prototype, not a certified mobility aid. It cannot determine whether a path is safe, detect every hazard, or replace a cane, guide dog, or human assistance.</p><div className="safety-chip"><ShieldCheck size={15}/> Human safety comes first</div></div></section>
          </div>
        </section>

        <section className="values container"><div><Eye size={23}/><strong>See with clarity</strong><small>Common objects &amp; text</small></div><div><Ear size={23}/><strong>Hear in your language</strong><small>اردو and English</small></div><div><Accessibility size={23}/><strong>Designed for inclusion</strong><small>Accessible controls &amp; guidance</small></div><div><LockKeyhole size={23}/><strong>Privacy-conscious</strong><small>In-browser vision processing</small></div></section>
      </main>
      <footer className="footer"><div className="container footer-content"><Brand/><div><span>MADE TO MAKE TECHNOLOGY MORE HUMAN.</span><small>NazarSaathi © 2026 · Experimental accessibility technology.</small></div><a href="https://github.com/umair-aziz025/NazarSaathi" target="_blank" rel="noopener noreferrer">OPEN SOURCE <ArrowRight size={16}/></a></div></footer>
    </div>
  );
}
