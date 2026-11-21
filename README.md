# GTA 6 Trophy Guide & Tracker — Leonida

An offline web guide and tracker for all **55 PlayStation 5 trophies** of
Grand Theft Auto VI (1 platinum, 2 gold, 6 silver, 46 bronze), with a cited
guide for every trophy, a roadmap to the platinum, and a missable-trophy
warning.

## What it does

- **Tracker** — a checklist of every trophy with its official name, description
  and grade. Tick a trophy when you earn it; progress saves in your browser
  (localStorage) and the counter at the top shows `X / 55 earned` with a
  breakdown by grade.
- **Filters** — search by name, description or guide; filter by grade
  (Platinum / Gold / Silver / Bronze) and by kind (Story, Missable,
  Collectibles, Activities, Online); a "Missable only" toggle.
- **Spoiler mode** — hides the names and descriptions of story trophies until
  you earn them.
- **Export / Import / Reset** — export your progress to a JSON file, import it
  back on another device, or reset it (with a confirmation).
- **Roadmap** — the stages to the platinum in order, each with the trophies it
  unlocks and what to do before moving on.
- **Missables** — every missable trophy in one place, with its point of no
  return. Earn these before the final missions, or keep a manual save from
  before the cutoff.
- **Sources** — every fact in a guide is cited to a numbered source; the Sources
  tab lists them all with names, links and read dates. The guides are written
  in our own words — a source is cited, never copied.

## Run it locally

```sh
node serve.ts
```

Then open http://localhost:8080. Or serve the `app/` folder with any static
file server. It works with the network off: the app fetches only its own
`app/data/trophies.json` and loads no external files.

## Data

`app/data/trophies.json` holds the 55 official trophies (names, descriptions
and grades as PlayStation publishes them), the guide for each one with
citation numbers, the 7-stage roadmap, and the source list.

## Missable warning

At least one trophy can be missed permanently once you pass the end of the
story. Check the Missables tab before the final missions and keep a manual
save from before the point of no return.

## Notes

Unofficial fan guide. Grand Theft Auto and GTA are trademarks of Rockstar
Games; this guide uses no Rockstar logo, artwork or game screenshots.
