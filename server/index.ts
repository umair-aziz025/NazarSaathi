const port=Number(Bun.env.PORT||3000);
const publicRoot=new URL('../dist/',import.meta.url);
const types:Record<string,string>={'.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.html':'text/html; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.ico':'image/x-icon','.webp':'image/webp','.json':'application/json'};
Bun.serve({port,hostname:'0.0.0.0',async fetch(req){
  const url=new URL(req.url);
  if(url.pathname==='/api/health')return Response.json({ok:true,service:'NazarSaathi',version:'2.0.0',stack:'React + TypeScript + Vite + Bun'});
  if(url.pathname==='/api/urdu-tts'){
    const text=url.searchParams.get('text')||'';
    if(!text||text.length>220||!/[\\u0600-\\u06FF]/.test(text))return new Response('Invalid Urdu phrase',{status:400});
    try{
      const endpoint='https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=ur&q='+encodeURIComponent(text);
      const response=await fetch(endpoint,{headers:{'User-Agent':'Mozilla/5.0 Chrome/124.0 Safari/537.36','Accept':'audio/mpeg,*/*'},signal:AbortSignal.timeout(9000)});
      const buffer=await response.arrayBuffer(), contentType=response.headers.get('content-type')||'';
      if(!response.ok||!contentType.toLowerCase().startsWith('audio/')||buffer.byteLength>500000)return new Response('Urdu speech unavailable',{status:503});
      return new Response(buffer,{headers:{'content-type':'audio/mpeg','cache-control':'public,max-age=1800','x-content-type-options':'nosniff'}});
    }catch{return new Response('Urdu speech service unavailable',{status:503})}
  }
  const path=url.pathname;
  if(path.includes('..')||path.includes('\\')||path.includes('\0'))return new Response('Invalid path',{status:400});
  const asset=path==='/'?'index.html':path.replace(/^\/+/, '');
  const file=Bun.file(new URL(asset,publicRoot));
  if(await file.exists()){
    const ext='.'+(asset.split('.').pop()||'html');
    return new Response(file,{headers:{'content-type':types[ext]||'application/octet-stream','x-content-type-options':'nosniff','referrer-policy':'no-referrer','permissions-policy':'geolocation=()','cache-control':asset.startsWith('assets/')?'public,max-age=604800,immutable':'public,max-age=60'}});
  }
  if(!path.startsWith('/api/'))return new Response(Bun.file(new URL('index.html',publicRoot)),{headers:{'content-type':'text/html; charset=utf-8','cache-control':'public,max-age=60'}});
  return new Response('Not found',{status:404});
}});
