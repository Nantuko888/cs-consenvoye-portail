# Installation — Signalements RTN (privés)

## État
La page `formation.html` et `RTN_Signalements.gs` sont préparés sur la branche `feature/signalements-rtn-prives`. **Ne pas fusionner avant installation et test du backend** : le module est incomplet tant que le routeur Apps Script n'est pas raccordé.

## Projet Apps Script Formation
1. Ajouter le fichier `RTN_Signalements.gs` au **même projet Apps Script** que `RTN_Tableaux.gs`. Il dépend de `rtnRequireSession_` et `rtnUserId_` existants.
2. Dans le routeur **POST existant** (`Formation_Bridge_POST.gs`), après les vérifications de la requête Formation et sans créer de nouveau `doPost`, router les actions suivantes :
   - `signal_permissions` → `rtnSignalPermissions_(session)`
   - `signal_create` → `rtnSignalCreate_(session, question_id, motif, commentaire)`
   - `signal_list` → `rtnSignalList_(session)`
   - `signal_update` → `rtnSignalUpdate_(session, id, statut)`
   Les champs `session`, `question_id`, `motif`, `commentaire`, `id`, `statut` doivent être lus dans la même structure de POST que les actions déjà fonctionnelles (`dashboard`, `save`). Les réponses passent dans le même mécanisme sécurisé `formation:bridge`.
3. Ajouter aux **Propriétés du script** la clé `RTN_SIGNAL_ADMIN_IDS`. Sa valeur est la liste exacte des ID utilisateurs **calculés côté serveur** par `rtnUserId_(rtnRequireSession_(session))`, séparés par des virgules. Ne pas utiliser un nom affiché, un rôle fourni par le navigateur ou une adresse saisie côté client comme contrôle d'accès.
4. Déployer une nouvelle version du Web App Formation. Vérifier que l'URL /exec existante reste inchangée et accessible aux comptes autorisés.
5. Vérifier les protections du classeur : la feuille `RTN_Signalements` est créée automatiquement et masquée, mais **masquer une feuille ne suffit pas**. Ne donner accès en lecture au classeur qu'aux personnes autorisées à voir les identifiants des déclarants.

## Droits
- Utilisateur authentifié : `signal_create` uniquement; son identité est extraite de sa session validée.
- Administrateur explicitement inscrit dans `RTN_SIGNAL_ADMIN_IDS` : `signal_permissions` retourne `canManage:true`, peut appeler `signal_list` et `signal_update`.
- Refus serveur pour tous les autres utilisateurs, même en appelant directement l'API.
- Par défaut aucun administrateur si la propriété n'est pas renseignée.
- Le tableau de suivi affiche l'**identifiant serveur** du déclarant, pas nécessairement son nom civil. Un affichage nominatif exigera une résolution d'identité côté serveur, pas une valeur transmise par le client.

## Tests avant fusion
1. Le parcours révisions / retour au portail reste fonctionnel.
2. Un utilisateur peut signaler une question; un enregistrement est créé.
3. Le même utilisateur ne voit jamais le menu `Signalements RTN` et ses appels `signal_list`/`signal_update` sont refusés.
4. Un administrateur voit le menu, l'auteur, la date, le motif, et peut passer le statut à « Corrigé » ou « Rejeté ».
5. Un accès sans session valide ou une session expirée est refusé.
6. Vérifier les formulaires POST et le déploiement Apps Script avant publication publique.

## Limites
Le backend Apps Script existant n'est pas présent dans ce dépôt GitHub : l'insertion exacte des branches du routeur et les tests réels sur Google Sheets doivent être réalisés dans ce projet. Le signalement désigne actuellement l'ID de la question; l'affichage de son texte dans la liste administrateur exige un rapprochement côté serveur avec la banque de questions.
