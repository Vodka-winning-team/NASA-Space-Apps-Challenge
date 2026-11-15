# Pitch script, 4 minutes (task S4)

**Who speaks:** Paveesh presents (story lead in PLAN.md). Who drives the laptop during the demo: [CHECK: team to decide]. Practise the hand-over at slide 4.

**Length:** about 460 spoken words: an easy pace of about 115 a minute, which leaves room for the demo clicks and pauses.

**What the judges score**, and where each one is earned:

| Criterion | Where we earn it |
|---|---|
| Relevance | Slides 2 and 5: the challenge's own problem (hard-to-use tools, launch delays), answered on one screen |
| Impact | Slides 3, 4 and 7: planners get an answer in seconds; the public sees why, in 3D, on their own phone, in English or French |
| Creativity | Slide 4: the page finds the fix by itself; the 3D replay. Slide 7: turn your phone to stand on the Moon |
| Validity | Slide 6: NASA LOLA hills, NASA JPL Horizons Sun and Earth, our check against NASA's maps, limits stated by us |
| Presentation | One story (lost, then saved), a live demo, a QR code the judges can try |

**Time budget**

| Slide | What | Time | Clock at end |
|---|---|---|---|
| 1 | Title | 0:15 | 0:15 |
| 2 | The problem | 0:30 | 0:45 |
| 3 | One screen, one answer | 0:15 | 1:00 |
| 4 | Live demo: lost, why (the 3D view, 20 s), saved | 1:20 | 2:20 |
| 5 | When the launch slips | 0:30 | 2:50 |
| 6 | NASA data and our check | 0:35 | 3:25 |
| 7 | Mauritius, QR code, your phone, thanks | 0:35 | 4:00 |

The pitch is strictly timed. If the demo is running long, drop the line in brackets on slide 5. Keep the 3D part: it is the "why", and it is short.

---

## The script

### Slide 1 (0:15)

Imagine a lander touches down at the Moon's south pole. Nine days later, it is lost. We are a team from Port Louis. We built a tool that answers one question before launch: will the lander survive?

### Slide 2 (0:30)

The south pole has ice, so space agencies want to land there. But the Sun never climbs high. It skims the edge of the sky, so a hill or a crater rim can hide it for days. No Sun, the battery drains. Empty battery, lost lander. And to talk to us, the lander must also see Earth. So where and when you land decides everything.

### Slide 3 (0:15)

The tools that check this today are powerful, but hard to read. Ours is one screen. Pick a place, pick a date, and get an answer in big letters.

### Slide 4 (1:20), live demo

Let me show you. Haworth, 28 July 2027. A two-week mission, and a battery that lasts four days without Sun.

Lost on day 9. Why?

This is the real ground at Haworth, built from NASA's laser maps, with our lander on it. Let's jump to day 8. The Sun is right there on the horizon, but the line to it is red: a hill about a hundred kilometres away is in the way. No sunlight, and the battery is already down to thirty percent.

So how do we save it? The page tried five changes by itself. Four work. A taller panel does not: the hills are too high.

Let's land five days later. Survived, just: the battery fell to twelve percent. But Earth is now in view only five percent of the time. Power is saved; contact is the next problem. The tool shows both.

### Slide 5 (0:30)

The challenge stresses launch delays. Each square is the same mission, one day later. Five red days, then green. That is the question planners face when a launch slips.

Over two years of dates, with this lander, Mons Mouton survives on 71 percent, Slater Plain on only 33.

(You can also land anywhere south of 85 degrees, and download every hour as a spreadsheet.)

### Slide 6 (0:35)

Is it real? Every hill comes from NASA's LOLA laser altimeter on the Lunar Reconnaissance Orbiter. Every Sun and Earth position comes from NASA JPL Horizons, every hour of 2027 and 2028.

We cross-checked against NASA's own visibility maps; the page shows where we differ and why. And we are honest about the limits: the battery is a simple model, and seeing Earth is not the same as a radio link.

### Slide 7 (0:35)

One last thing. On 28 July 2027, our lander can see Earth while the Moon is up over Port Louis. Look at the Moon, and the lander is looking back.

Scan the code. It works on your phone, offline, in English or French. Press "Look around with your phone" and turn: you are standing at Haworth.

Will the lander survive? Now anyone can check. Thank you.

---

## Live demo path (slide 4)

**Before the pitch**

1. On the demo laptop, open this link once while online, so the offline copy is stored:
   https://vodka-winning-team.github.io/NASA-Space-Apps-Challenge/?mode=planner&lang=en#site=HW06&date=2027-07-28&days=14&batt=96&panel=2
   It opens in **Mission planner** mode, in English, with the demo mission already set. Links with settings never open the guided tour, so nothing pops up.
   - If the projector washes out the dark page, press **Light** at the top right (and **Dark** to go back). The page remembers it.
   - Check the button at the top right says **FR** (the page is in English). If it says **EN**, the page is in French: press it once.
2. Check that it says **"Lost on day 9."** and that "How do we save it?" says **4 of 5**.
3. Keep a second tab on the same link, in case you need to start again. Keep `docs/index.html` from the repo on the laptop as a second backup (it opens with no internet).

**Clicks during the demo** (the link sets everything; you only point, scroll and click twice)

1. Point at the verdict: **"Lost on day 9."**
2. Scroll down past "How do we save it?" to **"Why? Watch the mission."** (the 3D view of the ground, with the lander on it).
3. **Click once in the middle of the battery chart** (the wide dark chart right under the 3D view). The view jumps to **day 8**: the battery in the top-left corner shows about **30%**, the thin line from the lander to the Sun is **red**, and a label next to the Sun says **"The Sun is below the horizon here (the land … km away hides it)"** (about 97 km; the exact number depends on where you click). Point at the red line and the label.
   - Do **not** press Play here: it runs all 14 days in about 8 seconds, too fast to talk over.
4. Scroll back up to **"How do we save it?"**: "We tried five changes, one at a time. 4 of 5 would save this mission." Point at the card with a cross, "Raise the solar panel".
5. On the first card, **"Land 5 days later"**, click **Try it**.
6. The page scrolls back up by itself. The verdict now says **"Survived, just."**, the battery fell to 12%, and the line under it says Earth is in view 5% of the time.
7. Back to the slides for slide 5.

**If the demo fails**

Say: *"The live site is not answering, so here are the same screens from last night."* Then show the backup video (`pitch/backup-demo.mp4`, 37 s, also at https://github.com/Vodka-winning-team/NASA-Space-Apps-Challenge/blob/main/pitch/backup-demo.mp4; keep a copy on the laptop's desktop), or these screenshots in order:

1. `pitch/screenshots/desktop-lost-planner-04-verdict.jpg` ("Lost on day 9.")
2. `pitch/screenshots/desktop-lost-planner-05-rescue.jpg` (4 of 5 fixes)
3. `pitch/screenshots/desktop-lost-planner-09-landing-later.jpg` ("Wait 5 days, land on 2 Aug, and the lander survives.")

Keep talking from the script. Do not try to fix the laptop during the pitch.

---

## Likely questions from the judges

**1. Why does your sunlight differ from NASA's maps?**
We cross-checked against NASA's long-term visibility maps. The comparison uses different time periods, terrain resolutions, observer heights and Earth-visibility definitions; it is not a measurement of prediction accuracy. Our Earth metric uses its centre; NASA counts any visible part of Earth's disc. Our sunlight-duration differences are 6.0 points on average at 0.5 m and 10.9 at 2 m. The cause has not been isolated.

**2. Is "Earth in view" the same as a radio link?**
No. It means the centre of the Earth is above the hills, so there is a clear line of sight. It does not include the antenna, the ground stations, their schedules or relay satellites. We say this on the page.

**3. How accurate is "Somewhere else" (your own coordinates)?**
Close to the prepared sites. The browser uses NASA's 80 m height map for the ground within 10 km of the lander, which is where ridge-top horizons are decided, and a 640 m copy for hills up to 200 km away. We tested it by rebuilding the six prepared sites this way: the hill line stayed within a quarter of a degree, and the survived/lost answer matched on about 96 to 100% of landing days. One more thing we learned: moving the lander just 700 m changes the answer on about half the landing days, so the exact spot matters.

**4. What would you add next?**
A better battery model (cold, heat, real lander power numbers), a finer height map close to the lander, and more years of Sun and Earth positions. Then test it with real mission planners and teachers, and fix what confuses them.

**5. Who is this for?**
Planners who need a fast first look, especially when a launch slips, and teachers and the public. It opens in a simple mode for everyone; the Mission planner mode adds the detail. It does not replace NASA's professional tools.

**6. Does the phone look-around use the camera or my location?**
No. Only the phone's motion sensors, and only after you press the button (iPhones ask for permission first). Directions are for the Moon scene, not the real sky: "Re-centre" sets which way is forward. On a laptop the button is hidden; you drag the view instead.

**7. Why French?**
Mauritius uses both. The switch translates the words on the page and the charts; the numbers and the calculation are the same in both languages.

**If asked how AI was used:** code, data scripts and text were written with AI assistance (Claude), and OpenAI Codex helped with review and parts of the last night's work. The science comes from NASA data and published papers, and our numbers were checked against NASA's maps.

---
Drafted with AI assistance (Claude).
