// Remplacer UNIQUEMENT la fonction rtnAccess_(email) de Code.gs RTN.
// Vérification du credential Google inchangée dans rtnConnect().
// Les contrôles d'autorisation restent appliqués à chaque dashboard/sauvegarde.
function rtnAccess_(email) {
  const sh = SpreadsheetApp.openById(RTN_SECURITY.PORTAL_SPREADSHEET_ID).getSheetByName('Acces');
  if (!sh) throw Error('Feuille Acces du portail introuvable');
  const rows = sh.getDataRange().getValues();
  if (rows.length < 2) return null;
  const normalized = h => String(h || '').trim().toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
  const cols = rows[0].map(normalized);
  const iEmail = cols.indexOf('email');
  const iFormation = cols.indexOf('formation');
  const iNom = cols.indexOf('nom');
  if (iEmail < 0 || iFormation < 0) {
    throw Error('Colonnes email ou formation manquantes dans Acces');
  }
  const verifiedEmail = String(email || '').trim().toLowerCase();
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][iEmail] || '').trim().toLowerCase() !== verifiedEmail) continue;
    if (String(rows[i][iFormation] ?? '').trim() !== '1') return null;
    return {email: verifiedEmail, nom: iNom >= 0 ? String(rows[i][iNom] || '').trim() : '', allowed: true};
  }
  return null;
}
