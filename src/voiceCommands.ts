/** Deterministic bilingual voice command vocabulary.
 * No camera, microphone or DOM access here, so intents can be tested without a browser.
 * Recognition still depends on the device's browser speech engine.
 */
export type VoiceControlIntent =
  | { action: 'language'; value: 'en' | 'ur' }
  | { action: 'mode'; value: 'look' | 'read' | 'guide' }
  | { action: 'camera'; value: 'start' | 'stop' | 'front' | 'back' | 'fill' | 'entire' | 'zoomIn' | 'zoomOut' | 'zoomReset' }
  | { action: 'speech'; value: 'on' | 'off' | 'repeat' | 'stop' }
  | { action: 'focusAssist'; value: 'on' | 'off' }
  | { action: 'model'; value: 'fast' | 'detailed' }
  | { action: 'sensitivity'; value: 'more' | 'balanced' | 'confidence' }
  | { action: 'ocrLanguage'; value: 'urd' | 'eng' }
  | { action: 'theme'; value: 'daylight' | 'sea-glass' | 'midnight' | 'contrast' }
  | { action: 'destination'; value: 'gate' | 'lobby' | 'library' | 'helpdesk' | 'lab' }
  | { action: 'focus'; value: 'camera' | 'voice' | 'results' | 'settings' | 'checkpoints' }
  | { action: 'action'; value: 'analyze' | 'capture' | 'identify' | 'scan' | 'read' | 'readUrdu' | 'status' | 'help' | 'features' | 'undo' | 'startVision' | 'startReading' | 'nextMode' | 'previousMode' | 'describe' | 'captureRead' }
  | { action: 'listening'; value: 'start' | 'stop' };

function normalize(text: string): string {
  return text.toLowerCase()
    .replace(/[\u064b-\u065f\u0670]/g, '')
    .replace(/ي/g, 'ی').replace(/ك/g, 'ک').replace(/ة/g, 'ہ')
    .replace(/[?.!,،؟؛:]/g, ' ').replace(/\s+/g, ' ').trim();
}
const any = (text: string, words: string[]) => words.some(w => text.includes(w));

export function parseVoiceControl(raw: string): VoiceControlIntent | null {
  const t = normalize(raw);
  if (!t) return null;

  if (any(t, ['stop listening', 'stop assistant', 'microphone off', 'turn off microphone', 'سننا بند', 'مائک بند', 'مائیک بند', 'مائیکروفون بند', 'assistant band'])) return { action:'listening',value:'stop' };

  if (any(t, ['start listening','start assistant','enable microphone','turn on microphone','enable voice recognition','hands free on','start hands free','مائیک چالو','آواز سے سننا شروع','وائس اسسٹنٹ چالو'])) return { action:'listening',value:'start' };


  // Alternative natural phrases in English, Urdu and common Roman Urdu.
  // Specific composite requests must precede generic mode/camera names.
  if(any(t,['take a picture and read','take photo and read','capture and read','capture text','capture and analyze text','take photo of text','read from camera','scan and read','read the camera','read what is written','please read this','read these lines','take an image and read','capture text and read','read whats written','read these words','text on camera','camera se parho','tasveer parho','تصویر لے کر پڑھو','تصویر لے کے پڑھو','پڑھ کر سناؤ','کیمرے سے پڑھو','عبارت پڑھو','فوٹو لے کر پڑھو','لکھائی پڑھو']))return {action:'action',value:'captureRead'};
  if(any(t,['take picture and analyse','take picture and analyze','capture and analyze','capture and analyse','analyse this frame','analyze this frame','take a photograph','take a snapshot','take snapshot','capture and analyse','take a photo','click picture','snap a picture','take photo','image capture','picture lo','photo lo','tasveer lo','فوٹو لو','تصویر لو','فوٹو کھینچو','تصویر کھینچ لو']))return {action:'action',value:'capture'};
  if(any(t,['next mode','next feature','switch to next','next function','next option','next screen','forward','next please','forward to next','agli functionality','agla mode','اگلا موڈ','اگلی سہولت','اگلا فنکشن','آگے جاؤ']))return {action:'action',value:'nextMode'};
  if(any(t,['previous mode','previous feature','switch back mode','back to previous mode','last mode','previous screen','back one mode','back to last feature','pichla mode','pichle mode','پچھلا موڈ','پچھلی سہولت','پچھلے موڈ میں']))return {action:'action',value:'previousMode'};

  if(any(t,['enable vision','start vision','turn on vision','activate vision','activate camera vision','start looking','start detecting','begin detection','look and listen start','start object recognition','nazar saathi see','vision chalao','vision shuru karo','nazarsaathi dekho','cheezain dekho','ویژن چالو','ویژن شروع','نظر چالو','چیزوں کی شناخت شروع','سامنے دیکھنا شروع','دیکھنا شروع کرو']))return {action:'action',value:'startVision'};
  if(any(t,['enable reading','start reading','activate reading','start reader','turn on reader','enable text reader','start ocr','start reading mode','read mode enable','start text scanning','start reading text','parhna shuru karo','reading chalao','matn parho','پڑھنا شروع','پڑھنے کی سہولت چالو','پڑھائی شروع','پڑھنے کا موڈ شروع','عبارت پڑھنا شروع']))return {action:'action',value:'startReading'};
  if(any(t,['select vision','choose vision','select look','select live vision','switch to live vision','select look and listen','turn on live view','go to vision','switch to vision','change to vision','back to vision','return to vision','go back to vision','vision option','vision select karo','vision kholo','ویژن منتخب','ویژن کھولو','دیکھنے والا فنکشن','شناخت منتخب','نظر کا موڈ']))return {action:'mode',value:'look'};
  if(any(t,['select reading','choose reading','select reader','switch to read','enable read feature','start text feature','switch to reader','select read','switch to text reading','open reading','reading option','go to reading','go back to reading','reader kholo','reading select karo','پڑھنے کا آپشن','پڑھائی منتخب','پڑھنے والا حصہ','ریڈنگ موڈ']))return {action:'mode',value:'read'};
  if(any(t,['select checkpoints','choose checkpoints','open navigation demo','activate qr mode','enable checkpoint mode','switch to guide','go to qr mode','scan mode select','رستے کا ڈیمو','چیک پوائنٹ منتخب','گائیڈ موڈ','رہنمائی موڈ']))return {action:'mode',value:'guide'};

  if(any(t,['zoom in','zoom closer','magnify','increase zoom','zoom camera in','near zoom','zoom badhao','zoom karo','qareeb karo','زوم ان','زوم بڑھاؤ','قریب زوم','کیمرہ زوم بڑھاؤ']))return {action:'camera',value:'zoomIn'};
  if(any(t,['zoom out','zoom back','reduce zoom','decrease zoom','zoom kam karo','door karo','زوم آؤٹ','زوم کم','کیمرہ زوم گھٹاؤ']))return {action:'camera',value:'zoomOut'};
  if(any(t,['reset zoom','normal zoom','original zoom','zoom reset','زوم ری سیٹ','زوم پہلے جیسا','نارمل زوم']))return {action:'camera',value:'zoomReset'};
  if(any(t,['focus assist on','enable focus assist','find small objects','detect small objects','focus scan on','scan distant objects','focus help','focus assist chalao','چھوٹی چیزیں تلاش','فوکس اسسٹ چالو','چھوٹی چیزوں کی شناخت']))return {action:'focusAssist',value:'on'};
  if(any(t,['focus assist off','disable focus assist','stop focus scan','focus off','فوکس اسسٹ بند','فوکس بند']))return {action:'focusAssist',value:'off'};
  if(any(t,['describe the surroundings','whats in view','tell me the scene','identify this scene','tell me what is in front of me','tell me what you can see','what is ahead of me','describe everything you see','show objects','identify surroundings','what is visible','what do you see now','scan surroundings','look at my surroundings','samne kya hai','kya dikh raha hai','mere samne kya hai','aage kya hai',' سامنے کیا ہے','کیا دکھ رہا ہے','ابھی کیا ہے','سامنے کون ہے']))return {action:'action',value:'describe'};
  if(any(t,['camera on karo','camera chalao','camera start karo','camera kholo','camera shuru','کیمرہ آن کرو','کیمرہ آن','کیمرہ اسٹارٹ','کیمرہ کھول دو']))return {action:'camera',value:'start'};
  if(any(t,['camera band karo','camera roko','camera stop karo','کیمرہ آف کرو','کیمرہ بند کرو','کیمرہ بند کر دو']))return {action:'camera',value:'stop'};
  if(any(t,['urdu mein bolo','urdu mein baat','urdu language select','urdu select karo','اردو میں بات کرو','اردو زبان منتخب']))return {action:'language',value:'ur'};
  if(any(t,['english mein bolo','english mein baat','english select karo','angrezi bolo','انگلش میں بات','انگریزی زبان منتخب']))return {action:'language',value:'en'};
  if(any(t,['repeat that','repeat answer','last answer','dobara batao','phir se batao','پھر بتاؤ','جو کہا دوبارہ']))return {action:'speech',value:'repeat'};
  if(any(t,['listen to me','listen now','hear my command','wake up assistant','assistant suno','میری بات سنو','میری سنو']))return {action:'listening',value:'start'};

  if(t==='next')return {action:'action',value:'nextMode'};
  if(t==='previous'||t==='back')return {action:'action',value:'previousMode'};
  // Explicitly switch speech *and* recognition locale. The UI selector does the same.
  if (any(t, ['speak english','switch to english','english please','english language','انگریزی بولو','انگلش بولو','انگریزی میں','english bolo'])) return {action:'language',value:'en'};
  if (any(t, ['speak urdu','switch to urdu','urdu please','urdu language','اردو بولو','اردو میں','اردو زبان','urdu bolo'])) return {action:'language',value:'ur'};

  if (any(t, ['go back','previous setting','undo last change','undo setting','واپس پچھلی','پچھلی سیٹنگ','واپس کر دو','پہلے جیسا','undo'])) return {action:'action',value:'undo'};
  if (any(t, ['what can you do','available functions','all commands','list commands','voice commands','command list','features available','دستیاب سہولت','کیا کر سکتے','کیا کیا کر','آپشن بتا','اختیارات بتا','سہولتیں بتا'])) return {action:'action',value:'features'};
  if (any(t, ['help me','help','مدد','کمانڈ بتا'])) return {action:'action',value:'help'};
  if (any(t, ['tell status','system status','current settings','which mode','what settings','موجودہ سیٹنگ','کون سا موڈ','اسٹیٹس بتا'])) return {action:'action',value:'status'};
  if (any(t, ['repeat','say again','again please','دوبارہ بولو','پھر سناؤ','دوبارہ'])) return {action:'speech',value:'repeat'};
  if (any(t, ['stop talking','stop speaking','be quiet','mute voice','خاموش','بولنا بند','آواز بند کرو'])) return {action:'speech',value:'stop'};

  // Recognize camera crop commands before generic camera on/off commands.
  if (any(t, ['show entire image','show whole image','show full image','uncrop','fit camera','fit the camera','restore camera view','full camera image','پورا منظر','پوری تصویر','مکمل تصویر','بغیر کراپ','پہلے والی تصویر','poori tasveer'])) return {action:'camera',value:'entire'};
  if (any(t, ['fill frame','fill screen','full width camera','camera full width','zoom to fill','fill the camera','camera zoom','camera crop','پورا فریم','پورے اسکرین','پوری سکرین','کیمرہ فل','فل سکرین','فل اسکرین','full width'])) return {action:'camera',value:'fill'};
  if (any(t, ['front camera','selfie camera','switch to front','سامنے والا کیمرہ','فرنٹ کیمرہ','سیلفی کیمرہ'])) return {action:'camera',value:'front'};
  if (any(t, ['back camera','rear camera','switch to rear','switch to back','پیچھے والا کیمرہ','بیک کیمرہ','پچھلا کیمرہ'])) return {action:'camera',value:'back'};
  if (any(t, ['stop camera','turn off camera','camera off','close camera','کیمرہ بند','camera band'])) return {action:'camera',value:'stop'};
  if (any(t, ['start camera','open camera','turn on camera','camera on','enable camera','کیمرہ کھولو','کیمرہ چالو','کیمرہ شروع','camera kholo'])) return {action:'camera',value:'start'};

  if (any(t, ['automatic narration off','disable automatic speech','auto narration off','stop auto narration','turn off auto speech','pause descriptions','pause narration','stop describing continuously','stop describing','stop live narration','narration off','خاموشی سے دیکھو','مسلسل بولنا بند','بتانا بند کرو','آٹو آواز بند','خودکار آواز بند','بیان بند'])) return {action:'speech',value:'off'};
  if (any(t, ['automatic narration on','enable automatic speech','auto narration on','turn on auto speech','speak automatically','describe continuously','continuous descriptions on','keep telling me what you see','keep describing','keep talking about what you see','narrate what you see','tell me what you see continuously','narration on','لائیو منظر بتاتے رہو','مسلسل بتاؤ','مسلسل بولتے رہو','جو نظر آئے بتاتے رہو','دیکھ کر بتاتے رہو','آٹو آواز چالو','خودکار آواز چالو','بیان شروع','بتاتے رہو'])) return {action:'speech',value:'on'};

  if (any(t, ['detailed model','accurate model','better model','high accuracy model','detailed detection','بہتر ماڈل','تفصیلی ماڈل','درست ماڈل'])) return {action:'model',value:'detailed'};
  if (any(t, ['fast model','light model','lightweight model','speed mode','تیز ماڈل','ہلکا ماڈل'])) return {action:'model',value:'fast'};

  if (any(t, ['more results','find more objects','lower threshold','higher sensitivity','detect more','more detections','زیادہ چیزیں','زیادہ حساس','مزید نتائج'])) return {action:'sensitivity',value:'more'};
  if (any(t, ['high confidence','fewer false detections','higher confidence','strict detection','اعتماد زیادہ','پکا نتیجہ','کم غلطیاں'])) return {action:'sensitivity',value:'confidence'};
  if (any(t, ['balanced detection','balanced sensitivity','normal sensitivity','درمیانی حساسیت','متوازن حساسیت'])) return {action:'sensitivity',value:'balanced'};

  if (any(t, ['daylight theme','light theme','white theme','bright theme','day theme','سفید تھیم','لائٹ تھیم','روشن تھیم'])) return {action:'theme',value:'daylight'};
  if (any(t, ['sea glass theme','mint theme','green theme','sea glass','سبز تھیم','گرین تھیم'])) return {action:'theme',value:'sea-glass'};
  if (any(t, ['dark theme','night theme','midnight theme','ڈارک تھیم','اندھیرا تھیم','رات والی تھیم'])) return {action:'theme',value:'midnight'};
  if (any(t, ['contrast theme','high contrast theme','زیادہ کنٹراسٹ','ہائی کنٹراسٹ'])) return {action:'theme',value:'contrast'};

  if (any(t, ['look mode','vision mode','object mode','object detection mode','switch to look','دیکھنے والا موڈ','شناخت والا موڈ','چیزیں دیکھو'])) return {action:'mode',value:'look'};
  if (any(t, ['text mode','reading mode','read mode','switch to reading','او سی آر موڈ','پڑھنے کا موڈ','متن کا موڈ'])) return {action:'mode',value:'read'};
  if (any(t, ['checkpoint mode','navigation mode','qr mode','guide mode','راستہ موڈ','چیک پوائنٹ موڈ','کیو آر موڈ'])) return {action:'mode',value:'guide'};

  if (any(t, ['read urdu text','ocr in urdu','urdu ocr','urdu text language','اردو عبارت','اردو متن','اردو پڑھائی'])) return {action:'ocrLanguage',value:'urd'};
  if (any(t, ['read english text','ocr in english','english ocr','english text language','انگریزی عبارت','انگریزی متن'])) return {action:'ocrLanguage',value:'eng'};

  if (any(t, ['go to library','destination library','navigate to library','لائبریری جانا','لائبریری جاؤ'])) return {action:'destination',value:'library'};
  if (any(t, ['go to help desk','destination help desk','help desk checkpoint','ہیلپ ڈیسک جاؤ','مدد کا کاؤنٹر'])) return {action:'destination',value:'helpdesk'};
  if (any(t, ['go to lab','destination lab','computer lab checkpoint','لیب جاؤ','کمپیوٹر لیب جانا'])) return {action:'destination',value:'lab'};
  if (any(t, ['go to reception','destination reception','reception checkpoint','استقبالیہ جاؤ'])) return {action:'destination',value:'lobby'};
  if (any(t, ['go to gate','destination gate','welcome point','گیٹ جاؤ','دروازے کا نشان'])) return {action:'destination',value:'gate'};

  if (any(t, ['go to camera settings','open camera settings','camera settings','کیمرہ سیٹنگ','کیمرہ کی سیٹنگ'])) return {action:'focus',value:'settings'};
  if (any(t, ['focus camera','go to camera','open vision panel','camera controls','کیمرہ کنٹرول','کیمرہ والا حصہ'])) return {action:'focus',value:'camera'};
  if (any(t, ['voice controls','open assistant','go to voice','assistant settings','آواز کے کنٹرول','اسسٹنٹ کھولو'])) return {action:'focus',value:'voice'};
  if (any(t, ['read results','go to results','show results','results panel','نتائج سناؤ','نتائج کھولو'])) return {action:'focus',value:'results'};
  if (any(t, ['open checkpoints','checkpoint options','show checkpoints','چیک پوائنٹ کھولو','نشان کے آپشن'])) return {action:'focus',value:'checkpoints'};

  if (any(t, ['capture frame','take a photo and analyze','capture and analyze','capture photo','تصویر کھینچو','فریم کی تصویر','کیمرہ تصویر لو'])) return {action:'action',value:'capture'};
  if (any(t, ['identify more','classify image','what else is this','more categories','مزید شناخت','اور پہچانو'])) return {action:'action',value:'identify'};
  if (any(t, ['analyze photo','analyze image','analyze upload','تصویر کا تجزیہ','فوٹو کا تجزیہ'])) return {action:'action',value:'analyze'};
  if (any(t, ['scan checkpoint','scan qr','scan qr code','qr scan','کیو آر اسکین','نشان اسکین'])) return {action:'action',value:'scan'};
  if (any(t, ['read urdu','اردو پڑھو','اردو پڑھ'])) return {action:'action',value:'readUrdu'};
  if (any(t, ['read this','read text','read the sign','what does it say','یہ پڑھو','یہ پڑھ','لکھا پڑھ','کیا لکھا'])) return {action:'action',value:'read'};

  return null; // Let existing scene, object and safety commands handle other phrases.
}
