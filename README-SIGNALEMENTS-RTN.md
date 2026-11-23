# Signalements RTN

Le bouton « Signaler une erreur » se trouve dans les questions RTN. Le suivi « Signalements RTN » est accessible depuis l’accueil des révisions après vérification du rôle par le serveur.

## Projet Apps Script Formation

Ajouter `RTN_Signalements.gs` au projet qui publie l’adresse Formation utilisée par `formation.html`. Dans le `doPost(e)` de `Formation_Bridge_POST.gs`, conserver la passerelle et ajouter ces actions au routeur existant.

| Action | Appel |
| --- | --- |
| `signal_permissions` | `rtnSignalPermissions_(p.session)` |
| `signal_create` | `rtnSignalCreate_(p.session, p.question_id, p.motif, p.commentaire)` |
| `signal_list` | `rtnSignalList_(p.session)` |
| `signal_update` | `rtnSignalUpdate_(p.session, p.id, p.statut)` |

Publier une version du déploiement existant pour garder la même adresse. Le module utilise la validation de session RTN. La consultation et le traitement exigent un profil actif de rôle `admin` dans `Utilisateurs`. Le serveur détermine l’identité du déclarant depuis sa session et enregistre son identifiant.

Le premier signalement crée l’onglet masqué `RTN_Signalements`. Garder le classeur accessible uniquement aux personnes autorisées à voir les signalements. Masquer un onglet ne restreint pas l’accès des personnes qui ont déjà accès au classeur.

## Vérifications

- Envoyer un signalement depuis une question et vérifier la ligne dans Google Sheets.
- Avec un compte administrateur actif, vérifier l’auteur, le motif, le commentaire et les statuts En attente, Corrigé et Rejeté.
- Avec un compte ordinaire, vérifier que l’entrée de suivi est masquée et que les actions de consultation et de traitement sont refusées.
- Vérifier que les appels sans session, avec une session expirée ou avec une autorisation retirée sont refusés.
- Vérifier la connexion Google, l’ouverture des révisions et le retour au portail.
