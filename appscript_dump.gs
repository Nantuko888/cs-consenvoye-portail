/*********** CS CONSENVOYE — API JSONP UNIQUE (EQUIPES + ORGA + PLANNING) ***********/
// ✅ ID DU GOOGLE SHEET (PAS L'URL)
const SPREADSHEET_ID = "1z9jr9bBt89MwUzRYHpVEhPditJ5Xy528dvNco4CFMZk";

// Onglets
const TAB_EQUIPES = "Équipes";
const TAB_DIRECTION = "Direction";
const TAB_POLES = "Pôles";
const TAB_SOUSPOLES = "SousPôles";
const TAB_MEMBRES = "Membres";
const TAB_PLANNING_EVENTS = "PlanningEvents";
const TAB_PLANNING_CATEGORIES = "PlanningCategories";
const TAB_DOCUMENTS = "Documents";
const TAB_VSAV = "DesinfectionVSAV"; // EXACT
const TAB_PLANNING_YEARS = "PlanningYears";

/** ================== API JSONP UNIQUE ================== **/
function doGet(e) {
  const cb = (e?.parameter?.callback) || "callback";
  const view = ((e?.parameter?.view) || "equipes").toString().toLowerCase();
  if (view === "auth_check") return out_(authCheck_(e), cb);

  // ✅ NO-CACHE: ?nocache=1 -> ignore le cache Apps Script
  const nocache = String((e?.parameter?.nocache) || "") === "1";

  try {
    if (view === "equipes" || view === "teams") return out_(getEquipes_(), cb);
    if (view === "org" || view === "orga" || view === "organigramme") return out_(getOrg_(), cb);

    if (view === "planning_year" || view === "planningyear") {
      const year = Number((e?.parameter?.year) || new Date().getFullYear());
      return out_(getPlanningYear_(year, nocache), cb);
    }

    if (view === "planning_categories" || view === "planningcats") {
      return out_(getPlanningCategories_(nocache), cb);
    }

    // ✅ Planning Years (liste + création)
    if (view === "planning_years" || view === "planning_years_list" || view === "planningyears") {
      return out_(getPlanningYears_(nocache), cb);
    }
    if (view === "planning_year_create" || view === "planning_create_year") {
      return out_(planningYearCreate_(e), cb);
    }

    if (view === "planning_add" || view === "planning_add_event") {
  return out_(planningAddEvent_(e), cb);
}
if (view === "planning_delete" || view === "planning_delete_event") {
  return out_(planningDeleteEvent_(e), cb);
}
    if (view === "documents" || view === "docs") {
  return out_(getDocuments_(), cb);
}
// ✅ Désinfection VSAV
if (view === "vsav_get" || view === "vsav" || view === "desinfectionvsav") {
  return out_(getVsav_(), cb);
}
// ✅ Désinfection VSAV if (view === "vsav_get" || view === "vsav" || view === "desinfectionvsav") { return out_(getVsav_(), cb); } if (view === "vsav_set_agent") { return out_(vsavSetAgent_(e), cb); } if (view === "vsav_unset_agent") { return out_(vsavUnsetAgent_(e), cb); }
if (view === "vsav_set_agent") {
  return out_(vsavSetAgent_(e), cb);
}
if (view === "vsav_unset_agent") {
  return out_(vsavUnsetAgent_(e), cb);
}
if (view === "vsav_set_fait") {
  return out_(vsavSetFait_(e), cb);
}

if (view === "vsav_set_nonfait") {
  return out_(vsavSetNonfait_(e), cb);
}
    // fallback : évite "view inconnue" -> la page ne casse pas
    return out_(getEquipes_(), cb);

  } catch (err) {
    return out_({ ok:false, error:String(err && err.message ? err.message : err) }, cb);
  }
}

/** ================== EQUIPES ================== **/
function getEquipes_(){
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sh = ss.getSheetByName(TAB_EQUIPES);
  if (!sh) return { ok:false, error:`Onglet introuvable: ${TAB_EQUIPES}` };

  const values = sh.getDataRange().getValues();
  if (values.length < 2) {
    return { ok:true, teams:{ "1":[], "2":[] }, updatedAt:new Date().toISOString() };
  }

  const headers = values[0].map(h => normHeader_(h));
  const idxEquipe = headers.indexOf("equipe");
  const idxFonct = headers.indexOf("fonction");
  const idxNom = headers.indexOf("nom");

  let idxComp = headers.indexOf("comp");
  if (idxComp === -1) idxComp = headers.indexOf("competences");

  if (idxEquipe === -1 || idxFonct === -1 || idxNom === -1) {
    return {
      ok:false,
      error:`Headers attendus ligne 1 : equipe | fonction | nom | (comp/competences). Reçu: ${headers.join(", ")}`
    };
  }

  const teams = { "1":[], "2":[] };

  for (let i=1; i<values.length; i++){
    const row = values[i];
    if (row.every(c => String(c||"").trim()==="")) continue;

    const eq = String(row[idxEquipe]||"").trim(); // "1" ou "2"
    const f = String(row[idxFonct]||"").trim();
    const n = String(row[idxNom]||"").trim();
    const c = (idxComp>-1) ? String(row[idxComp]||"").trim() : "";

    if (!eq || !n) continue;
    if (!teams[eq]) teams[eq] = [];
    teams[eq].push({ fonction:f, nom:n, comp:c });
  }

  // ✅ TRI HIÉRARCHIQUE PAR FONCTION
  const normText = (v) => {
    const s = (v==null) ? "" : String(v).trim();
    return s
      .toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/['’]/g, "")
      .replace(/\s+/g, " ");
  };

  const rank = (fonction) => {
    const f = normText(fonction);
    if (f.includes("resp")) return 0;
    if (f.includes("adj")) return 1;
    if (/\bca\b/.test(f)) return 2;
    if (/\bce\b/.test(f)) return 3;
    if (f.includes("equip")) return 4;
    if (f.includes("isp")) return 5;
    if (f.includes("appr") || /\bapp\b/.test(f)) return 6;
    return 999;
  };

  Object.keys(teams).forEach(k => {
    teams[k].sort((a,b) => rank(a.fonction) - rank(b.fonction));
  });

  return { ok:true, teams, updatedAt:new Date().toISOString() };
}

/** ================== ORGA ================== **/
function getOrg_(){
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

  const dirT = readTable_(ss, TAB_DIRECTION);
  const polesT= readTable_(ss, TAB_POLES);
  const sousT = readTable_(ss, TAB_SOUSPOLES);
  const memT = readTable_(ss, TAB_MEMBRES);

  const pick_ = (r, keys) => {
    for (const k of keys){
      const v = r[k];
      if (v !== undefined && v !== null && String(v).trim() !== "") return String(v).trim();
    }
    return "";
  };
  const norm_ = s => String(s || "").trim().toLowerCase();

  const direction = { chef:"—", adj1:"—", adj2:"—" };
  for (const r of dirT.rows){
    const role = norm_(pick_(r, ["fonction","role","function"]));
    const nom = pick_(r, ["nom","name"]);
    if (!nom) continue;

    if (role.includes("chef")) direction.chef = nom;
    else if (role.includes("adj1") || role.includes("1") || role.includes("prem")) direction.adj1 = nom;
    else if (role.includes("adj2") || role.includes("2") || role.includes("deux")) direction.adj2 = nom;
  }

  const sousByPole = new Map();
  const spToPole = new Map();

  for (const r of sousT.rows){
    const poleId = pick_(r, ["pole_id","idpole","id_pole","idpole"]);
    const spId = pick_(r, ["id","souspole_id","idsouspole","id_souspole","idsouspole"]);
    const lib = pick_(r, ["libelle","label"]);
    const ordre = Number(pick_(r, ["ordre","order"])) || 9999;

    if (!poleId || !spId) continue;

    spToPole.set(spId, poleId);
    if (!sousByPole.has(poleId)) sousByPole.set(poleId, []);
    sousByPole.get(poleId).push({ id: spId, libelle: lib, ordre });
  }
  for (const arr of sousByPole.values()) arr.sort((a,b)=>a.ordre-b.ordre);

  const memByKey = new Map();
  for (const r of memT.rows){
    const spId = pick_(r, ["souspole_id","idsouspole","id_souspole","idsouspole","id"]);
    const poleId = pick_(r, ["pole_id","idpole","id_pole"]) || spToPole.get(spId) || "";
    if (!poleId || !spId) continue;

    const key = poleId + "|" + spId;
    const fonction = pick_(r, ["fonction","function","role"]);
    const nom = pick_(r, ["nom","name"]);
    const ordre = Number(pick_(r, ["ordre","order"])) || 9999;
    if (!nom) continue;

    if (!memByKey.has(key)) memByKey.set(key, []);
    memByKey.get(key).push({ ordre, fonction, nom });
  }
  for (const arr of memByKey.values()) arr.sort((a,b)=>a.ordre-b.ordre);

  const poles = polesT.rows
    .map(r=>{
      const id = pick_(r, ["id","idpole","pole_id","id_pole"]);
      const label = pick_(r, ["libelle","label"]);
      const color = pick_(r, ["couleur","color"]);
      const ordre = Number(pick_(r, ["ordre","order"])) || 9999;
      if (!id || !label) return null;

      const subpoles = (sousByPole.get(id) || []).map(sp=>{
        const key = id + "|" + sp.id;
        const membres = (memByKey.get(key) || []).map(m=>{
          const spLabel = norm_(sp.libelle);
          if (id === "amicale" && spLabel.includes("bureau") && m.fonction){
            return `${m.fonction} : ${m.nom}`;
          }
          return m.nom;
        });
        return { label: sp.libelle, membres };
      });

      return { id, label, color, ordre, subpoles };
    })
    .filter(Boolean)
    .sort((a,b)=>a.ordre-b.ordre);

  return { ok:true, direction, poles, updatedAt:new Date().toISOString() };
}

/** ================== OUTILS ================== **/
function out_(obj, cb){
  return ContentService
    .createTextOutput(`${cb}(${JSON.stringify(obj)});`)
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}

function readTable_(ss, name){
  const sh = ss.getSheetByName(name);
  if(!sh) throw new Error(`Onglet introuvable: ${name}`);

  const v = sh.getDataRange().getValues();
  if(v.length < 2) return { rows:[] };

  const headers = v[0].map(h => normHeader_(h));
  const rows = [];

  for(let i=1;i<v.length;i++){
    const row = v[i];
    if(row.every(c=>String(c||"").trim()==="")) continue;

    const o = {};
    for(let j=0;j<headers.length;j++){
      const key = headers[j];
      if(key) o[key] = row[j];
    }
    rows.push(o);
  }
  return { rows };
}

function normHeader_(h){
  return String(h||"")
    .trim()
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}
function getNameFromAcces_(email){
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sh = ss.getSheetByName("Acces");
  if(!sh) return "";

  const v = sh.getDataRange().getValues();
  // headers: email | role | nom
  for(let i=1;i<v.length;i++){
    const e = String(v[i][0]||"").trim().toLowerCase();
    if(e && e === String(email||"").trim().toLowerCase()){
      return String(v[i][2]||"").trim(); // col C = nom
    }
  }
  return "";
}


/**
 * GET: ?view=planning_year&year=2026&nocache=1&callback=cb
 */
function getPlanningYear_(year, nocache){

  year = Number(year);
  if (!Number.isFinite(year) || year < 2000 || year > 2100){
    return { ok:false, error:"Paramètre year invalide" };
  }

  const cache = CacheService.getScriptCache();
  const cacheKey = "planning_year_" + year;

  // ✅ cache uniquement si nocache != 1
  if (!nocache){
    const cached = cache.get(cacheKey);
    if (cached){
      try { return JSON.parse(cached); } catch(e){}
    }
  }

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const t = readTable_(ss, TAB_PLANNING_EVENTS);

  const pick_ = (r, keys) => {
    for (const k of keys){
      const v = r[k];
      if (v !== undefined && v !== null && String(v).trim() !== "") return v;
    }
    return "";
  };

  const normalizeDate_ = (v) => {
    // Date native Sheets
    if (v instanceof Date && !isNaN(v.getTime())){
      const y = v.getFullYear();
      const m = String(v.getMonth()+1).padStart(2,"0");
      const d = String(v.getDate()).padStart(2,"0");
      return `${y}-${m}-${d}`;
    }

    const s = String(v || "").trim();
    if (!s) return "";

    // déjà bon
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

    // dd/mm/yyyy ou d/m/yyyy
    const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (m){
      const dd = String(m[1]).padStart(2,"0");
      const mm = String(m[2]).padStart(2,"0");
      const yy = m[3];
      return `${yy}-${mm}-${dd}`;
    }

    // on renvoie tel quel (au cas où)
    return s;
  };

  const events = [];

  for (const r of t.rows){
    const date = normalizeDate_(pick_(r, ["date","jour","day"]));
    if (!date) continue;

    // filtre année
    if (!date.startsWith(String(year) + "-")) continue;

    const start = String(pick_(r, ["start","debut","heure_debut","heuredebut","hdebut"]) || "").trim();
    const end = String(pick_(r, ["end","fin","heure_fin","heurefin","hfin"]) || "").trim();

    let title = String(pick_(r, ["title","titre","libelle","label","evenement","event"]) || "").trim();
    const category = String(pick_(r, ["category","categorie","cat"]) || "").trim();
    const details = String(pick_(r, ["details","detail","commentaire","remarque","notes","note"]) || "").trim();
    const location = String(pick_(r, ["location","lieu","place"]) || "").trim();
    const event_id = String(pick_(r, ["event_id","id","eventid"]) || "").trim();

    // ✅ IMPORTANT :
    // Avant, on jetait la ligne si title était vide.
    // Maintenant on garde si (title OU details) existe, pour que les "notes" remontent.
    if (!title && !details) continue;

    // ✅ si note sans titre -> titre par défaut
    if (!title && details) title = "Note";

    events.push({ event_id, date, start, end, title, category, details, location });

  events.sort((a,b) => (
    a.date.localeCompare(b.date) ||
    String(a.start||"").localeCompare(String(b.start||""))
  ));

  const out = { ok:true, year, events, updatedAt:new Date().toISOString() };

  if (!nocache){
    try { cache.put(cacheKey, JSON.stringify(out), 600); } catch(e){}
  }

  return out;
}
}


/**
 * GET: ?view=planning_categories&nocache=1&callback=cb
 */
function getPlanningCategories_(nocache){
  const cache = CacheService.getScriptCache();
  const cacheKey = "planning_categories";

  if (!nocache){
    const cached = cache.get(cacheKey);
    if (cached){
      try { return JSON.parse(cached); } catch(e){}
    }
  }

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const t = readTable_(ss, TAB_PLANNING_CATEGORIES);

  const pick_ = (r, keys) => {
    for (const k of keys){
      const v = r[k];
      if (v !== undefined && v !== null && String(v).trim() !== "") return v;
    }
    return "";
  };

  const categories = [];
  for (const r of t.rows){
    const category = String(pick_(r, ["category","categorie","cat","nom"]) || "").trim();
    if (!category) continue;
    const color = String(pick_(r, ["color","couleur"]) || "").trim() || "rgba(255,255,255,.30)";
    const order = Number(pick_(r, ["order","ordre"]) || 9999) || 9999;
    categories.push({ category, color, order });
  }

  categories.sort((a,b)=> (a.order - b.order) || a.category.localeCompare(b.category));

  const out = { ok:true, categories, updatedAt:new Date().toISOString() };
  if (!nocache){
    try { cache.put(cacheKey, JSON.stringify(out), 600); } catch(e){}
  }
  return out;
}

function nowIso_(){
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd'T'HH:mm:ss");
}

// ID unique simple & robuste
function makeEventId_(){
  const ts = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyyMMdd_HHmmss");
  const rnd = Math.random().toString(16).slice(2, 8);
  return `evt_${ts}_${rnd}`;
}

/**
 * GET: ?view=planning_years_list&nocache=1&callback=cb
 */
function getPlanningYears_(nocache){
  const cache = CacheService.getScriptCache();
  const cacheKey = "planning_years_v1";
  if (!nocache){
    const cached = cache.get(cacheKey);
    if (cached){
      try { return JSON.parse(cached); } catch(e){}
    }
  }

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sh = ss.getSheetByName(TAB_PLANNING_YEARS);
  if (!sh) return { ok:false, error:`Onglet introuvable: ${TAB_PLANNING_YEARS}` };

  const v = sh.getDataRange().getValues();
  if (!v || v.length < 2){
    const outEmpty = { ok:true, years:[], updatedAt:new Date().toISOString() };
    if (!nocache){ try{ cache.put(cacheKey, JSON.stringify(outEmpty), 600); }catch(e){} }
    return outEmpty;
  }

  const headers = v[0].map(h => normHeader_(h));
  const iYear = headers.indexOf("year");
  const iStatus = headers.indexOf("status");

  if (iYear === -1) return { ok:false, error:"Header manquant: year" };

  const years = [];
  for (let i=1;i<v.length;i++){
    const row = v[i];
    if (row.every(c => String(c||"").trim()==="")) continue;

    const year = Number(String(row[iYear]||"").trim());
    if (!Number.isFinite(year)) continue;

    const status = (iStatus !== -1) ? String(row[iStatus]||"").trim().toLowerCase() : "active";
    // on ne filtre pas trop : le front décidera (active/archived)
    years.push({ year, status: status || "active" });
  }

  years.sort((a,b)=>a.year-b.year);

  const out = { ok:true, years, updatedAt:new Date().toISOString() };
  if (!nocache){
    try { cache.put(cacheKey, JSON.stringify(out), 600); } catch(e){}
  }
  return out;
}

/**
 * GET: ?view=planning_year_create&year=2027&email=...&callback=cb
 * admin requis
 */
function planningYearCreate_(e){
  const lock = LockService.getScriptLock();
  try{
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

    const email = String(e?.parameter?.email || "").trim().toLowerCase();
    if(!email) return { ok:false, error:"email manquant" };

    const auth = authCheck_({ parameter:{ email } });
    if(!auth || auth.ok !== true || auth.role !== "admin"){
      return { ok:false, error:"Accès refusé (admin requis)" };
    }

    const year = Number(String(e?.parameter?.year || "").trim());
    if(!Number.isFinite(year) || year < 2000 || year > 2100){
      return { ok:false, error:"year invalide" };
    }

    lock.waitLock(15000);

    const sh = ss.getSheetByName(TAB_PLANNING_YEARS);
    if (!sh) return { ok:false, error:`Onglet introuvable: ${TAB_PLANNING_YEARS}` };

    const v = sh.getDataRange().getValues();
    const headers = (v[0] || []).map(h => normHeader_(h));
    const iYear = headers.indexOf("year");
    const iStatus = headers.indexOf("status");
    const iCreatedAt = headers.indexOf("created_at");
    const iCreatedBy = headers.indexOf("created_by");

    if (iYear === -1) return { ok:false, error:"Header manquant: year" };

    // déjà présent ?
    for(let r=1;r<v.length;r++){
      const y = Number(String(v[r][iYear]||"").trim());
      if (y === year){
        return { ok:true, created:false, exists:true, year };
      }
    }

    const row = new Array(headers.length).fill("");
    row[iYear] = year;
    if (iStatus !== -1) row[iStatus] = "active";
    if (iCreatedAt !== -1) row[iCreatedAt] = nowIso_();
    if (iCreatedBy !== -1) row[iCreatedBy] = email;

    sh.appendRow(row);

    // purge cache
    try { CacheService.getScriptCache().remove("planning_years_v1"); } catch(e){}

    return { ok:true, created:true, year, updatedAt:new Date().toISOString() };

  }catch(err){
    return { ok:false, error:String(err && err.message ? err.message : err) };
  }finally{
    try{ lock.releaseLock(); }catch(e){}
  }
}


/** ================== COLORATION GOOGLE SHEETS (PlanningEvents) ================== **/
function colorPlanningEvents() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const shEvents = ss.getSheetByName(TAB_PLANNING_EVENTS);
  const shCats = ss.getSheetByName(TAB_PLANNING_CATEGORIES);
  if (!shEvents || !shCats) return;

  // --- Lire PlanningCategories (category -> color) ---
  const catsRange = shCats.getDataRange();
  const cats = catsRange.getValues();
  if (cats.length < 2) return;

  const hC = cats[0].map(x => String(x).trim().toLowerCase());
  const iCat = hC.indexOf("category");
  const iColor = hC.indexOf("color");
  if (iCat === -1 || iColor === -1) return;

  const map = new Map();
  for (let i=1;i<cats.length;i++){
    const r = cats[i];
    const k = String(r[iCat] || "").trim().toLowerCase();
    const col = String(r[iColor] || "").trim();
    if (k && col) map.set(k, col);
  }

  // --- Lire PlanningEvents ---
  const range = shEvents.getDataRange();
  const values = range.getValues();
  if (values.length < 2) return;

  const headers = values[0].map(x => String(x).trim().toLowerCase());
  const idxCategory = headers.indexOf("category");
  if (idxCategory === -1) return;

  // Coloration A:G (7 colonnes) ou moins si la feuille a moins
  const lastCol = Math.min(range.getNumColumns(), 7);

  // ✅ Optimisation: prépare un tableau de couleurs (1 ligne = 1 tableau [col...])
  const bg = [];
  const fg = [];

  // ligne 1 (headers) : on ne touche pas
  bg.push(new Array(lastCol).fill(null));
  fg.push(new Array(lastCol).fill(null));

  for (let r = 2; r <= values.length; r++) {
    const cat = String(values[r-1][idxCategory] || "").trim().toLowerCase();
    const color = map.get(cat);

    if (color) {
      bg.push(new Array(lastCol).fill(color));
      fg.push(new Array(lastCol).fill("#ffffff"));
    } else {
      bg.push(new Array(lastCol).fill(null));
      fg.push(new Array(lastCol).fill(null));
    }
  }

  shEvents.getRange(1, 1, bg.length, lastCol).setBackgrounds(bg);
  shEvents.getRange(1, 1, fg.length, lastCol).setFontColors(fg);
}

/**
 * ✅ Auto-coloration
 * - Recolore dès que tu modifies PlanningEvents ou PlanningCategories.
 * - Si tu veux pas d’auto: supprime cette fonction, ou laisse mais sans trigger.
 */
function onEdit(e){
  try{
    const sh = e && e.range && e.range.getSheet ? e.range.getSheet() : null;
    if(!sh) return;

    const name = sh.getName();
    if (name === TAB_PLANNING_EVENTS || name === TAB_PLANNING_CATEGORIES){
      colorPlanningEvents();
    }
  }catch(err){
    // silencieux
  }
}
function getDocuments_(){
  const cache = CacheService.getScriptCache();
  const cacheKey = "documents_v2";
  const cached = cache.get(cacheKey);
  if (cached){
    try { return JSON.parse(cached); } catch(e){}
  }

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const t = readTable_(ss, "Documents");

  const pick_ = (r, keys) => {
    for (const k of keys){
      const v = r[k];
      if (v !== undefined && v !== null && String(v).trim() !== "") return v;
    }
    return "";
  };

  const toBool_ = (v, def=true) => {
    const s = String(v ?? "").trim().toLowerCase();
    if (s === "") return def;
    if (s === "false" || s === "0" || s === "non" || s === "no") return false;
    return true;
  };

  const docs = [];
  for (const r of t.rows){
    const category = String(pick_(r, ["categorie","category","cat","categorie_document"]) || "").trim();
    const title = String(pick_(r, ["nom","title","titre","libelle","label"]) || "").trim();
    const url = String(pick_(r, ["url","lien","link"]) || "").trim();
    const enabled = toBool_(pick_(r, ["enabled","actif","active"]), true);
    const order = Number(pick_(r, ["ordre","order"]) || 9999) || 9999;

    if(!enabled) continue;
    if(!title || !url) continue;

    docs.push({ category: category || "Autre", title, url, order });
  }

  docs.sort((a,b)=>(a.order-b.order) || a.category.localeCompare(b.category) || a.title.localeCompare(b.title));

  const categories = [];
  const seen = new Set();
  for(const d of docs){
    if(!seen.has(d.category)){
      seen.add(d.category);
      categories.push(d.category);
    }
  }

  const out = { ok:true, categories, docs, updatedAt:new Date().toISOString() };
  try { cache.put(cacheKey, JSON.stringify(out), 120); } catch(e){} // 2 min
  return out;
}
function getVsav_(){
  try{
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sh = ss.getSheetByName(TAB_VSAV);
    if(!sh) return { ok:false, error:`Onglet introuvable: ${TAB_VSAV}` };

    const v = sh.getDataRange().getValues();
    if(!v || v.length < 2) return { ok:true, rows:[], updatedAt:new Date().toISOString() };

    const headers = v[0].map(h => normHeader_(h));

    const idxM = headers.indexOf("mois");
    const idxRef = headers.indexOf("referent"); // chez toi = email référent
    const idxAgent = headers.indexOf("agent"); // prénom agent
    const idxAE = headers.indexOf("agent_email"); // email agent
    const idxDate = headers.indexOf("date_validation"); // date validation
    const idxJust = headers.indexOf("justificatif"); // justificatif

    if(idxM === -1 || idxRef === -1){
      return { ok:false, error:`Headers manquants: mois / referent. Reçu: ${headers.join(", ")}` };
    }

    // ✅ Map email -> prénom depuis Acces (col A=email, col C=prenom)
    const accesMap = (()=>{
      const map = new Map();
      const shA = ss.getSheetByName("Acces");
      if(!shA) return map;
      const a = shA.getDataRange().getValues();
      for(let i=1;i<a.length;i++){
        const em = String(a[i][0]||"").trim().toLowerCase();
        const pr = String(a[i][2]||"").trim();
        if(em) map.set(em, pr);
      }
      return map;
    })();

    // ✅ fallback Membres: email -> "Prenom Nom" (si dispo)
    const membresMap = (()=>{
      const map = new Map();
      const shM = ss.getSheetByName(TAB_MEMBRES);
      if(!shM) return map;
      const m = shM.getDataRange().getValues();
      if(!m || m.length < 2) return map;

      const h = m[0].map(x => normHeader_(x));
      const iEmail = h.indexOf("email");
      const iPrenom = h.indexOf("prenom");
      const iNom = h.indexOf("nom");
      if(iEmail === -1) return map;

      for(let i=1;i<m.length;i++){
        const em = String(m[i][iEmail]||"").trim().toLowerCase();
        if(!em) continue;
        const pr = (iPrenom !== -1) ? String(m[i][iPrenom]||"").trim() : "";
        const no = (iNom !== -1) ? String(m[i][iNom]||"").trim() : "";
        const full = (pr + " " + no).trim();
        if(full) map.set(em, full);
      }
      return map;
    })();

    const toIso_ = (val)=>{
      if(!val) return "";
      if(val instanceof Date && !isNaN(val.getTime())){
        return Utilities.formatDate(val, Session.getScriptTimeZone(), "yyyy-MM-dd");
      }
      const s = String(val).trim();
      if(!s) return "";
      if(/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
      const d = new Date(s);
      if(!isNaN(d.getTime())){
        return Utilities.formatDate(d, Session.getScriptTimeZone(), "yyyy-MM-dd");
      }
      return "";
    };

    const emailFallback_ = (email)=>{
      const local = String(email||"").split("@")[0] || "";
      const first = local.split(/[._-]/)[0] || local;
      return first ? (first.charAt(0).toUpperCase() + first.slice(1)) : "";
    };

    const rows = [];
    for(let i=1;i<v.length;i++){
      const r = v[i];
      if(r.every(c => String(c||"").trim()==="")) continue;

      const mois = String(r[idxM]||"").trim();

      const refEmail = String(r[idxRef]||"").trim().toLowerCase();
      const refPrenom = accesMap.get(refEmail) || "";
      const refMembres = membresMap.get(refEmail) || "";
      const referentAff = (refPrenom || refMembres || emailFallback_(refEmail)).trim();

      const agent = (idxAgent !== -1) ? String(r[idxAgent]||"").trim() : "";
      const agent_email = (idxAE !== -1) ? String(r[idxAE]||"").trim().toLowerCase() : "";

      const date_validation = (idxDate !== -1) ? toIso_(r[idxDate]) : "";
      const justificatif = (idxJust !== -1) ? String(r[idxJust]||"").trim() : "";

      // ✅ status dérivé: si date -> done ou not_done selon justificatif
      const status = date_validation ? (justificatif ? "not_done" : "done") : (justificatif ? "not_done" : "");

      rows.push({
        mois,
        referent: referentAff, // ✅ affichage propre
        referent_email: refEmail, // ✅ pour droits UI
        agent,
        agent_email,
        date_validation, // ✅ ISO YYYY-MM-DD
        justificatif,
        status
      });
    }

    return { ok:true, rows, updatedAt:new Date().toISOString() };

  }catch(err){
    return { ok:false, error:String(err && err.message ? err.message : err) };
  }
}

 
function normMonth_(s){
  return String(s||"").trim().toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g,"");
}


function toIsoDate_(val){
  if(!val) return "";
  if(Object.prototype.toString.call(val) === "[object Date]" && !isNaN(val.getTime())){
    return Utilities.formatDate(val, Session.getScriptTimeZone(), "yyyy-MM-dd");
  }
  if(typeof val === "string"){
    const s = val.trim();
    if(/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    const d = new Date(s);
    if(!isNaN(d.getTime())){
      return Utilities.formatDate(d, Session.getScriptTimeZone(), "yyyy-MM-dd");
    }
  }
  return "";
}

function emailToNameSafe_(ss, email){
  // si tu as une fonction existante, on l'utilise
  try{
    if(typeof emailToName_ === "function"){
      const n = String(emailToName_(ss, email) || "").trim();
      if(n) return n;
    }
  }catch(e){}

  // fallback propre : "pierre.venante" -> "Pierre"
  const local = String(email || "").split("@")[0] || "";
  const first = local.split(/[._-]/)[0] || local;
  return first ? (first.charAt(0).toUpperCase() + first.slice(1)) : "";
}

function buildAccesNameMap_(ss){
  const map = new Map();
  const sh = ss.getSheetByName("Acces");
  if(!sh) return map;

  const v = sh.getDataRange().getValues();
  for(let i=1;i<v.length;i++){
    const email = String(v[i][0] || "").trim().toLowerCase(); // col A
    const name = String(v[i][2] || "").trim(); // col C
    if(email) map.set(email, name);
  }
  return map;
}

/**
 * Normalise une date en "YYYY-MM-DD"
 * - si c’est un Date : ok
 * - si c’est déjà "YYYY-MM-DD" : ok
 * - si c’est "Sun Feb..." : on tente Date()
 */
function normIsoDate_(val){
  if(!val) return "";

  // Date Google Sheets
  if(val instanceof Date && !isNaN(val.getTime())){
    const y = val.getFullYear();
    const m = String(val.getMonth()+1).padStart(2,"0");
    const d = String(val.getDate()).padStart(2,"0");
    return `${y}-${m}-${d}`;
  }

  const s = String(val).trim();
  if(!s) return "";

  // Déjà ISO
  if(/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  // Essaye de parser "Sun Feb..."
  const dt = new Date(s);
  if(!isNaN(dt.getTime())){
    const y = dt.getFullYear();
    const m = String(dt.getMonth()+1).padStart(2,"0");
    const d = String(dt.getDate()).padStart(2,"0");
    return `${y}-${m}-${d}`;
  }

  return "";
}

function emailToName_(ss, email){
  try{
    const sh = ss.getSheetByName("Membres");
    if(!sh){
      return email.split("@")[0].split(".")[0].replace(/^\w/, c => c.toUpperCase());
    }

    const v = sh.getDataRange().getValues();
    if(!v || v.length < 2){
      return email.split("@")[0].split(".")[0].replace(/^\w/, c => c.toUpperCase());
    }

    const h = v[0].map(x => normHeader_(x));
    const idxEmail = h.indexOf("email");
    const idxPrenom = h.indexOf("prenom");
    const idxNom = h.indexOf("nom");

    if(idxEmail === -1){
      return email.split("@")[0].split(".")[0].replace(/^\w/, c => c.toUpperCase());
    }

    for(let i=1;i<v.length;i++){
      const em = String(v[i][idxEmail] || "").trim().toLowerCase();
      if(em === email){
        const prenom = (idxPrenom !== -1) ? String(v[i][idxPrenom] || "").trim() : "";
        const nom = (idxNom !== -1) ? String(v[i][idxNom] || "").trim() : "";
        const full = (prenom + " " + nom).trim();
        return full || email.split("@")[0].split(".")[0].replace(/^\w/, c => c.toUpperCase());
      }
    }

    return email.split("@")[0].split(".")[0].replace(/^\w/, c => c.toUpperCase());

  }catch(e){
    return email.split("@")[0].split(".")[0].replace(/^\w/, c => c.toUpperCase());
  }
}




function authCheck_(e){
  try{
    const email = String(e?.parameter?.email || "").trim().toLowerCase();
    if(!email) return { ok:false, error:"email manquant" };

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sh = ss.getSheetByName("Acces");
    if(!sh) return { ok:false, error:"onglet Acces introuvable", spreadsheetId: SPREADSHEET_ID };

    const data = sh.getDataRange().getValues();
    let found = false;
    let foundRole = "";
    let foundRow = -1;

    for(let i=1;i<data.length;i++){
      const eMail = String(data[i][0]||"").trim().toLowerCase();
      const role = String(data[i][1]||"").trim().toLowerCase();
      if(eMail && eMail === email){
        found = true;
        foundRole = role;
        foundRow = i+1; // numéro de ligne Sheets
        break;
      }
    }

    return {
      ok: found,
      email,
      role: foundRole,
      debug: {
        spreadsheetId: SPREADSHEET_ID,
        spreadsheetName: ss.getName(),
        sheetName: sh.getName(),
        lastRow: sh.getLastRow(),
        foundRow
      }
    };

  }catch(err){
    return { ok:false, error:String(err && err.message ? err.message : err), debug:{ spreadsheetId: SPREADSHEET_ID } };
  }
}

function vsavUnsetAgent_(e){
  try{
    const month = String(e?.parameter?.month || "").trim();
    const email = String(e?.parameter?.email || "").trim().toLowerCase();
    if(!month) return { ok:false, error:"month manquant" };
    if(!email) return { ok:false, error:"email manquant" };

    const lock = LockService.getScriptLock();
    lock.waitLock(15000);

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sh = ss.getSheetByName(TAB_VSAV);
    if(!sh) return { ok:false, error:`Onglet introuvable: ${TAB_VSAV}` };

    const v = sh.getDataRange().getValues();
    if(v.length < 2) return { ok:true };

    const headers = v[0].map(h => normHeader_(h));
    const idxM = headers.indexOf("mois");
    const idxA = headers.indexOf("agent");
    const idxAE = headers.indexOf("agent_email"); // IMPORTANT

    if(idxM === -1 || idxA === -1 || idxAE === -1){
      return { ok:false, error:"Headers attendus: mois | agent | agent_email" };
    }

    const mNeed = normMonth_(month);
    let rowIndex = -1;
    for(let i=1;i<v.length;i++){
      const m = normMonth_(v[i][idxM]);
      if(m && m === mNeed){ rowIndex = i; break; }
    }
    if(rowIndex === -1) return { ok:false, error:"Mois introuvable" };

    const currentEmail = String(v[rowIndex][idxAE] || "").trim().toLowerCase();
    if(!currentEmail) return { ok:true }; // déjà vide

    // sécurité : seul celui qui a pris (email) peut annuler
    if(currentEmail !== email){
      return { ok:false, error:"Tu ne peux pas annuler à la place d’un autre" };
    }

    // ✅ on vide TOUT
    sh.getRange(rowIndex+1, idxA+1).setValue("");
    sh.getRange(rowIndex+1, idxAE+1).setValue("");

    return { ok:true };

  }catch(err){
    return { ok:false, error:String(err && err.message ? err.message : err) };
  }finally{
    try{ LockService.getScriptLock().releaseLock(); }catch(e){}
  }
}



function vsavSetFait_(e){
  try{
    const month = String(e?.parameter?.month || "").trim();
    const email = String(e?.parameter?.email || "").trim().toLowerCase();
    const date = String(e?.parameter?.date || "").trim();

    if(!month || !email || !date){
      return { ok:false, error:"Paramètres manquants" };
    }

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sh = ss.getSheetByName(TAB_VSAV);
    if(!sh) return { ok:false, error:"Onglet VSAV introuvable" };

    const v = sh.getDataRange().getValues();
    if(v.length < 2) return { ok:false, error:"Feuille vide" };

    const headers = v[0].map(h => normHeader_(h));
    const idxM = headers.indexOf("mois");
    const idxDate = headers.indexOf("date_validation");
    const idxJust = headers.indexOf("justificatif");

    if(idxM === -1 || idxDate === -1 || idxJust === -1){
      return { ok:false, error:"Headers attendus: mois | date_validation | justificatif" };
    }

    for(let i=1;i<v.length;i++){
      if(String(v[i][idxM]).trim().toUpperCase() === month.toUpperCase()){
        sh.getRange(i+1, idxDate+1).setValue(date); // ✅ date validation
        sh.getRange(i+1, idxJust+1).setValue(""); // ✅ on efface le justificatif
        return { ok:true };
      }
    }

    return { ok:false, error:"Mois introuvable" };

  }catch(err){
    return { ok:false, error:String(err && err.message ? err.message : err) };
  }
}


function vsavSetNonfait_(e){
  try{
    const month = String(e?.parameter?.month || "").trim();
    const email = String(e?.parameter?.email || "").trim().toLowerCase();
    const date = String(e?.parameter?.date || "").trim(); // ✅ on récupère la date
    const justificatif = String(
      e?.parameter?.justificatif || e?.parameter?.justif || ""
    ).trim(); // ✅ tolérance

    if(!month || !email || !date || !justificatif){
      return { ok:false, error:"Paramètres manquants (month/email/date/justificatif)" };
    }

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sh = ss.getSheetByName(TAB_VSAV);
    const v = sh.getDataRange().getValues();
    const headers = v[0].map(h => normHeader_(h));

    const idxM = headers.indexOf("mois");
    const idxDate = headers.indexOf("date_validation"); // ✅ ta colonne E
    const idxJust = headers.indexOf("justificatif"); // ✅ ta colonne F

    // (optionnel) si tu as une colonne status/fait_statut
    const idxStatus = headers.indexOf("fait_statut");

    if(idxM === -1 || idxDate === -1 || idxJust === -1){
      return { ok:false, error:"Headers manquants (mois/date_validation/justificatif)" };
    }

    for(let i=1;i<v.length;i++){
      if(String(v[i][idxM]).trim().toUpperCase() === month.toUpperCase()){
        // ✅ on écrit la date dans date_validation même pour NON FAIT
        sh.getRange(i+1, idxDate+1).setValue(date);

        // ✅ justificatif
        sh.getRange(i+1, idxJust+1).setValue(justificatif);

        // ✅ statut si la colonne existe
        if(idxStatus !== -1){
          sh.getRange(i+1, idxStatus+1).setValue("not_done");
        }

        return { ok:true };
      }
    }

    return { ok:false, error:"Mois introuvable" };

  }catch(err){
    return { ok:false, error:String(err) };
  }
}
function vsavSetAgent_(e){
  const lock = LockService.getScriptLock();
  try{
    const month = String(e?.parameter?.month || "").trim();
    const email = String(e?.parameter?.email || "").trim().toLowerCase();

    if(!month) return { ok:false, error:"month manquant" };
    if(!email) return { ok:false, error:"email manquant" };

    lock.waitLock(15000);

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sh = ss.getSheetByName(TAB_VSAV);
    if(!sh) return { ok:false, error:`Onglet introuvable: ${TAB_VSAV}` };

    // ✅ prénom depuis Acces (col A=email, col C=prenom)
    const shAcces = ss.getSheetByName("Acces");
    if(!shAcces) return { ok:false, error:"Onglet Acces introuvable" };

    const a = shAcces.getDataRange().getValues();
    let prenom = "";
    for(let i=1;i<a.length;i++){
      const em = String(a[i][0]||"").trim().toLowerCase();
      if(em === email){
        prenom = String(a[i][2]||"").trim();
        break;
      }
    }
    if(!prenom) return { ok:false, error:"Utilisateur non trouvé dans Acces" };

    const v = sh.getDataRange().getValues();
    if(v.length < 2) return { ok:false, error:"Feuille VSAV vide" };

    const headers = v[0].map(h => normHeader_(h));
    const idxM = headers.indexOf("mois");
    const idxA = headers.indexOf("agent");
    const idxAE = headers.indexOf("agent_email");

    if(idxM === -1 || idxA === -1 || idxAE === -1){
      return { ok:false, error:"Headers attendus: mois | agent | agent_email" };
    }

    const mNeed = normMonth_(month);
    let rowIndex = -1;
    for(let i=1;i<v.length;i++){
      const m = normMonth_(v[i][idxM]);
      if(m && m === mNeed){ rowIndex = i; break; }
    }
    if(rowIndex === -1) return { ok:false, error:"Mois introuvable" };

    const currentAgent = String(v[rowIndex][idxA] || "").trim();
    const currentMail = String(v[rowIndex][idxAE] || "").trim().toLowerCase();
    if(currentAgent || currentMail){
      return { ok:false, error:"Déjà pris" };
    }

    // ✅ écriture prénom + email
    sh.getRange(rowIndex+1, idxA+1).setValue(prenom);
    sh.getRange(rowIndex+1, idxAE+1).setValue(email);

    return { ok:true };

  }catch(err){
    return { ok:false, error:String(err && err.message ? err.message : err) };
  }finally{
    try{ lock.releaseLock(); }catch(e){}
  }
}

function isAdminEmail_(ss, email){
  email = String(email||"").trim().toLowerCase();
  if(!email) return false;

  const sh = ss.getSheetByName("Acces");
  if(!sh) return false;

  const v = sh.getDataRange().getValues();
  for(let i=1;i<v.length;i++){
    const em = String(v[i][0]||"").trim().toLowerCase();
    const role = String(v[i][1]||"").trim().toLowerCase(); // col B = role
    if(em === email){
      // adapte si tu utilises "admin" / "administrateur" / "chef" etc.
      return (role === "admin" || role === "administrateur");
    }
  }
  return false;
}

function planningAddEvent_(e){
  const lock = LockService.getScriptLock();
  try{
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

    const email = String(e?.parameter?.email || "").trim().toLowerCase();
    if(!email) return { ok:false, error:"email manquant" };
    const auth = authCheck_({ parameter:{ email } });
if(!auth || auth.ok !== true || auth.role !== "admin"){
  return { ok:false, error:"Accès refusé (admin requis)" };
}

    const date = String(e?.parameter?.date || "").trim(); // "YYYY-MM-DD"
    const start = String(e?.parameter?.start || "").trim(); // "HH:MM" (optionnel)
    const end = String(e?.parameter?.end || "").trim(); // "HH:MM" (optionnel)
    const title = String(e?.parameter?.title || "").trim(); // obligatoire
    const category = String(e?.parameter?.category || "").trim();
    const details = String(e?.parameter?.details || "").trim();
    const location = String(e?.parameter?.location || "").trim();

    if(!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return { ok:false, error:"date invalide" };
    if(!title) return { ok:false, error:"title manquant" };

    lock.waitLock(15000);

    const sh = ss.getSheetByName(TAB_PLANNING_EVENTS);
    if(!sh) return { ok:false, error:`Onglet introuvable: ${TAB_PLANNING_EVENTS}` };

    const v = sh.getDataRange().getValues();
    const headers = (v[0] || []).map(h => normHeader_(h));

    // On retrouve les colonnes par header normalisé
    const idx = (key) => headers.indexOf(key);

    const iDate = idx("date");
    const iStart = idx("start");
    const iEnd = idx("end");
    const iTitle = idx("title");
    const iCat = idx("category");
    const iDetails = idx("details");
    const iLoc = idx("location");
    const iEventId = idx("event_id");

    if(iDate === -1 || iTitle === -1){
      return { ok:false, error:`Headers manquants dans ${TAB_PLANNING_EVENTS} (au minimum: date, title). Reçu: ${headers.join(", ")}` };
    }

    // On construit une ligne de la longueur des headers
    const row = new Array(headers.length).fill("");

    row[iDate] = date;
    if(iStart !== -1) row[iStart] = start;
    if(iEnd !== -1) row[iEnd] = end;
    row[iTitle] = title;
    if(iCat !== -1) row[iCat] = category;
    if(iDetails !== -1) row[iDetails] = details;
    if(iLoc !== -1) row[iLoc] = location;

    // ✅ event_id (si la colonne existe)
    if (iEventId !== -1) row[iEventId] = makeEventId_();

    sh.appendRow(row);

    return { ok:true, added:true, updatedAt:new Date().toISOString() };

  }catch(err){
    return { ok:false, error:String(err && err.message ? err.message : err) };
  }finally{
    try{ lock.releaseLock(); }catch(e){}
  }
}

function planningDeleteEvent_(e){
  const lock = LockService.getScriptLock();
  try{
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

    const email = String(e?.parameter?.email || "").trim().toLowerCase();
    if(!email) return { ok:false, error:"email manquant" };

    const auth = authCheck_({ parameter:{ email } });
    if(!auth || auth.ok !== true || auth.role !== "admin"){
      return { ok:false, error:"Accès refusé (admin requis)" };
    }

    // ✅ priorité: suppression par event_id (fiable)
    const event_id = String(e?.parameter?.event_id || e?.parameter?.id || "").trim();

    // ✅ fallback historique : supprimer par (date + title + start)
    const date = String(e?.parameter?.date || "").trim();
    const title = String(e?.parameter?.title || "").trim();
    const start = String(e?.parameter?.start || "").trim();

    if(!event_id && (!date || !title)){
      return { ok:false, error:"Paramètres manquants (event_id OU date/title)" };
    }

    lock.waitLock(15000);

    const sh = ss.getSheetByName(TAB_PLANNING_EVENTS);
    if(!sh) return { ok:false, error:`Onglet introuvable: ${TAB_PLANNING_EVENTS}` };

    const v = sh.getDataRange().getValues();
    if(v.length < 2) return { ok:true, deleted:0 };

    const headers = v[0].map(h => normHeader_(h));
    const iEventId = headers.indexOf("event_id");
    const iDate = headers.indexOf("date");
    const iTitle = headers.indexOf("title");
    const iStart = headers.indexOf("start");

    if(iEventId === -1 && (iDate === -1 || iTitle === -1)){
      return { ok:false, error:"Headers manquants: event_id ou (date/title)" };
    }

    let deleted = 0;

    // on parcourt à l’envers pour delete safe
    for(let r = v.length - 1; r >= 1; r--){
      let same = false;

      if(event_id && iEventId !== -1){
        const eid = String(v[r][iEventId] || "").trim();
        same = (eid === event_id);
      } else {
        const d = (iDate !== -1) ? String(v[r][iDate] || "").trim() : "";
        const t = (iTitle !== -1) ? String(v[r][iTitle] || "").trim() : "";
        const s = (iStart !== -1) ? String(v[r][iStart] || "").trim() : "";
        same = (d === date && t === title && (start ? s === start : true));
      }

      if(same){
        sh.deleteRow(r + 1);
        deleted++;
        // si event_id fourni, on peut arrêter après 1 suppression
        if(event_id) break;
      }
    }

    return { ok:true, deleted };

  }catch(err){
    return { ok:false, error:String(err && err.message ? err.message : err) };
  }finally{
    try{ lock.releaseLock(); }catch(e){}
  }
}

