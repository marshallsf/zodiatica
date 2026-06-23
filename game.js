/* ZODIATICA - game engine + UI (vanilla JS) */

const AI_NAMES = ["Orion", "Luna", "Vega", "Atlas", "Nova"];
const TURN_DELAY = 950; // ms between AI moves

let G = null; // game state

function imgUrl(file) { return IMG_DIR + encodeURIComponent(file); }

/* ---- Token chips (visual match aids) ---- */
const SIGN_ABBR = {
  aries: "Ari", taurus: "Tau", gemini: "Gem", cancer: "Can", leo: "Leo", virgo: "Vir",
  libra: "Lib", scorpio: "Sco", sagittarius: "Sag", capricorn: "Cap", aquarius: "Aqu", pisces: "Pis",
};
const PLANET_ABBR = {
  mercury: "Mer", venus: "Ven", mars: "Mar", jupiter: "Jup", saturn: "Sat",
  uranus: "Ura", neptune: "Nep", pluto: "Plu", sun: "Sun", moon: "Moon",
};
const MODE_ABBR = { cardinal: "Card", fixed: "Fix", mutable: "Mut" };

function tokenInfo(t) {
  if (SIGN_ABBR[t]) return { abbr: SIGN_ABBR[t], cat: "sign", glyph: SIGN_GLYPH[t] };
  if (PLANET_ABBR[t]) return { abbr: PLANET_ABBR[t], cat: "planet" };
  if (t === "planetx") return { abbr: "Pl-X", cat: "planet" };
  if (["fire", "water", "air", "earth", "spirit"].includes(t)) return { abbr: cap(t), cat: "element" };
  if (MODE_ABBR[t]) return { abbr: MODE_ABBR[t], cat: "mode" };
  if (t === "sungroup") return { abbr: "☀ Sun", cat: "group" };
  if (t === "moongroup") return { abbr: "☾ Moon", cat: "group" };
  if (t === "rising") return { abbr: "Asc", cat: "group" };
  return { abbr: cap(t), cat: "other" };
}

function chipHtml(token, { match = false, wild = false, faded = false } = {}) {
  const info = tokenInfo(token);
  const cls = `chip chip-${info.cat}` +
    (match ? " match" : "") + (wild ? " wildchip" : "") + (faded ? " faded" : "");
  const text = (info.glyph ? info.glyph + " " : "") + info.abbr;
  return `<span class="${cls}" title="${tagLabel(token)}">${text}${wild ? " ✦" : ""}</span>`;
}

function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function startGame(numHumans, numAI, firstName, guided) {
  const deck = shuffle(buildDeck());

  const players = [];
  for (let i = 0; i < numHumans; i++) {
    const nm = i === 0 && firstName ? firstName : `Player ${i + 1}`;
    players.push({ name: nm, human: true, hand: [], seat: players.length });
  }
  for (let i = 0; i < numAI; i++)
    players.push({ name: AI_NAMES[i], human: false, hand: [], seat: players.length });

  for (let r = 0; r < 5; r++)
    for (const p of players) p.hand.push(deck.pop());

  let start;
  do { start = deck.pop(); } while (start && start.wild && deck.length);
  const discard = [start];

  G = {
    deck, discard, players,
    turn: 0, dir: 1,
    active: activeTagsFor(start),
    pendingExtra: false,
    over: false,
    revealed: false,
    multiHuman: numHumans > 1,
    guided: !!guided,
    log: [],
  };

  document.getElementById("setup").classList.add("hidden");
  document.getElementById("table").classList.remove("hidden");
  document.getElementById("winscreen").classList.add("hidden");
  document.getElementById("hand-label").textContent =
    G.multiHuman ? "" : "Your hand";

  pushLog(`Game on! Opening card: <b>${start.name}</b>.`);
  Audio.sfx.deal();
  beginTurn(true);
}

function current() { return G.players[G.turn]; }
function topCard() { return G.discard[G.discard.length - 1]; }

function drawFromDeck(n = 1) {
  const out = [];
  for (let i = 0; i < n; i++) {
    if (G.deck.length === 0) reshuffle();
    if (G.deck.length === 0) break;
    out.push(G.deck.pop());
  }
  return out;
}

function reshuffle() {
  if (G.discard.length <= 1) return;
  const top = G.discard.pop();
  G.deck = shuffle(G.discard);
  G.discard = [top];
  pushLog("Draw pile reshuffled from the discard.");
}

function advanceTurn(step = 1) {
  const n = G.players.length;
  G.turn = (G.turn + G.dir * step + n * step) % n;
}

/* ---- Turn lifecycle (handles AI, hot-seat pass gate, solo reveal) ---- */
function beginTurn(isFirst) {
  G.revealed = false;
  render();
  if (G.over) return;
  const p = current();

  if (!p.human) {
    scheduleAI();
    return;
  }
  // human
  if (G.multiHuman) {
    showPassGate(p);
  } else {
    G.revealed = true;
    render();
  }
}

function showPassGate(p) {
  const gate = document.getElementById("pass-gate");
  document.getElementById("pass-name").textContent = p.name;
  gate.classList.remove("hidden");
  document.getElementById("reveal-btn").onclick = () => {
    gate.classList.add("hidden");
    G.revealed = true;
    render();
  };
}

/* ---- Core play ---- */
function playCard(player, card, chosenTag, fromRect) {
  const idx = player.hand.indexOf(card);
  if (idx === -1) return;
  player.hand.splice(idx, 1);
  G.discard.push(card);
  G.active = activeTagsFor(card, chosenTag);

  // audio
  if (card.wild) Audio.sfx.wild();
  else if (card.action === "reverse") Audio.sfx.reverse();
  else Audio.sfx.play();

  // animation: fly a clone from source to the discard pile
  animateToDiscard(card, fromRect);

  let msg = `${player.name} played <b>${card.name}</b>`;
  if (card.action === "reverse") { G.dir *= -1; msg += " — retrograde! Order reverses"; }
  if (card.wild) {
    const t = chosenTag || card.setsTag;
    if (t) msg += ` — wild, now <b>${tagLabel(t)}</b>`;
  }
  pushLog(msg + ".");

  if (player.hand.length === 0) {
    G.over = true;
    render();
    Audio.sfx.win();
    showWin(player);
    return;
  }
  if (player.hand.length === 1) pushLog(`${player.name} has one card left!`);

  if (card.wild) {
    G.pendingExtra = true;
    render();
    if (!player.human) setTimeout(aiExtraOrPass, TURN_DELAY);
    return;
  }

  G.pendingExtra = false;
  advanceTurn();
  setTimeout(() => beginTurn(false), 260);
}

/* ---- Human actions ---- */
function onCardClick(card) {
  if (G.over) return;
  const p = current();
  if (!p.human || !G.revealed) return;

  const el = document.querySelector(`.card[data-uid="${card.uid}"]`);
  const fromRect = el ? el.getBoundingClientRect() : null;

  if (!G.pendingExtra && !cardMatches(card, G.active)) {
    Audio.sfx.illegal();
    flashIllegal(card);
    return;
  }
  if (card.wildKind === "choose") {
    askElement((el2) => playCard(p, card, el2, fromRect));
    return;
  }
  playCard(p, card, null, fromRect);
}

function onDraw() {
  if (G.over) return;
  const p = current();
  if (!p.human || !G.revealed) return;

  if (G.pendingExtra) { // decline bonus
    G.pendingExtra = false;
    advanceTurn();
    beginTurn(false);
    return;
  }

  const [c] = drawFromDeck(1);
  if (!c) { pushLog("No cards left to draw."); return; }
  p.hand.push(c);
  Audio.sfx.draw();
  pushLog(`${p.name} drew a card.`);
  if (cardMatches(c, G.active)) {
    pushLog("You may play the card you drew, or pass.");
    render();
  } else {
    advanceTurn();
    setTimeout(() => beginTurn(false), 200);
  }
}

function onPass() {
  if (G.over) return;
  const p = current();
  if (!p.human || !G.revealed) return;
  G.pendingExtra = false;
  advanceTurn();
  beginTurn(false);
}

/* ---- AI ---- */
function scheduleAI() { setTimeout(aiTurn, TURN_DELAY); }
function legalCards(player) { return player.hand.filter((c) => cardMatches(c, G.active)); }

function aiPickElement(player) {
  const counts = {};
  for (const c of player.hand)
    for (const t of c.tags)
      if (["fire", "water", "air", "earth", "spirit"].includes(t))
        counts[t] = (counts[t] || 0) + 1;
  const best = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  return best ? best[0] : "fire";
}

function aiChoose(player) {
  const legal = legalCards(player);
  if (legal.length === 0) return null;
  legal.sort((a, b) => (a.wild ? 1 : 0) - (b.wild ? 1 : 0)); // dump non-wilds first
  return legal[0];
}

function aiRect(seat) {
  const el = document.querySelector(`.opponent[data-seat="${seat}"]`);
  return el ? el.getBoundingClientRect() : null;
}

function aiTurn() {
  if (G.over) return;
  const p = current();
  if (p.human) return;

  const choice = aiChoose(p);
  if (!choice) {
    const [c] = drawFromDeck(1);
    if (c) {
      p.hand.push(c);
      Audio.sfx.draw();
      pushLog(`${p.name} drew a card.`);
      if (cardMatches(c, G.active)) { playAI(p, c); return; }
    }
    advanceTurn();
    setTimeout(() => beginTurn(false), 200);
    return;
  }
  playAI(p, choice);
}

function playAI(p, card) {
  const chosen = card.wildKind === "choose" ? aiPickElement(p) : null;
  playCard(p, card, chosen, aiRect(p.seat));
}

function aiExtraOrPass() {
  if (G.over) return;
  const p = current();
  if (p.human) return;
  const legal = legalCards(p);
  if (legal.length > 0) {
    G.pendingExtra = false;
    playAI(p, legal[0]);
  } else {
    G.pendingExtra = false;
    advanceTurn();
    setTimeout(() => beginTurn(false), 200);
  }
}

/* ---- Rendering ---- */
function render() {
  renderOpponents();
  renderPile();
  renderHand();
  renderStatus();
  renderLog();
}

function renderOpponents() {
  const wrap = document.getElementById("opponents");
  wrap.innerHTML = "";
  G.players.forEach((p, i) => {
    // In hot-seat, other humans are also "across the table" while not their turn
    if (p.human && (!G.multiHuman) ) return; // solo: only AIs shown up top
    if (p.human && i === G.turn && G.revealed) return; // current human shows hand below
    const el = document.createElement("div");
    el.className = "opponent" + (i === G.turn ? " active" : "") + (p.human ? " human" : "");
    el.dataset.seat = p.seat;
    const icon = p.human ? "🧑" : "🤖";
    el.innerHTML =
      `<div class="opp-name">${icon} ${p.name}</div>` +
      `<div class="opp-cards">${"🂠".repeat(Math.min(p.hand.length, 10))}</div>` +
      `<div class="opp-count">${p.hand.length} cards</div>`;
    wrap.appendChild(el);
  });
}

function renderPile() {
  const top = topCard();
  document.getElementById("discard").innerHTML =
    `<img src="${imgUrl(top.file)}" alt="${top.name}">`;
  document.getElementById("deck-count").textContent = G.deck.length;
  // chips showing what the next card must match
  const chips = (G.active || []).map((t) => chipHtml(t)).join("");
  document.getElementById("discard-chips").innerHTML = chips || chipHtml("any");
}

function renderHand() {
  const hand = document.getElementById("hand");
  hand.innerHTML = "";
  const p = current();
  const showing = p.human && G.revealed && !G.over;

  if (!showing) {
    hand.innerHTML = `<div class="thinking">${
      G.over ? "" : p.human ? "✦ Tap “Reveal my hand” to continue ✦"
                           : `🤖 ${p.name} is consulting the stars…`
    }</div>`;
    document.getElementById("hand-label").textContent = "";
    return;
  }

  document.getElementById("hand-label").textContent =
    G.multiHuman ? `${p.name}'s hand` : "Your hand";

  p.hand.forEach((c) => {
    const div = document.createElement("div");
    const legal = G.pendingExtra || cardMatches(c, G.active);
    div.className = "card" + (legal ? " playable" : " dim");
    div.dataset.uid = c.uid;
    div.onclick = () => onCardClick(c);

    // token chips: wild cards show one gold WILD chip; others show their 3 tokens,
    // highlighting the one(s) that match the current pile.
    let chips;
    if (c.wild) {
      chips = chipHtml(c.setsTag, { wild: true });
    } else {
      chips = c.tags
        .map((t) => {
          const isMatch = !G.pendingExtra && (G.active || []).includes(t);
          // during a bonus turn any card is playable, so don't fade anything
          return chipHtml(t, { match: isMatch, faded: !G.pendingExtra && !isMatch });
        })
        .join("");
    }
    div.innerHTML =
      `<img src="${imgUrl(c.file)}" alt="${c.name}">` +
      `<div class="chips">${chips}</div>`;
    hand.appendChild(div);
  });

  renderGuideHint(p);
}

function renderGuideHint(p) {
  const box = document.getElementById("guide-hint");
  if (!G.guided || G.over) { box.classList.add("hidden"); return; }
  const legal = legalCards(p);
  if (G.pendingExtra) {
    box.innerHTML = "★ <b>Bonus turn:</b> play any card from your hand, or skip.";
  } else if (legal.length) {
    const c = legal[0];
    const st = sharedTag(c, G.active);
    box.innerHTML = c.wild
      ? `💡 You can play a <b>wild</b> (${c.name}) to change the element.`
      : `💡 Try <b>${c.name}</b> — it matches by <b>${tagLabel(st)}</b>.`;
  } else {
    box.innerHTML = "💡 No match in hand — <b>draw a card</b>.";
  }
  box.classList.remove("hidden");
}

function renderStatus() {
  const turnName = G.over ? "—" : current().name;
  document.getElementById("turn-indicator").innerHTML = `Turn: <b>${turnName}</b>`;
  const tags = (G.active || []).map(tagLabel).join(", ") || "anything";
  document.getElementById("active-tag").innerHTML = `Match: <b>${tags}</b>`;

  const drawBtn = document.getElementById("draw-btn");
  const passBtn = document.getElementById("pass-btn");
  const myTurn = current().human && G.revealed && !G.over;
  drawBtn.disabled = !myTurn;
  drawBtn.textContent = G.pendingExtra ? "Skip bonus" : "Draw card";
  passBtn.disabled = !myTurn || G.pendingExtra;
  passBtn.classList.toggle("hidden", G.pendingExtra);
  document.getElementById("bonus-hint").classList.toggle("hidden", !G.pendingExtra);
}

function renderLog() {
  const box = document.getElementById("log");
  box.innerHTML = G.log.slice(-7).map((l) => `<div>${l}</div>`).join("");
  box.scrollTop = box.scrollHeight;
}

function pushLog(msg) { G.log.push(msg); }

function flashIllegal(card) {
  const el = document.querySelector(`.card[data-uid="${card.uid}"]`);
  if (!el) return;
  el.classList.remove("shake");
  void el.offsetWidth;
  el.classList.add("shake");
}

/* ---- Flying card animation ---- */
function animateToDiscard(card, fromRect) {
  const target = document.getElementById("discard");
  if (!fromRect || !target) return;
  const toRect = target.getBoundingClientRect();
  const fly = document.createElement("div");
  fly.className = "fly-card";
  fly.innerHTML = `<img src="${imgUrl(card.file)}" alt="">`;
  fly.style.left = fromRect.left + "px";
  fly.style.top = fromRect.top + "px";
  fly.style.width = fromRect.width + "px";
  fly.style.height = fromRect.height + "px";
  document.body.appendChild(fly);
  // next frame -> animate to discard position/size
  requestAnimationFrame(() => {
    fly.style.left = toRect.left + "px";
    fly.style.top = toRect.top + "px";
    fly.style.width = toRect.width + "px";
    fly.style.height = toRect.height + "px";
    fly.style.transform = "rotate(360deg)";
    fly.style.opacity = "0.96";
  });
  setTimeout(() => fly.remove(), 520);
}

/* ---- Element chooser modal (Planet X) ---- */
function askElement(cb) {
  const modal = document.getElementById("element-modal");
  modal.classList.remove("hidden");
  modal.querySelectorAll("button[data-el]").forEach((b) => {
    b.onclick = () => { modal.classList.add("hidden"); cb(b.dataset.el); };
  });
}

/* ---- Win ---- */
function showWin(player) {
  spawnConfetti();
  const ws = document.getElementById("winscreen");
  ws.classList.remove("hidden");
  document.getElementById("win-text").innerHTML = player.human
    ? `🌟 ${player.name} wins! The cosmos aligns in your favor. 🌟`
    : `${player.name} cleared their hand first. The stars favor the machine!`;
}

function spawnConfetti() {
  const box = document.getElementById("confetti");
  box.innerHTML = "";
  const glyphs = ["♈","♉","♊","♋","♌","♍","♎","♏","♐","♑","♒","♓","✦","★","☾"];
  for (let i = 0; i < 60; i++) {
    const s = document.createElement("span");
    s.textContent = glyphs[i % glyphs.length];
    s.style.left = (Math.random() * 100) + "vw";
    s.style.animationDelay = (Math.random() * 1.5) + "s";
    s.style.animationDuration = (2.5 + Math.random() * 2.5) + "s";
    s.style.fontSize = (14 + Math.random() * 22) + "px";
    box.appendChild(s);
  }
}

/* ---- Learn overlay ---- */
function buildGuideTable() {
  const t = document.getElementById("guide-table");
  const rows = guideRows();
  t.innerHTML =
    "<tr><th>Sign</th><th>Planet</th><th>Element</th><th>Mode</th></tr>" +
    rows.map(r =>
      `<tr><td>${r.glyph} ${r.sign}</td><td>${r.planet}</td><td>${r.element}</td><td>${r.mode}</td></tr>`
    ).join("");
}

/* ---- Setup wiring ---- */
window.addEventListener("DOMContentLoaded", () => {
  buildGuideTable();

  document.getElementById("start-btn").onclick = () => {
    const humans = parseInt(document.getElementById("human-count").value, 10);
    const ai = parseInt(document.getElementById("ai-count").value, 10);
    const total = humans + ai;
    const warn = document.getElementById("setup-warn");
    if (total < 2) { warn.textContent = "Need at least 2 players total."; warn.classList.remove("hidden"); return; }
    if (total > 6) { warn.textContent = "Maximum 6 players total."; warn.classList.remove("hidden"); return; }
    warn.classList.add("hidden");
    const name = document.getElementById("player-name").value.trim();
    const guided = document.getElementById("guided").checked;
    Audio.init(); // user gesture -> audio allowed
    Audio.resume();
    startGame(humans, ai, name, guided);
  };

  document.getElementById("learn-btn").onclick = () =>
    document.getElementById("learn-modal").classList.remove("hidden");
  document.getElementById("learn-close").onclick = () =>
    document.getElementById("learn-modal").classList.add("hidden");

  document.getElementById("draw-btn").onclick = onDraw;
  document.getElementById("pass-btn").onclick = onPass;

  document.getElementById("mute-btn").onclick = (e) => {
    const m = Audio.toggleMute();
    e.target.textContent = m ? "🔇" : "🔊";
  };

  document.getElementById("again-btn").onclick = () => {
    document.getElementById("winscreen").classList.add("hidden");
    document.getElementById("table").classList.add("hidden");
    document.getElementById("setup").classList.remove("hidden");
  };
});
