# Slides (task S2)

Seven slides, the title slide included. English. No NASA logos. The spoken words are in [PITCH_SCRIPT.md](PITCH_SCRIPT.md); the notes below are short versions of them.

All pictures are in `pitch/screenshots/`. They show the real website on the demo mission: Haworth, landing 28 Jul 2027, 14 days, battery lasts 4 days without Sun, panel 2 m. Use the dark slide background so the screenshots blend in.

| # | Slide | Time | Judging criteria |
|---|---|---|---|
| 1 | Will the lander survive? | 0:15 | Presentation |
| 2 | The south pole is hard | 0:35 | Relevance, Impact |
| 3 | One screen, one answer | 0:25 | Impact, Presentation |
| 4 | Lost on day 9. Can we save it? (live demo) | 1:00 | Creativity, Impact |
| 5 | When the launch slips | 0:35 | Relevance, Creativity |
| 6 | Built on NASA data, checked against NASA | 0:40 | Validity |
| 7 | Mauritius can see it. So can you. | 0:30 | Impact, Presentation |
| | **Total** | **4:00** | |

---

## Slide 1: Will the lander survive?

**On the slide**

- Title: **Will the lander survive?**
- Under it: Lunar Landing Site Navigator · NASA Space Apps Challenge 2026 · Port Louis
- Team: Jayesh, Suresh, Paveesh [CHECK: add every team member as the team agrees]
- Picture: `desktop-lost-planner-04-verdict.jpg` (the big red "Lost on day 9."), large.

**Speaker notes**

Open on the red verdict. A lander touches down at the south pole, and nine days later it is lost. Our tool answers one question: will the lander survive?

---

## Slide 2: The south pole is hard

**On the slide**

- The Sun stays low. Hills hide it for days.
- No Sun → battery empty → lander lost.
- No Earth in view → no contact.
- Picture: `desktop-lost-planner-07-watch-the-mission.jpg`, cropped to the top half: the hill line, the Sun low on the left, Earth above, "The lander is here".

**Speaker notes**

The south pole has ice, so agencies want to land there. The Sun skims the edge of the sky, so a hill can hide it for days. A lander runs on solar panels, so no Sun means the battery drains. And to talk to us it must see Earth. Where and when you land decides whether the mission lives.

---

## Slide 3: One screen, one answer

**On the slide**

- Pick a place. Pick a date. Get an answer.
- Pictures: `desktop-lost-planner-03-choose-a-place-and-a-date.jpg` (the six places, the date, the map) and `phone-lost-simple-03-verdict.jpg` (the same answer on a phone), side by side.
- Small text: Works on phones. Works offline.

**Speaker notes**

The tools that do this today are powerful but hard to read. Ours is one screen: the real hills with the Sun and Earth moving along them, a battery run through the mission, and an answer in big letters. Same site on a phone.

---

## Slide 4: Lost on day 9. Can we save it? (live demo)

**On the slide**

- Lost on day 9 → How do we save it? → Saved.
- Picture (shown only if the demo fails): `desktop-lost-planner-05-rescue.jpg` ("We tried five changes, one at a time. 4 of 5 would save this mission.")
- Second backup picture: `desktop-lost-planner-10-landing-later.jpg` (2 Aug: "Wait 5 days, land on 2 Aug, and the lander survives.")

**Speaker notes**

Switch to the browser. Exact clicks are in PITCH_SCRIPT.md. Show "Lost on day 9", scroll to "How do we save it?", 4 of 5 fixes work, raising the panel to 10 m does not. Click "Try it" on "Land 5 days later". The verdict becomes "Survived, just." with the battery down to 12%. Say honestly that Earth is now in view only 5% of the time: power is saved, contact is the next problem.

The backup video (`pitch/backup-demo.mp4`) shows the "Survived, just." screen at about 0:17, and `pitch/screenshots/` has it too (see its README).

---

## Slide 5: When the launch slips

**On the slide**

- What if we land a few days later?
- Which place is safest?
- Pictures: `desktop-lost-planner-10-landing-later.jpg` (top) and `desktop-lost-planner-13-compare-the-six-places.jpg` (bottom: two years, six places, green and red stripes).
- Small line: Land anywhere south of 85° S (type it or tap the map). The numbers hour by hour, as a CSV.

**Speaker notes**

The challenge stresses launch delays. Each square is the same mission, landing one day later: five red days, then a narrow yellow survive, then green. The stripes show every landing date in 2027 and 2028 for all six places. With this lander, Mons Mouton survives on 71% of dates, Slater Plain on 33%.

---

## Slide 6: Built on NASA data, checked against NASA

**On the slide**

- Hills: NASA LRO LOLA height map, 80 m pixels, Moon's curve included.
- Sun and Earth: NASA/JPL Horizons, every hour of 2027 and 2028, no atmosphere, libration included.
- Sites: Wueller et al. 2026.
- Checked against NASA Goddard's sunlight maps (PGDA):

| | Average difference from NASA | Largest |
|---|---|---|
| Earth in view (panel 2 m) | 1.7 points | 2.8 points |
| Sunlight (panel 0.5 m) | 6.0 points higher | 18.9 points |

- Honest limits: our sunlight runs high, so "lost" is the safer signal. The battery is a simple model. Earth in view is line of sight, not a radio link.
- Small picture: `desktop-lost-planner-11-which-hill-hid-the-sun.jpg` (the real hill, 91.8 km away, that hid the Sun).

**Speaker notes**

Every hill and every Sun position is NASA data. We then checked ourselves against NASA's own maps. Earth agrees within 3 points everywhere. Our sunlight runs high, so we say so on the page: a narrow "survived" needs caution, and "lost" is the safer signal.

---

## Slide 7: Mauritius can see it. So can you.

**On the slide**

- "Go outside, look at the Moon, and the lander is looking back."
- Picture: `desktop-lost-planner-15-mauritius.jpg` ("Yes. For 54 hours of this mission, the lander can see Earth while the Moon is in the sky over Port Louis.")
- QR code: `pitch/qr-code-dark.png` (for a dark slide) or `pitch/qr-code.png` (for a white slide). Scan it once with a phone before the pitch.
- Links: vodka-winning-team.github.io/NASA-Space-Apps-Challenge · github.com/Vodka-winning-team/NASA-Space-Apps-Challenge
- Footer, small: NASA data: LRO LOLA, NASA/JPL Horizons, NASA GSFC PGDA. Built with AI assistance (Claude, OpenAI Codex). Not a NASA product.

**Speaker notes**

On 28 July 2027, from 4 in the morning Mauritius time, our lander can see Earth while the Moon is up over Port Louis. Scan the code: it works on your phone, even offline. Thank you.

---

## Checklist before the pitch

- Seven slides, no more. In English.
- No NASA logos or NASA branding on any slide.
- QR code scanned once with a real phone.
- Slides exported as PDF as well, in case the slide tool fails.
- Slides link added to `pitch/SUBMISSION.md` and to the NASA page; it opens without a login.

---
Drafted with AI assistance (Claude).
