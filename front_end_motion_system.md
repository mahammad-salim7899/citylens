# CityLens frontend motion system (2026-10-01)

A restrained, app-wide motion pass on top of the existing design (civic navy,
Manrope/Inter). No new dependencies: Tailwind keyframes, a few CSS primitives,
and two small hooks.

## Where things live

- `tailwind.config.js`: keyframes and `animate-*` utilities (rise, fade-in,
  scale-in, page-in, pop, sweep, grow-x/y, ripple, shimmer, dash-flow, float),
  plus the `ease-out-expo` curve used almost everywhere.
- `src/index.css`: `.reveal` (scroll reveal), `.skeleton`, `.svg-draw`,
  `.dash-line`, `.scan-grid`, `.animate-shake`, map pin drop, and the
  reduced-motion overrides.
- `src/lib/motion.js`: `useInView`, `useCountUp`, `stagger()`,
  `prefersReducedMotion()`.
- `src/components/Motion.jsx`: `<Reveal>`, `<CountUp>`, `<Skeleton>`.

## Conventions — follow these when adding motion

1. **Stagger with the `--d` CSS variable**, e.g. `style={{ '--d': '120ms' }}`.
   Every `animate-*` utility reads its delay from it.
2. **Entrance animations move the `translate`/`scale` properties, never
   `transform`.** A finished animation with fill-mode `both` keeps its last
   value, so animating `transform` pins it and silently kills hover lifts
   (`hover:-translate-y-*`) on the same element. This was a real bug caught in
   testing.
3. **Leaflet markers**: Leaflet positions them with `transform`, so pin
   animation targets the inner `<svg>` with `translate`.
4. **Grid columns on mobile** need `min-w-0` / `grid-cols-1`, or long text
   widens the page. Fixed on Dashboard and Login.
5. **Reduced motion** is honoured globally: delays are zeroed, reveals and
   drawn SVGs are shown in their final state, and count-ups jump to the value.

## Signature moments

- Home hero: the card settles in, a scan line passes over the photo, the
  detection box draws itself, and the result tiles land. Connectors between
  the flow steps show travelling dashes.
- Analysis screen: viewfinder corners, detection grid, looping scan line,
  progress bar, and the active step highlighted.
- Success: the circle and tick draw, then a ripple plays.
- Officer form and login: a shake on validation errors. Filter clicks on the
  authority dashboard replay a short row cascade.

## Verified

Ten browser checks pass: hover lift still works on animated tiles, the
count-up lands on the real number, the scan line shows, the tick finishes
drawn, the shake triggers, filter clicks replay rows, reduced motion hides
nothing, and there are no page errors. No horizontal overflow at 360 or
390 px on any page.