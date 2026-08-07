# Errantry

A walking RPG. You bank miles by walking in the real world, then spend them
moving on a map that has nothing to do with real geography.

## Running it

There is no build step. It's ES modules and plain files.

    cd errantry
    python3 -m http.server 8000

Then open http://localhost:8000

For the service worker and installability you need HTTPS, so push the folder
to GitHub Pages and add it to your home screen from there.

Icons aren't included yet — drop `icon-192.png`, `icon-512.png` and
`icon-512-maskable.png` in the root when you have them. The app runs without
them; only the install prompt is affected.

## Layout

    index.html            shell
    sw.js                 offline cache
    css/app.css           parchment, thumb-first
    js/store.js           persistence, with fallbacks
    js/travel.js          the road — pure, testable, no imports
    js/content.js         THE MAP, and everything else the world is made of
    js/dice.js            rolling — pure, seedable
    js/loot.js            purse categories, item tiers, weight
    js/rules.js           SRD 5.1 data: ancestries, classes, spells
    js/character.js       making a character, and every derived number
    js/charui.js          the creation flow and the sheet
    js/state.js           account + campaign model, the mile bank
    js/screens.js         views (return HTML strings)
    js/main.js            boot, routing, every mutation
    data/                 survey exports, kept for reference

## The two tiers

**Account** is yours: lifetime miles, the walking log, conditioning, the list
of campaigns. Conditioning is a ratchet — it never resets and never spends,
and it survives a character's death.

**Campaign** is the character's: bank, position, in-world day, quest flags,
the road log. Miles land in whichever campaign is active when you log them.
They can't be in two places at once.

## What's built

- Mile bank with a cap that grows as conditioning earns it
- Overflow past the cap still counts toward conditioning, so walking is never wasted
- Steps→miles, calibrated by height
- The map ships inside the app — nothing to load, nothing to paste
- A campaign stores only where it is, so map updates reach a character
  already walking; roads that move or vanish are reconciled on launch
- Travel: departing, walking down a road, arriving, turning back
- Encounters fire at the right intervals — the content behind them is stubbed
- Running the bank dry mid-road leaves you camped; nothing decays while you're gone

- Character creation: nine ancestries, five classes, rolled or standard or
  your own body, prior trades, skills, spells, and the warrant
- The character sheet, with everything derived rather than stored
- Loot: five purse categories that scale by region, four item tiers, weight

## What isn't

Combat, encounter content, contracts, shops, levelling choices, coaches,
death resolution, quests, reputation.

## Licence

This work includes material from the SRD 5.1 by Wizards of the Coast LLC,
licensed under CC-BY-4.0. See ATTRIBUTION in js/rules.js.

## Testing the travel engine

`js/travel.js` imports nothing and touches no browser API, so it runs in node:

    node --input-type=module -e "
      import('./js/travel.js').then(T => {
        const road = {id:'e1', from:'a', to:'b', miles:9, density:'normal'};
        const j = T.beginJourney(road, 'a', 'foot', 'seed');
        console.log(T.advance(j, 4));
      })"
