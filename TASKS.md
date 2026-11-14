# Tasks

Status: `open`, `doing (name)`, `done`. Take any open task. Edit this file and push when you take or finish one.

## Engine (lead Jayesh, backup Suresh)

| # | Task | Status |
|---|---|---|
| E1 | Data format and data files (docs/data) | done |
| E2 | Download NASA's south pole height map (LOLA) | done |
| E3 | Compute the horizon (hill line) around one site | done |
| E4 | Get Sun and Earth sky positions from NASA/JPL Horizons for one site | done |
| E5 | Produce the real data file for one site | done |
| E6 | Choose the 5 landing sites, with coordinates and a source for each | done (6 sites, from Wueller et al. 2026) |
| E7 | Produce data files for all 5 sites | done |
| E8 | Moon-over-Port-Louis times from NASA/JPL Horizons | done |
| E9 | Check our sunlight numbers against NASA's published sunlight map | done, see VALIDATION.md |

## Website (lead Suresh, backup Jayesh)

| # | Task | Status |
|---|---|---|
| W1 | Page skeleton that loads the sample data file | done |
| W2 | Lander view: hill line with the Sun and Earth moving along it | done |
| W3 | Site picker and date picker | done |
| W4 | Battery run and the survived / died verdict | done |
| W5 | Launch-delay calendar (green and red dates) | done |
| W6 | Phone layout; add-to-home-screen; works offline | done on headless Chrome, and headless Firefox at true 390 and 360 px widths; needs a test on real phones |
| W7 | Mauritius moment | done |
| W8 | "About and limits" panel: data sources, assumptions, what the tool does not do | done |
| W9 | Public link that opens without a login | done (Suresh): https://vodka-winning-team.github.io/NASA-Space-Apps-Challenge/ (GitHub Pages from `main`, `/docs`; updates about a minute after each push) |
| W10 | Test on 2 phones and 2 browsers; list bugs here | doing (Suresh): headless Firefox passed at 1366, 390 and 360 px (see notes); real phones still to do |

## Story (lead Paveesh, backup Suresh)

| # | Task | Status |
|---|---|---|
| S1 | Paste the Resources tab from the official challenge page into `docs/RESOURCES.md` | open |
| S2 | Slide outline, 7 slides (structure is in the Presentation Guidelines PDF) | open |
| S3 | Draft the NASA submission text: summary (50 to 200 words), project details, NASA data, references, AI use | open |
| S4 | Pitch script for 4 minutes; decide who speaks | open |
| S5 | Screenshots of every screen, for slides and as backup | done (Suresh): `pitch/screenshots/`, desktop and phone (true 390 px), both modes |
| S6 | 30-second backup screen recording | open |
| S7 | QR code to the public link for the last slide | done (Suresh): `pitch/qr-code.png` (black on white) and `pitch/qr-code-dark.png` (for the dark slides); scan it once with a phone to be sure |
| S8 | Make the repo public; test every link in a private browser window | done (Suresh): repo is public; live site tested in a fresh browser with no login; every link in README, CHALLENGE and VALIDATION opens, except spaceappschallenge.org, which did not answer our script, so check it by hand |
| S9 | Fill the NASA page and click Submit for Judging | open |
| S10 | Three timed rehearsals | open |

## Bugs and notes

- 15 Nov 02:40, Suresh: merged `plain-words` (Simple / Mission planner switch, "How do we save it?") into `main`. Automated test in headless Firefox, on desktop (1366 px) and phone widths (390 and 360 px; the first run was really at 500 px because Firefox windows cannot be narrower, so it was re-run with the page in an iframe of exactly 390 and 360 px): no script errors, no sideways scroll, all 6 places x 24 dates run, Play works, a shared link opens the same settings, "Try it" saves a lost mission and "Put it back" undoes it, the offline copy fills (38 files). The same test passed on the live GitHub Pages link. No bugs found. Small thing for later: the map dots (30 px) and the battery slider (28 px tall) are a bit small to tap.
- Note for the pitch: the page opens in **Simple** mode, which hides the detailed sections (among them the planner, the hill side view, the two-place comparison and the two-year calendar). Click **Mission planner** to show judges everything, or share a link ending `?mode=planner`.

(add here)
