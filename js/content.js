/* ════════════════════════════════════════════════════════════════
   content.js — everything the world is made of

   The survey lives here rather than in a file the app fetches, and
   rather than inside each saved campaign. A campaign remembers only
   WHERE IT IS — a node id, or a road id and how far along. The map is
   app content, so extending it here reaches a character already
   walking it.

   Node and road ids must stay stable across edits. reconcile() cleans
   up when they don't, but it costs the player their place.

   Two things are layered on top of the plotting table's export, because
   the table has no field for them yet:

     site  — what's in a place worth going in for. `loot` reads as the
             map notes are written: coin category, then counts per tier.
     gate  — somewhere you can see on the map and cannot walk into.
   ════════════════════════════════════════════════════════════════ */

export const BUILD = "2026-08-07 · 9";

export const SURVEY = {
    format: "ordinate-survey-v1",
    title: "The Errantry Map",
    ppm: 11,
    compass: 8,
    regions: [
      {
        id: "r1",
        name: "The Kept Vale",
        threat: 1,
        hex: "#5e7a4e",
        notes: "Roads maintained. Patrols occasionally real."
      },
      {
        id: "r2",
        name: "The Broken Numbers",
        threat: 2,
        hex: "#6b5a86",
        notes: "Stones present but re-cut. The mileage lies."
      },
      {
        id: "r3",
        name: "The Tollmarch",
        threat: 3,
        hex: "#a8752c",
        notes: "Every crossing is owned by somebody."
      },
      {
        id: "r4",
        name: "The Reversion",
        threat: 4,
        hex: "#3f6f78",
        notes: "Roads under forest. Constructs still patrolling."
      },
      { id: "r5", name: "Off the Survey", threat: 5, hex: "#8f4436", notes: "No stones." }
    ],
    nodes: [
      {
        id: "nar8qx1",
        name: "",
        kind: "ruin",
        stone: "0",
        region: "r1",
        level: 1,
        origin: true,
        x: 0,
        y: 0,
        notes: "The old capital. Now abandoned. Once mighty, now old constructs roam the streets, attacking any who dare challenge them. This will be a gate for the sequel, if it's made. The player cannot get here now. ",
        gate: {
          note: "The constructs still walk those streets, and they still know their orders. Not in this life, and not on this warrant."
        }
      },
      {
        id: "narj272",
        name: "Dolomite",
        kind: "city",
        stone: 1,
        region: "r1",
        level: 1,
        seat: true,
        x: 0,
        y: -10,
        services: {
          inn: 1,
          stable: 1,
          coach: 1,
          board: 1,
          office: 1,
          store: 1,
          provision: 1,
          smith: 1,
          apothecary: 1,
          market: 1,
          temple: 1,
          healer: 1,
          archive: 1,
          trainer: 1,
          reeve: 1,
          fence: 1
        },
        notes: "The new capital, this is the starting point for the campaign"
      },
      {
        id: "navr706",
        name: "",
        kind: "town",
        region: "r1",
        level: 1,
        x: -41,
        y: -18,
        services: {
          inn: 1,
          stable: 1,
          coach: 1,
          board: 1,
          store: 1,
          provision: 1,
          smith: 1,
          market: 1,
          temple: 1,
          healer: 1
        }
      },
      {
        id: "navrt17",
        name: "",
        kind: "town",
        stone: "4NE",
        region: "r1",
        level: 1,
        x: 12,
        y: -37,
        services: {
          inn: 1,
          stable: 1,
          coach: 1,
          board: 1,
          store: 1,
          provision: 1,
          smith: 1,
          market: 1,
          temple: 1,
          healer: 1,
          trainer: 1
        },
        notes: "A town more off the beaten path. It doesn't want to cater to thieves and bandits, but they have a way of persuading the towns folk. The user will be treated poorly if they have a bad reputation. And well if they have a good reputation. There will be a quest here that will involve clearing out the bandit caves that connect directly to the city."
      },
      {
        id: "navs4u8",
        name: "",
        kind: "town",
        region: "r1",
        level: 1,
        x: -22,
        y: -26,
        services: {
          inn: 1,
          stable: 1,
          coach: 1,
          board: 1,
          store: 1,
          provision: 1,
          smith: 1,
          market: 1,
          temple: 1,
          healer: 1,
          apothecary: 1,
          reeve: 1,
          fence: 1
        }
      },
      {
        id: "navssl9",
        name: "",
        kind: "town",
        stone: "3.4NE",
        region: "r1",
        level: 1,
        x: 36,
        y: -10,
        services: { inn: 1, board: 1, provision: 1, smith: 1, temple: 1, healer: 1, fence: 1, reeve: 1 },
        notes: "A town well off the beaten path. Bandits and thieves come here and find that they are welcome, so long as they don't steal from the locals. There are lots of people who will want to take advantage of the player, if they have a good reputation. If they have a bad reputation, the user will fit in much more."
      },
      {
        id: "nbg77m3f",
        name: "",
        kind: "town",
        region: "r1",
        level: 1,
        x: -10,
        y: -51,
        services: {
          inn: 1,
          stable: 1,
          coach: 1,
          board: 1,
          store: 1,
          provision: 1,
          smith: 1,
          market: 1,
          temple: 1,
          healer: 1
        }
      },
      {
        id: "nbgmro3j",
        name: "",
        kind: "toll",
        region: "r1",
        level: 1,
        x: -10,
        y: -30,
        services: { reeve: 1 }
      },
      {
        id: "nbj8ez3p",
        name: "",
        kind: "cave",
        region: "r1",
        level: 1,
        x: 19,
        y: -35,
        notes: "Bandit Cave. Active. Will have rng 1-3 bandits, rng gold category 2, 3 rng loot items tier 1. one rng tier 2 loot item.",
        site: {
          kind: "banditCave",
          foes: [
            { id: "bandit", n: "1d3" }
          ],
          loot: { coin: 2, t1: 3, t2: 1 },
          once: true
        }
      },
      {
        id: "nbj9xr3q",
        name: "",
        kind: "cave",
        region: "r1",
        level: 1,
        x: 39,
        y: -23,
        notes: "Bandit Cave. Active. Will have rng 1-3 bandits, rng gold category 2, 3 rng loot items tier 1. one rng tier 2 loot item.",
        site: {
          kind: "banditCave",
          foes: [
            { id: "bandit", n: "1d3" }
          ],
          loot: { coin: 2, t1: 3, t2: 1 },
          once: true
        }
      },
      {
        id: "nbjbh23r",
        name: "",
        kind: "cave",
        region: "r1",
        level: 1,
        x: 6,
        y: -52,
        notes: "Bandit Cave. Active. Will have rng 1-3 bandits, rng gold category 2, 3 rng loot items tier 1. one rng tier 2 loot item.",
        site: {
          kind: "banditCave",
          foes: [
            { id: "bandit", n: "1d3" }
          ],
          loot: { coin: 2, t1: 3, t2: 1 },
          once: true
        }
      },
      {
        id: "nbjcrr3s",
        name: "",
        kind: "cave",
        region: "r1",
        level: 1,
        x: 3,
        y: -30,
        notes: "Bandit Cave. Active. Will have rng 1-3 bandits, rng gold category 2, 3 rng loot items tier 1. one rng tier 2 loot item.",
        site: {
          kind: "banditCave",
          foes: [
            { id: "bandit", n: "1d3" }
          ],
          loot: { coin: 2, t1: 3, t2: 1 },
          once: true
        }
      },
      {
        id: "nbkcub3u",
        name: "",
        kind: "cave",
        region: "r1",
        level: 1,
        x: 32,
        y: -4,
        notes: "Bandit Cave. Active. Will have rng 1-3 bandits, rng gold category 2, 3 rng loot items tier 1. one rng tier 2 loot item.",
        site: {
          kind: "banditCave",
          foes: [
            { id: "bandit", n: "1d3" }
          ],
          loot: { coin: 2, t1: 3, t2: 1 },
          once: true
        }
      },
      {
        id: "nbkggk3v",
        name: "",
        kind: "cave",
        region: "r1",
        level: 1,
        x: 22,
        y: -15,
        notes: "Bandit Cave. Active. Will have rng 1-3 bandits, rng gold category 2, 3 rng loot items tier 1. one rng tier 2 loot item.",
        site: {
          kind: "banditCave",
          foes: [
            { id: "bandit", n: "1d3" }
          ],
          loot: { coin: 2, t1: 3, t2: 1 },
          once: true
        }
      }
    ],
    roads: [
      {
        id: "earj273",
        from: "nar8qx1",
        to: "narj272",
        miles: 1,
        density: "normal",
        coach: true,
        region: "r1"
      },
      {
        id: "eavxuza",
        from: "navr706",
        to: "narj272",
        miles: 4.2,
        density: "normal",
        coach: true,
        region: "r1"
      },
      {
        id: "eavzs7b",
        from: "navs4u8",
        to: "narj272",
        miles: 2.7,
        density: "normal",
        coach: true,
        region: "r1"
      },
      {
        id: "eaw245c",
        from: "navrt17",
        to: "narj272",
        miles: 3,
        density: "normal",
        coach: true,
        region: "r1"
      },
      {
        id: "eaw510d",
        from: "navssl9",
        to: "narj272",
        miles: 3.6,
        density: "normal",
        coach: true,
        region: "r1"
      },
      {
        id: "eaz88ff",
        from: "navr706",
        to: "navs4u8",
        miles: 2.1,
        density: "normal",
        coach: true,
        region: "r1"
      },
      {
        id: "eazcdmh",
        from: "navrt17",
        to: "navssl9",
        miles: 3.6,
        density: "normal",
        coach: true,
        region: "r1"
      },
      {
        id: "eazguci",
        from: "navr706",
        to: "nar8qx1",
        miles: 4.5,
        density: "normal",
        coach: true,
        region: "r1"
      },
      {
        id: "eb06psk",
        from: "navssl9",
        to: "nar8qx1",
        miles: 3.4,
        density: "normal",
        coach: true,
        region: "r1"
      },
      {
        id: "ebgc1q3g",
        from: "nbg77m3f",
        to: "navrt17",
        miles: 2.4,
        density: "normal",
        coach: true,
        region: "r1"
      },
      {
        id: "ebgdlt3h",
        from: "nbg77m3f",
        to: "navs4u8",
        miles: 2.5,
        density: "normal",
        coach: true,
        region: "r1"
      },
      {
        id: "ebgyph3k",
        from: "navs4u8",
        to: "nbgmro3j",
        miles: 1.1,
        density: "normal",
        coach: true,
        region: "r1"
      },
      {
        id: "ebh1w13l",
        from: "nbgmro3j",
        to: "navrt17",
        miles: 2.1,
        density: "normal",
        coach: true,
        region: "r1"
      },
      {
        id: "ebh4md3m",
        from: "narj272",
        to: "nbgmro3j",
        miles: 2,
        density: "normal",
        coach: true,
        region: "r1"
      },
      {
        id: "ebh5y93n",
        from: "nbgmro3j",
        to: "nbg77m3f",
        miles: 1.9,
        density: "normal",
        coach: true,
        region: "r1"
      },
      {
        id: "ebjgpt3t",
        from: "navrt17",
        to: "nbjbh23r",
        miles: 2.3,
        density: "normal",
        coach: true,
        region: "r1",
        pts: [
          { x: 11, y: -42 },
          { x: 16, y: -46 },
          { x: 8, y: -47 }
        ]
      },
      {
        id: "ebklpn3w",
        from: "nbkggk3v",
        to: "navssl9",
        miles: 1.4,
        density: "normal",
        coach: true,
        region: "r1",
        pts: [
          { x: 26, y: -15 },
          { x: 29, y: -15 }
        ]
      },
      {
        id: "ebknpr3x",
        from: "navssl9",
        to: "nbj9xr3q",
        miles: 1.5,
        density: "normal",
        coach: true,
        region: "r1",
        pts: [
          { x: 42, y: -15 }
        ]
      },
      {
        id: "ebkppu3y",
        from: "navssl9",
        to: "nbkcub3u",
        miles: 1,
        density: "normal",
        coach: true,
        region: "r1",
        pts: [
          { x: 38, y: -6 }
        ]
      },
      {
        id: "ebkrk13z",
        from: "navrt17",
        to: "nbj8ez3p",
        miles: 0.8,
        density: "normal",
        coach: true,
        region: "r1",
        pts: [
          { x: 17, y: -38 }
        ]
      },
      {
        id: "ebktox40",
        from: "navrt17",
        to: "nbjcrr3s",
        miles: 1.1,
        density: "normal",
        coach: true,
        region: "r1",
        pts: [
          { x: 8, y: -32 }
        ]
      }
    ],
    shapes: [
      {
        id: "saxm32e",
        kind: "river",
        closed: false,
        pts: [
          { x: -33, y: 22 },
          { x: -33, y: 12 },
          { x: -20, y: 13 },
          { x: -12, y: 6 },
          { x: -4, y: 9 },
          { x: 2, y: -1 },
          { x: -1, y: -14 },
          { x: -9, y: -24 },
          { x: -16, y: -20 },
          { x: -29, y: -27 },
          { x: -24, y: -37 },
          { x: -32, y: -44 },
          { x: -42, y: -43 },
          { x: -46, y: -52 },
          { x: -39, y: -56 },
          { x: -44, y: -59 },
          { x: -53, y: -57 },
          { x: -60, y: -61 },
          { x: -60, y: -61 },
          { x: -60, y: -61 },
          { x: -70, y: -56 },
          { x: -76, y: -61 },
          { x: -67, y: -75 },
          { x: -53, y: -74 },
          { x: -46, y: -82 },
          { x: -47, y: -88 },
          { x: -54, y: -97 },
          { x: -49, y: -105 },
          { x: -36, y: -107 },
          { x: -19, y: -114 },
          { x: -5, y: -108 },
          { x: 11, y: -115 },
          { x: 26, y: -110 },
          { x: 50, y: -122 }
        ],
        side: 1
      },
      {
        id: "saznu7j",
        kind: "impasse",
        closed: false,
        pts: [
          { x: -26, y: -11 },
          { x: -25, y: -12 }
        ],
        impassable: true,
        side: 1
      },
      {
        id: "sb0ezdl",
        kind: "impasse",
        closed: false,
        pts: [
          { x: 23, y: -8 },
          { x: 25, y: -5 }
        ],
        impassable: true,
        side: 1
      },
      {
        id: "sbaalzn",
        kind: "water",
        closed: false,
        pts: [
          { x: 9, y: -227 },
          { x: 4, y: -210 },
          { x: 24, y: -193 },
          { x: 39, y: -170 },
          { x: 31, y: -159 },
          { x: 23, y: -148 },
          { x: 21, y: -137 },
          { x: 32, y: -127 },
          { x: 45, y: -127 },
          { x: 42, y: -119 },
          { x: 45, y: -112 },
          { x: 54, y: -101 },
          { x: 47, y: -97 },
          { x: 44, y: -92 },
          { x: 42, y: -83 },
          { x: 45, y: -68 },
          { x: 50, y: -56 },
          { x: 57, y: -44 },
          { x: 60, y: -39 },
          { x: 60, y: -31 },
          { x: 56, y: -21 },
          { x: 48, y: -13 },
          { x: 46, y: -4 },
          { x: 41, y: 2 },
          { x: 6, y: 19 },
          { x: -45, y: 9 },
          { x: -71, y: -4 },
          { x: -97, y: -2 },
          { x: -109, y: 14 },
          { x: -153, y: -4 },
          { x: -190, y: 4 },
          { x: -219, y: 19 }
        ],
        impassable: true,
        side: -1,
        notes: "This is the great sea. This is where the old empire came from, and where they went"
      },
      {
        id: "sbhzh83o",
        kind: "wood",
        closed: true,
        pts: [
          { x: -2, y: -52 },
          { x: -7, y: -45 },
          { x: -8, y: -37 },
          { x: -5, y: -29 },
          { x: -2, y: -22 },
          { x: 2, y: -19 },
          { x: 8, y: -18 },
          { x: 16, y: -19 },
          { x: 15, y: -12 },
          { x: 14, y: -7 },
          { x: 14, y: -4 },
          { x: 20, y: 2 },
          { x: 28, y: 3 },
          { x: 34, y: 0 },
          { x: 40, y: -3 },
          { x: 44, y: -7 },
          { x: 44, y: -11 },
          { x: 45, y: -18 },
          { x: 44, y: -21 },
          { x: 38, y: -26 },
          { x: 37, y: -32 },
          { x: 36, y: -37 },
          { x: 33, y: -43 },
          { x: 30, y: -47 },
          { x: 26, y: -47 },
          { x: 18, y: -49 },
          { x: 17, y: -52 },
          { x: 14, y: -54 },
          { x: 10, y: -55 },
          { x: 3, y: -55 }
        ],
        side: 1,
        notes: "This is the West Wood, it is full of bandit caves and mildly dangerous creatures"
      },
      {
        id: "sbvo4t41",
        kind: "impasse",
        closed: false,
        pts: [
          { x: -2, y: -4 },
          { x: 2, y: -4 }
        ],
        impassable: true,
        side: 1
      }
    ]
  };

/* Unnamed places still have to be spoken of. */
export function placeName(n) {
  if (!n) return "nowhere";
  if (n.name) return n.name;
  const kind = { city: "city", town: "town", village: "village", post: "waystation",
                 stone: "stone", toll: "toll", ruin: "ruin", cave: "cave",
                 wood: "wood", camp: "camp" }[n.kind] || "place";
  return n.stone ? `the ${kind} at ${n.stone}` : `an unnamed ${kind}`;
}

/* Where a fresh carrier takes up their warrant: the living seat if one
   is marked, else the largest place, else whatever's first. */
export function startNode(map) {
  const m = map || SURVEY;
  return m.nodes.find(n => n.seat && !n.gate)
      || m.nodes.find(n => n.kind === "city" && !n.gate)
      || m.nodes.find(n => n.kind === "town" && !n.gate)
      || m.nodes[0] || null;
}

export function regionOf(map, node) {
  if (!node) return null;
  return (map.regions || []).find(r => r.id === node.region) || null;
}
export function threatOf(map, node) {
  const r = regionOf(map, node);
  return r ? (r.threat || 1) : 1;
}

/* A campaign may carry its own survey for testing. Otherwise it gets
   whatever the app ships, which is what lets the map grow underneath a
   character already walking it. */
export function mapFor(camp) {
  return (camp && camp.mapOverride && camp.mapOverride.nodes && camp.mapOverride.nodes.length)
    ? camp.mapOverride
    : SURVEY;
}

/* Called on every launch. If the map has moved under a saved position,
   put the carrier somewhere real and say so, rather than rendering a
   screen they can't escape. */
export function reconcile(camp, map) {
  if (!camp) return null;
  const has = id => map.nodes.some(n => n.id === id);
  const start = startNode(map);

  if (camp.journey) {
    const road = map.roads.find(r => r.id === camp.journey.roadId);
    if (!road || !has(camp.journey.fromId) || !has(camp.journey.toId)) {
      camp.at = has(camp.journey.fromId) ? camp.journey.fromId : (start && start.id);
      camp.journey = null;
      return "That road is no longer on the survey. You've been set down at the nearest stone.";
    }
    const total = Math.round(road.miles * (camp.journey.factor || 1) * 10) / 10;
    if (Math.abs(total - camp.journey.total) > 0.05) {
      const frac = camp.journey.total ? camp.journey.progress / camp.journey.total : 0;
      camp.journey.total = total;
      camp.journey.realMiles = road.miles;
      camp.journey.progress = Math.round(total * frac * 10) / 10;
      return "The survey has been re-measured. This road is now " + road.miles + " miles.";
    }
    return null;
  }

  if (!camp.at || !has(camp.at)) {
    camp.at = start ? start.id : null;
    return start ? "You've been set down at " + placeName(start) + "." : null;
  }
  return null;
}
