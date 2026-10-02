const CACHE='ubsf-nova-sertania-v6';
const ASSETS=['./','index.html','styles.css','js/app.js','js/config.js','js/model.js','js/pdf.js','assets/logo-sertania.png','assets/avisos/renovacao-de-receitas.png','assets/avisos/renovacao-de-receitas.pdf','manifest.json'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
 if(event.request.method!=='GET')return;
 const url=new URL(event.request.url);
 if(url.hostname.includes('supabase.co'))return;
 event.respondWith(fetch(event.request).then(response=>{if(response.ok&&url.origin===location.origin)caches.open(CACHE).then(c=>c.put(event.request,response.clone()));return response;}).catch(()=>caches.match(event.request).then(r=>r||caches.match('./'))));
});
