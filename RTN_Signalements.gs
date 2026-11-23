/** Signalements RTN — additif pour le projet Apps Script Formation existant.
 * NE PAS créer un second doPost. Ajouter les quatre actions au routeur
 * Formation_Bridge_POST.gs (instructions dans README-SIGNALEMENTS-RTN.md).
 * Les identités sont toujours issues de rtnRequireSession_, jamais du client.
 * Configurer la propriété de script RTN_SIGNAL_ADMIN_IDS avec les ID
 * utilisateurs exacts (rtnUserId_(identity)), séparés par des virgules.
 */
const RTN_SIGNAL_SHEET='RTN_Signalements';
const RTN_SIGNAL_HEADERS=['id','date','question_id','motif','commentaire','auteur_id','statut','date_traitement','traite_par'];
const RTN_SIGNAL_MOTIFS=['incorrecte','demonstration_incorrecte','reference','autre'];
const RTN_SIGNAL_STATUTS=['En attente','Corrigé','Rejeté'];

function rtnSignalIdentity_(session){
  const identity=rtnRequireSession_(String(session||''));
  return {identity,userId:String(rtnUserId_(identity)||'')};
}
function rtnSignalIsAdmin_(userId){
  const raw=PropertiesService.getScriptProperties().getProperty('RTN_SIGNAL_ADMIN_IDS')||'';
  return raw.split(',').map(s=>s.trim()).filter(Boolean).includes(String(userId));
}
function rtnSignalAdmin_(session){
  const who=rtnSignalIdentity_(session);
  if(!who.userId || !rtnSignalIsAdmin_(who.userId))throw Error('Accès administrateur refusé');
  return who;
}
function rtnSignalSheet_(){
  const ss=SpreadsheetApp.getActiveSpreadsheet();
  let sh=ss.getSheetByName(RTN_SIGNAL_SHEET);
  if(!sh){sh=ss.insertSheet(RTN_SIGNAL_SHEET);sh.appendRow(RTN_SIGNAL_HEADERS);sh.hideSheet();}
  const headers=sh.getRange(1,1,1,RTN_SIGNAL_HEADERS.length).getValues()[0];
  if(RTN_SIGNAL_HEADERS.some((h,i)=>headers[i]!==h))throw Error('En-têtes RTN_Signalements invalides');
  return sh;
}
function rtnSignalPermissions_(session){
  const who=rtnSignalIdentity_(session);
  return {canManage:!!who.userId && rtnSignalIsAdmin_(who.userId)};
}
function rtnSignalCreate_(session,questionId,motif,commentaire){
  const who=rtnSignalIdentity_(session);
  if(!who.userId)throw Error('Utilisateur inconnu');
  const id=String(questionId||'').trim();
  if(!/^[A-Za-z0-9_-]{1,80}$/.test(id))throw Error('Question invalide');
  motif=String(motif||'');
  if(!RTN_SIGNAL_MOTIFS.includes(motif))throw Error('Motif invalide');
  commentaire=String(commentaire||'').trim();
  if(commentaire.length>1000)throw Error('Commentaire trop long');
  // Le client ne peut envoyer ni nom, ni email, ni statut de traitement.
  const lock=LockService.getScriptLock();lock.waitLock(20000);
  try{
    const sh=rtnSignalSheet_();
    // Empêche les répétitions immédiates pour la même question et auteur.
    const n=sh.getLastRow(),rows=n>1?sh.getRange(Math.max(2,n-199),1,Math.min(n-1,199),RTN_SIGNAL_HEADERS.length).getValues():[];
    const duplicate=rows.some(r=>String(r[2])===id && String(r[5])===who.userId && String(r[6])==='En attente' && r[1] instanceof Date && Date.now()-r[1].getTime()<60000);
    if(duplicate)throw Error('Un signalement récent existe déjà pour cette question');
    const signalId='SIG_'+Utilities.getUuid();
    sh.appendRow([signalId,new Date(),id,motif,commentaire,who.userId,'En attente','','']);
    return {saved:true,id:signalId};
  }finally{lock.releaseLock();}
}
function rtnSignalList_(session){
  rtnSignalAdmin_(session);
  const sh=rtnSignalSheet_(),n=sh.getLastRow();
  if(n<2)return {items:[]};
  const vals=sh.getRange(Math.max(2,n-499),1,Math.min(n-1,499),RTN_SIGNAL_HEADERS.length).getValues();
  return {items:vals.reverse().map(r=>({
    id:String(r[0]),date:r[1] instanceof Date?r[1].toISOString():String(r[1]),
    question_id:String(r[2]),motif:String(r[3]),commentaire:String(r[4]),
    auteur:String(r[5]),statut:String(r[6]),
    date_traitement:r[7] instanceof Date?r[7].toISOString():String(r[7]||''),
    traite_par:String(r[8]||'')
  }))};
}
function rtnSignalUpdate_(session,id,statut){
  const who=rtnSignalAdmin_(session);
  if(!RTN_SIGNAL_STATUTS.includes(String(statut)))throw Error('Statut invalide');
  const lock=LockService.getScriptLock();lock.waitLock(20000);
  try{
    const sh=rtnSignalSheet_(),n=sh.getLastRow();
    if(n<2)throw Error('Signalement introuvable');
    const ids=sh.getRange(2,1,n-1,1).getValues();
    const idx=ids.findIndex(r=>String(r[0])===String(id));
    if(idx<0)throw Error('Signalement introuvable');
    sh.getRange(idx+2,7,1,3).setValues([[String(statut),new Date(),who.userId]]);
    return {updated:true};
  }finally{lock.releaseLock();}
}
