/**
 * Formation — passerelle HTML POST pour l'interface GitHub Pages.
 *
 * À ajouter au projet Google Apps Script FORMATION, sans remplacer Code.gs.
 * À déployer comme nouvelle version du déploiement Web déjà existant.
 * NE PAS activer côté portail avant vérification de cette passerelle.
 *
 * Important : les jetons Google et les sessions sont reçus uniquement
 * dans le corps POST (jamais en URL). Le serveur revérifie les droits
 * formation=1 avec rtnConnect()/rtnRequireSession_().
 */
function doPost(e) {
  const p = (e && e.parameter) || {};
  const requestId = String(p.request_id || '');
  const targetOrigin = 'https://nantuko888.github.io';
  let response = { type:'formation:bridge', request_id:requestId, ok:false };

  try {
    if (String(p.formation_bridge || '') !== '1') {
      throw Error('Appel de formation inconnu');
    }
    if (!/^[a-f0-9]{32}$/.test(requestId)) {
      throw Error('Identifiant de requête incorrect');
    }
    const action = String(p.action || '');
    let data;
    switch (action) {
      case 'connect':
        data = rtnConnect(String(p.credential || ''));
        break;
      case 'dashboard':
        data = pseDashboard(String(p.session || ''));
        break;
      case 'save': {
        const json = String(p.payload || '');
        if (json.length > 250000) throw Error('Séance trop volumineuse');
        data = enregistrerSeancePSE(JSON.parse(json), String(p.session || ''));
        break;
      }
      default:
        throw Error('Action non prise en charge');
    }
    response = {type:'formation:bridge',request_id:requestId,ok:true,data:data};
  } catch (err) {
    response = {type:'formation:bridge',request_id:requestId,ok:false,
      error:String(err && err.message ? err.message : err)};
  }

  // La réponse ne peut être lue que par notre origine GitHub Pages.
  // Base64 protège aussi contre l'injection de balises HTML/script.
  const base64=Utilities.base64Encode(
    Utilities.newBlob(JSON.stringify(response), 'application/json').getBytes()
  );
  const html='<!doctype html><html><meta charset="utf-8"><body><script>'+
    '(function(){try{var binary=atob('+JSON.stringify(base64)+');'+
    'var bytes=Uint8Array.from(binary,function(x){return x.charCodeAt(0)});'+
    'var msg=JSON.parse(new TextDecoder().decode(bytes));'+
    'var a=window;for(var i=0;i<5;i++){if(!a.parent||a.parent===a)break;a=a.parent;'+
    'try{a.postMessage(msg,'+JSON.stringify(targetOrigin)+');}catch(ignore){}}'+
    '}catch(e){}})();'+
    '<\/script></body></html>';
  return HtmlService.createHtmlOutput(html)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
