/**
 * Google Apps Script — pont RTN HTTPS appelé UNIQUEMENT par le Worker.
 *
 * Avant installation :
 * 1. Vérifier que le projet n'a pas déjà une fonction doPost(e).
 * 2. Définir dans les propriétés du script RTN : RTN_BRIDGE_SECRET,
 *    une chaîne aléatoire longue et strictement identique au secret Worker.
 * 3. Le code RTN existant doit fournir rtnConnect(), pseDashboard(),
 *    enregistrerSeancePSE() et revérifier le droit de chaque session.
 * 4. Mettre à jour le déploiement Web App EXISTANT.
 *
 * IMPORTANT :
 * Le frontend n'utilise jamais directement cette URL /exec.
 * Les requêtes entrantes sont filtrées ci-dessous puis revérifiées
 * par les fonctions RTN, y compris les autorisations du compte.
 *
 * Ne pas coller ce fichier dans le script tant que l'intégration
 * et les éventuels autres doPost n'ont pas été vérifiés.
 */
function doPost(e) {
  var out;
  try {
    var raw = String(e && e.postData && e.postData.contents || '');
    if (!raw || raw.length > 90000) throw new Error('Requête invalide');
    var data = JSON.parse(raw);
    if (!data || Array.isArray(data) || typeof data !== 'object') {
      throw new Error('Corps JSON invalide');
    }
    var expected = PropertiesService.getScriptProperties().getProperty('RTN_BRIDGE_SECRET');
    if (!expected || expected.length < 40 || typeof data.secret !== 'string' || data.secret !== expected) {
      throw new Error('Accès refusé');
    }
    var action = data.action;
    if (action === 'connect') {
      if (typeof data.credential !== 'string' || !data.credential || data.credential.length > 10000) {
        throw new Error('Identité absente');
      }
      // Validation Google du token ET vérification des droits dans rtnConnect.
      out = rtnConnect(data.credential);
    } else if (action === 'dashboard') {
      if (typeof data.session !== 'string' || !data.session || data.session.length > 4000) {
        throw new Error('Session absente');
      }
      out = pseDashboard(data.session);
    } else if (action === 'save') {
      if (typeof data.session !== 'string' || !data.session || data.session.length > 4000) {
        throw new Error('Session absente');
      }
      if (!data.payload || typeof data.payload !== 'object' || Array.isArray(data.payload)) {
        throw new Error('Résultat invalide');
      }
      out = enregistrerSeancePSE(data.payload, data.session);
    } else {
      throw new Error('Action inconnue');
    }
    // Conserver la structure retournée par RTN ; ne pas substituer
    // de fausse autorisation côté passerelle.
    out = {ok:true,data:out};
  } catch (err) {
    // Ne pas révéler les jetons, secrets ou détails internes.
    out = {ok:false,error:'Accès RTN refusé ou service indisponible'};
  }
  return ContentService.createTextOutput(JSON.stringify(out))
    .setMimeType(ContentService.MimeType.JSON);
}
