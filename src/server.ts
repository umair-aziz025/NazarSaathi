const root = new URL("../public/",import.meta.url);
const headers={"x-content-type-options":"nosniff","referrer-policy":"no-referrer","permissions-policy":"geolocation=(), microphone=()"};
Bun.serve({port:Number(Bun.env.PORT||3000),hostname:"0.0.0.0",async fetch(req){const url=new URL(req.url);const path=url.pathname;
if(path==="/api/health")return Response.json({ok:true,service:"NazarSaathi",version:"github-1.0",mode:"browser-side-ai"});
if(path==="/api/urdu-tts"){
 const text=url.searchParams.get("text")||"";
 if(!text||text.length>220||!/[\u0600-\u06FF]/.test(text))return new Response("Invalid Urdu phrase",{status:400});
 try{
  const endpoint="https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=ur&q="+encodeURIComponent(text);
  const upstream=await fetch(endpoint,{headers:{"User-Agent":"Mozilla/5.0 Chrome/124.0 Safari/537.36","Accept":"audio/mpeg,*/*"},signal:AbortSignal.timeout(8500)});
  const data=await upstream.arrayBuffer();const type=upstream.headers.get("content-type")||"";
  if(!upstream.ok||!type.toLowerCase().startsWith("audio/")||data.byteLength>500000)return new Response("Urdu TTS unavailable",{status:503});
  return new Response(data,{headers:{"Content-Type":"audio/mpeg","Cache-Control":"public, max-age=3600",...headers}});
 }catch{return new Response("Urdu TTS unavailable",{status:503})}
}
const files={"/": ["index.html","text/html; charset=utf-8"],"/index.html":["index.html","text/html; charset=utf-8"],"/styles.css":["styles.css","text/css; charset=utf-8"],"/app.js":["app.js","text/javascript; charset=utf-8"]};
const item=files[path];if(!item)return new Response("Not Found",{status:404});
return new Response(Bun.file(new URL(item[0],root)),{headers:{"Content-Type":item[1],"Cache-Control":"public, max-age=60",...headers}});
}});
