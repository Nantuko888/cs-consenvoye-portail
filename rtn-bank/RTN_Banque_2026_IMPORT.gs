/**
 * RTN — import de la nouvelle banque de 119 QCM (13 chapitres).
 * Dépend du classeur Formation existant, pas de nouveau doPost.
 * Fonction à exécuter UNE FOIS après ajout au projet Apps Script : rtnInstallerBanque2026
 * Préserve les onglets Seances / Reponses / Progression, archive le contenu Questions.
 */
const RTN_BANQUE_2026_SOURCE =
  'https://raw.githubusercontent.com/Nantuko888/cs-consenvoye-portail/main/rtn-bank/questions.json';
const RTN_BANQUE_2026_ENTETES = [
  'question_id','chapitre_id','fiche_ref','page_pdf','niveau','type','enonce',
  'option_A','option_B','option_C','option_D','bonnes_reponses',
  'explication','actif','version_source'
];

function rtnLireBanque2026_() {
  const resp = UrlFetchApp.fetch(RTN_BANQUE_2026_SOURCE, {
    muteHttpExceptions: true, followRedirects: true
  });
  if (resp.getResponseCode() !== 200) {
    throw Error('Téléchargement de la banque RTN impossible (HTTP ' + resp.getResponseCode() + ')');
  }
  const raw = resp.getContentText('UTF-8');
  if (raw.length > 350000) throw Error('Fichier de banque trop volumineux');
  const b = JSON.parse(raw);
  if (b.version !== 'RTN-PSE-07-2026' ||
      !Array.isArray(b.questions) || b.questions.length !== 119) {
    throw Error('Banque RTN inattendue (version ou nombre de questions)');
  }
  const seen = {};
  const rows = b.questions.map((q, i) => {
    const id = String(q.id || '');
    const chap = String(q.id || '').slice(6, 8);
    if (!/^RTN26-(0[1-9]|1[0-3])-\d{3}$/.test(id) || seen[id]) {
      throw Error('Identifiant invalide/doublon à la question ' + (i + 1));
    }
    seen[id] = true;
    if (chap !== String(q.ref || '').slice(0, 2) ||
        !/^(Facile|Moyen|Expert)$/.test(String(q.level || '')) ||
        !Array.isArray(q.options) || q.options.length !== 4 ||
        !Number.isInteger(q.answer) || q.answer < 0 || q.answer > 3 ||
        !Number.isInteger(q.page) || q.page < 9 || q.page > 389 ||
        String(q.q || '').trim().length < 20 ||
        String(q.why || '').trim().length < 15 ||
        q.options.some(x => !String(x || '').trim())) {
      throw Error('Question RTN incorrecte : ' + id);
    }
    return [id,chap,q.ref,q.page,q.level,'Opérationnel',q.q,
      q.options[0],q.options[1],q.options[2],q.options[3],
      'ABCD'[q.answer],q.why,true,b.version];
  });
  const allChap = new Set(rows.map(r => r[1]));
  if (allChap.size !== 13) throw Error('Des chapitres manquent');
  return rows;
}

function rtnVerifierBanque2026() {
  const rows = rtnLireBanque2026_();
  const byChapter = {};
  rows.forEach(r => byChapter[r[1]] = (byChapter[r[1]] || 0) + 1);
  const result = {ok:true,total:rows.length,chapitres:byChapter};
  Logger.log(JSON.stringify(result));
  return result;
}

function rtnInstallerBanque2026() {
  const incoming = rtnLireBanque2026_(); // Vérifier AVANT modification.
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw Error('Ouvre ce script depuis le classeur Google Sheets FORMATION');
  const sh = ss.getSheetByName('Questions');
  if (!sh) throw Error('Onglet Questions absent');
  const header = sh.getRange(1,1,1,15).getValues()[0];
  if (RTN_BANQUE_2026_ENTETES.some((x,i) => header[i] !== x)) {
    throw Error('En-têtes incompatibles avec le classeur Questions');
  }
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const last = sh.getLastRow();
    const old = last > 1 ? sh.getRange(2,1,last - 1,15).getValues() : [];
    const oldIds = {};
    old.forEach((row, i) => {
      const id = String(row[0] || '');
      if (id) {
        if (oldIds[id] !== undefined) throw Error('Identifiant en double dans Questions : ' + id);
        oldIds[id] = i;
      }
    });
    const hasNewBank = incoming.every(r => oldIds[r[0]] !== undefined);
    const needsChange = old.some(r => String(r[0] || '') &&
      (String(r[0]).startsWith('RTN26-') ? r[13] !== true : r[13] !== false)) || !hasNewBank;
    if (!needsChange) return {ok:true,alreadyInstalled:true,created:0,archive:''};

    // Sauvegarde dans le même classeur, AVANT toute modification.
    const stamp = Utilities.formatDate(new Date(),Session.getScriptTimeZone(),'yyyyMMdd_HHmmss');
    const archive = sh.copyTo(ss).setName('Questions_BACKUP_' + stamp);
    archive.hideSheet();

    // Réécrit la banque de questions sans toucher aux historiques personnels.
    const merged = old.map(r => r.slice());
    merged.forEach(r => { if (String(r[0] || '')) r[13] = false; });
    incoming.forEach(r => {
      if (oldIds[r[0]] !== undefined) merged[oldIds[r[0]]] = r;
      else merged.push(r);
    });
    if (sh.getMaxRows() < merged.length + 1) {
      sh.insertRowsAfter(sh.getMaxRows(), merged.length + 1 - sh.getMaxRows());
    }
    if (merged.length) sh.getRange(2,1,merged.length,15).setValues(merged);
    const chapSheet=ss.getSheetByName('Chapitres');
    if(chapSheet && chapSheet.getLastRow()>1){
      const chapVals=chapSheet.getRange(2,1,chapSheet.getLastRow()-1,6).getValues();
      chapVals.forEach((r,i)=>{
        const ch=String(r[0]).padStart(2,'0');
        const n=incoming.filter(q=>q[1]===ch).length;
        if(n) chapSheet.getRange(i+2,5,1,2).setValues([[n,'Banque opérationnelle RTN 07-2026']]);
      });
    }
    SpreadsheetApp.flush();
    const result={ok:true,created:incoming.filter(r=>oldIds[r[0]]===undefined).length,
      activated:incoming.length,disabledOld:old.filter(r=>String(r[0]||'')&&!String(r[0]).startsWith('RTN26-')).length,
      archive:archive.getName()};
    Logger.log(JSON.stringify(result));
    return result;
  } finally { lock.releaseLock(); }
}
