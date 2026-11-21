/**
 * RTN transport API (préparation).
 * Aucune requête n'est émise tant qu'un backend HTTPS n'a pas été configuré.
 * Important : aucun ID token ni jeton de session dans l'URL.
 */
export class RtnApi {
  constructor(baseUrl) {
    const url = new URL(baseUrl);
    if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) {
      throw new Error('URL API RTN invalide : HTTPS sans identifiants ni paramètres requis.');
    }
    this.baseUrl = url.href.replace(/\/$/, '');
  }

  async request(endpoint, payload) {
    const response = await fetch(this.baseUrl + endpoint, {
      method: 'POST',
      mode: 'cors',
      credentials: 'omit',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error('Service RTN indisponible ou accès refusé (' + response.status + ')');
    const result = await response.json();
    if (!result || typeof result !== 'object') throw new Error('Réponse RTN invalide');
    return result;
  }

  async connect(credential) {
    if (typeof credential !== 'string' || !credential) throw new Error('Identification Google requise');
    return this.request('/rtn/connect', { credential });
  }

  async dashboard(session) {
    return this.request('/rtn/dashboard', { session });
  }

  async save(payload, session) {
    return this.request('/rtn/save', { payload, session });
  }
}
