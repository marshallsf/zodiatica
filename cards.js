/* ZODIATICA - card data & deck construction (BADGE-EXACT)
 *
 * Matching is driven by exactly what is printed on each physical card:
 * each card exposes its CENTER subject + its TWO corner badges as match tokens.
 * Two cards match if they share at least one token. (Per the instructions:
 * "look at the card's images — top corners and center".)
 *
 * Token data below was transcribed directly from the 64 card faces in ../Source.
 * Special group rules from the instructions are encoded as the tokens
 * "sungroup" (Sun, solar eclipse, sunrise, sunset) and
 * "moongroup" (Moon, full moon, void moon, moon signs, lunar eclipse).
 */

const IMG_DIR = "assets/";

let _uid = 0;
function card(name, file, type, tags, extra = {}) {
  return Object.assign(
    { uid: ++_uid, name, file, type, tags: Array.from(new Set(tags)) },
    extra
  );
}

function buildDeck() {
  const D = [];

  // ---------- 24 SIGN cards (center sign + 2 printed badges) ----------
  const signs = [
    ["Aries", "aries.jpg", ["aries", "taurus", "saturn"]],
    ["Taurus", "taurus.jpg", ["taurus", "gemini", "planetx"]],
    ["Gemini", "gemini.jpg", ["gemini", "capricorn", "mars"]],
    ["Cancer", "cancer.jpg", ["cancer", "libra", "jupiter"]],
    ["Leo", "leo.jpg", ["leo", "scorpio", "neptune"]],
    ["Virgo", "virgo.jpg", ["virgo", "libra", "neptune"]],
    ["Libra", "libra.jpg", ["libra", "pisces", "neptune"]],
    ["Scorpio", "scorpio.jpg", ["scorpio", "aquarius", "mercury"]],
    ["Sagittarius", "sagitarius.jpg", ["sagittarius", "virgo", "venus"]],
    ["Capricorn", "capricorn.jpg", ["capricorn", "scorpio", "sun"]],
    ["Aquarius", "aquarius.jpg", ["aquarius", "virgo", "saturn"]],
    ["Pisces", "pisces.jpg", ["pisces", "aries", "earth"]],
    // "2" art variants
    ["Aries", "aries 2.jpg", ["aries", "taurus", "uranus"]],
    ["Taurus", "taurus 2.jpg", ["taurus", "sagittarius", "moon"]],
    ["Gemini", "gemini 2.jpg", ["gemini", "leo", "pluto"]],
    ["Cancer", "cancer 2.jpg", ["cancer", "taurus", "mars"]],
    ["Leo", "leo 2.jpg", ["leo", "cancer", "jupiter"]],
    ["Virgo", "virgo 2.jpg", ["virgo", "aries", "jupiter"]],
    ["Libra", "libra 2.jpg", ["libra", "cancer", "pluto"]],
    ["Scorpio", "scorpio 2.jpg", ["scorpio", "leo", "venus"]],
    ["Sagittarius", "sagitarius 2.jpg", ["sagittarius", "libra", "planetx"]],
    ["Capricorn", "capricorn 2.jpg", ["capricorn", "aquarius", "moon"]],
    ["Aquarius", "aquarius 2.jpg", ["aquarius", "capricorn", "sun"]],
    ["Pisces", "pisces 2.jpg", ["pisces", "sagittarius", "uranus"]],
  ];
  for (const [name, file, tags] of signs) D.push(card(name, file, "sign", tags));

  // ---------- 10 PLANET cards ----------
  const planets = [
    ["Mercury", "mercury.jpg", ["mercury", "cancer", "fire"]],
    ["Venus", "venus.jpg", ["venus", "scorpio", "spirit"]],
    ["Mars", "mars.jpg", ["mars", "pisces", "pluto"]],
    ["Jupiter", "jupiter.jpg", ["jupiter", "scorpio", "fire"]],
    ["Saturn", "saturn.jpg", ["saturn", "taurus", "cardinal"]],
    ["Uranus", "uranus.jpg", ["uranus", "virgo", "fire"]],
    ["Neptune", "neptune.jpg", ["neptune", "capricorn", "mutable"]],
    ["Pluto", "pluto.jpg", ["pluto", "aquarius", "sun"]],
    ["Sun", "sun.jpg", ["sun", "sungroup", "libra", "earth"]],
    ["Moon", "moon.jpg", ["moon", "moongroup", "libra", "mars"]],
  ];
  for (const [name, file, tags] of planets) D.push(card(name, file, "planet", tags));

  // ---------- 8 RETROGRADE cards (reverse the turn order) ----------
  const retros = [
    ["Mercury Retrograde", "mercury retrograde.jpg", ["mercury", "aquarius", "water"]],
    ["Venus Retrograde", "venus retrograde.jpg", ["venus", "cancer", "planetx"]],
    ["Mars Retrograde", "mars retrograde.jpg", ["mars", "virgo", "air"]],
    ["Jupiter Retrograde", "jupiter retrograde.jpg", ["jupiter", "pisces", "water"]],
    ["Saturn Retrograde", "saturn retrograde.jpg", ["saturn", "aries", "water"]],
    ["Uranus Retrograde", "uranus retrograde.jpg", ["uranus", "leo", "air"]],
    ["Neptune Retrograde", "neptune retrograde.jpg", ["neptune", "aquarius", "earth"]],
    ["Pluto Retrograde", "pluto retrograde.jpg", ["pluto", "gemini", "venus"]],
  ];
  for (const [name, file, tags] of retros)
    D.push(card(name, file, "retrograde", tags, { action: "reverse" }));

  // ---------- 10 SPECIAL cards (Sun group / Moon group / Rising) ----------
  const specials = [
    ["Full Moon", "full moon.jpg", ["moongroup", "sagittarius", "spirit"]],
    ["Void Moon", "void moon.jpg", ["moongroup", "taurus", "mutable"]],
    ["Moon Sign", "moon sign.jpg", ["moongroup", "aries", "saturn"]],
    ["Moon Sign", "moon sign 2.jpg", ["moongroup", "gemini", "mutable"]],
    ["Lunar Eclipse", "lunar eclipse.jpg", ["moongroup", "leo", "fixed"]],
    ["Solar Eclipse", "solar eclipse.jpg", ["sungroup", "pisces", "cardinal"]],
    ["Sunrise", "sunrise.jpg", ["sungroup", "capricorn", "mercury"]],
    ["Sunset", "sunset.jpg", ["sungroup", "taurus", "spirit"]],
    ["Rising Sign", "risign sign.jpg", ["rising", "pisces", "cardinal"]],
    ["Rising Sign", "risign sign 2.jpg", ["rising", "capricorn", "mercury"]],
  ];
  for (const [name, file, tags] of specials) D.push(card(name, file, "special", tags));

  // ---------- 2 PLANET X cards (normal cards — NOT wild) ----------
  D.push(card("Planet X", "planet x.jpg", "planetx", ["planetx", "gemini", "moon"]));
  D.push(card("Planet X", "planet x 2.jpg", "planetx", ["planetx", "virgo", "uranus"]));

  // ---------- 10 WILD cards (Elements & Modes) ----------
  const elementWilds = [
    ["Air", "air.jpg", "air"],
    ["Fire", "fire.jpg", "fire"],
    ["Water", "waters.jpg", "water"],
    ["Spirit", "spirit.jpg", "spirit"],
    ["Earth", "earth.jpg", "earth"],
    ["Earth", "earth 2.jpg", "earth"],
    ["Earth", "earth 3.jpg", "earth"],
  ];
  for (const [name, file, el] of elementWilds)
    D.push(card(name, file, "wild-element", [el], { wild: true, wildKind: "element", setsTag: el }));

  const modeWilds = [
    ["Cardinal", "cardinal.jpg", "cardinal"],
    ["Fixed", "fixed.jpg", "fixed"],
    ["Mutable", "mutable.jpg", "mutable"],
  ];
  for (const [name, file, m] of modeWilds)
    D.push(card(name, file, "wild-mode", [m], { wild: true, wildKind: "mode", setsTag: m }));

  return D;
}

// ---- Matching ----
function cardMatches(card, activeTags) {
  if (card.wild) return true;
  if (!activeTags || activeTags.length === 0) return true;
  return card.tags.some((t) => activeTags.includes(t));
}

function activeTagsFor(card, chosenTag) {
  if (card.wild) {
    if (card.wildKind === "choose") return chosenTag ? [chosenTag] : [];
    return [card.setsTag];
  }
  return card.tags;
}

// ---- Display helpers ----
const SIGN_GLYPH = {
  aries: "♈", taurus: "♉", gemini: "♊", cancer: "♋", leo: "♌", virgo: "♍",
  libra: "♎", scorpio: "♏", sagittarius: "♐", capricorn: "♑", aquarius: "♒", pisces: "♓",
};
const TAG_LABEL = {
  sungroup: "Sun", moongroup: "Moon", planetx: "Planet X",
  rising: "Rising Sign", water: "Water",
};
function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
function tagLabel(t) { return TAG_LABEL[t] || cap(t); }

function sharedTag(card, activeTags) {
  if (!activeTags || activeTags.length === 0) return null;
  return card.tags.find((t) => activeTags.includes(t)) || null;
}

// Learn / GUIDE screen: the true astrological correspondences (teaching reference)
const GUIDE_DATA = {
  aries: ["Mars", "Fire", "Cardinal"], taurus: ["Venus", "Earth", "Fixed"],
  gemini: ["Mercury", "Air", "Mutable"], cancer: ["Moon", "Water", "Cardinal"],
  leo: ["Sun", "Fire", "Fixed"], virgo: ["Mercury", "Earth", "Mutable"],
  libra: ["Venus", "Air", "Cardinal"], scorpio: ["Pluto", "Water", "Fixed"],
  sagittarius: ["Jupiter", "Fire", "Mutable"], capricorn: ["Saturn", "Earth", "Cardinal"],
  aquarius: ["Uranus", "Air", "Fixed"], pisces: ["Neptune", "Water", "Mutable"],
};
function guideRows() {
  return Object.entries(GUIDE_DATA).map(([sign, [planet, element, mode]]) => ({
    glyph: SIGN_GLYPH[sign], sign: cap(sign), planet, element, mode,
  }));
}
