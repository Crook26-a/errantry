/* ════════════════════════════════════════════════════════════════
   state.js — what the game knows

   Two tiers, deliberately separate:

   ACCOUNT  is yours. Every mile you have ever walked, the log of when
            you walked it, and which campaigns exist. Conditioning lives
            here because you earned it with your legs, not your
            character's, and it survives a character's death.

   CAMPAIGN is the character's. Bank, position on the road, in-world
            day, quest flags. Miles land in whichever campaign is active
            when you log them; they can't be in two places at once.
   ════════════════════════════════════════════════════════════════ */

import * as store from "./store.js";
import { beginJourney, advance, clearEncounter, turnBack, RIDE } from "./travel.js";

export const ACCOUNT_KEY = "errantry:account";
const campKey = id => "errantry:campaign:" + id;

export const BASE_CAP = 63;
export const STEPS_PER_MILE = 2000;

/* Conditioning: walking always counts for something, even when the
   bank is full. Nothing here is spendable — it's a ratchet. */
export const CONDITIONING = [
  { mi: 25,   name: "Road-broken",     cap: 2, note: "The first blisters are behind you." },
  { mi: 60,   name: "Sound of wind",   cap: 2, note: "Nine days at seven miles. You stop noticing the first hour." },
  { mi: 120,  name: "Long-legged",     cap: 3, note: "Distance has stopped being an argument." },
  { mi: 220,  name: "Hard-footed",     cap: 3, note: "You have walked further than most people ever will." },
  { mi: 360,  name: "Weather-proof",   cap: 4, note: "Rain is a condition, not an obstacle." },
  { mi: 550,  name: "Carrier's pace",  cap: 4, note: "You could do this for a living. You are." },
  { mi: 800,  name: "Iron-shinned",    cap: 5, note: "Eight hundred miles under you." },
  { mi: 1100, name: "Unhurried",       cap: 5, note: "You have crossed the map twice over." },
  { mi: 1500, name: "Of the road",     cap: 6, note: "There is no longer a version of you that doesn't walk." }
];

const r1 = v => Math.round(v * 10) / 10;
const today = () => new Date().toISOString().slice(0, 10);
const uid = p => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

/* ── account ──────────────────────────────────────────────────── */
export function blankAccount() {
  return {
    v: 1,
    lifetimeMiles: 0,
    stepsPerMile: STEPS_PER_MILE,
    entries: [],            // {id, date, miles, source, campaignId, banked}
    campaigns: [],          // {id, name, deathMode, created, mapTitle}
    activeCampaign: null
  };
}

export async function loadAccount() {
  const a = await store.get(ACCOUNT_KEY);
  if (!a || a.v !== 1) return blankAccount();
  return { ...blankAccount(), ...a };
}
export function saveAccount(acc) { store.saveSoon(ACCOUNT_KEY, () => acc); }
export function saveAccountNow(acc) { return store.set(ACCOUNT_KEY, acc); }

export function earnedPerks(lifetimeMiles) {
  return CONDITIONING.filter(c => lifetimeMiles >= c.mi);
}
export function nextPerk(lifetimeMiles) {
  return CONDITIONING.find(c => lifetimeMiles < c.mi) || null;
}
export function bankCap(lifetimeMiles) {
  return BASE_CAP + earnedPerks(lifetimeMiles).reduce((s, c) => s + c.cap, 0);
}

/* Stride from height, because a 5'2" walker and a 6'4" walker do not
   put down the same number of steps in a mile, and a flat 2,000 is
   wrong for both. Roughly 0.413 × height for a walking stride. */
export function stepsPerMileFor(heightInches) {
  if (!heightInches) return STEPS_PER_MILE;
  const strideIn = heightInches * 0.413;
  return Math.round(63360 / strideIn);
}

/* ── campaigns ────────────────────────────────────────────────── */
export function blankCampaign(name, deathMode) {
  return {
    v: 1,
    id: uid("c"),
    name: name || "A carrier",
    deathMode: deathMode || "bonded",   // unbonded | bonded | insured
    created: today(),
    bank: 0,
    day: 1,
    at: null,          // node id, when standing still
    journey: null,     // set while on a road
    map: null,         // the survey, pasted in
    flags: {},
    log: []            // road log, newest first
  };
}

export async function loadCampaign(id) {
  if (!id) return null;
  const c = await store.get(campKey(id));
  return c && c.v === 1 ? c : null;
}
export function saveCampaign(c) { if (c) store.saveSoon(campKey(c.id), () => c); }
export function saveCampaignNow(c) { return c ? store.set(campKey(c.id), c) : null; }
export function deleteCampaign(id) { return store.del(campKey(id)); }

/* ── logging miles ────────────────────────────────────────────
   The one place miles enter the world. Overflow past the cap is not
   lost — it just can't be spent. It still ratchets conditioning,
   because you did walk it. */
export function logMiles(acc, camp, miles, source) {
  miles = r1(Math.max(0, miles));
  if (!miles) return { banked: 0, overflow: 0, unlocked: [] };

  const before = acc.lifetimeMiles;
  acc.lifetimeMiles = r1(acc.lifetimeMiles + miles);
  const unlocked = CONDITIONING.filter(c => before < c.mi && acc.lifetimeMiles >= c.mi);

  let banked = 0, overflow = miles;
  if (camp) {
    const cap = bankCap(acc.lifetimeMiles);
    const room = Math.max(0, r1(cap - camp.bank));
    banked = Math.min(miles, room);
    overflow = r1(miles - banked);
    camp.bank = r1(camp.bank + banked);
  }

  acc.entries.unshift({
    id: uid("e"), date: today(), miles,
    source: source || "manual",
    campaignId: camp ? camp.id : null,
    banked
  });
  if (acc.entries.length > 2000) acc.entries.length = 2000;

  return { banked, overflow, unlocked };
}

export function undoEntry(acc, camp, entryId) {
  const i = acc.entries.findIndex(e => e.id === entryId);
  if (i < 0) return false;
  const e = acc.entries[i];
  acc.entries.splice(i, 1);
  acc.lifetimeMiles = r1(Math.max(0, acc.lifetimeMiles - e.miles));
  if (camp && e.campaignId === camp.id) camp.bank = r1(Math.max(0, camp.bank - e.banked));
  return true;
}

export function milesOn(acc, date) {
  return r1(acc.entries.filter(e => e.date === date).reduce((s, e) => s + e.miles, 0));
}
export function recentDays(acc, n) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const iso = d.toISOString().slice(0, 10);
    out.push({ date: iso, miles: milesOn(acc, iso) });
  }
  return out;
}

/* ── the world ────────────────────────────────────────────────── */
export function setOut(camp, road, rideId) {
  camp.journey = beginJourney(road, camp.at, rideId, camp.id + camp.day);
  camp.at = null;
  return camp.journey;
}

/* Spends from the bank, stopping at an encounter or on arrival.
   Returns a report the UI can narrate. */
export function walk(camp, wanted) {
  const j = camp.journey;
  if (!j) return { spent: 0, blocked: "not-travelling" };
  const budget = Math.min(wanted, camp.bank);
  if (budget <= 0) return { spent: 0, blocked: "bank-empty" };

  const res = advance(j, budget);
  camp.bank = r1(camp.bank - res.spent);

  if (res.arrived) {
    camp.at = j.toId;
    camp.day += Math.max(1, Math.round(j.realMiles / 8));
    camp.journey = null;
  }
  return res;
}

export function resolveEncounter(camp, record) {
  if (camp.journey) clearEncounter(camp.journey, record);
}
export function turnAround(camp) {
  if (camp.journey) camp.journey = turnBack(camp.journey);
}

export function addLog(camp, text, kind) {
  camp.log.unshift({ day: camp.day, date: today(), text, kind: kind || "" });
  if (camp.log.length > 500) camp.log.length = 500;
}

export { RIDE };
