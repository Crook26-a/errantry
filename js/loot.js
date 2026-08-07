/* ════════════════════════════════════════════════════════════════
   loot.js — purses, tiers, and what it costs you to carry them

   Two axes, because the map notes use both:

   PURSE CATEGORY (1–5) is coin. A category means the same thing
   everywhere, but scales with the region's threat, so "a purse" off a
   Kept Vale bandit and "a purse" off something in the Reversion are the
   same idea and very different money. One table, five regions.

   TIER (1–4) is goods. Tier is about what the thing IS, not what it's
   worth — a tier 1 roll is road gear and trade stock, tier 4 is the
   sort of thing a campaign turns on.

   Everything carries a WEIGHT. That's the point. A haul you can't lift
   isn't a reward, it's a decision, and the decision is the game.
   ════════════════════════════════════════════════════════════════ */

import { rollDetail, pickSome, between, roll } from "./dice.js";

/* ── coin ─────────────────────────────────────────────────────
   Stored as copper, always an integer. No floating point, no
   five-currency bookkeeping — gold, silver and copper, which is all
   anyone ever actually uses. */
export const CP = 1, SP = 10, GP = 100;

export function coinStr(cp) {
  cp = Math.max(0, Math.round(cp));
  if (!cp) return "nothing";
  const g = Math.floor(cp / GP), s = Math.floor((cp % GP) / SP), c = cp % SP;
  const parts = [];
  if (g) parts.push(g + " gp");
  if (s) parts.push(s + " sp");
  if (c) parts.push(c + " cp");
  return parts.join(" ");
}
export function coinShort(cp) {
  cp = Math.max(0, Math.round(cp));
  if (cp >= GP) return (cp / GP).toFixed(cp % GP ? 1 : 0) + "g";
  if (cp >= SP) return Math.floor(cp / SP) + "s";
  return cp + "c";
}

/* What a place is worth robbing for. Values are Kept Vale money;
   REGION_PURSE scales them outward. */
export const PURSE = [
  null,
  { cat: 1, name: "Scraps",        dice: "3d6",      unit: SP, note: "What's in a dead man's pocket." },
  { cat: 2, name: "A purse",       dice: "2d6",      unit: GP, note: "A working take. A bandit's week." },
  { cat: 3, name: "A takings-box", dice: "4d6",      unit: GP, note: "A month of somebody's tolls." },
  { cat: 4, name: "A strongbox",   dice: "2d6*5",    unit: GP, note: "Worth robbing on purpose." },
  { cat: 5, name: "A chest",       dice: "4d6*10",   unit: GP, note: "Worth dying for. People have." }
];

/* Region threat 1–5. The same category, further out. */
export const REGION_PURSE = { 1: 1, 2: 1.5, 3: 2.5, 4: 4, 5: 6 };

export function rollPurse(cat, threat = 1, rnd = Math.random) {
  const p = PURSE[cat];
  if (!p) return { cp: 0, name: "nothing", detail: null };
  const d = rollDetail(p.dice, rnd);
  const mult = REGION_PURSE[threat] || 1;
  return { cp: Math.round(d.total * p.unit * mult), name: p.name, detail: d, cat };
}

/* ── goods ────────────────────────────────────────────────────
   lb  — pounds, the currency that actually hurts
   cp  — market value in copper; you sell at SELL_RATE
   stack — [min,max] quantity when it's the sort of thing that comes
           in a bundle
   w   — draw weight within its tier (higher = commoner)              */
export const SELL_RATE = 0.5;

export const ITEMS = [
  /* ── TIER 1 · road gear, trade stock, what everyone has ──────── */
  { id: "rations",    name: "Rations",            tier: 1, kind: "supply",  lb: 2,   cp: 50,   stack: [1, 4], w: 5, note: "A day's food, per unit." },
  { id: "waterskin",  name: "Waterskin",          tier: 1, kind: "supply",  lb: 5,   cp: 20,   w: 3 },
  { id: "torches",    name: "Torches",            tier: 1, kind: "supply",  lb: 1,   cp: 1,    stack: [3, 10], w: 5 },
  { id: "tinderbox",  name: "Tinderbox",          tier: 1, kind: "supply",  lb: 1,   cp: 50,   w: 3 },
  { id: "bedroll",    name: "Bedroll",            tier: 1, kind: "camp",    lb: 7,   cp: 100,  w: 3 },
  { id: "blanket",    name: "Wool blanket",       tier: 1, kind: "camp",    lb: 3,   cp: 50,   w: 3 },
  { id: "messkit",    name: "Mess kit",           tier: 1, kind: "camp",    lb: 1,   cp: 20,   w: 2 },
  { id: "rope",       name: "Hempen rope, 50 ft", tier: 1, kind: "tool",    lb: 10,  cp: 100,  w: 3 },
  { id: "crowbar",    name: "Crowbar",            tier: 1, kind: "tool",    lb: 5,   cp: 200,  w: 2 },
  { id: "hammer",     name: "Hammer",             tier: 1, kind: "tool",    lb: 3,   cp: 100,  w: 2 },
  { id: "pitons",     name: "Iron pitons",        tier: 1, kind: "tool",    lb: 0.25, cp: 5,   stack: [4, 10], w: 2 },
  { id: "whetstone",  name: "Whetstone",          tier: 1, kind: "tool",    lb: 1,   cp: 1,    w: 3 },
  { id: "oilflask",   name: "Flask of oil",       tier: 1, kind: "supply",  lb: 1,   cp: 10,   stack: [1, 3], w: 3 },
  { id: "lantern",    name: "Hooded lantern",     tier: 1, kind: "supply",  lb: 2,   cp: 500,  w: 1 },
  { id: "dagger",     name: "Dagger",             tier: 1, kind: "weapon",  lb: 1,   cp: 200,  w: 4, note: "1d4 piercing, finesse, light, thrown." },
  { id: "club",       name: "Club",               tier: 1, kind: "weapon",  lb: 2,   cp: 10,   w: 3, note: "1d4 bludgeoning, light." },
  { id: "handaxe",    name: "Handaxe",            tier: 1, kind: "weapon",  lb: 2,   cp: 500,  w: 3, note: "1d6 slashing, light, thrown." },
  { id: "spear",      name: "Spear",              tier: 1, kind: "weapon",  lb: 3,   cp: 100,  w: 3, note: "1d6 piercing, thrown, versatile (1d8)." },
  { id: "arrows",     name: "Arrows",             tier: 1, kind: "ammo",    lb: 0.05, cp: 5,   stack: [10, 40], w: 4 },
  { id: "leather",    name: "Leather armour",     tier: 1, kind: "armor",   lb: 10,  cp: 1000, w: 2, note: "AC 11 + Dex." },
  { id: "shield",     name: "Shield",             tier: 1, kind: "armor",   lb: 6,   cp: 1000, w: 2, note: "+2 AC." },
  { id: "clothes",    name: "Common clothes",     tier: 1, kind: "goods",   lb: 3,   cp: 50,   w: 3 },
  { id: "hides",      name: "Bundle of hides",    tier: 1, kind: "trade",   lb: 15,  cp: 200,  w: 3, note: "Dead weight. Sells anywhere." },
  { id: "grain",      name: "Sack of grain",      tier: 1, kind: "trade",   lb: 20,  cp: 100,  w: 2, note: "Heavy, cheap, always wanted." },
  { id: "cloth",      name: "Bolt of coarse cloth", tier: 1, kind: "trade", lb: 10,  cp: 400,  w: 2 },
  { id: "copperingot",name: "Copper ingot",       tier: 1, kind: "trade",   lb: 8,   cp: 300,  w: 2 },
  { id: "tallow",     name: "Keg of tallow",      tier: 1, kind: "trade",   lb: 25,  cp: 250,  w: 1 },
  { id: "letters",    name: "Bundle of letters",  tier: 1, kind: "goods",   lb: 0.5, cp: 0,    w: 2, note: "Somebody's. Not yours." },

  /* ── TIER 2 · what a carrier saves up for ────────────────────── */
  { id: "potion",     name: "Potion of Healing",  tier: 2, kind: "potion",  lb: 0.5, cp: 5000, w: 6, note: "2d4+2 hit points. Infrastructure, not treasure." },
  { id: "antitoxin",  name: "Antitoxin",          tier: 2, kind: "potion",  lb: 0,   cp: 5000, w: 2, note: "Advantage on poison saves, 1 hour." },
  { id: "healerkit",  name: "Healer's kit",       tier: 2, kind: "tool",    lb: 3,   cp: 500,  w: 4, note: "Ten uses. Stabilises without a roll." },
  { id: "thieftools", name: "Thieves' tools",     tier: 2, kind: "tool",    lb: 1,   cp: 2500, w: 3 },
  { id: "shortsword", name: "Shortsword",         tier: 2, kind: "weapon",  lb: 2,   cp: 1000, w: 4, note: "1d6 piercing, finesse, light." },
  { id: "longsword",  name: "Longsword",          tier: 2, kind: "weapon",  lb: 3,   cp: 1500, w: 4, note: "1d8 slashing, versatile (1d10)." },
  { id: "battleaxe",  name: "Battleaxe",          tier: 2, kind: "weapon",  lb: 4,   cp: 1000, w: 3, note: "1d8 slashing, versatile (1d10)." },
  { id: "warhammer",  name: "Warhammer",          tier: 2, kind: "weapon",  lb: 2,   cp: 1500, w: 3, note: "1d8 bludgeoning, versatile (1d10)." },
  { id: "rapier",     name: "Rapier",             tier: 2, kind: "weapon",  lb: 2,   cp: 2500, w: 2, note: "1d8 piercing, finesse." },
  { id: "shortbow",   name: "Shortbow",           tier: 2, kind: "weapon",  lb: 2,   cp: 2500, w: 3, note: "1d6 piercing, range 80/320." },
  { id: "lightxbow",  name: "Light crossbow",     tier: 2, kind: "weapon",  lb: 5,   cp: 2500, w: 2, note: "1d8 piercing, loading." },
  { id: "chainshirt", name: "Chain shirt",        tier: 2, kind: "armor",   lb: 20,  cp: 5000, w: 3, note: "AC 13 + Dex (max 2)." },
  { id: "scalemail",  name: "Scale mail",         tier: 2, kind: "armor",   lb: 45,  cp: 5000, w: 2, note: "AC 14 + Dex (max 2). Heavy on a long road." },
  { id: "silverdag",  name: "Silvered dagger",    tier: 2, kind: "weapon",  lb: 1,   cp: 10200, w: 1, note: "Some things only silver touches." },
  { id: "holysymbol", name: "Silver holy symbol", tier: 2, kind: "focus",   lb: 1,   cp: 500,  w: 2 },
  { id: "finecloak",  name: "Fine cloak",         tier: 2, kind: "goods",   lb: 2,   cp: 1500, w: 3 },
  { id: "silverring", name: "Silver ring",        tier: 2, kind: "valuable",lb: 0,   cp: 2500, w: 3 },
  { id: "gemstone",   name: "Cut gemstone",       tier: 2, kind: "valuable",lb: 0,   cp: 0, valueRoll: "2d6*10", unit: GP, w: 3, note: "No weight at all. The best kind of money." },
  { id: "silveringot",name: "Silver ingot",       tier: 2, kind: "trade",   lb: 8,   cp: 2500, w: 2 },
  { id: "finewine",   name: "Bottle of fine wine",tier: 2, kind: "trade",   lb: 3,   cp: 1000, w: 2 },
  { id: "spice",      name: "Box of spice",       tier: 2, kind: "trade",   lb: 2,   cp: 3000, w: 2, note: "Light and dear. Carriers dream of this." },
  { id: "charter",    name: "Sealed Ordinate charter", tier: 2, kind: "paper", lb: 0.5, cp: 0, w: 1, note: "Nobody living can read it. Somebody will pay to." },

  /* ── TIER 3 · uncommon. Changes how you play. ─────────────────── */
  { id: "potion2",    name: "Potion of Greater Healing", tier: 3, kind: "potion", lb: 0.5, cp: 15000, w: 5, note: "4d4+4 hit points." },
  { id: "weapon1",    name: "Weapon, +1",         tier: 3, kind: "weapon",  lb: 3,   cp: 30000, w: 4, note: "+1 to attack and damage." },
  { id: "armor1",     name: "Armour, +1",         tier: 3, kind: "armor",   lb: 20,  cp: 40000, w: 2, note: "+1 AC." },
  { id: "cloakprot",  name: "Cloak of Protection",tier: 3, kind: "wondrous",lb: 1,   cp: 35000, w: 3, note: "+1 AC and saves. Attunement." },
  { id: "bootself",   name: "Boots of Elvenkind", tier: 3, kind: "wondrous",lb: 1,   cp: 25000, w: 3, note: "Advantage on Stealth. Your steps make no sound." },
  { id: "gogglesnight",name:"Goggles of Night",   tier: 3, kind: "wondrous",lb: 1,   cp: 25000, w: 3, note: "Darkvision 60 ft." },
  { id: "ringswim",   name: "Ring of Swimming",   tier: 3, kind: "wondrous",lb: 0,   cp: 20000, w: 2, note: "Swim speed 40 ft. Attunement." },
  { id: "gauntlets",  name: "Gauntlets of Ogre Power", tier: 3, kind: "wondrous", lb: 2, cp: 40000, w: 2, note: "Strength becomes 19. Carry weight with it." },
  { id: "bagholding", name: "Bag of Holding",     tier: 3, kind: "wondrous",lb: 15,  cp: 40000, w: 1, note: "Holds 500 lb in 64 cubic feet, and weighs 15 lb no matter what's in it. The most wanted thing on the road." },
  { id: "halfplate",  name: "Half plate",         tier: 3, kind: "armor",   lb: 40,  cp: 75000, w: 1, note: "AC 15 + Dex (max 2). Forty pounds of it." },
  { id: "necklace",   name: "Gold necklace",      tier: 3, kind: "valuable",lb: 0,   cp: 0, valueRoll: "2d6*25", unit: GP, w: 3 },
  { id: "plate",      name: "Ordinate survey plate", tier: 3, kind: "paper", lb: 4,  cp: 15000, w: 2, note: "A cast bronze sheet of the old survey. Heavy, and worth more to the right archive than to any market." },

  /* ── TIER 4 · rare. A campaign turns on these. ────────────────── */
  { id: "potion3",    name: "Potion of Superior Healing", tier: 4, kind: "potion", lb: 0.5, cp: 50000, w: 4, note: "8d4+8 hit points." },
  { id: "weapon2",    name: "Weapon, +2",         tier: 4, kind: "weapon",  lb: 3,   cp: 80000, w: 3 },
  { id: "ringprot",   name: "Ring of Protection", tier: 4, kind: "wondrous",lb: 0,   cp: 90000, w: 2, note: "+1 AC and saves. Attunement." },
  { id: "bootsspeed", name: "Boots of Speed",     tier: 4, kind: "wondrous",lb: 1,   cp: 80000, w: 2, note: "Double speed for 10 minutes a day." },
  { id: "elvenchain", name: "Elven chain",        tier: 4, kind: "armor",   lb: 20,  cp: 80000, w: 2, note: "AC 13 + Dex (max 2). No proficiency needed." },
  { id: "struckroll", name: "A struck-out survey roll", tier: 4, kind: "paper", lb: 1, cp: 0, w: 1, note: "A page of the Ordinate's own numbering, with a stretch of it scored through. Priceless, unsellable, and the reason any of this started." }
];

export const byTier = t => ITEMS.filter(i => i.tier === t);
export const itemById = id => ITEMS.find(i => i.id === id) || null;

/* One rolled instance of a thing: quantity resolved, value resolved. */
export function instance(item, rnd = Math.random) {
  const qty = item.stack ? between(item.stack[0], item.stack[1], rnd) : 1;
  let each = item.cp;
  if (item.valueRoll) each = roll(item.valueRoll, rnd) * (item.unit || 1);
  return {
    id: item.id, name: item.name, kind: item.kind, tier: item.tier,
    qty, lb: item.lb, cp: each, note: item.note || ""
  };
}

export function rollItems(tier, n, rnd = Math.random) {
  if (n <= 0) return [];
  return pickSome(byTier(tier), n, rnd).filter(Boolean).map(i => instance(i, rnd));
}

/* ── the roller a site actually calls ─────────────────────────
   spec mirrors how the map notes are written:
     { coin: 2, t1: 3, t2: 1 }
   is "gold category 2, three tier 1 items, one tier 2 item".        */
export function rollLoot(spec = {}, ctx = {}) {
  const rnd = ctx.rnd || Math.random;
  const threat = ctx.threat || 1;
  const items = [
    ...rollItems(1, spec.t1 || 0, rnd),
    ...rollItems(2, spec.t2 || 0, rnd),
    ...rollItems(3, spec.t3 || 0, rnd),
    ...rollItems(4, spec.t4 || 0, rnd)
  ];
  const purse = spec.coin ? rollPurse(spec.coin, threat, rnd) : { cp: 0, name: null };
  return {
    coin: purse.cp,
    purseName: purse.name,
    items,
    lb: totalWeight(items),
    cp: purse.cp + totalValue(items)
  };
}

export function totalWeight(items) {
  return Math.round(items.reduce((s, i) => s + i.lb * i.qty, 0) * 10) / 10;
}
export function totalValue(items) {
  return items.reduce((s, i) => s + i.cp * i.qty, 0);
}
export function sellValue(items) {
  return Math.floor(totalValue(items) * SELL_RATE);
}

/* Sort a haul the way a carrier would look at it: what's worth the most
   per pound goes in the pack first, and the grain gets left behind. */
export function byWorthPerPound(items) {
  return [...items].sort((a, b) => {
    const av = a.lb ? (a.cp / a.lb) : Infinity;
    const bv = b.lb ? (b.cp / b.lb) : Infinity;
    return bv - av;
  });
}

/* What the map notes call for, named so sites can reference it. */
export const SITE_SPECS = {
  banditCave:   { coin: 2, t1: 3, t2: 1 },
  banditPurse:  { coin: 1, t1: 1 },
  tollBox:      { coin: 3, t1: 1, t2: 1 },
  caravanWreck: { coin: 2, t1: 4, t2: 1 },
  wardenCache:  { coin: 3, t2: 2, t3: 1 },
  strongbox:    { coin: 4, t2: 2, t3: 1 },
  hoard:        { coin: 5, t2: 3, t3: 2, t4: 1 }
};
