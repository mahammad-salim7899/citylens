import React from 'react'
import { Link } from 'react-router-dom'
import { Camera, ScanEye, ClipboardCheck, Landmark, MapPinned, ArrowRight, UserRound, Image as ImageIcon } from 'lucide-react'
import Button from '../components/Button'
import IssueCard from '../components/IssueCard'
import DetectionOverlay from '../components/DetectionOverlay'
import { CountUp, Reveal } from '../components/Motion'
import { useInView } from '../lib/motion'
import { SAMPLE_IMAGES } from '../data/mockData'

const steps = [
  { n: '01', title: 'Capture / Upload', icon: Camera, description: 'Snap a photo of the problem or upload one from your gallery. Location is read from the photo.' },
  { n: '02', title: 'AI Detects', icon: ScanEye, description: 'Computer vision identifies the issue, and the severity engine rates how serious it is.' },
  { n: '03', title: 'Confirm', icon: ClipboardCheck, description: 'You check the result and correct it if needed. Nothing is filed without your say.' },
  { n: '04', title: 'Authority Acts', icon: Landmark, description: 'The complaint goes straight to the department responsible — they review and act.' },
  { n: '05', title: 'Track Resolution', icon: MapPinned, description: 'Follow every update, read what was done, and see before/after proof.' },
]

// Hero composition: Citizen → Photo → AI Detection → Civic Action
const flow = [
  { icon: UserRound, label: 'Citizen' },
  { icon: ImageIcon, label: 'Photo' },
  { icon: ScanEye, label: 'AI detection' },
  { icon: Landmark, label: 'Civic action' },
]

// The hero plays one short sequence on load:
//   card settles in → a scan line passes over the photo → the detection
//   box draws itself → the result tiles land one by one.
// Times below are in ms from page load.
const T = { card: 250, scan: 650, box: 1350, tiles: 1900 }

function HeroComposition() {
  const tiles = [
    { k: 'Issue', v: 'Garbage', tone: 'text-white' },
    { k: 'Severity', v: 'High', tone: 'text-red-300' },
    { k: 'Routed to', v: 'Sanitation', tone: 'text-white' },
  ]
  return (
    <div className="relative isolate mx-auto w-full max-w-md lg:max-w-none">
      {/* soft glow behind the card (isolate keeps it above the section background) */}
      <div className="pointer-events-none absolute -inset-6 -z-10 animate-fade-in rounded-[2.5rem] bg-[radial-gradient(60%_60%_at_60%_40%,rgba(53,72,180,0.18),transparent_70%)]" style={{ '--d': `${T.card}ms` }} aria-hidden="true" />

      <div className="animate-scale-in rounded-3xl bg-civic-900 p-4 shadow-lift sm:p-5" style={{ '--d': `${T.card}ms` }}>
        <div className="flex items-center justify-between px-1 text-xs font-medium text-civic-100/70">
          <span className="flex items-center gap-1.5">
            <span className="relative flex h-1.5 w-1.5" aria-hidden="true">
              <span className="absolute inset-0 animate-ping rounded-full bg-signal-tealLight opacity-70" />
              <span className="relative h-1.5 w-1.5 rounded-full bg-signal-tealLight" />
            </span>
            Citizen report
          </span>
          <span className="font-mono">CL-2026-00123</span>
        </div>

        <div className="relative mt-3 overflow-hidden rounded-xl">
          <DetectionOverlay
            src={SAMPLE_IMAGES.garbage}
            alt="Example report: garbage dumped along a roadside wall"
            detections={[{ issue: 'garbage_dumping', confidence: 0.91, bbox: [168, 238, 612, 528] }]}
            imageWidth={800}
            imageHeight={600}
            maxHeight="max-h-none"
            delay={T.box}
          />
          {/* one pass of the scanner before the box appears */}
          <div className="pointer-events-none absolute inset-0 animate-sweep" style={{ '--d': `${T.scan}ms` }} aria-hidden="true">
            <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-b from-transparent to-civic-400/35" />
            <div className="absolute inset-x-0 bottom-0 h-0.5 bg-civic-200 shadow-[0_0_12px_2px_rgba(163,174,230,0.9)]" />
          </div>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
          {tiles.map((t, i) => (
            <div key={t.k} className="animate-rise rounded-lg bg-civic-800 px-3 py-2.5" style={{ '--d': `${T.tiles + i * 110}ms` }}>
              <p className="text-civic-100/60">{t.k}</p>
              <p className={`mt-0.5 font-semibold ${t.tone}`}>{t.v}</p>
            </div>
          ))}
        </div>
      </div>

      <ol className="mt-5 flex items-center justify-between gap-1 px-1" aria-label="How a report flows">
        {flow.map((f, i) => (
          <li key={f.label} className="flex flex-1 items-center gap-1 last:flex-none">
            <div className="flex animate-rise flex-col items-center gap-1.5" style={{ '--d': `${500 + i * 120}ms` }}>
              <span className="flex h-9 w-9 items-center justify-center rounded-full border border-ink-300 bg-white text-civic-700 shadow-sm transition-transform duration-300 hover:scale-110">
                <f.icon className="h-4 w-4" aria-hidden="true" />
              </span>
              <span className="whitespace-nowrap text-[11px] font-medium text-ink-500">{f.label}</span>
            </div>
            {/* dashes travel left → right: the report moving along */}
            {i < flow.length - 1 && <span className="dash-line mb-5 flex-1 animate-dash-flow" aria-hidden="true" />}
          </li>
        ))}
      </ol>
    </div>
  )
}

function HowItWorks() {
  const [ref, inView] = useInView()
  return (
    <ol ref={ref} className="relative mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-5 lg:gap-6">
      <span className="absolute left-0 right-0 top-[3.25rem] hidden h-px bg-ink-200 lg:block" aria-hidden="true" />
      {/* progress line draws across the steps when the section scrolls in */}
      {inView && <span className="absolute left-0 right-0 top-[3.25rem] hidden h-px origin-left animate-grow-x bg-civic-500 lg:block" style={{ '--d': '150ms' }} aria-hidden="true" />}
      {steps.map((step, i) => (
        <Reveal as="li" key={step.n} className="group relative" delay={i * 110}>
          <p className="font-display text-sm font-bold text-civic-500">{step.n}</p>
          <div className="relative mt-3 flex h-10 w-10 items-center justify-center rounded-xl bg-civic-100 text-civic-700 ring-4 ring-white transition-[transform,background-color,color] duration-300 ease-out-expo group-hover:-translate-y-0.5 group-hover:bg-civic-700 group-hover:text-white">
            <step.icon className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
          </div>
          <h3 className="mt-4 font-display text-base font-semibold text-ink-900">{step.title}</h3>
          <p className="mt-1.5 text-sm leading-relaxed text-ink-500">{step.description}</p>
        </Reveal>
      ))}
    </ol>
  )
}

export default function Home() {
  return (
    <>
      <section className="relative overflow-hidden border-b border-ink-300/60 bg-white">
        {/* faint grid, fading out toward the bottom */}
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(30,42,107,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(30,42,107,0.045)_1px,transparent_1px)] bg-[size:44px_44px] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_30%,black,transparent)]" aria-hidden="true" />

        <div className="relative mx-auto grid max-w-6xl gap-12 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-[1.05fr,1fr] lg:items-center lg:gap-16 lg:py-24">
          <div>
            <p className="inline-flex animate-rise items-center gap-2 rounded-full border border-civic-200 bg-civic-50 px-3 py-1 text-sm font-semibold text-civic-700">
              <ScanEye className="h-3.5 w-3.5" aria-hidden="true" /> Computer vision for civic reporting
            </p>
            <h1 className="mt-5 font-display text-4xl font-extrabold leading-[1.08] tracking-tight text-ink-900 sm:text-5xl lg:text-[3.5rem]">
              <span className="block animate-rise" style={{ '--d': '80ms' }}>See it. Report it.</span>
              <span className="block animate-rise bg-gradient-to-r from-civic-700 via-civic-500 to-civic-700 bg-clip-text text-transparent" style={{ '--d': '160ms' }}>
                Improve your city.
              </span>
            </h1>
            <p className="mt-5 max-w-md animate-rise text-lg leading-relaxed text-ink-500" style={{ '--d': '240ms' }}>
              CityLens uses computer vision to help citizens report civic problems quickly, accurately, and transparently.
            </p>
            <div className="mt-8 flex animate-rise flex-col gap-3 sm:flex-row" style={{ '--d': '320ms' }}>
              <Button as={Link} to="/report" size="lg" icon={ArrowRight} iconPosition="right">Report an Issue</Button>
              <Button as={Link} to="/track" size="lg" variant="secondary">Track Complaint</Button>
            </div>
            <dl className="mt-10 grid max-w-md animate-rise grid-cols-3 gap-4 border-t border-ink-200 pt-6" style={{ '--d': '400ms' }}>
              {[[3, 'civic issues detected'], [5, 'steps to resolution'], [1, 'photo is all it takes']].map(([n, l]) => (
                <div key={l}>
                  <dt className="sr-only">{l}</dt>
                  <dd className="font-display text-2xl font-bold text-ink-900"><CountUp value={n} duration={900} /></dd>
                  <dd className="text-xs leading-snug text-ink-500">{l}</dd>
                </div>
              ))}
            </dl>
          </div>
          <HeroComposition />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
        <Reveal className="max-w-xl">
          <h2 className="font-display text-3xl font-bold tracking-tight text-ink-900">Three issues. One photo each.</h2>
          <p className="mt-3 text-ink-500">CityLens focuses on the civic problems that affect road safety and public spaces the most.</p>
        </Reveal>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {[['pothole', SAMPLE_IMAGES.pothole], ['illegal_parking', SAMPLE_IMAGES.parking], ['garbage_dumping', SAMPLE_IMAGES.garbage]].map(([issue, img], i) => (
            <Reveal key={issue} delay={i * 120}>
              <IssueCard issue={issue} image={img} />
            </Reveal>
          ))}
        </div>
      </section>

      <section className="border-y border-ink-300/60 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
          <Reveal className="max-w-xl">
            <h2 className="font-display text-3xl font-bold tracking-tight text-ink-900">How CityLens works</h2>
            <p className="mt-3 text-ink-500">From a single photo to a resolved civic issue — one continuous loop between citizens and authorities.</p>
          </Reveal>
          <HowItWorks />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
        <Reveal variant="scale">
          <div className="relative flex flex-col items-start justify-between gap-6 overflow-hidden rounded-3xl bg-civic-900 p-8 sm:flex-row sm:items-center sm:p-14">
            {/* drifting light behind the copy */}
            <span className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 animate-float rounded-full bg-civic-500/30 blur-3xl" aria-hidden="true" />
            <span className="pointer-events-none absolute -bottom-28 left-1/4 h-64 w-64 animate-float rounded-full bg-signal-teal/20 blur-3xl [animation-delay:1.2s]" aria-hidden="true" />
            <div className="relative">
              <h2 className="font-display text-2xl font-bold text-white sm:text-3xl">Spotted a civic issue nearby?</h2>
              <p className="mt-2 max-w-md text-civic-100/80">Report it in under a minute — CityLens routes it to the right department.</p>
            </div>
            <Button as={Link} to="/report" size="lg" variant="secondary" icon={ArrowRight} iconPosition="right" className="relative">Report an Issue</Button>
          </div>
        </Reveal>
      </section>
    </>
  )
}
