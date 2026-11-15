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
| W11 | Mission planner figures, daily table and hourly CSV export | done: includes custom places, UTC times, NASA sources and simple-model limits |

## Story (lead Paveesh, backup Suresh)

| # | Task | Status |
|---|---|---|
| S1 | Paste the Resources tab from the official challenge page into `docs/RESOURCES.md` | done (Suresh, with AI): `docs/RESOURCES.md`, every resource with links and what we used it for |
| S2 | Slide outline, 7 slides (structure is in the Presentation Guidelines PDF) | draft done (Suresh, with AI): `pitch/SLIDES.md`; Paveesh to turn into slides |
| S3 | Draft the NASA submission text: summary (50 to 200 words), project details, NASA data, references, AI use | draft done (Suresh, with AI): `pitch/SUBMISSION.md` (summary 160 words); team to check the team list |
| S4 | Pitch script for 4 minutes; decide who speaks | draft done (Suresh, with AI): `pitch/PITCH_SCRIPT.md` (544 words, timed to 4:00, demo clicks, fallback, judge Q&A); team to decide who drives the laptop |
| S5 | Screenshots of every screen, for slides and as backup | done (Suresh): `pitch/screenshots/`, desktop and phone (true 390 px), both modes |
| S6 | 30-second backup screen recording | done (Suresh): `pitch/backup-demo.mp4` (37 s, captions, recorded from the real site, with the 3D replay) |
| S7 | QR code to the public link for the last slide | done (Suresh): `pitch/qr-code.png` (black on white) and `pitch/qr-code-dark.png` (for the dark slides); scan it once with a phone to be sure |
| S8 | Make the repo public; test every link in a private browser window | done (Suresh): repo is public; live site tested in a fresh browser with no login; every link in README, CHALLENGE and VALIDATION opens, except spaceappschallenge.org, which did not answer our script, so check it by hand |
| S9 | Fill the NASA page and click Submit for Judging | open |
| S10 | Three timed rehearsals | open |

## Bugs and notes

- 15 Nov, 06:40, Suresh (with Claude and OpenAI Codex): **"Why? Watch the mission." is now a 3D replay.** It opens beside the lander on the real ground (NASA LOLA), with the Sun on the horizon and the Earth (NASA Blue Marble) where NASA/JPL Horizons puts it. Drag to look around, right-drag to move, Ctrl + scroll or the + and − buttons to zoom out over the whole region; buttons for "From above", "Lander's eye", "Look at Earth". A line to the Sun turns red and names the ridge when the Sun is blocked. The old flat picture is still there, folded below the battery chart ("Flat 360° view of the horizon"). Also fixed: the mouse pointer vanishing over the 3D view, the mouse wheel getting stuck on it, and slow place changes. Tests: 134 checks pass. Screenshots (`pitch/screenshots/`, see `desktop-replay-*`) and the backup video are new. If anything looks wrong on the demo laptop, the version before this change is tagged `before-3d-replay` (to go back: `git revert -m 1 <the merge commit>` and push, or ask Suresh).

- 15 Nov, early morning, Suresh (with Claude and OpenAI Codex): added "Somewhere else" (land anywhere south of 85° S) and "The numbers, hour by hour" (CSV), the submission pack drafts, the backup video, and a browser test suite (`tests/run.sh`, 112 checks, all passing). Codex reviewed the code and found 13 issues; 12 are fixed and tested (`tests/review.mjs`). Not changed: after a deploy, a phone that loses the network halfway through loading could mix old and new files for one visit; the cache now never stores error pages, so a reload fixes it.

- 15 Nov 02:40, Suresh: merged `plain-words` (Simple / Mission planner switch, "How do we save it?") into `main`. Automated test in headless Firefox, on desktop (1366 px) and phone widths (390 and 360 px; the first run was really at 500 px because Firefox windows cannot be narrower, so it was re-run with the page in an iframe of exactly 390 and 360 px): no script errors, no sideways scroll, all 6 places x 24 dates run, Play works, a shared link opens the same settings, "Try it" saves a lost mission and "Put it back" undoes it, the offline copy fills (38 files). The same test passed on the live GitHub Pages link. No bugs found. Small thing for later: the map dots (30 px) and the battery slider (28 px tall) are a bit small to tap.
- Note for the pitch: the page opens in **Simple** mode, which hides the detailed sections (among them the planner, the hill side view, the two-place comparison and the two-year calendar). Click **Mission planner** to show judges everything, or share a link ending `?mode=planner`.

- 15 Nov 10:40, Suresh: added a guided tour for first-time visitors (`docs/tour.js`, `docs/tour.css`): a welcome card, then 12 short spotlight steps over the real page, with "Try it" hints. It opens by itself only on a first visit to the plain link, never over a link with settings (so not over the demo link). The **Tour** button at the top replays it. Tested by `tests/tour.mjs` at laptop and phone sizes.

- 15 Nov 11:25, Suresh: tour updated for Jayesh's additions: a step for **Look around with your phone** (shown only when that button is, on phones and tablets), a step for **Light / Dark and FR / EN**, and the whole tour in French (it follows the language switch). Fixed a bug in the French switch: a link with settings opened in French lost its settings (the demo link opened 1 Jan with default settings). Pitch script and slides moved to 5 minutes, with the 3D replay in the demo and the phone look-around in the close.

(add here)
