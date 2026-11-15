# Pitch script, 4 minutes (task S4)

**Who speaks:** Paveesh presents (story lead in PLAN.md). Who drives the laptop during the demo: [CHECK: team to decide]. Practise the hand-over at slide 4.

**Length:** the spoken words below are 544 words (530 without the optional sentence in brackets on slide 5). Per slide: 37, 88, 58, 111, 82, 99, 69. That is about 135 words a minute overall, slower on slide 4 to leave room for the demo clicks.

**Time budget**

| Slide | What | Time | Clock at end |
|---|---|---|---|
| 1 | Title | 0:15 | 0:15 |
| 2 | The problem | 0:35 | 0:50 |
| 3 | One screen, one answer | 0:25 | 1:15 |
| 4 | Live demo: lost, then saved | 1:00 | 2:15 |
| 5 | When the launch slips | 0:35 | 2:50 |
| 6 | NASA data and our check | 0:40 | 3:30 |
| 7 | Mauritius, QR code, thanks | 0:30 | 4:00 |

The pitch is strictly timed. If you are behind at 2:15, drop the line in brackets on slide 5.

---

## The script

### Slide 1 (0:15)

Imagine a lander touches down at the Moon's south pole. Nine days later, it is lost. We are a team from Port Louis. We built a tool that answers one question before launch: will the lander survive?

### Slide 2 (0:35)

The south pole has ice, so space agencies want to land there. But it is a hard place. The Sun never climbs high. It skims the edge of the sky, so a hill or a crater rim can hide it for days. A lander runs on solar panels. No Sun, and the battery drains. Empty battery, lost lander. And to talk to us, the lander must see Earth. If a hill hides Earth, there is no contact. So where and when you land decides whether the mission lives.

### Slide 3 (0:25)

The tools that check this today are powerful, but hard to read. Ours is one screen. Pick a place. Pick a date. You see the real hills around the lander, with the Sun and Earth moving along them. A battery runs through the mission, and you get an answer in big letters. On a laptop or a phone.

### Slide 4 (1:00), live demo

Let me show you. Haworth, landing 28 July 2027. A two-week mission, and a battery that lasts four days without Sun.

Lost on day 9. The hills hid the Sun for too long.

We do not stop there. We ask: how do we save it? It tried five changes by itself. Four of them work. A taller panel does not: the hills are too high.

Let's land five days later.

Survived, just. The battery fell to twelve percent. One click, and I can put it back.

But look: Earth is now in view only five percent of the time. Power is saved. Contact is the next problem. The tool shows both.

### Slide 5 (0:35)

The challenge stresses launch delays. So: what if we land a few days later? Each square is the same mission, one day later. Five red days, then green. That is the question planners face when a launch slips.

And which place is safest? Two years of landing dates for all six places. With this lander, Mons Mouton survives on 71 percent of dates, Slater Plain on only 33.

(Planners can also land anywhere south of 85 degrees, and download every hour as a spreadsheet.)

### Slide 6 (0:40)

Is it real? Every hill comes from NASA's LOLA laser altimeter on the Lunar Reconnaissance Orbiter, with the Moon's curve included. Every Sun and Earth position comes from NASA JPL Horizons, every hour of 2027 and 2028.

Then we checked ourselves against NASA Goddard's sunlight maps. Earth in view: within three points at every site. Sunlight: we run high, six points on average. So we say it on the page: a narrow "survived" needs caution, and "lost" is the safer signal. The battery is a simple model, and Earth in view means line of sight, not a radio link.

### Slide 7 (0:30)

One last thing. On 28 July 2027, from four in the morning, our lander can see Earth while the Moon is up over Port Louis. Go outside, look at the Moon, and the lander is looking back.

Scan the code. It works on your phone, even offline. Everything is open: the code, the data, and our check against NASA. Will the lander survive? Now anyone can check. Thank you.

---

## Live demo path (slide 4)

**Before the pitch**

1. On the demo laptop, open this link once while online, so the offline copy is stored:
   https://vodka-winning-team.github.io/NASA-Space-Apps-Challenge/?mode=planner#site=HW06&date=2027-07-28&days=14&batt=96&panel=2
   It opens in **Mission planner** mode with the demo mission already set.
2. Check that it says **"Lost on day 9."** and that "How do we save it?" says **4 of 5**.
3. Keep a second tab on the same link, in case you need to start again. Keep `docs/index.html` from the repo on the laptop as a second backup (it opens with no internet).

**Clicks during the demo** (if the page is not already set, do all of them; if it is, just point)

1. Top right: click **Mission planner**.
2. "Where do we land?": click **Haworth**.
3. "When?": set the date to **28 Jul 2027** (the box may show it as 07/28/2027).
4. Open **More settings**: mission **14 days**, slide the battery to **4 days without Sun**, panel **2 m**. The line next to "More settings" should read "14-day mission · battery lasts 4 days without Sun · panel 2 m high".
5. Point at the verdict: **"Lost on day 9."** "The hills hid the Sun for too long."
6. Scroll down one screen to **"How do we save it?"**: "We tried five changes, one at a time. 4 of 5 would save this mission." Point at the one card with a cross, "Raise the solar panel": "Does not work. Even at 10 m the hills still hide the Sun for too long."
7. On the first card, **"Land 5 days later"** (Land on 2 Aug instead of 28 Jul), click **Try it**.
8. The page scrolls back up by itself. The verdict now says **"Survived, just."** and "The battery fell to 12%". The line under it says Earth is in view 5% of the time.
9. If there is time: scroll to **"Why? Watch the mission."** and press **Play the mission**. The 3D view shows the lander on the real ground, the Sun on the horizon, and the Earth above it (click **Look at Earth**). When the Sun goes behind a hill the line to it turns red. Ctrl + scroll zooms out over the craters. Skip this if behind.
10. If there is still time: the box below says "Saved. One change did it: landing 5 days later." Click **Put it back the way it was** to show the undo. Skip this if behind.
11. Go back to the slides for slide 5.

**If the demo fails**

Say: *"The live site is not answering, so here are the same screens from last night."* Then show the backup video (`pitch/backup-demo.mp4`, 32 s, also at https://github.com/Vodka-winning-team/NASA-Space-Apps-Challenge/blob/main/pitch/backup-demo.mp4; keep a copy on the laptop's desktop), or these screenshots in order:

1. `pitch/screenshots/desktop-lost-planner-04-verdict.jpg` ("Lost on day 9.")
2. `pitch/screenshots/desktop-lost-planner-05-rescue.jpg` (4 of 5 fixes)
3. `pitch/screenshots/desktop-lost-planner-10-landing-later.jpg` ("Wait 5 days, land on 2 Aug, and the lander survives.")

Keep talking from the script. Do not try to fix the laptop during the pitch.

---

## Likely questions from the judges

**1. Why does your sunlight differ from NASA's maps?**
Our sunlight is higher than NASA's at all six sites: 6.0 points on average with the panel at 0.5 m, 10.9 at 2 m. The largest gap is Nobile Rim 1. We have not proven the cause. Likely reasons: NASA's map is for the ground on a 60 m grid, while ours puts a panel above an 80 m grid, which smooths the ground near the lander. NASA averages 18.6 years; we cover two. And on ridge tops, neighbouring NASA pixels differ by 20 points or more. That is why we tell users that "lost" is the safer signal. Earth in view agrees within 3 points everywhere, with the panel at 2 m.

**2. Is "Earth in view" the same as a radio link?**
No. It means the centre of the Earth is above the hills, so there is a clear line of sight. It does not include the antenna, the ground stations, their schedules or relay satellites. We say this on the page.

**3. How accurate is "Somewhere else" (your own coordinates)?**
Close to the prepared sites. The browser uses NASA's 80 m height map for the ground within 10 km of the lander, which is where ridge-top horizons are decided, and a 640 m copy for hills up to 200 km away. We tested it by rebuilding the six prepared sites this way: the hill line stayed within a quarter of a degree, and the survived/lost answer matched on 97 to 100% of landing days. One more thing we learned: moving the lander just 700 m changes the answer on about half the landing days, so the exact spot matters.

**4. What would you add next?**
A better battery model (cold, heat, real lander power numbers), a finer height map close to the lander, and more years of Sun and Earth positions. Then test it with real mission planners and teachers, and fix what confuses them.

**5. Who is this for?**
Planners who need a fast first look, especially when a launch slips, and teachers and the public. It opens in a simple mode for everyone; the Mission planner mode adds the detail. It does not replace NASA's professional tools.

**If asked how AI was used:** code, data scripts and text were written with AI assistance (Claude), and OpenAI Codex helped with review and parts of the last night's work. The science comes from NASA data and published papers, and our numbers were checked against NASA's maps.

---
Drafted with AI assistance (Claude).
