# Submission text for the Space Apps project page (task S3)

Copy each part into the matching box on the NASA Space Apps project page. Then click **Submit for Judging**. Saving is not submitting.

Before pasting:

- Fill the slides link placeholder at the bottom. Every link must open without a login.

---

## Project name

Will the lander survive?

## Challenge

Lunar Landing Site Navigator

## High-level summary

(160 words, counted. The limit is 50 to 200.)

Will the lander survive? is a simple website for planning a landing near the Moon's south pole. There the Sun stays low, so hills can hide it for days. A solar-powered lander then drains its battery and is lost. To talk to us, it must also see Earth. Pick one of six candidate sites and a landing date. The website shows the Sun and Earth against that place's real horizon, runs a battery through the mission, and gives a plain answer: survived, or lost on day X. If the lander is lost, it tries five fixes and shows which ones save it. A calendar shows what happens if the launch slips a few days, and two-year stripes show which place is safest. It is built on NASA data: LRO LOLA heights and NASA/JPL Horizons positions of the Sun and Earth, checked against NASA Goddard's sunlight maps. It works on phones and offline. It is for planners, teachers and the public.

## Project details

### What it does

You pick a place near the Moon's south pole and a landing date. The website answers one question: will the lander survive?

- **The view from the lander.** The real hill line around the site, with the Sun and Earth moving along it hour by hour.
- **The verdict.** A battery fills in sunlight and drains in the dark. The answer is in big letters: "Survived." or "Lost on day 9."
- **How sure is this answer?** The same mission run 16 times with bad luck added: less sunlight, weaker panels, more power use, a battery not full at landing.
- **Play the mission.** Watch the Sun go behind the hills and the battery run down.
- **How do we save it?** When the lander is lost, the website tries five single changes: land later, carry a bigger battery, raise the solar panel, land at another place, or plan a shorter mission. It shows which ones work. Each can be applied with one click and undone.
- **Sunset and Earthset countdown,** and the height of the Sun and Earth above the ground and above the hills.
- **What if we land a few days later?** The same mission for each of the next 14 days, in green and red. This is for launch delays, which the challenge stresses.
- **Which place is safest?** Two years of landing dates (2027 and 2028) for all six places, as coloured stripes.
- **Compare two places** on the same date with the same lander.
- **Which hill hid the Sun?** A side view of the hill that blocked the Sun, and how far away it is.
- **Stand on the ground.** A 3D view of the real ground around the lander, lit by the Sun at the hour shown.
- **Can it do science too?** A task planner: place jobs like drilling or sending results home, and see what the battery can afford.
- **Can Mauritius see it?** The hours when the lander can see Earth while the Moon is in the sky over Port Louis.
- **Somewhere else: land anywhere south of 85° S.** Type coordinates or tap the map. The browser works out the hills from the NASA LOLA height map (80 m detail near the lander, 640 m for far hills) and turns the NASA/JPL Horizons Sun and Earth positions of the nearest prepared site to the new place. Tested by rebuilding the six prepared sites this way: the same survived/lost answer on 97 to 100% of landing days.
- **The numbers, hour by hour.** Key figures, a day-by-day table, and a CSV download of every hour, for planners.

Two modes: **Simple** (the default, for the public) and **Mission planner** (every section). The website works on phones, can be added to the home screen, and works offline after the first visit.

### How it works

1. **The hills.** From NASA's LOLA height map of the south pole (80 m per pixel) we look out from each site in 720 directions, up to 200 km, and keep the highest hill in each direction. The Moon's curve is included. We do this for a solar panel 0.5 m, 2 m and 10 m above the ground.
2. **The Sun and Earth.** NASA/JPL Horizons gives their direction in the sky of each site for every hour of 2027 and 2028, with no atmosphere. Earth's wobble in the sky (libration) is included.
3. **Each hour** we work out how much of the Sun's disc is above the hills, and whether the centre of the Earth is above them.
4. **The battery.** The lander uses 1 unit of energy per hour. In full Sun its panels make 3 units per hour, less if hills cover part of the Sun. The battery size is set in hours it lasts without Sun. If it reaches empty, the lander is lost.
5. **The check.** We compared our numbers with NASA Goddard's illumination maps at all six sites. Earth in view agrees within 3 points everywhere (panel at 2 m; average difference 1.7 points). Our sunlight is higher than NASA's at every site (6.0 points on average at 0.5 m, 10.9 points at 2 m). So a narrow "survived" deserves caution, and "lost" is the safer signal. The website says this openly.

Python scripts turn the NASA data into small data files. The website reads those files directly, so it needs no server of its own and no internet once loaded.

### Benefits

- Hours of sunlight become one clear answer: the mission lives, or it is lost on a given day.
- When a launch slips, a planner can see at once which new dates and places still work.
- The website does not stop at "lost". It suggests fixes, and shows the cost of each.
- It covers both things the challenge asks about: power (Sun) and direct-to-Earth contact (Earth in view).
- It is honest about its limits, with a check against NASA's own maps on the page.
- Teachers and the public can use it on a phone in a few seconds. The Mauritius section links the Moon in our own sky to a lander on its surface.

### What we hope to achieve

A fast first look for mission planners, teachers and the public, before they open the professional tools. We would like people to understand why the south pole is hard, and that the landing date matters as much as the landing place. It does not replace NASA's mission tools.

### Limits (stated on the website)

- The battery is a simple model: no heat, cold, dust or ageing.
- "Earth in view" means a clear line of sight. It is not a guaranteed radio link.
- The height map has 80 m pixels, so rocks and small ridges are not seen. It ends at 80° south, so hills further north are not included.
- Our sunlight runs higher than NASA's maps (see above).
- It does not judge slopes, landing hazards or science value.

### Tools and languages

- **Python 3** with numpy and requests (Pillow for the map picture): the engine that turns NASA data into data files.
- **HTML, CSS and JavaScript** with canvas drawing. No framework, no build step.
- **three.js r147** for the 3D view of the ground.
- **GitHub Pages** for the public link.
- **Progressive web app** (service worker and web manifest): installable on a phone, works offline.

## NASA data

- **NASA/JPL Horizons System** (from the challenge's Resources tab): https://ssd.jpl.nasa.gov/horizons/ . Sun and Earth positions in the sky of each site, every hour of 2027 and 2028, airless, libration included. Also the Moon's position from Port Louis, Mauritius.
- **NASA LRO LOLA gridded elevation LDEM_80S_80M** (LOLA topography is named in the challenge text), NASA PDS Geosciences Node: https://pds-geosciences.wustl.edu/lro/lro-l-lola-3-rdr-v1/lrolol_1xxx/data/lola_gdr/polar/img/ . The horizon around each site, the side view of the blocking hill, the 3D ground and the map picture.
- **NASA GSFC Planetary Geodesy Data Archive, LOLA-derived polar illumination maps** (files AVGVISIB_85S_060M_201608 and AVGVISIB_85S_060M_201608_EARTH): https://pgda.gsfc.nasa.gov/products/69 . Used to check our sunlight and Earth numbers.

We did not use Quickmap or Moon Trek.

## Space agency partner and other data

- No partner space agency data was used. (The CSA Moon Exploration portal is on the Resources tab; we did not use it.)
- **Wueller et al. (2026)**, JGR Planets 131(3), e2025JE009434, https://doi.org/10.1029/2025JE009434 , with data at https://doi.org/10.5281/zenodo.17084058 (CC BY 4.0). The coordinates of the six candidate landing sites.
- Fonts: Archivo and JetBrains Mono (SIL Open Font License).
- three.js r147 (MIT License).

## References

1. NASA/JPL Horizons System. https://ssd.jpl.nasa.gov/horizons/
2. LRO LOLA gridded data record, polar product LDEM_80S_80M. NASA PDS Geosciences Node. https://pds-geosciences.wustl.edu/lro/lro-l-lola-3-rdr-v1/lrolol_1xxx/data/lola_gdr/polar/img/
3. LOLA-derived polar illumination maps. NASA GSFC Planetary Geodesy Data Archive. https://pgda.gsfc.nasa.gov/products/69
4. Mazarico, E., et al. (2011). Illumination conditions of the lunar polar regions using LOLA topography. Icarus 211. https://doi.org/10.1016/j.icarus.2010.10.030
5. Wueller et al. (2026). JGR Planets 131(3), e2025JE009434. https://doi.org/10.1029/2025JE009434 . Data: https://doi.org/10.5281/zenodo.17084058
6. three.js r147. https://github.com/mrdoob/three.js/releases/tag/r147
7. Archivo and JetBrains Mono fonts, SIL Open Font License. https://fonts.google.com/specimen/Archivo , https://fonts.google.com/specimen/JetBrains+Mono

Full list with what each was used for: https://github.com/Vodka-winning-team/NASA-Space-Apps-Challenge/blob/main/docs/RESOURCES.md

## Use of AI

- Code, data scripts and text in this project were written with AI assistance: **Claude** (Anthropic).
- **OpenAI Codex** was used for code review and for parts of the work on the last night, for example the science task planner.
- The team tested the website and ran the check against NASA's maps.
- All science comes from NASA data and published papers. AI was not used to make up data.
- No AI-made images, and no NASA logos or branding.

## Links

- Live website (works on phones, no login): https://vodka-winning-team.github.io/NASA-Space-Apps-Challenge/
- Mission planner view, opened on the demo mission: https://vodka-winning-team.github.io/NASA-Space-Apps-Challenge/?mode=planner#site=HW06&date=2027-07-28&days=14&batt=96&panel=2
- Code and data: https://github.com/Vodka-winning-team/NASA-Space-Apps-Challenge
- Slides: [ADD LINK, must open without login]
- 30-second backup video: https://github.com/Vodka-winning-team/NASA-Space-Apps-Challenge/blob/main/pitch/backup-demo.mp4

## Team

Jayesh (engine), Suresh (website), Paveesh (story and presenter). Port Louis, Mauritius.

[CHECK: list every team member as the team agrees, for example Adiyen, who is also on the GitHub organisation.]

This is a hackathon project. It is not a NASA product and is not endorsed by NASA.

---
Drafted with AI assistance (Claude).
