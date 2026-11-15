# Pitch script: Will the lander survive? (4 minutes)

Everything for the pitch in one place: timing, what is on each slide, the exact words, the demo clicks, the backup plan and the likely questions. The longer versions are in `pitch/PITCH_SCRIPT.md` and `pitch/SLIDES.md`.

## Timing

| # | Slide | Time | Clock at end | Judges score |
|---|---|---|---|---|
| 1 | Will the lander survive? | 0:15 | 0:15 | Presentation |
| 2 | The south pole is hard | 0:30 | 0:45 | Relevance, Impact |
| 3 | One screen, one answer | 0:15 | 1:00 | Impact, Presentation |
| 4 | Live demo: lost, why (3D), saved | 1:20 | 2:20 | Creativity, Impact |
| 5 | When the launch slips | 0:30 | 2:50 | Relevance, Creativity |
| 6 | Built on NASA data, checked against NASA | 0:35 | 3:25 | Validity |
| 7 | Mauritius can see it. So can you. | 0:35 | 4:00 | Impact, Presentation |

About 470 spoken words: an easy pace, with room for the demo clicks. If the demo runs long, drop the line in brackets on slide 5. Keep the 3D part: it is the "why", and it is short.

## Before the pitch

1. On the demo laptop, open this link once **while online**, so it also works offline:
   https://vodka-winning-team.github.io/NASA-Space-Apps-Challenge/?mode=planner&lang=en#site=HW06&date=2027-07-28&days=14&batt=96&panel=2
   - It opens in Mission planner, in English, with the demo mission set. The guided tour never pops up on this link.
   - The button at the top right should say **FR** (the page is in English). If it says **EN**, press it once.
   - If the projector washes out the dark page, press **Light** at the top right.
2. Check it says **"Lost on day 9."** and "How do we save it?" says **4 of 5**.
3. Keep a second tab on the same link, and `pitch/backup-demo.mp4` on the desktop.
4. Practise the one click on the battery chart (demo step 3) once.

---

## Slide 1: Will the lander survive? (0:15)

**On the slide:** title **Will the lander survive?** · Lunar Landing Site Navigator · NASA Space Apps Challenge 2026 · Port Louis · team names · picture `pitch/screenshots/desktop-lost-planner-04-verdict.jpg` (the big red "Lost on day 9.").

**Say:**
> Imagine a lander touches down at the Moon's south pole. Nine days later, it is lost. We are a team from Port Louis. We built a tool that answers one question before launch: will the lander survive?

## Slide 2: The south pole is hard (0:30)

**On the slide:** The Sun stays low; hills hide it for days. No Sun → battery empty → lander lost. No Earth in view → no contact. Picture: `desktop-replay-1-beside-the-lander.jpg`, top half.

**Say:**
> The south pole has ice, so space agencies want to land there. But the Sun never climbs high. It skims the edge of the sky, so a hill or a crater rim can hide it for days. No Sun, the battery drains. Empty battery, lost lander. And to talk to us, the lander must also see Earth. So where and when you land decides everything.

## Slide 3: One screen, one answer (0:15)

**On the slide:** Pick a place. Pick a date. Get an answer. Pictures side by side: `desktop-lost-planner-03-choose-a-place-and-a-date.jpg` and `phone-lost-simple-03-verdict.jpg`. Small: works on phones, works offline.

**Say:**
> The tools that check this today are powerful, but hard to read. Ours is one screen. Pick a place, pick a date, and get an answer in big letters.

## Slide 4: Live demo (1:20)

Switch to the browser (the demo link is already open). Two clicks in total.

**1. Point at the verdict, "Lost on day 9."** Say:
> Let me show you. Haworth, 28 July 2027. A two-week mission, and a battery that lasts four days without Sun. Lost on day 9. Why?

**2. Scroll down** past "How do we save it?" to **"Why? Watch the mission."**: the big 3D picture of the ground with the lander on it.

**3. Click once in the middle of the battery chart** (the wide dark chart right under the 3D picture). The view jumps to day 8:
- top-left corner: **Day 8**, battery about **30%**
- the thin line from the lander to the Sun is **red**
- a label by the Sun: "The Sun is below the horizon here (the land **97 km** away hides it)" (the number changes a little with where you click)

Point at the red line and the label. Say:
> This is the real ground at Haworth, built from NASA's laser maps, with our lander on it. Let's jump to day 8. The Sun is right there on the horizon, but the line to it is red: a hill about a hundred kilometres away is in the way. No sunlight, and the battery is already down to thirty percent.

Do **not** press Play during the pitch: it runs all 14 days in about 8 seconds, too fast to talk over.

**4. Scroll back up to "How do we save it?"** Point at the card with a cross, "Raise the solar panel". Say:
> So how do we save it? The page tried five changes by itself. Four work. A taller panel does not: the hills are too high.

**5. On the first card, "Land 5 days later", click Try it.** The page jumps back up to **"Survived, just."** Say:
> Let's land five days later. Survived, just: the battery fell to twelve percent. But Earth is now in view only five percent of the time. Power is saved; contact is the next problem. The tool shows both.

**6. Back to the slides.**

**If the demo fails:** say *"The live site is not answering, so here are the same screens from last night."* Play `pitch/backup-demo.mp4` (37 s; "Survived, just." at about 0:27), or show `desktop-lost-planner-04-verdict.jpg`, `-05-rescue.jpg` and `-09-landing-later.jpg` in that order. Keep talking. Do not try to fix the laptop on stage.

## Slide 5: When the launch slips (0:30)

**On the slide:** What if we land a few days later? Which place is safest? Pictures: `desktop-lost-planner-09-landing-later.jpg` (top) and `desktop-lost-planner-12-compare-the-six-places.jpg` (bottom). Small: land anywhere south of 85° S; every hour as a CSV.

**Say:**
> The challenge stresses launch delays. Each square is the same mission, one day later. Five red days, then green. That is the question planners face when a launch slips.
>
> Over two years of dates, with this lander, Mons Mouton survives on 71 percent, Slater Plain on only 33.
>
> (You can also land anywhere south of 85 degrees, and download every hour as a spreadsheet.)

## Slide 6: Built on NASA data, checked against NASA (0:35)

**On the slide:** Hills: NASA LRO LOLA, 80 m pixels. Sun and Earth: NASA/JPL Horizons, every hour of 2027–28, no atmosphere. Sites: Wueller et al. 2026. Checked against NASA Goddard's maps (PGDA): Earth 1.7 points apart on average; our sunlight runs 6.0 points higher (panel 0.5 m). Limits: simple battery model; Earth in view is line of sight, not a radio link. Small picture: `desktop-lost-planner-10-which-hill-hid-the-sun.jpg`.

**Say:**
> Is it real? Every hill comes from NASA's LOLA laser altimeter on the Lunar Reconnaissance Orbiter. Every Sun and Earth position comes from NASA JPL Horizons, every hour of 2027 and 2028.
>
> We cross-checked against NASA's own visibility maps; the page shows where we differ and why. And we are honest about the limits: the battery is a simple model, and seeing Earth is not the same as a radio link.

## Slide 7: Mauritius can see it. So can you. (0:35)

**On the slide:** "Go outside, look at the Moon, and the lander is looking back." Picture: `desktop-lost-planner-14-mauritius.jpg`. QR code (`pitch/qr-code-dark.png` or `pitch/qr-code.png`) with: **Scan, press "Look around with your phone", and turn.** · English / Français. Links: vodka-winning-team.github.io/NASA-Space-Apps-Challenge · github.com/Vodka-winning-team/NASA-Space-Apps-Challenge. Footer: NASA data: LRO LOLA, NASA/JPL Horizons, NASA GSFC PGDA. Built with AI assistance (Claude, OpenAI Codex). Not a NASA product.

**Say:**
> One last thing. On 28 July 2027, our lander can see Earth while the Moon is up over Port Louis. Look at the Moon, and the lander is looking back.
>
> Scan the code. It works on your phone, offline, in English or French. Press "Look around with your phone" and turn: you are standing at Haworth.
>
> Will the lander survive? Now anyone can check. Thank you.

---

## Likely questions (short answers)

- **Why does your sunlight differ from NASA's maps?** The comparison uses different time spans, map detail, panel heights and Earth definitions, so it is not an accuracy score. Our sunlight runs higher (6.0 points on average at 0.5 m, 10.9 at 2 m); the cause is not yet isolated, and the page says so.
- **Is "Earth in view" a radio link?** No. It means the centre of the Earth is above the hills: a clear line of sight. No antenna, ground stations or relay satellites.
- **How accurate is "Somewhere else"?** The browser uses NASA's 80 m map within 10 km and a 640 m map out to 200 km. Rebuilding the six prepared sites that way, the hill line stayed within a quarter of a degree and the survive/lost answer matched on about 96 to 100% of landing days.
- **Does the phone look-around use the camera or my location?** No. Only the motion sensors, and only after you press the button. On a laptop the button is hidden; you drag the view instead.
- **Why French?** Mauritius uses both. The words change; the numbers and the calculation are the same.
- **Who is this for?** Planners who need a fast first look, especially when a launch slips, and teachers and the public. It does not replace NASA's professional tools.
- **What next?** A better battery model (cold, heat, real lander power), finer maps near the lander, more years of Sun and Earth positions, then testing with real planners and teachers.
- **How was AI used?** Code, data scripts and text were written with AI assistance (Claude), and OpenAI Codex helped with review. The science comes from NASA data and published papers, checked against NASA's maps.

---
Written with AI assistance (Claude).
