# Will the lander survive?

Status: proposed concept; not implemented.

Challenge: [NASA Space Apps 2026 — Lunar Landing Site Navigator](https://www.spaceappschallenge.org/2026/challenges/lunar-landing-site-navigator/)

## Concept

A simple website that lets users choose a supported lunar landing site, landing date, mission duration, and fictional lander configuration. It visualizes the Sun and Earth against the terrain horizon, estimates battery charge, and helps users find a better plan when the configured mission runs out of power.

Pitch: **Will your lander run out of power? Choose a lunar site, landing date, and lander configuration. Watch the shadows, track the battery, and find a better plan before it runs out.**

## User experience

1. **View from the lander:** a 2D terrain skyline derived from elevation data, with Sun and Earth positions animated through time.
2. **Power verdict:** a battery timeline ending in “Power lasts the full mission” or “Battery depleted on day X,” explicitly under the selected configuration.
3. **Landing-date calendar:** compare nearby arrival dates. Green means the configured power requirement passes, amber means a small reserve, and red means battery depletion. Define the reserve threshold visibly. These are power-model results, not declarations of safe landing conditions.
4. **Can we save it?** Change the date, supported site, battery capacity, or assumed electrical load, then replay the mission and compare the result.
5. **Mauritius moment:** an optional Port Louis viewing-overlap indicator. A more advanced version computes geometric contact opportunities to a hypothetical station at Port Louis coordinates.

Keep the skyline, controls, verdict, and compact comparison timeline on one main screen. Keep sources and assumptions readily accessible.

## Scientific model and limits

The battery model integrates net electrical power over time:

`battery change = (solar generation - electrical load) * time step`

Bound charge by usable capacity, account for charging/discharging efficiency or state the simplifying assumptions, and record the first depletion event. The fictional preset must expose usable battery capacity, starting charge, array orientation/output assumptions, load including an assumed heater demand, and mission duration. Sunlight does not imply charging when generation is below consumption.

This estimates power endurance. It does not establish actual spacecraft survival: detailed thermal behaviour, hardware faults, landing hazards, and battery temperature effects remain outside the first version.

Report Earth visibility and interruption duration separately. Loss of communication does not automatically cause mission failure. Visibility alone does not establish radio-link availability.

A Moon-above-Port-Louis condition combined with Earth-centre visibility from the lander is only an approximate overlap indicator. Direct station visibility requires the station-specific sightline, including lunar terrain obstruction; actual communication additionally requires antenna and link-budget analysis.

Use landing dates rather than launch dates. A launch delay does not necessarily produce an identical shift in lunar arrival time.

## Proposed minimum scope

- Three verified sites, a bounded date range, and cached/precomputed data.
- Real terrain horizons for the supported sites; no invented skyline presented as measured terrain.
- Sun and Earth positions, a shared time slider, and a 2D skyline.
- A transparent fictional lander preset and battery simulation.
- Nearby landing-date comparison and calendar.
- Rescue controls and before/after results.
- A data-and-method panel with coordinates, time basis, terrain resolution, observer height, sources, assumptions, and limitations.

Defer arbitrary coordinates, detailed 3D terrain, full thermal simulation, equipment-height changes, and radio-link budgets. Add the Mauritius feature after the core works reliably.

## Data and validation

- [JPL Horizons](https://ssd.jpl.nasa.gov/horizons/manual.html): observer-specific Sun and Earth geometry.
- [Horizons API](https://ssd-api.jpl.nasa.gov/doc/horizons.html): programmatic ephemeris access.
- [LRO LOLA archive](https://pds-geosciences.wustl.edu/missions/lro/lola.htm): elevation products for terrain horizons.
- [QuickMap](https://quickmap.lroc.asu.edu/) and [Moon Trek](https://trek.nasa.gov/moon/): inspect site context.
- [NASA south-pole illumination map](https://science.nasa.gov/photojournal/south-pole-illumination-map/): illumination-pattern cross-check, not automatic validation of individual date predictions.
- [NASA lunar power-hibernation research](https://ntrs.nasa.gov/citations/20220017550): context for the connection between heating needs, battery demand, and survival.

First verify compatible coordinate conventions, terrain reference surfaces, units, and time systems. Compare sample positions against Horizons output and inspect terrain visibility transitions. Document centre-of-disc versus partial-disc visibility assumptions. Match periods, locations, and observer heights before using published illumination products for quantitative comparisons. Label coarse sampling and refine transitions where feasible.

Check the battery model with meaningful cases: darkness-only discharge, generation below load, positive net charging with a capacity cap, and depletion before mission completion. Record sources, processing settings, and limitations with the output.

## Proposed 15-hour allocation

| Time | Deliverable |
| --- | --- |
| First 3 hours | Prove one site's real terrain and Sun/Earth data pipeline. |
| Next 4 hours | Battery model, timeline, and animated skyline. |
| Next 3 hours | Two additional sites, date comparison, and calendar. |
| Next 2 hours | Rescue controls; Mauritius overlap if the core is reliable. |
| Final 3 hours | Validation, usability fixes, cached demonstration, and pitch rehearsal. |

The first data milestone determines whether the terrain scope is achievable. If it fails, reduce supported coverage and disclose limitations instead of substituting fabricated scientific results.

## Presentation

Demonstrate one sequence: choose a site and date, discover an energy shortfall, show the terrain/time conditions behind it, then change one input to recover power endurance.

Position the project through its clarity, working calculations, and transparent assumptions. Avoid unsupported claims about what other teams built, guaranteed uniqueness, guaranteed mission survival, or guaranteed awards.

## Capabilities needed

Frontend development and visualization; Python/data processing; lunar geometry/GIS; interface design; validation; and concise scientific storytelling. Use planning and implementation skills once the concept and scope are selected, followed by a presentation workflow for the pitch.
