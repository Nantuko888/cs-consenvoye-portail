/**
 * Cloudflare Worker — passerelle RTN, projet préparatoire.
 * Variables :
 *   RTN_SCRIPT_URL : URL du déploiement /exec RTN
 *   RTN_BRIDGE_SECRET : secret partagé, stocké comme SECRET Cloudflare
 * Le même secret doit être enregistré dans les propriétés du script RTN.
 * Ne pas publier RTN_SCRIPT_URL comme une API de confiance sans le secret.
 */
const ORIGIN = 'https://nantuko888.github.io';
const MAX_BODY_BYTES = 80 * 1024;
const ROUTES = Object.freeze({
  '/rtn/connect': 'connect',
  '/rtn/dashboard': 'dashboard',
  '/rtn/save': 'save'
});
function headers(origin) {
  return {
    'Access-Control-Allow-Origin': origin === ORIGIN ? ORIGIN : 'null',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '600',
    'Vary': 'Origin',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff'
  };
}
function json(value,status,origin) {
  return new Response(JSON.stringify(value),{
    status,headers:{'Content-Type':'application/json; charset=utf-8',...headers(origin)}
  });
}
export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    if(origin!==ORIGIN) return json({ok:false,error:'Origine non autorisée'},403,origin);
    if(request.method==='OPTIONS') return new Response(null,{status:204,headers:headers(origin)});
    const path = new URL(request.url).pathname;
    const action = ROUTES[path];
    if(!action || request.method!=='POST') return json({ok:false,error:'Route indisponible'},404,origin);
    if(!request.headers.get('Content-Type')?.toLowerCase().startsWith('application/json')) {
      return json({ok:false,error:'JSON requis'},415,origin);
    }
    if(!env.RTN_SCRIPT_URL?.startsWith('https://script.google.com/macros/s/') ||
       !env.RTN_SCRIPT_URL.endsWith('/exec') || !env.RTN_BRIDGE_SECRET) {
      return json({ok:false,error:'Passerelle non configurée'},503,origin);
    }
    let body;
    try {
      const text = await request.text();
      if(text.length>MAX_BODY_BYTES) return json({ok:false,error:'Requête trop longue'},413,origin);
      body = JSON.parse(text);
      if(!body || typeof body!=='object' || Array.isArray(body)) throw Error();
    } catch(_) {return json({ok:false,error:'Requête invalide'},400,origin);}
    if(action==='connect' && (typeof body.credential!=='string' || body.credential.length>10000)) {
      return json({ok:false,error:'Identité invalide'},400,origin);
    }
    if(action!=='connect' && (typeof body.session!=='string' || body.session.length>4000)) {
      return json({ok:false,error:'Session requise'},400,origin);
    }
    try {
      const upstream=await fetch(env.RTN_SCRIPT_URL,{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({action,secret:env.RTN_BRIDGE_SECRET,...body}),
        redirect:'follow',
        signal:AbortSignal.timeout(25000)
      });
      if(!upstream.ok) return json({ok:false,error:'Service RTN indisponible'},502,origin);
      const response=await upstream.json();
      if(!response || typeof response!=='object' || !('ok' in response)) throw Error('Invalid backend response');
      // Ne renvoyer que le JSON du backend, aucun cookie ni en-tête Google.
      return json(response,200,origin);
    } catch(_) {
      return json({ok:false,error:'Impossible de joindre RTN'},502,origin);
    }
  }
};
