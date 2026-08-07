/* ════════════════════════════════════════════════════════════════
   rules.js — the book

   SRD 5.1 content, used under CC-BY-4.0. Attribution is in ATTRIBUTION
   at the foot of this file and must ship with the app.

   Data only, plus the small pure functions that read it. No state, no
   DOM. Two deliberate departures from the book, both because this is a
   solo game played over months:

     XP_SOLO   — thresholds tripled. A lone character takes the whole
                 award instead of a quarter share, so untouched
                 thresholds would cap you a quarter of the way in.
     level cap — 5. Where 5e feels best, and where the sequel starts.
   ════════════════════════════════════════════════════════════════ */

export const LEVEL_CAP = 5;

export const ABILITIES = [
  { id: "str", name: "Strength",     short: "STR" },
  { id: "dex", name: "Dexterity",    short: "DEX" },
  { id: "con", name: "Constitution", short: "CON" },
  { id: "int", name: "Intelligence", short: "INT" },
  { id: "wis", name: "Wisdom",       short: "WIS" },
  { id: "cha", name: "Charisma",     short: "CHA" }
];

export const SKILLS = [
  { id: "acrobatics",  name: "Acrobatics",      ab: "dex" },
  { id: "animal",      name: "Animal Handling", ab: "wis" },
  { id: "arcana",      name: "Arcana",          ab: "int" },
  { id: "athletics",   name: "Athletics",       ab: "str" },
  { id: "deception",   name: "Deception",       ab: "cha" },
  { id: "history",     name: "History",         ab: "int" },
  { id: "insight",     name: "Insight",         ab: "wis" },
  { id: "intimidation",name: "Intimidation",    ab: "cha" },
  { id: "investigation",name:"Investigation",   ab: "int" },
  { id: "medicine",    name: "Medicine",        ab: "wis" },
  { id: "nature",      name: "Nature",          ab: "int" },
  { id: "perception",  name: "Perception",      ab: "wis" },
  { id: "performance", name: "Performance",     ab: "cha" },
  { id: "persuasion",  name: "Persuasion",      ab: "cha" },
  { id: "religion",    name: "Religion",        ab: "int" },
  { id: "sleight",     name: "Sleight of Hand", ab: "dex" },
  { id: "stealth",     name: "Stealth",         ab: "dex" },
  { id: "survival",    name: "Survival",        ab: "wis" }
];
export const skillById = id => SKILLS.find(s => s.id === id) || null;

export const mod = score => Math.floor((score - 10) / 2);
export const modStr = m => (m >= 0 ? "+" : "") + m;
export const profBonus = level => (level >= 5 ? 3 : 2);

/* Tripled. See the note at the top. */
export const XP_SOLO = [0, 0, 900, 2700, 8100, 19500];
export function levelFromXP(xp) {
  let lv = 1;
  for (let i = 2; i <= LEVEL_CAP; i++) if (xp >= XP_SOLO[i]) lv = i;
  return lv;
}
export function xpToNext(xp) {
  const lv = levelFromXP(xp);
  return lv >= LEVEL_CAP ? null : XP_SOLO[lv + 1] - xp;
}

/* ══════════════════════════ ANCESTRIES ═══════════════════════ */
export const ANCESTRIES = [
  { id: "dwarf", name: "Hill Dwarf", speed: 25, size: "Medium",
    asi: { con: 2, wis: 1 },
    traits: [
      "Darkvision 60 ft.",
      "Dwarven Resilience — advantage on saves against poison, and resistance to poison damage.",
      "Dwarven Toughness — one extra hit point per level.",
      "Stonecunning — count as proficient on History checks about stonework, with double proficiency.",
      "Speed 25 ft., and a heavy load never slows you."
    ],
    note: "Slow on the road, hard to put down. The extra hit point per level matters more to a lone carrier than to anyone in a party." },

  { id: "elf", name: "High Elf", speed: 30, size: "Medium",
    asi: { dex: 2, int: 1 },
    skills: ["perception"],
    traits: [
      "Darkvision 60 ft.",
      "Keen Senses — proficiency in Perception.",
      "Fey Ancestry — advantage against being charmed, and magic can't put you to sleep.",
      "Trance — four hours of meditation counts as a long rest's sleep.",
      "One wizard cantrip, cast with Intelligence."
    ],
    note: "Trance is quietly excellent on a road where camp is exposed for half the night." },

  { id: "halfling", name: "Lightfoot Halfling", speed: 25, size: "Small",
    asi: { dex: 2, cha: 1 },
    traits: [
      "Lucky — reroll a natural 1 on an attack, check, or save.",
      "Brave — advantage on saves against being frightened.",
      "Halfling Nimbleness — move through the space of any larger creature.",
      "Naturally Stealthy — hide behind a creature at least one size larger.",
      "Speed 25 ft."
    ],
    note: "Lucky is the single best survival trait in the book for someone with nobody to pick them up." },

  { id: "human", name: "Human", speed: 30, size: "Medium",
    asi: { str: 1, dex: 1, con: 1, int: 1, wis: 1, cha: 1 },
    traits: ["One point to every ability score.", "One extra language."],
    note: "No spikes, no holes. A rolled array with a bad number gets quietly repaired." },

  { id: "dragonborn", name: "Dragonborn", speed: 30, size: "Medium",
    asi: { str: 2, cha: 1 },
    choose: { id: "draconic", label: "Draconic ancestry",
      options: [
        { id: "red",   name: "Red — fire",        dmg: "fire",      breath: "15 ft. cone", save: "dex" },
        { id: "blue",  name: "Blue — lightning",  dmg: "lightning", breath: "5 by 30 ft. line", save: "dex" },
        { id: "green", name: "Green — poison",    dmg: "poison",    breath: "15 ft. cone", save: "con" },
        { id: "white", name: "White — cold",      dmg: "cold",      breath: "15 ft. cone", save: "con" },
        { id: "black", name: "Black — acid",      dmg: "acid",      breath: "5 by 30 ft. line", save: "dex" }
      ] },
    traits: [
      "Breath Weapon — once per rest, 2d6 damage in a cone or line (DC 8 + CON + proficiency for half).",
      "Resistance to your ancestry's damage type."
    ],
    note: "A once-a-rest area attack is worth a great deal when there are two of them and one of you." },

  { id: "gnome", name: "Rock Gnome", speed: 25, size: "Small",
    asi: { int: 2, con: 1 },
    traits: [
      "Darkvision 60 ft.",
      "Gnome Cunning — advantage on INT, WIS, and CHA saves against magic.",
      "Artificer's Lore — double proficiency on History checks about devices and constructs.",
      "Tinker — build a small clockwork device with tinker's tools.",
      "Speed 25 ft."
    ],
    note: "Artificer's Lore is not a throwaway here. The Ordinate left constructs behind, and somebody has to know what they were for." },

  { id: "halfelf", name: "Half-Elf", speed: 30, size: "Medium",
    asi: { cha: 2 },
    extraASI: { n: 2, amount: 1, label: "Two abilities of your choice gain +1" },
    extraSkills: 2,
    traits: [
      "Darkvision 60 ft.",
      "Fey Ancestry — advantage against being charmed, and magic can't put you to sleep.",
      "Skill Versatility — proficiency in two skills of your choice."
    ],
    note: "Two free skills is a lot of road when the only person who can pick a lock is you." },

  { id: "halforc", name: "Half-Orc", speed: 30, size: "Medium",
    asi: { str: 2, con: 1 },
    skills: ["intimidation"],
    traits: [
      "Darkvision 60 ft.",
      "Menacing — proficiency in Intimidation.",
      "Relentless Endurance — when dropped to 0 hit points, drop to 1 instead. Once per long rest.",
      "Savage Attacks — one extra damage die on a melee critical."
    ],
    note: "Relentless Endurance is a free second chance every long rest. Unbonded carriers should read that twice." },

  { id: "tiefling", name: "Tiefling", speed: 30, size: "Medium",
    asi: { cha: 2, int: 1 },
    traits: [
      "Darkvision 60 ft.",
      "Hellish Resistance — resistance to fire damage.",
      "Infernal Legacy — the thaumaturgy cantrip; hellish rebuke at 3rd level and darkness at 5th, once each per long rest, cast with Charisma."
    ],
    note: "Hellish rebuke is a reaction that punishes whatever just hit you, which is most things, since you're alone." }
];
export const ancestryById = id => ANCESTRIES.find(a => a.id === id) || null;

/* ══════════════════════════ CLASSES ══════════════════════════ */
const SLOTS_FULL = {           // cleric, sorcerer
  1: [2], 2: [3], 3: [4, 2], 4: [4, 3], 5: [4, 3, 2]
};
const SLOTS_HALF = {           // ranger
  1: [], 2: [2], 3: [3], 4: [3], 5: [4, 2]
};

export const CLASSES = [
  {
    id: "barbarian", name: "Barbarian", hitDie: 12,
    saves: ["str", "con"],
    skillCount: 2,
    skillsFrom: ["animal", "athletics", "intimidation", "nature", "perception", "survival"],
    armor: "Light and medium armour, shields",
    weapons: "Simple and martial weapons",
    primary: ["str", "con"],
    subclassAt: 3, subclassLabel: "Primal Path",
    subclasses: [{ id: "berserker", name: "Path of the Berserker",
      note: "Frenzy: rage with a bonus-action attack every turn, at the price of a level of exhaustion after." }],
    kit: ["greataxe", "handaxe", "handaxe", "explorer", "javelin4"],
    features: {
      1: [["Rage", "Bonus action. Advantage on STR checks and saves, +2 melee damage, resistance to bludgeoning, piercing and slashing. Two per long rest."],
          ["Unarmored Defense", "With no armour, AC is 10 + DEX + CON. A shield still works."]],
      2: [["Reckless Attack", "Trade advantage on your melee attacks for advantage on attacks against you."],
          ["Danger Sense", "Advantage on DEX saves against effects you can see."]],
      3: [["Frenzy", "Rage with a bonus-action melee attack each turn. One level of exhaustion when it ends."]],
      4: [["Ability Score Improvement", "+2 to one ability, or +1 to two."]],
      5: [["Extra Attack", "Attack twice when you take the Attack action."],
          ["Fast Movement", "+10 ft. speed out of heavy armour."]]
    },
    rages: { 1: 2, 2: 2, 3: 3, 4: 3, 5: 3 },
    note: "The solo character the book might as well have written. A d12, resistance to almost all physical damage, and no reliance on anyone else." },

  {
    id: "cleric", name: "Cleric", hitDie: 8,
    saves: ["wis", "cha"],
    skillCount: 2,
    skillsFrom: ["history", "insight", "medicine", "persuasion", "religion"],
    armor: "Light and medium armour, shields — and heavy armour, from the Life domain",
    weapons: "Simple weapons",
    primary: ["wis", "con"],
    caster: "full", castAbility: "wis", ritual: true,
    prepares: true,
    subclassAt: 1, subclassLabel: "Divine Domain",
    subclasses: [{ id: "life", name: "Life Domain",
      note: "Heavy armour, and every healing spell you cast restores extra hit points. The reason a lone cleric survives." }],
    kit: ["mace", "chainmail", "shield", "lightxbow", "priest", "holysymbol"],
    cantrips: { 1: 3, 2: 3, 3: 3, 4: 4, 5: 4 },
    slots: SLOTS_FULL,
    domainSpells: { 1: ["bless", "cure-wounds"], 3: ["lesser-restoration", "spiritual-weapon"], 5: ["beacon-of-hope", "revivify"] },
    features: {
      1: [["Spellcasting", "Prepare WIS modifier + level spells each long rest from the whole cleric list."],
          ["Disciple of Life", "Any spell of 1st level or higher that restores hit points restores an extra 2 + the spell's level."]],
      2: [["Channel Divinity", "Once per short rest: Turn Undead, or Preserve Life — heal 5 × level, split as you like."]],
      3: [],
      4: [["Ability Score Improvement", "+2 to one ability, or +1 to two."]],
      5: [["Destroy Undead", "Turned undead of CR ½ or lower are destroyed outright."]]
    },
    note: "The only class here that can put its own hit points back without spending coin. Life domain makes each one count for more." },

  {
    id: "rogue", name: "Rogue", hitDie: 8,
    saves: ["dex", "int"],
    skillCount: 4,
    skillsFrom: ["acrobatics", "athletics", "deception", "insight", "intimidation", "investigation",
                 "perception", "performance", "persuasion", "sleight", "stealth"],
    expertise: 2,
    armor: "Light armour",
    weapons: "Simple weapons, hand crossbows, longswords, rapiers, shortswords",
    tools: "Thieves' tools",
    primary: ["dex", "con"],
    subclassAt: 3, subclassLabel: "Roguish Archetype",
    subclasses: [{ id: "thief", name: "Thief",
      note: "Fast Hands: use an object, pick a lock, or Sleight of Hand as a bonus action. Second-Story Work: climbing costs nothing extra." }],
    kit: ["rapier", "shortbow", "leather", "dagger", "dagger", "thieftools", "burglar"],
    features: {
      1: [["Expertise", "Double proficiency on two of your skills."],
          ["Sneak Attack", "+1d6 once a turn when you have advantage, or when an ally is adjacent to the target."],
          ["Thieves' Cant", "A cant of signs and slang that hides meaning in plain speech."]],
      2: [["Cunning Action", "Dash, Disengage or Hide as a bonus action."]],
      3: [["Fast Hands", "Sleight of Hand, thieves' tools, or using an object as a bonus action."],
          ["Second-Story Work", "Climbing costs no extra movement; running jumps go further."]],
      4: [["Ability Score Improvement", "+2 to one ability, or +1 to two."]],
      5: [["Uncanny Dodge", "Reaction: halve the damage from one attack you can see."]]
    },
    sneak: { 1: 1, 2: 1, 3: 2, 4: 2, 5: 3 },
    note: "Sneak Attack normally wants an ally adjacent, which you won't have — so a solo rogue lives on Hide, Cunning Action, and shooting from cover. Uncanny Dodge at 5 is a genuine lifesaver." },

  {
    id: "ranger", name: "Ranger", hitDie: 10,
    saves: ["str", "dex"],
    skillCount: 3,
    skillsFrom: ["animal", "athletics", "insight", "investigation", "nature", "perception", "stealth", "survival"],
    armor: "Light and medium armour, shields",
    weapons: "Simple and martial weapons",
    primary: ["dex", "wis"],
    caster: "half", castAbility: "wis",
    subclassAt: 3, subclassLabel: "Ranger Archetype",
    subclasses: [{ id: "hunter", name: "Hunter",
      note: "Hunter's Prey: Colossus Slayer adds 1d8 to a wounded target once a turn — the best solo option on the list." }],
    kit: ["scalemail", "shortsword", "shortsword", "longbow", "arrows20", "explorer"],
    slots: SLOTS_HALF,
    spellsKnown: { 1: 0, 2: 2, 3: 3, 4: 3, 5: 4 },
    fightingStyleAt: 2,
    fightingStyles: [
      { id: "archery", name: "Archery", note: "+2 to ranged weapon attack rolls." },
      { id: "defense", name: "Defense", note: "+1 AC while wearing armour." },
      { id: "duelling", name: "Duelling", note: "+2 damage with a one-handed weapon and no other weapon in hand." },
      { id: "twoweapon", name: "Two-Weapon Fighting", note: "Add your ability modifier to the off-hand attack." }
    ],
    features: {
      1: [["Favoured Enemy", "Advantage on Survival to track them and INT checks to recall lore about them."],
          ["Natural Explorer", "In favoured terrain: no difficult terrain, never lost, alert while tracking, forage for two, and travel at full pace while paying attention."]],
      2: [["Fighting Style", "A way of fighting you've settled into."],
          ["Spellcasting", "A short list of spells known, cast with Wisdom."]],
      3: [["Colossus Slayer", "Once a turn, +1d8 damage to a creature below its hit point maximum."],
          ["Primeval Awareness", "Spend a slot to sense certain creature types within a mile."]],
      4: [["Ability Score Improvement", "+2 to one ability, or +1 to two."]],
      5: [["Extra Attack", "Attack twice when you take the Attack action."]]
    },
    note: "Natural Explorer is famously dead weight at tables that hand-wave travel. This entire game is travel." },

  {
    id: "sorcerer", name: "Sorcerer", hitDie: 6,
    saves: ["con", "cha"],
    skillCount: 2,
    skillsFrom: ["arcana", "deception", "insight", "intimidation", "persuasion", "religion"],
    armor: "None",
    weapons: "Daggers, darts, slings, quarterstaffs, light crossbows",
    primary: ["cha", "con"],
    caster: "full", castAbility: "cha",
    subclassAt: 1, subclassLabel: "Sorcerous Origin",
    subclasses: [{ id: "draconic", name: "Draconic Bloodline",
      note: "Hit points +1 per level, and AC 13 + DEX with no armour. Without it a d6 caster alone on a road does not last." }],
    kit: ["lightxbow", "bolts20", "dagger", "dagger", "explorer", "arcanefocus"],
    cantrips: { 1: 4, 2: 4, 3: 4, 4: 5, 5: 5 },
    slots: SLOTS_FULL,
    spellsKnown: { 1: 2, 2: 3, 3: 4, 4: 5, 5: 6 },
    sorceryPoints: { 1: 0, 2: 2, 3: 3, 4: 4, 5: 5 },
    choose: { id: "dragon", label: "Dragon ancestor",
      options: [
        { id: "red", name: "Red — fire", dmg: "fire" }, { id: "blue", name: "Blue — lightning", dmg: "lightning" },
        { id: "green", name: "Green — poison", dmg: "poison" }, { id: "white", name: "White — cold", dmg: "cold" },
        { id: "black", name: "Black — acid", dmg: "acid" }, { id: "gold", name: "Gold — fire", dmg: "fire" },
        { id: "silver", name: "Silver — cold", dmg: "cold" }, { id: "bronze", name: "Bronze — lightning", dmg: "lightning" }
      ] },
    features: {
      1: [["Spellcasting", "A short list of spells known, cast with Charisma."],
          ["Draconic Resilience", "One extra hit point per level. With no armour, AC is 13 + DEX."],
          ["Dragon Ancestor", "Double proficiency on CHA checks when dealing with dragons."]],
      2: [["Font of Magic", "Sorcery points, convertible to and from spell slots."]],
      3: [["Metamagic", "Two ways of bending a spell — Quickened, Twinned, Careful, Subtle, and the rest."]],
      4: [["Ability Score Improvement", "+2 to one ability, or +1 to two."]],
      5: [[]]
    },
    note: "Hard mode. A d6 hit die with nobody standing in front of you. It hits harder than anything else here and it will spend your potion money." }
];
export const classById = id => CLASSES.find(c => c.id === id) || null;

/* ══════════════════════ PRIOR TRADES ═════════════════════════
   Not SRD — the Errantry's own. What you did before you signed on.
   Two skills and a piece of kit, which is roughly what a background
   is worth without needing the whole apparatus.                    */
export const TRADES = [
  { id: "drover",   name: "Drover",       skills: ["animal", "survival"],       item: "rope",
    note: "You moved other people's livestock down other people's roads. You know which fords hold." },
  { id: "porter",   name: "Porter",       skills: ["athletics", "insight"],     item: "rope",
    note: "You carried for a living before you carried for the guild. Your back knows the difference between heavy and badly packed.", carry: 15 },
  { id: "clerk",    name: "Ordinate clerk",skills: ["history", "investigation"], item: "letters",
    note: "You worked in an office that filed things for a state that no longer exists. You can still read the hand." },
  { id: "poacher",  name: "Poacher",      skills: ["stealth", "survival"],      item: "hides",
    note: "Somebody else's wood, somebody else's deer. You were never caught, which is its own qualification." },
  { id: "pedlar",   name: "Pedlar",       skills: ["persuasion", "deception"],  item: "clothes",
    note: "You sold small things to people who didn't need them. You know what a road is worth to a stranger." },
  { id: "orderly",  name: "Orderly",      skills: ["medicine", "religion"],     item: "healerkit",
    note: "A temple infirmary, mostly mopping. You've seen what happens to people who walk too far on a bad leg." },
  { id: "gaoler",   name: "Reeve's man",  skills: ["intimidation", "perception"], item: "club",
    note: "You held a bridge, or a gate, or a door. Mostly you stood there and that was the job." },
  { id: "wright",   name: "Wheelwright",  skills: ["nature", "sleight"],        item: "hammer",
    note: "Carts break. You fixed them. It turns out that the Ordinate's constructs are also, in the end, machines." }
];
export const tradeById = id => TRADES.find(t => t.id === id) || null;

/* ═══════════════════ REAL-PERSON STRENGTH ════════════════════
   Height sets stride and nothing else. Weight sets nothing at all.
   Only what you can lift maps to a score, and it maps by percentile
   against the adult population rather than by the book's STR × 30,
   which would make an ordinary healthy person a mechanically bad
   character. Average maps to 10. Genuinely strong maps to 15 or 16.  */
export const LIFT_LADDER = [
  { lb: 60,  str: 8  }, { lb: 100, str: 9  }, { lb: 135, str: 10 },
  { lb: 175, str: 11 }, { lb: 225, str: 12 }, { lb: 285, str: 13 },
  { lb: 350, str: 14 }, { lb: 425, str: 15 }, { lb: 500, str: 16 }
];
export function strFromLift(lb) {
  if (!lb || lb <= 0) return 10;
  let out = 8;
  for (const step of LIFT_LADDER) if (lb >= step.lb) out = step.str;
  return Math.max(8, Math.min(16, out));
}
export function liftPercentile(lb) {
  const i = LIFT_LADDER.findIndex(s => lb < s.lb);
  if (i < 0) return 99;
  return Math.round((i / LIFT_LADDER.length) * 100);
}

/* ══════════════════════════ SPELLS ═══════════════════════════
   The subset that matters at levels 1–5 for the three casters here.
   Effects are one line — enough to choose with. Full text arrives
   with combat.                                                      */
export const SPELLS = [
  /* cantrips */
  { id: "sacred-flame",  name: "Sacred Flame",  lv: 0, cls: ["cleric"],  fx: "DEX save or 1d8 radiant. Cover doesn't help." },
  { id: "guidance",      name: "Guidance",      lv: 0, cls: ["cleric"],  fx: "Touch. +1d4 to one ability check within the minute. Concentration." },
  { id: "spare-dying",   name: "Spare the Dying",lv: 0, cls: ["cleric"], fx: "Touch a creature at 0 hit points and stabilise it." },
  { id: "thaumaturgy",   name: "Thaumaturgy",   lv: 0, cls: ["cleric"],  fx: "Small ominous effects — a booming voice, guttering flames, tremors." },
  { id: "light",         name: "Light",         lv: 0, cls: ["cleric", "sorcerer"], fx: "An object sheds bright light 20 ft." },
  { id: "resistance",    name: "Resistance",    lv: 0, cls: ["cleric"],  fx: "Touch. +1d4 to one saving throw within the minute. Concentration." },
  { id: "fire-bolt",     name: "Fire Bolt",     lv: 0, cls: ["sorcerer"], fx: "Ranged attack, 1d10 fire. 120 ft." },
  { id: "ray-frost",     name: "Ray of Frost",  lv: 0, cls: ["sorcerer"], fx: "Ranged attack, 1d8 cold, and speed drops by 10 ft." },
  { id: "shocking-grasp",name: "Shocking Grasp",lv: 0, cls: ["sorcerer"], fx: "Melee spell attack, 1d8 lightning; the target can't take reactions." },
  { id: "mage-hand",     name: "Mage Hand",     lv: 0, cls: ["sorcerer"], fx: "A spectral hand, 30 ft., 10 lb of lifting." },
  { id: "prestidigitation", name: "Prestidigitation", lv: 0, cls: ["sorcerer"], fx: "Small tricks — clean, chill, flavour, mark." },
  { id: "minor-illusion",name: "Minor Illusion",lv: 0, cls: ["sorcerer"], fx: "A sound or an image, 5-ft. cube, one minute." },
  { id: "acid-splash",   name: "Acid Splash",   lv: 0, cls: ["sorcerer"], fx: "DEX save or 1d6 acid. Can catch two adjacent creatures." },
  { id: "chill-touch",   name: "Chill Touch",   lv: 0, cls: ["sorcerer"], fx: "Ranged attack, 1d8 necrotic; the target can't regain hit points this turn." },

  /* 1st */
  { id: "cure-wounds",   name: "Cure Wounds",   lv: 1, cls: ["cleric", "ranger"], fx: "Touch. Heal 1d8 + casting modifier." },
  { id: "bless",         name: "Bless",         lv: 1, cls: ["cleric"],  fx: "+1d4 to attacks and saves for up to three creatures. Concentration, 1 minute." },
  { id: "healing-word",  name: "Healing Word",  lv: 1, cls: ["cleric"],  fx: "Bonus action, 60 ft. Heal 1d4 + modifier. Gets you up off the floor." },
  { id: "guiding-bolt",  name: "Guiding Bolt",  lv: 1, cls: ["cleric"],  fx: "Ranged spell attack, 4d6 radiant, and the next attack on it has advantage." },
  { id: "shield-faith",  name: "Shield of Faith",lv: 1, cls: ["cleric"], fx: "Bonus action. +2 AC for 10 minutes. Concentration." },
  { id: "inflict-wounds",name: "Inflict Wounds",lv: 1, cls: ["cleric"],  fx: "Melee spell attack, 3d10 necrotic." },
  { id: "detect-magic",  name: "Detect Magic",  lv: 1, cls: ["cleric", "ranger", "sorcerer"], fx: "Sense magic within 30 ft. Ritual." },
  { id: "hunters-mark",  name: "Hunter's Mark", lv: 1, cls: ["ranger"],  fx: "Bonus action. +1d6 weapon damage against one target, and advantage to track it. Concentration." },
  { id: "goodberry",     name: "Goodberry",     lv: 1, cls: ["ranger"],  fx: "Ten berries. Each restores 1 hit point and feeds someone for a day. Rations that heal." },
  { id: "longstrider",   name: "Longstrider",   lv: 1, cls: ["ranger"],  fx: "+10 ft. speed for an hour." },
  { id: "speak-animals", name: "Speak with Animals", lv: 1, cls: ["ranger"], fx: "Talk to beasts for 10 minutes. Ritual." },
  { id: "magic-missile", name: "Magic Missile", lv: 1, cls: ["sorcerer"], fx: "Three darts, 1d4+1 force each. Never misses." },
  { id: "shield",        name: "Shield",        lv: 1, cls: ["sorcerer"], fx: "Reaction. +5 AC until your next turn, and magic missile can't touch you." },
  { id: "burning-hands", name: "Burning Hands", lv: 1, cls: ["sorcerer"], fx: "15-ft. cone, DEX save, 3d6 fire." },
  { id: "sleep",         name: "Sleep",         lv: 1, cls: ["sorcerer"], fx: "5d8 hit points of creatures fall unconscious, lowest first. No save." },
  { id: "charm-person",  name: "Charm Person",  lv: 1, cls: ["sorcerer"], fx: "WIS save or the target is friendly for an hour." },
  { id: "expeditious",   name: "Expeditious Retreat", lv: 1, cls: ["sorcerer"], fx: "Bonus action to Dash, every turn, for 10 minutes. Concentration." },
  { id: "thunderwave",   name: "Thunderwave",   lv: 1, cls: ["sorcerer"], fx: "15-ft. cube, CON save, 2d8 thunder and pushed 10 ft. away." },

  /* 2nd */
  { id: "spiritual-weapon", name: "Spiritual Weapon", lv: 2, cls: ["cleric"], fx: "Bonus action. A floating weapon attacks for 1d8 + modifier, every turn, no concentration." },
  { id: "lesser-restoration", name: "Lesser Restoration", lv: 2, cls: ["cleric", "ranger"], fx: "End one disease, or blinded, deafened, paralysed or poisoned." },
  { id: "aid",           name: "Aid",           lv: 2, cls: ["cleric"],  fx: "+5 maximum and current hit points for eight hours." },
  { id: "hold-person",   name: "Hold Person",   lv: 2, cls: ["cleric", "sorcerer"], fx: "WIS save or paralysed. Melee attacks on it auto-crit. Concentration." },
  { id: "silence",       name: "Silence",       lv: 2, cls: ["cleric", "ranger"], fx: "A 20-ft. sphere where no sound exists and no verbal spell can be cast. Ritual." },
  { id: "pass-without",  name: "Pass Without Trace", lv: 2, cls: ["ranger"], fx: "+10 to Stealth and no tracking. Concentration." },
  { id: "spike-growth",  name: "Spike Growth",  lv: 2, cls: ["ranger"], fx: "20-ft. radius of thorns. 2d4 damage per 5 ft. moved. Concentration." },
  { id: "misty-step",    name: "Misty Step",    lv: 2, cls: ["sorcerer"], fx: "Bonus action. Teleport 30 ft. to somewhere you can see." },
  { id: "scorching-ray", name: "Scorching Ray", lv: 2, cls: ["sorcerer"], fx: "Three rays, separate attacks, 2d6 fire each." },
  { id: "mirror-image",  name: "Mirror Image",  lv: 2, cls: ["sorcerer"], fx: "Three duplicates. Attacks may hit one of those instead. No concentration." },
  { id: "invisibility",  name: "Invisibility",  lv: 2, cls: ["sorcerer"], fx: "Invisible for an hour, until you attack or cast. Concentration." },
  { id: "web",           name: "Web",           lv: 2, cls: ["sorcerer"], fx: "20-ft. cube of webbing. DEX save or restrained. Concentration." },

  /* 3rd */
  { id: "revivify",      name: "Revivify",      lv: 3, cls: ["cleric"],  fx: "Bring back someone dead less than a minute. 300 gp of diamond, gone." },
  { id: "spirit-guardians", name: "Spirit Guardians", lv: 3, cls: ["cleric"], fx: "15-ft. aura, 3d8 radiant and half speed. Concentration." },
  { id: "beacon-of-hope",name: "Beacon of Hope",lv: 3, cls: ["cleric"],  fx: "Advantage on WIS and death saves, and maximum healing. Concentration." },
  { id: "dispel-magic",  name: "Dispel Magic",  lv: 3, cls: ["cleric", "sorcerer"], fx: "End a spell of 3rd level or lower. Higher needs a check." },
  { id: "fireball",      name: "Fireball",      lv: 3, cls: ["sorcerer"], fx: "20-ft. radius, DEX save, 8d6 fire. Careful where you stand." },
  { id: "counterspell",  name: "Counterspell",  lv: 3, cls: ["sorcerer"], fx: "Reaction. Stop a spell of 3rd level or lower outright." },
  { id: "fly",           name: "Fly",           lv: 3, cls: ["sorcerer"], fx: "60 ft. flying speed for 10 minutes. Concentration." },
  { id: "haste",         name: "Haste",         lv: 3, cls: ["sorcerer"], fx: "Double speed, +2 AC, advantage on DEX saves, one extra action. Concentration." },
  { id: "lightning-bolt",name: "Lightning Bolt",lv: 3, cls: ["sorcerer"], fx: "100-ft. line, DEX save, 8d6 lightning." }
];
export const spellsFor = (clsId, lv) => SPELLS.filter(s => s.cls.includes(clsId) && s.lv === lv);
export const spellById = id => SPELLS.find(s => s.id === id) || null;

/* ══════════════════════ STARTING KIT ═════════════════════════
   Item ids here are the loot table's where they overlap; the rest are
   pack-only and priced for the shop later.                          */
export const KIT_ITEMS = {
  greataxe:   { name: "Greataxe",           lb: 7,  note: "1d12 slashing, heavy, two-handed" },
  javelin4:   { name: "Javelins ×4",        lb: 8,  note: "1d6 piercing, thrown 30/120" },
  mace:       { name: "Mace",               lb: 4,  note: "1d6 bludgeoning" },
  chainmail:  { name: "Chain mail",         lb: 55, note: "AC 16, disadvantage on Stealth, STR 13 or your speed drops" },
  shield:     { name: "Shield",             lb: 6,  note: "+2 AC" },
  rapier:     { name: "Rapier",             lb: 2,  note: "1d8 piercing, finesse" },
  shortbow:   { name: "Shortbow",           lb: 2,  note: "1d6 piercing, 80/320" },
  longbow:    { name: "Longbow",            lb: 2,  note: "1d8 piercing, 150/600, heavy, two-handed" },
  shortsword: { name: "Shortsword",         lb: 2,  note: "1d6 piercing, finesse, light" },
  scalemail:  { name: "Scale mail",         lb: 45, note: "AC 14 + DEX (max 2), disadvantage on Stealth" },
  leather:    { name: "Leather armour",     lb: 10, note: "AC 11 + DEX" },
  dagger:     { name: "Dagger",             lb: 1,  note: "1d4 piercing, finesse, light, thrown" },
  handaxe:    { name: "Handaxe",            lb: 2,  note: "1d6 slashing, light, thrown" },
  lightxbow:  { name: "Light crossbow",     lb: 5,  note: "1d8 piercing, loading, 80/320" },
  arrows20:   { name: "Arrows ×20",         lb: 1,  note: "" },
  bolts20:    { name: "Crossbow bolts ×20", lb: 1.5,note: "" },
  thieftools: { name: "Thieves' tools",     lb: 1,  note: "" },
  holysymbol: { name: "Holy symbol",        lb: 1,  note: "A spellcasting focus" },
  arcanefocus:{ name: "Arcane focus",       lb: 2,  note: "A spellcasting focus" },
  explorer:   { name: "Explorer's pack",    lb: 59, note: "Backpack, bedroll, mess kit, tinderbox, 10 torches, 10 days' rations, waterskin, 50 ft. of rope" },
  priest:     { name: "Priest's pack",      lb: 24, note: "Backpack, blanket, 10 candles, tinderbox, alms box, incense, censer, vestments, 2 days' rations, waterskin" },
  burglar:    { name: "Burglar's pack",     lb: 44, note: "Backpack, ball bearings, 10 ft. string, bell, 5 candles, crowbar, hammer, 10 pitons, hooded lantern, 2 flasks of oil, 5 days' rations, tinderbox, waterskin, 50 ft. of rope" }
};

export const STARTING_COIN = { barbarian: 5000, cleric: 5000, rogue: 5000, ranger: 5000, sorcerer: 5000 };

export const ATTRIBUTION = "This work includes material from the System Reference Document 5.1 " +
  "(“SRD 5.1”) by Wizards of the Coast LLC, available at https://dnd.wizards.com/resources/systems-reference-document. " +
  "The SRD 5.1 is licensed under the Creative Commons Attribution 4.0 International License, " +
  "available at https://creativecommons.org/licenses/by/4.0/legalcode.";
