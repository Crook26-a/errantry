/* ════════════════════════════════════════════════════════════════
   charui.js — signing on, and the sheet afterwards

   A stepped flow rather than one long form, because six decisions on
   one phone screen is a wall. Each step renders from `d` (the draft)
   and nothing else, so going back never loses a choice.
   ════════════════════════════════════════════════════════════════ */

import { esc, mi } from "./ui.js";
import * as R from "./rules.js";
import * as CH from "./character.js";

export const STEPS = ["who", "class", "abilities", "trade", "skills", "spells", "warrant"];

export function blankDraft() {
  return {
    step: "who", name: "", ancestry: null, klass: null, subclass: null,
    choice: {}, method: null, pool: [], assign: {}, real: { heightIn: "", liftLb: "" },
    bonus: {}, own: ["", "", "", "", "", ""], trade: null, skills: [], expertise: [], cantrips: [], spells: [],
    deathMode: "bonded", rolls: []
  };
}

/* Steps a given draft actually needs — a barbarian never sees spells. */
export function stepsFor(d) {
  const cls = d.klass ? R.classById(d.klass) : null;
  return STEPS.filter(s => {
    if (s === "spells") return !!(cls && (cls.caster || cls.cantrips));
    return true;
  });
}
const stepIndex = d => stepsFor(d).indexOf(d.step);

function progress(d) {
  const steps = stepsFor(d), i = stepIndex(d);
  return `<div style="display:flex;gap:4px;margin-bottom:18px">${steps.map((s, n) =>
    `<div style="flex:1;height:3px;border-radius:2px;background:${n <= i ? "var(--lead)" : "var(--rule)"}"></div>`).join("")}</div>`;
}

const abilityRow = (label, val, note) =>
  `<div class="stat"><span class="k">${esc(label)}</span><span class="v">${esc(val)}${note ? ` <small>${esc(note)}</small>` : ""}</span></div>`;

/* ══════════════════════════ CREATION ══════════════════════════ */
export function createScreen(d) {
  const body = {
    who: stepWho, class: stepClass, abilities: stepAbilities,
    trade: stepTrade, skills: stepSkills, spells: stepSpells, warrant: stepWarrant
  }[d.step](d);

  const i = stepIndex(d), steps = stepsFor(d);
  const back = i > 0 ? `<button class="btn quiet" data-act="cback" style="text-align:center">Back</button>` : "";

  return `<div class="screen">${progress(d)}${body}
    ${back ? `<div style="margin-top:20px">${back}</div>` : ""}
  </div>`;
}

/* ── 1 · who ──────────────────────────────────────────────────── */
function stepWho(d) {
  return `
    <h2 class="head">Who's signing on?</h2>
    <p class="note">The Errantry wants a name for the warrant and something to put in the ledger under kin. Neither has to be true.</p>
    <div class="field"><label>Name</label><input id="cName" type="text" value="${esc(d.name)}" placeholder="A carrier" maxlength="28"></div>
    <p class="eyebrow">Kin</p>
    ${R.ANCESTRIES.map(a => `
      <button class="btn ${d.ancestry === a.id ? "on hascount" : ""}" data-act="canc" data-id="${a.id}">
        ${esc(a.name)}
        <span class="r">${Object.entries(a.asi).map(([k, v]) => R.ABILITIES.find(x => x.id === k).short + "+" + v).join(" ")}</span>
        <span class="sub">${esc(a.note)}</span>
      </button>`).join("")}
    <button class="btn primary" data-act="cnext" ${d.ancestry ? "" : "disabled"} style="margin-top:14px;text-align:center">Carry on</button>`;
}

/* ── 2 · class ────────────────────────────────────────────────── */
function stepClass(d) {
  const cls = d.klass ? R.classById(d.klass) : null;
  const needsSub = cls && cls.subclassAt === 1;
  const needsChoice = cls && cls.choice;
  const ancChoice = R.ancestryById(d.ancestry) && R.ancestryById(d.ancestry).choice;

  return `
    <h2 class="head">What did they take you on as?</h2>
    ${R.CLASSES.map(c => `
      <button class="btn ${d.klass === c.id ? "on hascount" : ""}" data-act="ccls" data-id="${c.id}">
        ${esc(c.name)} <span class="r">d${c.hitDie}</span>
        <span class="sub">${esc(c.note)}</span>
      </button>`).join("")}

    ${ancChoice ? `<p class="eyebrow">${esc(ancChoice.label)}</p>
      ${ancChoice.options.map(o => `<button class="btn ${d.choice[ancChoice.id] === o.id ? "on" : ""}"
        data-act="cchoice" data-k="${ancChoice.id}" data-id="${o.id}">${esc(o.name)}</button>`).join("")}` : ""}

    ${needsSub ? `<p class="eyebrow">${esc(cls.subclassLabel)}</p>
      ${cls.subclasses.map(s => `<button class="btn ${d.subclass === s.id ? "on" : ""}" data-act="csub" data-id="${s.id}">
        ${esc(s.name)}<span class="sub">${esc(s.note)}</span></button>`).join("")}` : ""}

    ${needsChoice ? `<p class="eyebrow">${esc(cls.choice.label)}</p>
      ${cls.choice.options.map(o => `<button class="btn ${d.choice[cls.choice.id] === o.id ? "on" : ""}"
        data-act="cchoice" data-k="${cls.choice.id}" data-id="${o.id}">${esc(o.name)}</button>`).join("")}` : ""}

    <button class="btn primary" data-act="cnext" ${classReady(d) ? "" : "disabled"} style="margin-top:14px;text-align:center">Carry on</button>`;
}
function classReady(d) {
  if (!d.klass) return false;
  const cls = R.classById(d.klass), anc = R.ancestryById(d.ancestry);
  if (cls.subclassAt === 1 && !d.subclass) return false;
  if (cls.choice && !d.choice[cls.choice.id]) return false;
  if (anc.choice && !d.choice[anc.choice.id]) return false;
  return true;
}

/* ── 3 · abilities ────────────────────────────────────────────── */
function stepAbilities(d) {
  const cls = R.classById(d.klass), anc = R.ancestryById(d.ancestry);
  const placed = Object.values(d.assign).filter(v => v != null);
  const left = d.pool.filter((_, i) => !placed.includes(i));

  if (!d.method) return `
    <h2 class="head">Where does the body come from?</h2>
    <p class="note">${esc(cls.name)}s lean on ${cls.primary.map(p => R.ABILITIES.find(a => a.id === p).name).join(" and ")}.</p>
    <button class="btn" data-act="cmethod" data-m="roll">Roll for it
      <span class="sub">4d6, drop the lowest, six times. Rerolled whole if the set is genuinely cursed.</span></button>
    <button class="btn" data-act="cmethod" data-m="array">The standard array
      <span class="sub">15 14 13 12 10 8. No luck, no regret.</span></button>
    <button class="btn" data-act="cmethod" data-m="own">Roll your own dice
      <span class="sub">Four d6, drop the lowest, six times, at your own table. Type in what you get. No safety valve — what you roll is what you carry.</span></button>
    <button class="btn" data-act="cmethod" data-m="real">Use your own body
      <span class="sub">Your height sets your stride, and what you can lift sets your Strength — scored against the adult population, not against a powerlifter. Everything else is still rolled.</span></button>`;

  if (d.method === "own" && !d.pool.length) {
    const vals = d.own || ["", "", "", "", "", ""];
    const ready = vals.every(v => { const n = +v; return v !== "" && Number.isInteger(n) && n >= 1 && n <= 20; });
    const sum = vals.reduce((t, v) => t + (+v || 0), 0);
    const mods = vals.map(v => v === "" ? null : R.mod(+v));
    const modSum = mods.reduce((t, m) => t + (m || 0), 0);
    return `
    <h2 class="head">What did you roll?</h2>
    <p class="note">Six scores, in whatever order they came off the table. You'll place them next, so it doesn't matter which is which yet.</p>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:9px;margin-bottom:14px">
      ${vals.map((v, i) => `<input class="big" style="min-height:64px;font-size:26px" inputmode="numeric"
        data-own="${i}" value="${esc(v)}" placeholder="—" maxlength="2" aria-label="Score ${i + 1}">`).join("")}
    </div>
    <div class="stat"><span class="k">Total</span><span class="v">${sum || "—"}</span></div>
    <div class="stat"><span class="k">Modifiers add up to</span><span class="v">${ready ? R.modStr(modSum) : "—"}</span></div>
    <p class="note" style="font-size:13px">${
      !ready ? "Anything from 1 to 20." :
      modSum < 1 ? "That's a thin set. The app's own roller would have thrown it back — but it's your table, and your carrier." :
      Math.max(...vals.map(Number)) >= 17 ? "A good arm on that one." : "A workable set."}</p>
    <button class="btn primary" data-act="cown" ${ready ? "" : "disabled"} style="text-align:center">Take these</button>
    <button class="btn quiet" data-act="cmethod" data-m="" style="text-align:center">Choose a different way</button>`;
  }

  if (d.method === "real" && !d.pool.length) return `
    <h2 class="head">Your own measure</h2>
    <p class="note">Only what you can lift becomes a score, and it's ranked against ordinary adults, so average maps to 10 rather than to something insulting. Height sets your stride and nothing else. Weight sets nothing at all.</p>
    <div class="row">
      <div class="field"><label>Height (inches)</label><input id="cHt" inputmode="numeric" value="${esc(d.real.heightIn)}" placeholder="70"></div>
      <div class="field"><label>Most you can lift (lb)</label><input id="cLift" inputmode="numeric" value="${esc(d.real.liftLb)}" placeholder="185"></div>
    </div>
    <p class="note" style="font-size:13px">Deadlift, a loaded barbell, one end of a sofa — whatever you'd actually trust yourself to pick up once. An honest guess is fine.</p>
    <button class="btn primary" data-act="creal" style="text-align:center">Take the measure</button>`;

  const scores = R.ABILITIES.map(a => {
    const idx = d.assign[a.id];
    const rolled = idx == null ? null : d.pool[idx];
    const bump = (anc.asi[a.id] || 0) + (d.bonus[a.id] || 0);
    const total = rolled == null ? null : rolled + bump;
    return { a, rolled, bump, total, idx };
  });
  const done = scores.every(s => s.rolled != null);
  const extra = anc.extraASI;
  const bonusLeft = extra ? extra.n - Object.values(d.bonus).reduce((s, v) => s + v, 0) : 0;

  return `
    <h2 class="head">Place them</h2>
    <p class="note">${d.method === "real" ? "Strength is fixed by your own measure. Tap a score, then tap where it goes." : "Tap a score, then tap where it goes."} ${esc(cls.name)}s want ${cls.primary.map(p => R.ABILITIES.find(a => a.id === p).name).join(" and ")}.</p>

    ${left.length ? `<div style="display:flex;flex-wrap:wrap;gap:7px;margin-bottom:18px">${
      d.pool.map((v, i) => placed.includes(i) ? "" :
        `<button class="chip ${d.holding === i ? "on" : ""}" data-act="chold" data-i="${i}">${v}</button>`).join("")
    }</div>` : ""}

    ${scores.map(s => `
      <button class="btn ${s.rolled != null ? "on hascount" : d.holding != null ? "target" : ""}" data-act="cplace" data-ab="${s.a.id}"
        ${d.method === "real" && s.a.id === "str" ? "disabled" : ""}>
        ${esc(s.a.name)}
        <span class="r">${s.total == null ? "—" : `${s.total} <small style="color:var(--ink-faint)">(${R.modStr(R.mod(s.total))})</small>`}</span>
        <span class="sub">${s.rolled == null ? "empty" : `rolled ${s.rolled}${s.bump ? ` + ${s.bump} kin` : ""}`}${
          extra && s.rolled != null ? ` · <span data-act="cbonus" data-ab="${s.a.id}" style="color:var(--lead)">${(d.bonus[s.a.id] || 0) ? "remove +1" : bonusLeft > 0 ? "add +1" : ""}</span>` : ""}</span>
      </button>`).join("")}

    ${extra ? `<p class="note" style="font-size:13px">${esc(extra.label)} — ${bonusLeft} left to place.</p>` : ""}

    ${left.length === d.pool.length ? `<button class="btn quiet" data-act="corder" style="text-align:center">Take them straight down
      <span class="sub" style="text-align:center">In the order rolled — Strength first, Charisma last. The old way.</span></button>` : ""}

    ${d.method === "roll" && d.rolls.length ? `<p class="eyebrow">The dice</p>
      <div style="font-family:var(--mono);font-size:12px;color:var(--ink-soft);line-height:1.9">${
        d.rolls.map((r, i) => `<div>${String(r.total).padStart(2)} &nbsp;<span style="color:var(--ink-faint)">${
          r.dice.join(" ")} <s style="opacity:.5">${r.dropped.join(" ")}</s></span></div>`).join("")
      }</div>` : ""}

    ${d.method === "roll" ? `<button class="btn quiet" data-act="creroll" style="text-align:center;margin-top:10px">Roll a fresh set</button>` : ""}
    ${d.method === "own" ? `<button class="btn quiet" data-act="cownagain" style="text-align:center">Type different scores</button>` : ""}
    <button class="btn primary" data-act="cnext" ${done && bonusLeft === 0 ? "" : "disabled"} style="margin-top:10px;text-align:center">Carry on</button>`;
}

/* ── 4 · trade ────────────────────────────────────────────────── */
function stepTrade(d) {
  return `
    <h2 class="head">What were you before?</h2>
    <p class="note">Everyone was something. It's worth two skills and whatever you kept.</p>
    ${R.TRADES.map(t => `
      <button class="btn ${d.trade === t.id ? "on hascount" : ""}" data-act="ctrade" data-id="${t.id}">
        ${esc(t.name)}
        <span class="r">${t.skills.map(s => R.skillById(s).name).join(", ")}</span>
        <span class="sub">${esc(t.note)}</span>
      </button>`).join("")}
    <button class="btn primary" data-act="cnext" ${d.trade ? "" : "disabled"} style="margin-top:14px;text-align:center">Carry on</button>`;
}

/* ── 5 · skills ───────────────────────────────────────────────── */
function stepSkills(d) {
  const cls = R.classById(d.klass), anc = R.ancestryById(d.ancestry), trade = R.tradeById(d.trade);
  const free = [...(anc.skills || []), ...(trade ? trade.skills : [])];
  const need = cls.skillCount + (anc.extraSkills || 0);
  const pickable = anc.extraSkills
    ? R.SKILLS.map(s => s.id)                         // half-elf picks from everything
    : cls.skillsFrom;
  const chosen = d.skills.filter(s => !free.includes(s));
  const left = need - chosen.length;

  const expNeed = cls.expertise || 0;
  const expLeft = expNeed - d.expertise.length;

  return `
    <h2 class="head">What can you do?</h2>
    <p class="note">${left > 0 ? `${left} to choose.` : "That's the lot."}${free.length ? ` Your kin and your trade already gave you ${free.map(s => R.skillById(s).name).join(", ")}.` : ""}</p>
    ${pickable.map(id => {
      const s = R.skillById(id);
      const isFree = free.includes(id);
      const on = d.skills.includes(id);
      return `<button class="btn ${on ? "on hascount" : ""}" data-act="cskill" data-id="${id}" ${isFree || (left <= 0 && !on) ? "disabled" : ""}>
        ${esc(s.name)} <span class="r">${R.ABILITIES.find(a => a.id === s.ab).short}</span>
        ${isFree ? `<span class="sub">already yours</span>` : ""}</button>`;
    }).join("")}

    ${expNeed ? `<p class="eyebrow">Expertise — ${expLeft > 0 ? `${expLeft} to choose` : "chosen"}</p>
      <p class="note" style="font-size:13px">Double proficiency. Pick the two you want to be genuinely good at.</p>
      ${d.skills.map(id => `<button class="btn ${d.expertise.includes(id) ? "on" : ""}" data-act="cexp" data-id="${id}"
        ${expLeft <= 0 && !d.expertise.includes(id) ? "disabled" : ""}>${esc(R.skillById(id).name)}</button>`).join("")}` : ""}

    <button class="btn primary" data-act="cnext" ${left === 0 && expLeft === 0 ? "" : "disabled"} style="margin-top:14px;text-align:center">Carry on</button>`;
}

/* ── 6 · spells ───────────────────────────────────────────────── */
function stepSpells(d) {
  const cls = R.classById(d.klass);
  const nCant = cls.cantrips ? cls.cantrips[1] : 0;
  const nSpell = cls.spellsKnown ? cls.spellsKnown[1] : (cls.prepares ? 0 : 0);
  const cantLeft = nCant - d.cantrips.length;
  const spellLeft = nSpell - d.spells.length;
  const prep = cls.prepares;

  return `
    <h2 class="head">What do you know?</h2>
    ${prep ? `<p class="note">You prepare from the whole list each morning, so nothing here is permanent — but you still need cantrips, and those are for life.</p>` : ""}
    ${nCant ? `<p class="eyebrow">Cantrips — ${cantLeft > 0 ? `${cantLeft} to choose` : "chosen"}</p>
      ${R.spellsFor(cls.id, 0).map(s => `<button class="btn ${d.cantrips.includes(s.id) ? "on" : ""}" data-act="ccant" data-id="${s.id}"
        ${cantLeft <= 0 && !d.cantrips.includes(s.id) ? "disabled" : ""}>${esc(s.name)}<span class="sub">${esc(s.fx)}</span></button>`).join("")}` : ""}
    ${nSpell ? `<p class="eyebrow">Spells known — ${spellLeft > 0 ? `${spellLeft} to choose` : "chosen"}</p>
      ${R.spellsFor(cls.id, 1).map(s => `<button class="btn ${d.spells.includes(s.id) ? "on" : ""}" data-act="cspell" data-id="${s.id}"
        ${spellLeft <= 0 && !d.spells.includes(s.id) ? "disabled" : ""}>${esc(s.name)}<span class="sub">${esc(s.fx)}</span></button>`).join("")}` : ""}
    ${prep ? `<p class="note" style="margin-top:14px">First-level slots: ${cls.slots[1].join(", ")}. You'll prepare in the morning.</p>` : ""}
    <button class="btn primary" data-act="cnext" ${cantLeft === 0 && spellLeft === 0 ? "" : "disabled"} style="margin-top:14px;text-align:center">Carry on</button>`;
}

/* ── 7 · warrant ──────────────────────────────────────────────── */
const WARRANTS = [
  ["unbonded", "Unbonded", "You carry your own risk and the guild owes you nothing. If you die, that's the campaign. Your walked miles are kept and roll into the next one."],
  ["bonded", "Bonded", "The Errantry recovers its carriers. They haul you back to the last town and patch you up — the walk back out to your load is your own obligation. Half the miles the first time, then a quarter, then a tenth."],
  ["insured", "Insured", "A premium arrangement for carriers with money. The guild eats the loss and charges you coin for it. The easiest road, and everyone at the office knows."]
];

function stepWarrant(d) {
  const pc = previewCharacter(d);
  const s = CH.abilityScores(pc), enc = CH.encumbrance(pc), sc = CH.spellcasting(pc);
  return `
    <h2 class="head">Sign the warrant</h2>
    <p class="note">This is the one choice you can't take back.</p>
    ${WARRANTS.map(([id, name, note]) => `
      <button class="btn ${d.deathMode === id ? "on" : ""}" data-act="cdeath" data-id="${id}">
        ${esc(name)}<span class="sub">${esc(note)}</span></button>`).join("")}

    <p class="eyebrow">As it stands</p>
    <div class="card">
      <h3>${esc(pc.name)}</h3>
      <p>${esc(R.ancestryById(pc.ancestry).name)} · ${esc(R.classById(pc.klass).name)}${pc.trade ? ` · ${esc(R.tradeById(pc.trade).name)}` : ""}</p>
      <p style="font-family:var(--mono);font-size:13px">${R.ABILITIES.map(a => `${a.short} ${s[a.id]}`).join("  ")}</p>
    </div>
    ${abilityRow("Hit points", CH.maxHP(pc))}
    ${abilityRow("Armour class", CH.armorClass(pc))}
    ${abilityRow("Speed", CH.speed(pc) + " ft")}
    ${abilityRow("Passive perception", CH.passivePerception(pc))}
    ${abilityRow("Carrying", `${enc.w} / ${enc.cap} lb`, enc.state)}
    ${sc ? abilityRow("Spell save DC", sc.dc) : ""}
    <button class="btn primary" data-act="cdone" style="margin-top:18px;text-align:center">Take the warrant</button>`;
}

export function previewCharacter(d) {
  const scores = {};
  for (const a of R.ABILITIES) {
    const i = d.assign[a.id];
    scores[a.id] = i == null ? 10 : d.pool[i];
  }
  return CH.makeCharacter({
    name: d.name, ancestry: d.ancestry, klass: d.klass, trade: d.trade,
    subclass: d.subclass, choice: d.choice, scores, bonus: d.bonus,
    skills: d.skills, expertise: d.expertise, cantrips: d.cantrips, spells: d.spells,
    real: d.method === "real" ? { heightIn: +d.real.heightIn || null, liftLb: +d.real.liftLb || null } : null
  });
}

/* ══════════════════════════ THE SHEET ═════════════════════════ */
export function sheetScreen(pc) {
  if (!pc) return `<div class="screen"><p class="note">No carrier yet.</p></div>`;
  const s = CH.abilityScores(pc), m = CH.abilityMods(pc), sv = CH.saves(pc), sk = CH.skillMods(pc);
  const cls = R.classById(pc.klass), anc = R.ancestryById(pc.ancestry);
  const lv = CH.level(pc), enc = CH.encumbrance(pc), sc = CH.spellcasting(pc);
  const hp = CH.currentHP(pc), hpMax = CH.maxHP(pc);
  const next = R.xpToNext(pc.xp || 0);
  const pending = CH.pendingChoices(pc);

  return `
  <div class="screen">
    <div style="text-align:center;padding:4px 0 16px;border-bottom:1px solid var(--rule);margin-bottom:16px">
      <div style="font-family:var(--serif);font-size:26px">${esc(pc.name)}</div>
      <div style="font-size:11px;color:var(--ink-faint);letter-spacing:.08em;text-transform:uppercase;margin-top:5px">
        ${esc(anc.name)} · ${esc(cls.name)} · level ${lv}${pc.subclass ? " · " + esc((cls.subclasses.find(x => x.id === pc.subclass) || {}).name || "") : ""}
      </div>
    </div>

    ${pending.length ? `<div class="card"><h3>Owed to you</h3>
      <p>${pending.map(p => esc(p.label)).join(", ")} — choose when levelling is wired up.</p></div>` : ""}

    <div class="row" style="margin-bottom:16px">
      <div style="text-align:center"><div style="font-family:var(--mono);font-size:30px;${hp <= hpMax / 3 ? "color:var(--lead)" : ""}">${hp}</div>
        <div style="font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:var(--ink-faint)">of ${hpMax} hp</div></div>
      <div style="text-align:center"><div style="font-family:var(--mono);font-size:30px">${CH.armorClass(pc)}</div>
        <div style="font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:var(--ink-faint)">armour</div></div>
      <div style="text-align:center"><div style="font-family:var(--mono);font-size:30px">${CH.speed(pc)}</div>
        <div style="font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:var(--ink-faint)">feet</div></div>
    </div>

    <p class="eyebrow">Abilities</p>
    ${R.ABILITIES.map(a => `<div class="stat"><span class="k">${esc(a.name)}</span>
      <span class="v">${s[a.id]} <small>${R.modStr(m[a.id])} · save ${R.modStr(sv[a.id])}${cls.saves.includes(a.id) ? "◆" : ""}</small></span></div>`).join("")}

    <p class="eyebrow">Skills</p>
    ${R.SKILLS.filter(x => pc.skills.includes(x.id)).map(x =>
      `<div class="stat"><span class="k">${esc(x.name)}${pc.expertise.includes(x.id) ? " <span class='tag lead'>expert</span>" : ""}</span>
       <span class="v">${R.modStr(sk[x.id])}</span></div>`).join("")}
    <div class="stat"><span class="k">Passive perception</span><span class="v">${CH.passivePerception(pc)}</span></div>

    <p class="eyebrow">Carrying</p>
    <div class="stat"><span class="k">Pack</span><span class="v">${enc.w} / ${enc.cap} <small>lb · ${enc.state}</small></span></div>
    ${enc.note ? `<p class="note" style="font-size:13px;color:var(--lead)">${esc(enc.note)}</p>` : ""}
    <div class="stat"><span class="k">Purse</span><span class="v">${(pc.coin / 100).toFixed(0)} <small>gp</small></span></div>
    ${(pc.pack || []).map(i => `<div class="entry"><span class="m">${i.lb * i.qty}</span>
      <span class="s" style="flex:1;color:var(--ink)">${esc(i.name)}${i.equipped ? " <span class='tag'>worn</span>" : ""}</span></div>`).join("")}

    ${sc ? `<p class="eyebrow">Magic</p>
      <div class="stat"><span class="k">Save DC</span><span class="v">${sc.dc}</span></div>
      <div class="stat"><span class="k">Spell attack</span><span class="v">${R.modStr(sc.attack)}</span></div>
      <div class="stat"><span class="k">Slots</span><span class="v">${sc.slots.length ? sc.slots.join(" / ") : "—"}</span></div>
      ${pc.cantrips.map(id => { const sp = R.spellById(id); return sp ? `<div class="entry"><span class="d">cantrip</span><span class="s" style="flex:1;color:var(--ink)">${esc(sp.name)}</span></div>` : ""; }).join("")}
      ${pc.spells.map(id => { const sp = R.spellById(id); return sp ? `<div class="entry"><span class="d">${sp.lv}${sp.lv === 1 ? "st" : sp.lv === 2 ? "nd" : "rd"}</span><span class="s" style="flex:1;color:var(--ink)">${esc(sp.name)}</span></div>` : ""; }).join("")}` : ""}

    <p class="eyebrow">Features</p>
    ${CH.featuresAt(pc).map(f => `<div class="perk"><div class="t">${esc(f.name)}<span class="mi">level ${f.level}</span></div>
      <div class="n">${esc(f.text)}</div></div>`).join("")}
    ${anc.traits.map(t => `<div class="perk"><div class="n">${esc(t)}</div></div>`).join("")}

    <p class="eyebrow">Advancement</p>
    <div class="stat"><span class="k">Experience</span><span class="v">${pc.xp || 0}</span></div>
    <div class="stat"><span class="k">${next == null ? "At the cap" : "To level " + (lv + 1)}</span><span class="v">${next == null ? "—" : next}</span></div>
  </div>`;
}
