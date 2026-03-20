# Curling Engine Validation Research

## Validation target and what “credible” needs to mean
Your primary research question is well-posed: whether the engine reproduces real curling behavior *across the full shot lifecycle*, with special attention to the characteristic “late curl” (small early deviation, stronger sideways deviation near the end) and to whether sweeping, collisions, and ice evolution behave like the real sport.

A useful nuance from the literature is that **curling stone motion is not governed by a single universally accepted mechanism**; modern papers still frame “why stones curl” as unresolved and contested, with multiple competing models and partial explanations. citeturn12search15turn29view0 That does *not* prevent validation—rather, it means “credible” should be defined by a set of **observable outputs** (trajectory shape, distance, sensitivities, sweep response, collision outcomes) that must match measured/published behavior, even if the underlying internal model is one of several plausible mechanisms.

A pragmatic definition that aligns with published work is:

- **Quantitative agreement** for longitudinal motion (speed decay, travel time/distance) and for lateral motion (curl distance and how it accumulates over time), using at least one published trajectory dataset and at least one friction-vs-speed curve as benchmarks. citeturn18view0turn29view0turn12search21  
- **Qualitative + bounded-quantitative agreement** for sweeping and ice wear, because real sweeping outcomes vary with technique, broom head, and ice state; the right standard is “directionally correct with reasonable magnitude” and consistent with the best available measurements and models. citeturn32view0turn30view0turn12search16

## Published expectations for the full shot lifecycle
Across several strands of the curling-physics literature, the following behaviors are repeatedly treated as “typical” or “must reproduce”:

A rotating stone in normal play travels on the order of **~28 m** and shows a **sideways deviation on the order of ~1 m**; the curl direction is set by the sign of rotation, and (importantly) the *amount* of curl is often described as relatively **insensitive to rotation rate** across a broad “normal play” range. citeturn29view0turn18view0

The **stone–ice friction coefficient is low and speed-dependent** on pebbled ice. Nyberg et al. report friction decreasing with increasing sliding speed, with values around **~0.010** at higher speeds (e.g., ~2.3 m/s) and rising toward/above **~0.02** as speed approaches zero for a “normally scratched” stone; a “polished” stone stays closer to the low-friction level and also does not curl normally. citeturn29view0 A separate measurement campaign around the **Beijing “Ice Cube”** Olympic venue reports μ in roughly **0.006–0.016**, decreasing with increased sliding speed (interpreted as consistent with a lubricating, liquid-like layer). citeturn12search21

Sweeping is consistently described as acting primarily by **reducing effective friction** (often framed via heating the ice surface and modifying the interface), letting the stone **go farther** and often **hold line/straighten** depending on how and where sweeping is applied. citeturn32view0turn30view0turn12search16

Several models that try to generate the correct curl magnitude do so by invoking some asymmetry plus the speed-dependent friction/interaction. Two especially relevant examples:

- The **pivot–slide family** (discrete pivoting about contact points/slow-side regions, followed by sliding) explicitly treats stone motion as sequences of pivot+slide events and uses measured/assumed speed-dependent friction behavior as a key ingredient. citeturn22view0  
- Recent precision kinematic measurements argue that **left–right asymmetric friction due to velocity dependence**, combined with the **discrete point-like nature of contact**, leads to “swinging around” slow-side friction points—conceptually compatible with “many small pivots” ideas. citeturn12search15

## Geometry and baseline parameter checks that should be “non-negotiable”
This is the part you can (and should) validate almost mechanically: if these are wrong, downstream comparisons become ambiguous.

**Sheet geometry.** entity["organization","World Curling","governing body"] publishes an ice diagram with dimensions including total sheet length (150 ft / 45.720 m), distance between tee lines (114 ft / 34.747 m), hog-to-hog (72 ft / 21.945 m), and ring radii (6 ft / 1.829 m; 4 ft / 1.219 m; 2 ft / 0.610 m; 6 in / 0.152 m), plus sheet width 4.750 m. citeturn28view0

image_group{"layout":"carousel","aspect_ratio":"1:1","query":["curling sheet markings diagram house rings hog line back line tee line","curling stone running band underside close up","curling ice pebble close up"],"num_per_query":1}

**Stone contact geometry (running band).** Nyberg et al. describe a running band about **~6 mm wide** with **~120 mm diameter**, and pebble plateaus roughly **~0.2 mm high** and “up to” a few mm wide. citeturn29view0 Penner’s discussion likewise places the running band at roughly **~6 cm radius** and **~5 mm width**. citeturn18view0 These are not identical statements (width differs slightly; diameter vs radius), but they’re consistent within typical curling-stone manufacturing/measurement variability and, importantly, they imply the *same magnitude* of high contact pressure from small real contact area.

**Friction model realism vs constant μ.** If you set a constant kinetic friction coefficient (e.g., μ = 0.0168), it may still be usable as an *average effective* value, but the literature strongly supports **velocity-weakening friction** for stones on pebbled ice (μ decreases as speed increases) and **friction rising at low speeds**—exactly where late-shot curl behavior is most sensitive. citeturn29view0turn12search21turn22view0

A compact “parameter plausibility” table (what the literature supports vs what your spec asserts) looks like this:

| Parameter | What the literature supports (with typical magnitudes) | Implication for engine verification |
|---|---|---|
| Sheet dimensions, rings | WCF publishes standard geometry; 6/4/2 ft rings and 6 in button (1.829/1.219/0.610/0.152 m), hog-to-hog 21.945 m, tee-to-tee 34.747 m, sheet width ~4.75 m. citeturn28view0 | Treat as a deterministic unit test: coordinate system + drawing must match exactly. |
| Curl magnitude & rotation range | Curl is “slightly more than” ~1 m, with normal play often ~1–3 rotations over ~28 m; curl magnitude relatively insensitive to rotation speed in a wide range. citeturn29view0turn18view0 | Your engine must reproduce both the magnitude *and* the weak ω-dependence. |
| μ(v) behavior | Speed-dependent friction supported; Nyberg reports ~0.010 at higher speeds and rising toward/above ~0.02 near stop for scratched stones; Li et al. report μ ~0.006–0.016 decreasing with speed. citeturn29view0turn12search21 | A constant μ can be acceptable only if validated as an effective approximation over the shot. Otherwise, adopt μ(v) or calibrate μ_eff(t). |
| Sweeping effect direction | Sweeping reduces friction (via heating) and can add meter-scale distance; also used to hold line/straighten. citeturn32view0turn12search16turn30view0 | Validate sweep response in both distance and curl suppression/hold-line behavior. |

## Curl-shape verification with emphasis on late increasing curl and ω/v-type scaling
### What the pivot–slide literature actually gives you to test
The pivot–slide framework (as presented by entity["people","Mark R. A. Shegelski","physicist"] and entity["people","Edward P. Lozowski","curling physics researcher"]) explicitly models motion as repeated pivot–slide events and introduces a “pivot time fraction” \(f(t)\) derived from the ratio of pivot duration to total event duration, then relates the *direction of motion* and resulting lateral displacement to integrals involving \(v(t)\) and \(f(t)\). citeturn22view0 The same paper emphasizes that kinetic friction on ice is often treated as **velocity-weakening** (and cites/assumes behavior like \( \mu \propto v^{-1/2} \) over relevant ranges). citeturn22view0turn32view0

Even if your internal implementation uses a simplified “curl rate ∝ ω/v” heuristic, the *key observable prediction* you can validate is:

- **Curl should accumulate slowly early and more rapidly late**, because the underlying asymmetry/pivoting effectiveness is coupled to the stone slowing down (through μ(v), contact conditions, or pivot probability/strength), and because the ratio of rotational contribution to translational contribution becomes more significant as \(v\) decreases. This “more curl at lower speeds” appears as a recurring theme across multiple models and summaries. citeturn12search15turn29view0turn30view0

### A strong published trajectory benchmark you can use immediately
Penner reproduces and discusses a trajectory dataset from Jensen & Shegelski in which a stone traveled **25.6 m in 22.8 s**, curled **0.78 m**, and underwent **~2.7 rotations**; he also reports estimated initial conditions (**v₀ ≈ 2.09 m/s**, **ω₀ ≈ −1.01 rad/s**) derived from the dataset. citeturn18view0 This is almost tailor-made for engine validation because it supplies:

- a full shot distance and time,
- a total curl magnitude,
- an initial v and ω estimate,
- and an implicit expectation for the shape of x(t), y(t), and θ(t) (since it was “frame by frame” tracked in the original experiment). citeturn18view0

Penner also reports that his model’s lateral deviation mismatch against the experimental x-position stayed within about **~5 cm**, framing that as “relatively small” compared to stone diameter. citeturn18view0 That single number is extremely valuable as a *realistic quantitative tolerance target* for your engine’s lateral trajectory if you use the same initial conditions and comparable friction conditions.

### How to make “ω/v late curl” testable in-engine
To directly test your subquestion “curl remains small early and increases near end in proportion to ω/v”:

Define three derived observables from the engine output (no model internals required):

1. **Normalized curvature proxy**: \(\kappa(t) = \frac{d\psi}{ds}\) or a discrete equivalent using successive velocity headings; increasing \(\kappa(t)\) late is the signature of “late curl.” The pivot–slide formalism explicitly defines and integrates a direction-of-motion angle \(\psi(t)\). citeturn22view0  

2. **Curl accumulation profile**: \(x(y)\) or \(x(t)\) normalized by final curl \(x_F\). A “late curl” stone should have a curve where, for example, a minority of x_F is accumulated in the first half of travel and a larger share in the last third (exact thresholds should be set from your chosen benchmark datasets). Nyberg’s paper describes a typical curled trajectory magnitude and the sport context, and Murata’s paper frames the mechanism as dependent on velocity-dependent friction and discrete contacts—both consistent with late-stage growth being a key observed behavior. citeturn29view0turn12search15  

3. **Scaling check**: Evaluate whether \(\kappa(t)\) (or lateral acceleration magnitude) correlates with \(\omega(t)/v(t)\) under controlled runs. Murata argues the dominant origin of curl involves asymmetric friction due to the velocity dependence of friction coefficient and discrete contact, so this type of “speed-ratio scaling” test is directly aligned with the proposed physical cause. citeturn12search15turn29view0

A realistic acceptance band, if you adopt the Jensen & Shegelski-style dataset as your anchor, is:

- final curl distance within **±0.05–0.10 m** (because a published scratch-guide model comparison treats ~5 cm as already “small”), citeturn18view0  
- travel time within **~±0.5 s** for the same initial condition order (Penner cites 22.4 s modeled vs 22.8 s measured in that comparison), citeturn18view0  
- and (most importantly for your research question) the **shape** of x(t) should show clearly increasing curl rate late, not a near-constant curvature arc.

## Sweeping and ice evolution validation under published constraints
### Sweeping: direction of effects is well established; magnitude must be calibrated
A useful anchor is that even governance documents define sweeping’s intended effects: entity["organization","World Curling","governing body"] explicitly states acceptable sweeping effects include **making the stone go further and holding it straighter**, while allowing some enhancement of curl. citeturn12search16

Mechanistically, entity["people","Brett A. Marmo","sports engineering researcher"] and colleagues (including entity["people","Jane R. Blackford","materials researcher"] and entity["people","Mark-Paul Buckingham","sports engineering researcher"]) model sweeping as raising the ice surface temperature, reducing the effective friction coefficient and thus reducing deceleration. citeturn32view0 Their paper also explicitly notes that friction on ice is non-linear with velocity (stating \( \mu \propto v^{-1/2} \) in the relevant regime), and ties that nonlinearity to curved trajectories in curling. citeturn32view0

Importantly, Marmo et al. include a quantitative example: for a stone segment with initial velocity **1.0 m/s**, their model predicts an unswept slide of **5.84 m**, versus **6.40 m** when swept with a “conventional” style in their setup (i.e., a noticeable distance gain from sweeping). citeturn32view0 This gives you a concrete scenario to reproduce in-engine as a *unit test of sweep distance effect*, independent of curl.

Because published sweeping outcomes depend strongly on technique and where in the trajectory sweeping is applied, Bradley’s practical review emphasizes that **sweeping is most effective when the stone is slowest (in/near the house)** and less effective at higher stone speeds. citeturn30view0 That directly supports your lifecycle focus: a credible engine should show sweep leverage increasing late in the shot (all else equal), consistent with real tactical sweeping.

### Progressive ice change: pebble wear is real and directionally predictable
Nyberg et al. describe that pebble tops are intentionally flattened (“nipped”) before play and that pebbles show visible scratch changes after a stone passes; in pre-scratched experiments, “guiding effect” becomes **gradually weaker**, consistent with scratches wearing off. citeturn29view0 These observations support your “pebble wear accumulates across the game” spec directionally: repeated stone traffic should change the surface state in ways that can drift outcomes over ends.

More recent work in sweeping/trajectory literature explicitly discusses pebble height reduction per pass and its consequences for contact-area asymmetry models (e.g., reporting micron-scale changes per pass), reinforcing that “ice evolution across a game” is not just anecdotal but measurable. citeturn34search13turn34search10

For validation, the key is not to perfectly model rink-specific evolution, but to show:

- monotonic drift in **μ_eff** and/or in distance for repeated identical unswept throws, consistent with “pebble tops scraped flatter increases real contact and tends to increase friction,” and
- drift saturation (ice is scraped/maintained between ends/games in real play; a model that increases friction without bound is not credible). citeturn29view0

## Collisions and multi-stone outcomes under realistic restitution assumptions
### What can be validated robustly even if COR is uncertain
Your current collision spec is “elastic with coefficient of restitution 0.92 (granite on granite), targets continue moving after impact.” The *behavioral* part (“targets continue moving,” momentum transfer looks right) can be validated strongly even before you pin down a perfect restitution constant.

In real curling, stones are equal-mass to a good approximation and collisions are relatively low-speed; idealized physics predicts characteristic “angles after collision” patterns for near-elastic interactions, but real outcomes are modified by inelasticity, finite contact time, friction with ice immediately after impact, and rotational effects.

What the broader collision literature makes clear is that COR for rocky/granite-like bodies is **condition-dependent** (size, flaws, impact speed, angle). For example, Durda et al. report **large-scale experiments** measuring coefficients of restitution for **meter-scale granite spheres** at collision speeds up to about **1.5 m/s**, explicitly motivated by the need for reliable COR parameterization in models. citeturn36search0turn36search7 Even though that is not “curling stones,” it supports an important validation framing: **a single fixed COR is a practical approximation, not a universal constant**.

### Collision validation tests that map directly to gameplay expectations
Given the above, the most defensible collision validation strategy is:

- Treat COR as a *calibration parameter* bounded by plausible granite-on-granite behavior at low speeds, rather than as a fixed truth you assume without measurement. citeturn36search7  
- Validate collision outcomes by *observable invariants* and *game-relevant scenarios*:

1) **Head-on equal-mass hit**: shooter should lose most forward speed; target should gain most forward speed; energy loss should be modest (not dramatic) and consistent across repeated trials with the same impact speed.  

2) **Glancing hit**: verify that the two stones leave the collision with plausible split of speed and direction, and that both continue sliding under friction and curling physics thereafter (i.e., collision is not a “teleport stop”).  

3) **Post-impact curl continuity**: after collision, each stone’s subsequent curl/slowdown should remain consistent with the same friction and curl model used for normal travel (no discontinuities in μ_eff or ω dynamics unless physically motivated).  

Even without a curling-stone-specific COR paper in hand, this approach is aligned with both general restitution physics (COR is a ratio of relative speeds, and is commonly treated as an effective constant in simplified models) and with the existence of granite COR experiments showing condition dependence. citeturn35search19turn36search7

## A compact validation suite you can derive from the literature
The strongest single validation prompt you proposed—compare trajectories, curl timing, sweep response, stopping distances, and collisions against published physics and match behavior—is exactly what the literature supports as the only credible way to evaluate these engines, because the underlying mechanism remains debated. citeturn12search15turn29view0

A “minimum credible” validation suite, grounded in the sources above, would include:

- **Geometry unit test**: reproduce WCF geometry exactly (lines, rings, hog/back/tee distances). citeturn28view0  
- **Friction curve sanity test**: for an unswept straight slide (no rotation), measure μ_eff(v) from engine deceleration and check it is in-family with published μ ranges and velocity dependence (e.g., decreasing μ at higher v, increasing near stop). citeturn29view0turn12search21turn22view0  
- **Canonical published trajectory replication**: replicate the Jensen–Shegelski-type case as summarized by Penner (25.6 m travel, 22.8 s, 0.78 m curl, ~2.7 rotations; v₀ and ω₀ estimates) as your primary quantitative benchmark. citeturn18view0  
- **Late-curl profile test**: compute curl accumulation profile x(t) or x(y) and show clear late-stage increase in curl rate; test correlation of curvature/curl-rate with ω/v under controlled runs. citeturn12search15turn22view0turn29view0  
- **Sweeping distance benchmark**: reproduce Marmo et al.’s swept-vs-unswept distance change in the published scenario (5.84 m vs 6.40 m for the case they model) and verify sweep effectiveness increases as stone speed decreases, consistent with Bradley’s synthesis. citeturn32view0turn30view0  
- **Sweeping “hold line” direction check**: sweeping should, in general, be capable of making the stone go farther and hold straighter, matching both research summaries and World Curling’s policy definition of acceptable effects. citeturn12search16turn30view0  
- **Ice evolution drift test**: repeated identical throws should show plausible drift consistent with measured pebble wear/scratch wear-off narratives, without runaway behavior. citeturn29view0turn34search13  
- **Collision plausibility tests**: equal-mass hits transfer motion realistically; post-collision stones continue under the same friction/curl rules; tune COR within plausible bounds informed by granite restitution literature. citeturn36search7turn36search0

A defensible acceptance criterion derived from the most concrete published comparison available in your current source set is: **match the canonical published trajectory’s final curl and travel time within the same order of error as prior model–experiment comparisons (centimeter-scale lateral error and sub-second timing error), and reproduce the qualitative late-curl shape and sweep-response directionality.** citeturn18view0turn32view0turn12search16