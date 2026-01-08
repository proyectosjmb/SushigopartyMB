/* Sushi Draft Party (fan tool)
   - Pass-and-play (un dispositivo)
   - 3 rondas
   - Draft: elegir y pasar mano
   - Puntuación: Nigiri/Wasabi, Tempura, Sashimi, Dumplings, Maki, Pudding, Chopsticks
*/

const $ = (id) => document.getElementById(id);


// -------------------- THEME (Minimal / Fiesta) --------------------
const THEME_KEY = "sushi_theme";

function sanitizeTheme(t){
  return (t === "party") ? "party" : "minimal";
}
function getSavedTheme(){
  try{ return sanitizeTheme(localStorage.getItem(THEME_KEY) || "minimal"); }
  catch(_){ return "minimal"; }
}
function applyTheme(theme){
  const t = sanitizeTheme(theme);
  document.documentElement.setAttribute("data-theme", t);
  try{ localStorage.setItem(THEME_KEY, t); } catch(_){}

  const btn = $("btnTheme");
  if(btn) btn.textContent = `Tema: ${t === "party" ? "Fiesta" : "Minimal"}`;

  document.querySelectorAll('input[name="theme"]').forEach(r=>{
    r.checked = (r.value === t);
  });
}
function toggleTheme(){
  const cur = sanitizeTheme(document.documentElement.getAttribute("data-theme"));
  applyTheme(cur === "party" ? "minimal" : "party");
}

const PLAYER_COLORS = [
  "#6ee7b7", // verde menta
  "#38bdf8", // azul cielo
  "#fbbf24", // ámbar
  "#fb7185", // rosa coral
  "#a78bfa", // violeta
  "#34d399", // verde
  "#f472b6", // rosa
  "#60a5fa", // azul
];

const DEFAULT_COUNTS = {
  // “Bolsa” balanceada (no pretende replicar conteos exactos de ninguna edición)
  NIGIRI_EGG: 10,
  NIGIRI_SALMON: 10,
  NIGIRI_SQUID: 10,
  WASABI: 8,
  TEMPURA: 18,
  SASHIMI: 18,
  DUMPLING: 18,
  MAKI_1: 12,
  MAKI_2: 12,
  MAKI_3: 12,
  PUDDING: 12,
  CHOPSTICKS: 8,
};

const CARD_META = {
  NIGIRI_EGG:   { name:"Nigiri", icon:"🍤", desc:"Vale 1 (o 3 con Wasabi).", group:"Nigiri", nigiri:1 },
  NIGIRI_SALMON:{ name:"Nigiri", icon:"🐟", desc:"Vale 2 (o 6 con Wasabi).", group:"Nigiri", nigiri:2 },
  NIGIRI_SQUID: { name:"Nigiri", icon:"🦑", desc:"Vale 3 (o 9 con Wasabi).", group:"Nigiri", nigiri:3 },

  WASABI: { name:"Wasabi", icon:"🌶️", desc:"Triplica el siguiente Nigiri que bajes.", group:"Wasabi" },

  TEMPURA:{ name:"Tempura", icon:"🍤🍤", desc:"Par = 5 puntos. Sueltos = 0.", group:"Tempura" },
  SASHIMI:{ name:"Sashimi", icon:"🍣", desc:"Trío = 10 puntos. Sueltos = 0.", group:"Sashimi" },
  DUMPLING:{ name:"Dumpling", icon:"🥟", desc:"1/3/6/10/15 (máx 5).", group:"Dumpling" },

  MAKI_1:{ name:"Maki", icon:"🎏", desc:"1 maki. Mayorías por ronda.", group:"Maki", maki:1 },
  MAKI_2:{ name:"Maki", icon:"🎏🎏", desc:"2 maki. Mayorías por ronda.", group:"Maki", maki:2 },
  MAKI_3:{ name:"Maki", icon:"🎏🎏🎏", desc:"3 maki. Mayorías por ronda.", group:"Maki", maki:3 },

  PUDDING:{ name:"Pudding", icon:"🍮", desc:"Se puntúa al final del juego.", group:"Pudding" },

  CHOPSTICKS:{ name:"Chopsticks", icon:"🥢", desc:"En un turno futuro: juega 2 y regresa 🥢 a tu mano.", group:"Chopsticks" },
};

function clamp(n, a, b){ return Math.max(a, Math.min(b, n)); }
function shuffle(arr){
  for(let i=arr.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    [arr[i],arr[j]]=[arr[j],arr[i]];
  }
  return arr;
}

function cardsPerPlayerFor(nPlayers){
  if(nPlayers===2) return 10;
  if(nPlayers===3) return 9;
  if(nPlayers===4) return 8;
  if(nPlayers===5) return 7;
  if(nPlayers===6) return 6;
  if(nPlayers===7) return 5;
  return 4; // 8
}

function makeDeck(counts, enabled){
  const deck = [];
  let uid=1;
  for(const key of Object.keys(counts)){
    const meta = CARD_META[key];
    if(!meta) continue;

    if(enabled && enabled[meta.group] === false) continue;

    const c = clamp(parseInt(counts[key],10)||0, 0, 999);
    for(let i=0;i<c;i++){
      deck.push({ id:`${key}_${uid++}`, key, ...meta });
    }
  }
  return shuffle(deck);
}

function enabledFromUI(){
  return {
    Nigiri: $("cNigiri").checked,
    Wasabi: $("cWasabi").checked,
    Tempura: $("cTempura").checked,
    Sashimi: $("cSashimi").checked,
    Dumpling: $("cDumpling").checked,
    Maki: $("cMaki").checked,
    Pudding: $("cPudding").checked,
    Chopsticks: $("cChopsticks").checked,
  };
}

function getCountsFromInputs(){
  const counts = {};
  document.querySelectorAll("[data-count-key]").forEach(inp=>{
    counts[inp.dataset.countKey] = clamp(parseInt(inp.value,10)||0, 0, 999);
  });
  return counts;
}

function renderCountsEditor(){
  const wrap = $("deckCounts");
  wrap.innerHTML = "";
  const keys = Object.keys(DEFAULT_COUNTS);
  keys.forEach(k=>{
    const meta = CARD_META[k];
    const div = document.createElement("div");
    div.className = "count";
    div.innerHTML = `
      <div class="lbl">${meta.icon} ${k.replaceAll("_"," ")} <span style="opacity:.75">(${meta.group})</span></div>
      <input type="number" min="0" max="999" value="${DEFAULT_COUNTS[k]}" data-count-key="${k}" />
    `;
    wrap.appendChild(div);
  });
}

function renderNameInputs(n){
  const wrap = $("playerNames");
  wrap.innerHTML = "";
  for(let i=0;i<n;i++){
    const row = document.createElement("div");
    row.className = "name-row";
    row.style.setProperty("--p", PLAYER_COLORS[i % PLAYER_COLORS.length]);

    const dot = document.createElement("span");
    dot.className = "name-dot";
    dot.setAttribute("aria-hidden","true");

    const inp = document.createElement("input");
    inp.className = "name-input";
    inp.placeholder = `Jugador ${i+1}`;
    inp.id = `name_${i}`;

    row.appendChild(dot);
    row.appendChild(inp);
    wrap.appendChild(row);
  }
}

function renderSetupHandSize(){
  const n = state.setup.players;
  $("playerCount").textContent = n;
  $("cardsPerPlayer").textContent = cardsPerPlayerFor(n);
}

function passDirectionForRound(roundIndex){
  return (roundIndex % 2 === 1) ? "right" : "left";
}

// -------------------- GAME STATE --------------------
let state = {
  setup: { players: 4 },
  game: null
};

function newGame(){
  const n = state.setup.players;
  const cps = cardsPerPlayerFor(n);
  const names = [];
  for(let i=0;i<n;i++){
    const v = ($(`name_${i}`)?.value || "").trim();
    names.push(v || `Jugador ${i+1}`);
  }

  const enabled = enabledFromUI();
  const counts = getCountsFromInputs();
  const deck = makeDeck(counts, enabled);

  const players = names.map((name, idx)=>({
    id: idx,
    name,
    color: PLAYER_COLORS[idx % PLAYER_COLORS.length],
    total: 0,
    pudding: 0,
    lastRoundBreakdown: null,
    puddingAward: 0
  }));

  return {
    round: 1,
    turnPlayer: 0,
    players,
    cardsPerPlayer: cps,
    enabled,
    counts,
    baseDeck: deck,
    hands: [],
    tables: players.map(()=>[]),
    wantTwoPicks: false,
    selected: new Set(),
    roundDone: false
  };
}

function dealRound(){
  const g = state.game;
  const n = g.players.length;
  const need = n * g.cardsPerPlayer;

  const deck = [...g.baseDeck];
  shuffle(deck);
  if(deck.length < need){
    while(deck.length < need){
      const keys = Object.keys(CARD_META).filter(k=>{
        const grp = CARD_META[k].group;
        return g.enabled[grp] !== false;
      });
      const k = keys[Math.floor(Math.random()*keys.length)];
      deck.push({ id:`FILL_${k}_${Math.random()}`, key:k, ...CARD_META[k] });
    }
    shuffle(deck);
  }

  g.hands = [];
  for(let p=0;p<n;p++){
    g.hands[p] = deck.splice(0, g.cardsPerPlayer);
  }
  g.tables = g.players.map(()=>[]);
  g.turnPlayer = 0;
  g.wantTwoPicks = false;
  g.selected = new Set();
  g.roundDone = false;
}

function currentPlayer(){
  return state.game.players[state.game.turnPlayer];
}
function currentHand(){
  return state.game.hands[state.game.turnPlayer];
}

function playerHasChopsticksOnTable(playerIdx){
  return state.game.tables[playerIdx].some(c=>c.group==="Chopsticks");
}

function updateChopsticksButton(){
  const g = state.game;
  const idx = g.turnPlayer;
  const can = playerHasChopsticksOnTable(idx) && currentHand().length >= 2;
  $("btnUseChopsticks").disabled = !can;
}

function setPickModeLabel(){
  $("pickMode").textContent = state.game.wantTwoPicks ? "Elige 2 cartas" : "Elige 1 carta";
}

function fmt(n){
  const isInt = Math.abs(n - Math.round(n)) < 1e-9;
  return isInt ? String(Math.round(n)) : n.toFixed(2);
}

function renderPlayerBar(){
  const g = state.game;
  const bar = $("playerBar");
  if(!bar) return;

  bar.innerHTML = "";
  g.players.forEach((p,i)=>{
    const b = document.createElement("div");
    b.className = "pbadge" + (i===g.turnPlayer ? " active" : "");
    b.style.setProperty("--p", p.color);
    b.innerHTML = `
      <span class="pDot" aria-hidden="true"></span>
      <span class="pName">${p.name}</span>
      <span class="pMeta">${fmt(p.total)} pts • 🍮 ${p.pudding}</span>
    `;
    bar.appendChild(b);
  });
}

function renderTable(){
  const g = state.game;
  const table = g.tables[g.turnPlayer];
  const wrap = $("tableCards");
  wrap.innerHTML = "";
  if(table.length === 0){
    wrap.innerHTML = `<span class="hint">Aún no bajas cartas en esta ronda.</span>`;
    return;
  }
  table.forEach(c=>{
    const chip = document.createElement("div");
    chip.className="chip";
    chip.dataset.group = c.group;

    let badge = "";
    if(c.group==="Nigiri") badge = ` <span class="sub">+${c.nigiri}</span>`;
    if(c.group==="Maki") badge = ` <span class="sub">+${c.maki}🎏</span>`;

    chip.innerHTML = `<b>${c.icon} ${c.name}</b> <span class="sub">${c.group}</span>${badge}`;
    wrap.appendChild(chip);
  });
}

function renderHand(){
  const g = state.game;
  const wrap = $("handCards");
  wrap.innerHTML = "";

  const hand = currentHand();
  if(hand.length === 0){
    wrap.innerHTML = `<div class="hint">Ya no tienes cartas en mano.</div>`;
    return;
  }

  hand.forEach((c, idx)=>{
    const btn = document.createElement("button");
    btn.className = "cardbtn";
    btn.dataset.group = c.group;
    if(g.selected.has(idx)) btn.classList.add("selected");

    let badge = "";
    if(c.group==="Nigiri") badge = `<span class="badge">+${c.nigiri}</span>`;
    if(c.group==="Maki") badge = `<span class="badge">+${c.maki}🎏</span>`;

    btn.innerHTML = `
      <div class="row space">
        <div class="t"><span class="dot" aria-hidden="true"></span><span class="icon">${c.icon}</span> ${c.name}</div>
        <div class="row gap">
          ${badge}
          <div class="pill small tag">${c.group}</div>
        </div>
      </div>
      <div class="d">${c.desc}</div>
    `;
    btn.addEventListener("click", ()=>{
      toggleSelect(idx);
    });
    wrap.appendChild(btn);
  });
}

function toggleSelect(idx){
  const g = state.game;
  const need = g.wantTwoPicks ? 2 : 1;

  if(g.selected.has(idx)){
    g.selected.delete(idx);
  }else{
    if(g.selected.size >= need){
      const first = g.selected.values().next().value;
      g.selected.delete(first);
    }
    g.selected.add(idx);
  }

  $("btnConfirmPick").disabled = (g.selected.size !== need);
  renderHand();
}

function updateHeader(){
  const g = state.game;
  $("roundInfo").textContent = `Ronda ${g.round} / 3`;

  const p = currentPlayer();
  $("turnTitle").innerHTML = `Turno de: <span class="turnName" style="--p:${p.color}"><span class="pDot inline" style="--p:${p.color}"></span>${p.name}</span>`;

  const dir = passDirectionForRound(g.round);
  $("passInfo").textContent = (dir==="right") ? "Pasa a la derecha ➜" : "⬅︎ Pasa a la izquierda";

  setPickModeLabel();
  updateChopsticksButton();
  renderPlayerBar();
}

// -------------------- TURN FLOW --------------------
function useChopsticks(){
  const g = state.game;
  if(!playerHasChopsticksOnTable(g.turnPlayer)) return;
  if(currentHand().length < 2) return;
  g.wantTwoPicks = true;
  g.selected = new Set();
  $("btnConfirmPick").disabled = true;
  updateHeader();
  renderHand();
  $("handHint").textContent = "Estás usando 🥢: elige 2 cartas para bajar este turno.";
}

function confirmPick(){
  const g = state.game;
  const idxs = Array.from(g.selected.values()).sort((a,b)=>b-a);
  const hand = currentHand();

  const pickedCards = idxs.map(i => hand[i]);

  idxs.forEach(i => hand.splice(i,1));

  if(g.wantTwoPicks){
    const t = g.tables[g.turnPlayer];
    const chopIndex = t.findIndex(c=>c.group==="Chopsticks");
    if(chopIndex >= 0){
      const chop = t.splice(chopIndex,1)[0];
      hand.push(chop);
    }
  }

  pickedCards.forEach(c=>{
    g.tables[g.turnPlayer].push(c);
    if(c.group==="Pudding"){
      g.players[g.turnPlayer].pudding += 1;
    }
  });

  g.wantTwoPicks = false;
  g.selected = new Set();
  $("btnConfirmPick").disabled = true;

  passHands();

  if(g.hands.every(h=>h.length===0)){
    endRound();
    return;
  }

  g.turnPlayer = (g.turnPlayer + 1) % g.players.length;
  showPassOverlay();
}

function passHands(){
  const g = state.game;
  const n = g.players.length;
  const dir = passDirectionForRound(g.round);
  const nextHands = new Array(n);

  for(let i=0;i<n;i++){
    const to = (dir==="right")
      ? (i+1) % n
      : (i-1+n) % n;

    nextHands[to] = g.hands[i];
  }
  g.hands = nextHands;
}

function showPassOverlay(){
  const g = state.game;
  const nextIdx = g.turnPlayer;
  $("overlayText").textContent = `Siguiente: ${g.players[nextIdx].name}`;
  $("overlayPass").classList.remove("hidden");
}

function hidePassOverlay(){
  $("overlayPass").classList.add("hidden");
  updateHeader();
  renderTable();
  renderHand();
  $("handHint").textContent = "Elige una carta. Luego se pasa la mano.";
}

// -------------------- SCORING --------------------
function scoreRoundForPlayer(table){
  let score = 0;

  let pendingWasabi = 0;
  table.forEach(c=>{
    if(c.group==="Wasabi"){
      pendingWasabi += 1;
    }else if(c.group==="Nigiri"){
      const v = c.nigiri || 0;
      if(pendingWasabi > 0){
        score += v * 3;
        pendingWasabi -= 1;
      }else{
        score += v;
      }
    }
  });

  const tempura = table.filter(c=>c.group==="Tempura").length;
  score += Math.floor(tempura/2) * 5;

  const sashimi = table.filter(c=>c.group==="Sashimi").length;
  score += Math.floor(sashimi/3) * 10;

  const dumplings = table.filter(c=>c.group==="Dumpling").length;
  const d = Math.min(dumplings, 5);
  score += [0,1,3,6,10,15][d] || 0;

  return { score };
}

function countMaki(table){
  return table.filter(c=>c.group==="Maki").reduce((acc,c)=>acc+(c.maki||0),0);
}

function scoreMakiMajorities(){
  const g = state.game;
  const totals = g.tables.map(t=>countMaki(t));
  const sorted = [...totals].sort((a,b)=>b-a);
  const firstVal = sorted[0] || 0;
  if(firstVal === 0) return { totals, awarded: new Array(g.players.length).fill(0) };

  const firstPlayers = totals.map((v,i)=>v===firstVal ? i : -1).filter(i=>i>=0);
  let awarded = new Array(g.players.length).fill(0);

  if(firstPlayers.length > 1){
    const each = 6 / firstPlayers.length;
    firstPlayers.forEach(i=>awarded[i]+=each);
    return { totals, awarded };
  }

  awarded[firstPlayers[0]] += 6;

  const secondVal = sorted.find(v=>v<firstVal) || 0;
  if(secondVal === 0) return { totals, awarded };

  const secondPlayers = totals.map((v,i)=>v===secondVal ? i : -1).filter(i=>i>=0);
  const each2 = 3 / secondPlayers.length;
  secondPlayers.forEach(i=>awarded[i]+=each2);

  return { totals, awarded };
}

function scorePuddingEndgame(){
  const g = state.game;
  const puddings = g.players.map(p=>p.pudding);
  const max = Math.max(...puddings);
  const min = Math.min(...puddings);

  let awarded = new Array(g.players.length).fill(0);
  if(max === min) return { puddings, awarded };

  const most = puddings.map((v,i)=>v===max ? i : -1).filter(i=>i>=0);
  const least = puddings.map((v,i)=>v===min ? i : -1).filter(i=>i>=0);

  const plusEach = 6 / most.length;
  most.forEach(i=>awarded[i]+=plusEach);

  const minusEach = -6 / least.length;
  least.forEach(i=>awarded[i]+=minusEach);

  return { puddings, awarded };
}

function endRound(){
  const g = state.game;
  g.roundDone = true;

  const perPlayer = g.tables.map(t=>scoreRoundForPlayer(t));
  const maki = scoreMakiMajorities();

  g.players.forEach((p,i)=>{
    const s = perPlayer[i].score + maki.awarded[i];
    p.total += s;
    p.lastRoundBreakdown = {
      round: g.round,
      base: perPlayer[i].score,
      maki: maki.awarded[i],
      makiCount: maki.totals[i]
    };
  });

  openScoreboard(true);

  if(g.round >= 3){
    const pud = scorePuddingEndgame();
    g.players.forEach((p,i)=>{
      p.puddingAward = pud.awarded[i];
      p.total += pud.awarded[i];
    });
    openScoreboard(true);
  }
}

function maybeAdvanceRound(){
  const g = state.game;
  if(!g.roundDone) return;
  if(g.round >= 3) return;

  g.round += 1;
  g.roundDone = false;
  dealRound();
  updateHeader();
  renderTable();
  renderHand();
  showPassOverlay();
}

// -------------------- UI: SCOREBOARD --------------------
function openScoreboard(keepRoundAdvanceButton=false){
  const g = state.game;
  const wrap = $("scoreContent");

  const rows = [...g.players].sort((a,b)=>b.total - a.total);

  const roundRows = g.players.map(p=>{
    const b = p.lastRoundBreakdown;
    if(!b) return "";
    return `
      <div class="card" style="margin:10px 0; padding:12px;">
        <div class="row space">
          <div><span class="pDot inline" style="--p:${p.color}"></span> <b>${p.name}</b> <span class="hint">• Ronda ${b.round}</span></div>
          <div class="pill small">Total: ${fmt(p.total)}</div>
        </div>
        <div class="hint" style="margin-top:8px;">
          Base: <b>${fmt(b.base)}</b> • Maki: <b>${fmt(b.maki)}</b> (maki=${b.makiCount}) • Pudding acumulado: <b>${p.pudding}</b>
        </div>
      </div>
    `;
  }).join("");

  const end = (g.round >= 3)
    ? (() => {
        const pud = g.players
          .map(p=>({name:p.name, color:p.color, pudding:p.pudding, award: p.puddingAward || 0}))
          .sort((a,b)=>b.pudding - a.pudding);
        const list = pud.map(x=>`<li><span class="pDot inline" style="--p:${x.color}"></span> ${x.name}: 🍮 ${x.pudding} → <b>${fmt(x.award)}</b> pts</li>`).join("");
        return `
          <div class="divider"></div>
          <h3>🍮 Pudding (final)</h3>
          <ul class="hint">${list}</ul>
        `;
      })()
    : "";

  const advanceBtn = keepRoundAdvanceButton && g.roundDone && g.round < 3
    ? `<button id="btnNextRound" class="btn primary">Siguiente ronda</button>`
    : (g.round >= 3 ? `<button id="btnNewGame" class="btn primary">Nueva partida</button>` : "");

  wrap.innerHTML = `
    <div class="card" style="margin:10px 0; padding:12px;">
      <div class="row space">
        <div>
          <div class="kicker">Tabla general</div>
          <div class="hint">Ordenado por puntaje total.</div>
        </div>
        <div class="pill small">Ronda: ${g.round}/3</div>
      </div>
      <div class="divider"></div>
      <div class="hint">
        ${rows.map((p,i)=>`${i+1}. <span class="pDot inline" style="--p:${p.color}"></span> <b>${p.name}</b> — ${fmt(p.total)} pts (🍮 ${p.pudding})`).join("<br>")}
      </div>
    </div>

    ${roundRows}
    ${end}

    <div class="row end gap" style="margin-top:12px;">
      ${advanceBtn}
    </div>
  `;

  $("modalScore").classList.remove("hidden");

  const btnNext = $("btnNextRound");
  if(btnNext){
    btnNext.addEventListener("click", ()=>{
      $("modalScore").classList.add("hidden");
      maybeAdvanceRound();
    });
  }

  const btnNew = $("btnNewGame");
  if(btnNew){
    btnNew.addEventListener("click", ()=>{
      $("modalScore").classList.add("hidden");
      goToSetup();
    });
  }

  renderPlayerBar();
}

function closeScoreboard(){
  $("modalScore").classList.add("hidden");
}

// -------------------- UI: HELP --------------------
function openHelp(){ $("modalHelp").classList.remove("hidden"); }
function closeHelp(){ $("modalHelp").classList.add("hidden"); }

// -------------------- NAV --------------------
function goToGame(){
  $("screenSetup").classList.add("hidden");
  $("screenGame").classList.remove("hidden");
}
function goToSetup(){
  state.game = null;
  $("screenGame").classList.add("hidden");
  $("screenSetup").classList.remove("hidden");
  $("overlayPass").classList.add("hidden");
}

// -------------------- INIT --------------------
function startGame(){
  state.game = newGame();
  dealRound();
  goToGame();
  updateHeader();
  renderTable();
  renderHand();
  showPassOverlay();
}

function forceEndRound(){
  endRound();
}

function hardReset(){
  if(confirm("¿Seguro? Se perderá la partida actual.")){
    goToSetup();
  }
}

$("btnMinus").addEventListener("click", ()=>{
  state.setup.players = clamp(state.setup.players - 1, 2, 8);
  renderNameInputs(state.setup.players);
  renderSetupHandSize();
});
$("btnPlus").addEventListener("click", ()=>{
  state.setup.players = clamp(state.setup.players + 1, 2, 8);
  renderNameInputs(state.setup.players);
  renderSetupHandSize();
});

$("btnStart").addEventListener("click", startGame);
$("btnUseChopsticks").addEventListener("click", useChopsticks);
$("btnConfirmPick").addEventListener("click", confirmPick);

$("btnNextPlayer").addEventListener("click", hidePassOverlay);

$("btnScoreboard").addEventListener("click", ()=>openScoreboard(false));
$("btnCloseScore").addEventListener("click", closeScoreboard);

$("btnHelp").addEventListener("click", openHelp);
$("btnTheme")?.addEventListener("click", toggleTheme);
$("btnCloseHelp").addEventListener("click", closeHelp);

$("btnRoundEnd").addEventListener("click", forceEndRound);
$("btnReset").addEventListener("click", hardReset);

document.addEventListener("click", ()=>{
  if(!state.game) return;
  const g = state.game;
  const need = g.wantTwoPicks ? 2 : 1;
  $("btnConfirmPick").disabled = (g.selected.size !== need);
});

applyTheme(getSavedTheme());
document.querySelectorAll('input[name="theme"]').forEach(r=>{
  r.addEventListener("change", ()=>applyTheme(r.value));
});

// Render setup defaults
renderCountsEditor();
renderNameInputs(state.setup.players);
renderSetupHandSize();
