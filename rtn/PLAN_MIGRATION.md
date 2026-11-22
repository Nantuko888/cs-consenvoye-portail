# RTN intégré au portail — chantier de migration (non publié)

## Problème vérifié

L'application RTN **fonctionne** en navigation privée, y compris l'autorisation Google et l'accès au questionnaire. Dans Chrome avec plusieurs comptes Google, l'URL Apps Script `/exec` affiche une erreur Google Drive « Impossible d'ouvrir le fichier ». La correction de l'autorisation `UrlFetchApp.fetch` a été faite.

## Contraintes obligatoires

- Conserver **Révisions**, **Syopé**, le logo et le portail en production.
- Aucune banque de questions ni aucun corrigé privé publié en clair sur GitHub Pages.
- Conserver la vérification serveur du jeton Google et les droits de la feuille **Acces** ; contrôle renouvelé pour chaque action.
- Conserver l'historique multi-utilisateur dans Google Sheets ; ne pas enregistrer les résultats uniquement dans le navigateur.
- Éviter toute navigation, iframe et requête directe du navigateur vers l'URL `script.google.com/macros/.../exec` pour ne pas reproduire le conflit multi-comptes.
- Ne **jamais** exposer un jeton Google ou une session RTN dans une URL, dans le code public, dans un journal ou dans un paramètre de script JSONP.

## État technique du code examiné

- Frontend RTN : `Index.html` sous Apps Script, avec interface et banque **chargée après authentification**, et trois appels `google.script.run` :
  - `rtnConnect(credential)` ;
  - `pseDashboard(rtnSession)` ;
  - `enregistrerSeancePSE(payload, rtnSession)`.
- Le frontend RTN se base sur la variable de template `launchNonceJson` et sur `window.google.script.run`. Ces deux dépendances doivent être supprimées ou remplacées dans la version GitHub.
- Authentification initiale : le portail conserve un ID token Google dans `sessionStorage["cs_rtn_google_credential_v1"]`. Le serveur doit valider sa signature et son audience, puis vérifier le droit « RTN ».
- Le portail reste sur GitHub Pages (site statique). Il ne dispose pas à lui seul d'un serveur permettant de masquer des secrets ou de relayer des requêtes POST avec réponse CORS.

## Contrat de l'API à réaliser

Créer un **point d'accès HTTPS serveur**, indépendant de l'URL Web Apps Script visible par le navigateur, avec :
- `POST /rtn/connect` : prend un ID token Google dans le **corps** de la requête, vérification côté Apps Script, renvoie une session opaque courte.
- `POST /rtn/dashboard` : prend la session opaque dans le corps et renvoie uniquement les questions, résultats et informations du compte autorisé.
- `POST /rtn/save` : prend session et réponses dans le corps, stocke dans Sheets après validation serveur.
- Réponses JSON, CORS limité strictement à `https://nantuko888.github.io`; aucun cache partagé ; limitation de débit ; jetons jamais dans les URLs.
- La session existante `rtnRequireSession_` effectue déjà la révocation à chaque action. Les méthodes existantes `rtnConnect`, `pseDashboard`, `enregistrerSeancePSE` doivent rester la source de vérité pour les autorisations et l'enregistrement.

### Dépendance de déploiement

GitHub Pages ne peut pas implémenter ces routes serveur. Il faut soit :
1. Un petit relais HTTPS (par ex. Cloudflare Worker) qui relaie vers un backend authentifié avec un canal approprié ; **ou**
2. Déployer un véritable backend HTTP (Cloud Run/Firebase Functions) utilisant les APIs Google Sheets et une identité de service autorisée.

**Le simple fait de déplacer Index.html vers GitHub sans API serveur casserait RTN.** Utiliser `ContentService` JSONP avec un jeton en URL n'est pas retenu : cela exposerait les identifiants d'accès.

## Suite de l'implémentation

1. Choisir l'hébergement du petit backend HTTPS et son mode d'authentification côté serveur.
2. Brancher les trois fonctions, en maintenant leurs contrôles de droits et leurs validations.
3. Porter l'interface RTN dans `rtn/index.html` ; remplacer les `google.script.run` par les requêtes à l'API.
4. Tester depuis Chrome avec **deux comptes Google connectés** : connexion, lecture de la banque et sauvegarde des réponses.
5. Modifier seulement après validation la carte RTN de `revisions.html` pour ouvrir le frontend GitHub.

Ce document prépare la migration et **ne constitue pas une correction RTN déployée**.
