# Plan: Will the lander survive?

Deadline: **Sunday 11:30**, everything ready. Judging at 12:00. Pitch is 4 minutes, strictly timed.

The idea is in [IDEA.md](IDEA.md). The live task list is in [TASKS.md](TASKS.md).

## How we work

1. **One task list.** Every job is one line in TASKS.md with an owner and a status. Whoever is free takes the next open one, whatever their role.
2. **Roles are "lead plus backup", not walls.** The lead decides and keeps that part moving. Anyone can do the work and push it.
3. **Push small and often.** `main` must always open and run. Nobody sits on unpushed work for more than an hour.
4. **Agreed data format.** The website reads one data file per site (format in `docs/DATA_FORMAT.md`). A sample file exists from the start, so the website and slides do not wait for the real numbers.
5. **Checkpoints decide who moves.** At each checkpoint, whoever is ahead moves to whatever is behind.

## Roles

| Part | What it covers | Lead | Backup |
|---|---|---|---|
| Engine | NASA data in, data files out; the check against NASA's sunlight maps | Jayesh (main laptop) | Suresh |
| Website | Lander view, battery verdict, calendar, Mauritius moment, phone layout | Suresh | Jayesh |
| Story | 7 slides, NASA submission page, pitch script, screenshots, backup recording | Paveesh | Suresh |

## Timeline

| Time | Goal | Checkpoint |
|---|---|---|
| 21:15 to 21:30 | Kickoff: confirm roles, everyone can push, data format agreed | Everyone has pushed one test change |
| 21:30 to 23:30 | Engine works for 1 site; website skeleton runs on sample data; slide outline and submission draft started | **23:30:** one real site shown on screen |
| 23:30 to 02:00 | All 5 sites; battery verdict; launch-delay calendar; phone layout | **02:00:** core complete; presenter goes to sleep |
| 02:00 to 03:30 | Mauritius moment; NASA check; public link live; backup screenshots | **03:30:** no new features after this |
| 03:30 to 07:30 | Sleep | |
| 07:30 to 09:30 | Bug fixes only; final slides; 30-second backup recording | Demo runs with internet off |
| 09:30 to 10:30 | Fill the NASA page, click **Submit for Judging**; three timed rehearsals | Submitted |
| 10:30 to 11:30 | Buffer | Ready at 11:30 |

## If we are behind

Cut in this order:

1. The NASA check shrinks to one site.
2. The Mauritius moment becomes one line of text.
3. The launch-delay calendar covers one site.

The lander view and the battery verdict always stay.

## Website and phone

One build gives both:

- **Website:** the full tool on a laptop, used for the live demo.
- **Phone:** the same site laid out for a phone, installable to the home screen, working offline. A QR code on the last slide lets judges open it.

A separately coded mobile app is not planned. Stretch only, if everything is green at 02:00: wrap the finished site into an Android install file.

## Rules we must not forget

- Slides: 7 maximum, the title slide counts. In English.
- All submitted links must open without a login. The repo must be public by Sunday morning.
- Click **Submit for Judging** on the NASA platform. Saving is not submitting.
- List every NASA resource we used, with links. At least one must be from the challenge's Resources tab.
- Say where AI tools were used. No NASA logos in generated content.
- Do not rely on the internet during the demo. Keep screenshots and a recording as backup.

---
Drafted with AI assistance (Claude).
