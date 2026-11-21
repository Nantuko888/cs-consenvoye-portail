/** RTN Tableaux — module additif à placer dans le PROJET Apps Script Formation.
 * NE PAS créer de nouveau doPost : raccorder ces deux actions dans le routeur
 * Formation_Bridge_POST.gs existant, voir README tableaus.
 * Le serveur recalcule le score, contrôle la session et sépare les données des QCM.
 */
const RTN_TABLEAUX_SOURCE='RTN-PSE-07-2026';
const RTN_TABLEAUX_ANSWERS=[["T01",["Rouge","Bleu","Bleu"]],["T02",["Nature et circonstances","Nombre de victimes","Moyens complémentaires"]],["T03",["Arrêter l’hémorragie","Libérer les voies aériennes","RCP"]],["T04",["12","20","20","30","30","40","40","60"]],["T05",["60","100","70","140","100","160","120","160"]],["T06",["Membre supérieur droit","Membre inférieur droit","Membre supérieur gauche","Membre inférieur gauche"]],["T07",["4","3","2","1","5","4","6","4","3","15"]],["T08",["Rectale","Rectale","Buccale"]],["T09",["Tête","Cou","Thorax"]],["T10",["5","3","15","4","7"]],["T11",["9","15","15","6","9","9","1","6"]],["T12",["94","98","89","94"]],["T13",["En avant","10","Traumatisme du crâne","Traumatisme de la face"]],["T14",["PLS","RCP","Insufflations"]],["T15",["18","26","350","500","8","12","200","350","6","8","200","250","6","120","150"]],["E01",["5","10","15"]],["E02",["Asymétrie faciale","Faiblesse d’un membre supérieur","Trouble de la parole","10"]],["E03",["0","4","0","10"]],["E04",["100","120"]],["E05",["30","120","15"]],["E06",["10","5"]]];
const RTN_TABLEAUX_COLUMNS={
 TableauxSeances:['seance_id','utilisateur_id','date_debut','date_fin','nombre_tableaux','nombre_reponses','bonnes_reponses','taux_reussite','version_source','client_id'],
 TableauxReponses:['reponse_id','seance_id','utilisateur_id','tableau_id','index_case','reponse_donnee','reponse_attendue','correcte','horodatage','ordre_tableau']
};
function rtnTableauxSheet_(name){
 const ss=SpreadsheetApp.getActiveSpreadsheet();
 let sh=ss.getSheetByName(name);
 if(!sh){sh=ss.insertSheet(name);sh.appendRow(RTN_TABLEAUX_COLUMNS[name]);}
 const h=RTN_TABLEAUX_COLUMNS[name],given=sh.getRange(1,1,1,h.length).getValues()[0];
 if(h.some((v,i)=>v!==given[i]))throw Error('En-têtes incorrects dans '+name);
 return sh;
}
function rtnTableauxRows_(name){
 const sh=rtnTableauxSheet_(name),last=sh.getLastRow();
 return last<2?[]:sh.getRange(2,1,last-1,RTN_TABLEAUX_COLUMNS[name].length).getValues();
}
function rtnTableauxCorrect_(given,expected){
 if(given===null||given===undefined||String(given).trim()==='')return false;
 const a=String(given).trim(),b=String(expected).trim();
 if(/^-?\d+(?:\.\d+)?$/.test(b))return /^-?\d+(?:[.,]\d+)?$/.test(a)&&Number(a.replace(',','.'))===Number(b);
 return a===b;
}
function rtnTableauxSave_(payloadJson,session){
 const identity=rtnRequireSession_(session);
 const userId=rtnUserId_(identity);
 const p=typeof payloadJson==='string'?JSON.parse(payloadJson):payloadJson;
 if(!p||!Array.isArray(p.results)||p.results.length<1||p.results.length>40)throw Error('Séance de tableaux invalide');
 const refs=new Map(RTN_TABLEAUX_ANSWERS);
 const now=new Date(),sid='TAB_'+Utilities.getUuid();
 const clientId=String(p.client_id||'').trim();
 if(!/^[a-zA-Z0-9_-]{20,100}$/.test(clientId))throw Error('Identifiant de séance invalide');
 let entries=[],scores=[],right=0,total=0;
 p.results.forEach((table,i)=>{
   if(!table||!refs.has(String(table.id))||!Array.isArray(table.answers))throw Error('Tableau inconnu ou réponses invalides');
   const expected=refs.get(String(table.id));
   if(table.answers.length!==expected.length)throw Error('Nombre de réponses invalide pour '+table.id);
   let score=0;
   expected.forEach((exp,j)=>{
     const val=String(table.answers[j]??'').slice(0,300);
     const ok=rtnTableauxCorrect_(val,exp);
     score+=Number(ok);right+=Number(ok);total++;
     entries.push([Utilities.getUuid(),sid,userId,table.id,j,val,String(exp),ok,now,i]);
   });
   scores.push({id:table.id,correct:score,total:expected.length});
 });
 if(entries.length>1000)throw Error('Trop de cases');
 const lock=LockService.getScriptLock();lock.waitLock(20000);
 try{
   const seances=rtnTableauxSheet_('TableauxSeances'),answers=rtnTableauxSheet_('TableauxReponses');
   const existing=rtnTableauxRows_('TableauxSeances').find(r=>String(r[1])===userId&&String(r[9])===clientId);
   if(existing)return {saved:true,duplicate:true,sid:String(existing[0]),correct:Number(existing[6]),total:Number(existing[5]),pct:Math.round(Number(existing[7])*100)};
   // Écrire d'abord les réponses, puis la séance de synthèse.
   answers.getRange(answers.getLastRow()+1,1,entries.length,entries[0].length).setValues(entries);
   seances.appendRow([sid,userId,now,now,p.results.length,total,right,total?right/total:0,RTN_TABLEAUX_SOURCE,clientId]);
 }finally{lock.releaseLock();}
 return {saved:true,sid,correct:right,total,pct:total?Math.round(100*right/total):0,scores};
}
function rtnTableauxHistory_(session){
 const identity=rtnRequireSession_(session),userId=rtnUserId_(identity);
 const rows=rtnTableauxRows_('TableauxSeances').filter(r=>String(r[1])===userId).slice(-15).reverse();
 const ids=new Set(rows.map(r=>String(r[0])));
 if(!rows.length)return {sessions:[]};
 const groups=new Map();
 for(const row of rtnTableauxRows_('TableauxReponses')){
   if(String(row[2])!==userId||!ids.has(String(row[1])))continue;
   const sid=String(row[1]),itemId=String(row[3]),order=Number(row[9])||0;
   if(!groups.has(sid))groups.set(sid,new Map());
   const byTable=groups.get(sid);
   if(!byTable.has(order))byTable.set(order,{id:itemId,order,answers:[],mistakes:[],correct:0,total:0});
   const r=byTable.get(order),index=Number(row[4]),given=String(row[5]??''),expected=String(row[6]??'');
   const good=row[7]===true||String(row[7]).toLowerCase()==='true';
   r.answers[index]=given;r.correct+=Number(good);r.total++;
   if(!good)r.mistakes.push({index,given:given||'Non renseigné',expected});
 }
 }
 return {sessions:rows.map(r=>({
   sid:String(r[0]),date:r[3] instanceof Date?r[3].toISOString():String(r[3]),
   n:Number(r[4]),total:Number(r[5]),correct:Number(r[6]),
   client_id:String(r[9]||''),
   results:Array.from((groups.get(String(r[0]))||new Map()).values()).sort((a,b)=>a.order-b.order)
 }))};
}
