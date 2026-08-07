/* ════════════════════════════════════════════════════════════════
   character.js — making one, and reading one

   Pure. A character is a plain object that survives JSON.stringify, and
   every number you'd read off a sheet is DERIVED from it rather than
   stored, so nothing can drift out of agreement with itself. Change an
   ability score and AC, hit points, saves and carry weight all move.
   ════════════════════════════════════════════════════════════════ */

import { rollDetail } from "./dice.js";
import {
  ABILITIES, SKILLS, skillById, mod, profBonus, levelFromXP, xpToNext,
  ancestryById, classById, tradeById, strFromLift, LEVEL_CAP, KIT_ITEMS, STARTING_COIN
} from "./rules.js";

/* Armour you're handed is armour you're wearing. Nobody starts a
   campaign holding their chain mail. */
const EQUIP_ON_SIGHT = ["chainmail", "scalemail", "leather", "chainshirt", "halfplate", "shield"];

/* ── ability scores ───────────────────────────────────────────
   4d6, drop the lowest, six times. With permadeath on the table a
   genuinely cursed array shouldn't be something you have to accept, so
   a set is rerolled whole if nothing reaches 14 or the modifiers don't
   add up to at least +1. That's the standard table courtesy. */
export function rollArray(rnd = Math.random) {
  for (let attempt = 0; attempt < 40; attempt++) {
    const rolls = [];
    for (let i = 0; i < 6; i++) rolls.push(rollDetail("4d6kh3", rnd));
    const scores = rolls.map(r => r.total);
    const best = Math.max(...scores);
    const totalMod = scores.reduce((s, v) => s + mod(v), 0);
    if (best >= 14 && totalMod >= 1) return { scores, rolls, rerolled: attempt };
  }
  return { scores: [15, 14, 13, 12, 10, 8], rolls: [], rerolled: -1 };
}

export const STANDARD_ARRAY = [15, 14, 13, 12, 10, 8];

/* Real-person mode. Only lift maps to a score, and only by percentile —
   see the note in rules.js. Everything else is still rolled, because
   deriving Intelligence from a quiz is where this stops being charming. */
export function realPersonArray(liftLb, rnd = Math.random) {
  const str = strFromLift(liftLb);
  const rest = rollArray(rnd);
  /* drop the rolled STR, keep the other five, and let the player place them */
  const others = [...rest.scores].sort((a, b) => b - a).slice(0, 5);
  return { str, others, rolls: rest.rolls };
}

/* ── assembling one ───────────────────────────────────────────── */
export function makeCharacter(opts) {
  const anc = ancestryById(opts.ancestry);
  const cls = classById(opts.klass);
  const trade = tradeById(opts.trade);
  if (!anc || !cls) return null;

  const base = { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10, ...(opts.scores || {}) };

  const pc = {
    v: 1,
    name: (opts.name || "").trim() || "A carrier",
    ancestry: anc.id,
    klass: cls.id,
    trade: trade ? trade.id : null,
    subclass: opts.subclass || (cls.subclassAt === 1 && cls.subclasses[0] ? cls.subclasses[0].id : null),
    choice: opts.choice || null,          // draconic ancestry, dragon ancestor
    fightingStyle: opts.fightingStyle || null,
    base,                                  // rolled, before ancestry
    bonus: opts.bonus || {},               // half-elf's two free points
    skills: [...(opts.skills || [])],
    expertise: [...(opts.expertise || [])],
    spells: [...(opts.spells || [])],
    cantrips: [...(opts.cantrips || [])],
    xp: 0,
    hpLost: 0,
    hitDiceUsed: 0,
    inspiration: 0,
    exhaustion: 0,
    coin: STARTING_COIN[cls.id] || 0,
    pack: (cls.kit || []).map(id => ({ id, name: (KIT_ITEMS[id] || {}).name || id,
                                       lb: (KIT_ITEMS[id] || {}).lb || 0, qty: 1,
                                       equipped: EQUIP_ON_SIGHT.includes(id),
                                       note: (KIT_ITEMS[id] || {}).note || "" })),
    real: opts.real || null,              // {heightIn, liftLb} when built from a real person
    created: new Date().toISOString().slice(0, 10)
  };

  /* ancestry and trade skills come free and don't eat class picks */
  for (const s of (anc.skills || [])) if (!pc.skills.includes(s)) pc.skills.push(s);
  if (trade) for (const s of trade.skills) if (!pc.skills.includes(s)) pc.skills.push(s);
  if (trade && trade.item) {
    pc.pack.push({ id: trade.item, name: (KIT_ITEMS[trade.item] || {}).name || trade.item,
                   lb: (KIT_ITEMS[trade.item] || {}).lb || 1, qty: 1, note: "From your prior trade." });
  }
  return pc;
}

/* ── the sheet ────────────────────────────────────────────────
   Everything below is computed. Nothing here is stored. */
export function abilityScores(pc) {
  const anc = ancestryById(pc.ancestry);
  const out = { ...pc.base };
  for (const [k, v] of Object.entries(anc.asi || {})) out[k] = (out[k] || 10) + v;
  for (const [k, v] of Object.entries(pc.bonus || {})) out[k] = (out[k] || 10) + v;
  /* level 4 improvement */
  for (const [k, v] of Object.entries(pc.asi4 || {})) out[k] = (out[k] || 10) + v;
  for (const k of Object.keys(out)) out[k] = Math.min(20, out[k]);
  return out;
}
export const abilityMods = pc => {
  const s = abilityScores(pc), o = {};
  for (const a of ABILITIES) o[a.id] = mod(s[a.id]);
  return o;
};

export const level = pc => levelFromXP(pc.xp || 0);
export const prof = pc => profBonus(level(pc));

export function maxHP(pc) {
  const cls = classById(pc.klass), anc = ancestryById(pc.ancestry);
  const lv = level(pc), con = abilityMods(pc).con;
  let hp = cls.hitDie + con;                                   // level 1: max die
  const avg = Math.floor(cls.hitDie / 2) + 1;                  // fixed average after
  for (let i = 2; i <= lv; i++) hp += avg + con;
  if (anc.id === "dwarf") hp += lv;                            // Dwarven Toughness
  if (pc.subclass === "draconic") hp += lv;                    // Draconic Resilience
  return Math.max(1, hp);
}
export const currentHP = pc => Math.max(0, maxHP(pc) - (pc.hpLost || 0));

export function armorClass(pc) {
  const m = abilityMods(pc);
  const worn = (pc.pack || []).filter(i => i.equipped);
  const shield = worn.some(i => i.id === "shield") ? 2 : 0;
  const body = worn.find(i => ["chainmail", "scalemail", "leather", "chainshirt", "halfplate"].includes(i.id));

  let base;
  if (body) {
    base = { chainmail: 16, scalemail: 14 + Math.min(2, m.dex), leather: 11 + m.dex,
             chainshirt: 13 + Math.min(2, m.dex), halfplate: 15 + Math.min(2, m.dex) }[body.id];
  } else if (pc.klass === "barbarian") base = 10 + m.dex + m.con;   // Unarmored Defense
  else if (pc.subclass === "draconic") base = 13 + m.dex;           // Draconic Resilience
  else base = 10 + m.dex;

  if (pc.fightingStyle === "defense" && body) base += 1;
  return base + shield;
}

export function saves(pc) {
  const cls = classById(pc.klass), m = abilityMods(pc), p = prof(pc);
  const out = {};
  for (const a of ABILITIES) out[a.id] = m[a.id] + (cls.saves.includes(a.id) ? p : 0);
  return out;
}

export function skillMods(pc) {
  const m = abilityMods(pc), p = prof(pc), out = {};
  for (const s of SKILLS) {
    let v = m[s.ab];
    if (pc.skills.includes(s.id)) v += p;
    if (pc.expertise.includes(s.id)) v += p;
    out[s.id] = v;
  }
  return out;
}
export const passivePerception = pc => 10 + skillMods(pc).perception;

export function speed(pc) {
  const anc = ancestryById(pc.ancestry);
  let s = anc.speed;
  if (pc.klass === "barbarian" && level(pc) >= 5) s += 10;
  const ex = pc.exhaustion || 0;
  if (ex >= 2) s = Math.floor(s / 2);
  if (ex >= 5) s = 0;
  return s;
}

/* Carry weight is STR × 15 by the book. A porter's back is worth a
   little more than the book allows, and Gauntlets of Ogre Power are
   handled by the score itself. */
export function carryCapacity(pc) {
  const s = abilityScores(pc).str;
  const trade = tradeById(pc.trade);
  return s * 15 + (trade && trade.carry ? trade.carry : 0);
}
export function packWeight(pc) {
  const carried = (pc.pack || []).reduce((t, i) => t + (i.lb || 0) * (i.qty || 1), 0);
  const coinLb = (pc.coin || 0) / 100 * 0.02;   // 50 coins to the pound, near enough
  return Math.round((carried + coinLb) * 10) / 10;
}
export function encumbrance(pc) {
  const cap = carryCapacity(pc), w = packWeight(pc);
  if (w > cap) return { state: "over", note: "You cannot lift this.", cap, w };
  if (w > cap * 0.67) return { state: "heavy", note: "Speed drops by 20 ft.", cap, w };
  if (w > cap * 0.33) return { state: "laden", note: "Speed drops by 10 ft.", cap, w };
  return { state: "easy", note: "", cap, w };
}

/* ── spellcasting ─────────────────────────────────────────────── */
export function spellcasting(pc) {
  const cls = classById(pc.klass);
  if (!cls.caster && !cls.slots) return null;
  const lv = level(pc), m = abilityMods(pc), p = prof(pc);
  const ab = cls.castAbility;
  const slots = (cls.slots && cls.slots[lv]) ? [...cls.slots[lv]] : [];
  return {
    ability: ab,
    mod: m[ab],
    dc: 8 + p + m[ab],
    attack: p + m[ab],
    slots,
    cantripsKnown: cls.cantrips ? cls.cantrips[lv] : 0,
    spellsKnown: cls.spellsKnown ? cls.spellsKnown[lv] : null,
    prepared: cls.prepares ? Math.max(1, m[ab] + lv) : null
  };
}

/* ── features you actually have ───────────────────────────────── */
export function featuresAt(pc) {
  const cls = classById(pc.klass), lv = level(pc), out = [];
  for (let i = 1; i <= lv; i++) {
    for (const f of (cls.features[i] || [])) {
      if (f && f.length === 2) out.push({ level: i, name: f[0], text: f[1] });
    }
  }
  return out;
}

export function classResources(pc) {
  const cls = classById(pc.klass), lv = level(pc), out = [];
  if (cls.rages) out.push({ id: "rage", name: "Rages", max: cls.rages[lv] });
  if (cls.sneak) out.push({ id: "sneak", name: "Sneak Attack", value: cls.sneak[lv] + "d6" });
  if (cls.sorceryPoints && cls.sorceryPoints[lv]) out.push({ id: "sp", name: "Sorcery points", max: cls.sorceryPoints[lv] });
  out.push({ id: "hd", name: "Hit dice", max: lv, spent: pc.hitDiceUsed || 0, die: "d" + cls.hitDie });
  return out;
}

/* ── advancement ──────────────────────────────────────────────── */
export function awardXP(pc, amount) {
  const before = level(pc);
  pc.xp = Math.max(0, (pc.xp || 0) + Math.round(amount));
  const after = level(pc);
  return { before, after, levelled: after > before, xp: pc.xp, toNext: xpToNext(pc.xp) };
}

export function pendingChoices(pc) {
  const cls = classById(pc.klass), lv = level(pc), out = [];
  if (cls.subclassAt && lv >= cls.subclassAt && !pc.subclass)
    out.push({ id: "subclass", label: cls.subclassLabel, options: cls.subclasses });
  if (cls.fightingStyleAt && lv >= cls.fightingStyleAt && !pc.fightingStyle)
    out.push({ id: "style", label: "Fighting Style", options: cls.fightingStyles });
  if (lv >= 4 && !pc.asi4)
    out.push({ id: "asi4", label: "Ability Score Improvement" });
  return out;
}

/* ── rests ────────────────────────────────────────────────────
   Resources tick down over MILES, never over calendar days, so putting
   the phone away for two weeks never changes your state. */
export function shortRest(pc, diceSpent, rolls) {
  const healed = rolls.reduce((s, r) => s + r, 0) + diceSpent * abilityMods(pc).con;
  pc.hitDiceUsed = Math.min(level(pc), (pc.hitDiceUsed || 0) + diceSpent);
  pc.hpLost = Math.max(0, (pc.hpLost || 0) - Math.max(0, healed));
  return healed;
}
export function longRest(pc) {
  pc.hpLost = 0;
  pc.hitDiceUsed = Math.max(0, (pc.hitDiceUsed || 0) - Math.max(1, Math.floor(level(pc) / 2)));
  if (pc.exhaustion) pc.exhaustion--;
  return true;
}

export const isDead = pc => currentHP(pc) <= 0;
export { LEVEL_CAP };
