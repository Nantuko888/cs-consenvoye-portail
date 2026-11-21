# RTN — activation de l'enregistrement des tableaux sur Google Sheets

Le frontend `tableaux-rtn.html` est déjà publié sur GitHub Pages et ses appels de synchronisation (`tableaux_save`, `tableaux_history`) sont intégrés. Il fonctionne localement même avant activation des nouvelles actions côté serveur. **Le présent fichier `.gs` dans le dépôt GitHub n'est pas automatiquement installé dans Apps Script.**

## Dans le projet Apps Script **Formation RTN** (pas l'Apps Script principal du portail)

1. Créer un fichier **RTN_Tableaux.gs** ; y coller intégralement le contenu de `RTN_Tableaux.gs` de ce dépôt.
2. Dans `Formation_Bridge_POST.gs`, dans le routeur des actions **après validation du protocole `formation_bridge`**, ajouter ces deux branches avec la même forme de réponse que les actions existantes :
```javascript
if (action === 'tableaux_save') {
  return rtnTableauxSave_(p.payload, p.session);
}
if (action === 'tableaux_history') {
  return rtnTableauxHistory_(p.session);
}
```
**Attention :** `p` doit être l'objet des paramètres existants (souvent `e.parameter`). Respecter son nom exact et le mécanisme déjà présent pour produire le `postMessage` signé par request_id. Ne pas ajouter de second `doPost`.
3. Déployer une **nouvelle version** de la Web App Formation RTN via *Déployer > Gérer les déploiements > Modifier > Nouvelle version*. Conserver l'URL du déploiement existant utilisée par `formation.html`.
4. Vérifier la création des deux onglets dans le classeur Google Sheets Formation RTN : `TableauxSeances` et `TableauxReponses`. Les onglets `Seances`, `Reponses`, `Progression` des QCM sont conservés.
5. Faire une séance avec un compte autorisé (colonne `formation=1`). Vérifier le statut « synchronisé » et les données correspondant à ce compte. Tester aussi 40 exercices avec répétition d'un modèle : la colonne `ordre_tableau` permet de conserver toutes les occurrences sans les fusionner. Relancer volontairement une synchronisation : le `client_id` empêche une deuxième séance identique.

**Sécurité** : `rtnRequireSession_` vérifie la session et la permission Formation ; `rtnUserId_` fournit l'ID personnel. Le serveur recalcule les bonnes réponses avec les données du fichier .gs, et ignore tout score fourni par le client.

**Important :** le frontend est déjà raccordé. Il n'affiche jamais une sauvegarde Google confirmée sans réponse de succès du serveur. Sans modification puis redéploiement de l'Apps Script Formation, les séances restent locales et un message signale que la synchronisation Google est indisponible. Les données existantes des QCM ne sont pas modifiées.