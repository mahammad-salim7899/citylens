import React from 'react'
import { Link } from 'react-router-dom'
import { Camera, ScanEye, ClipboardCheck, Landmark, MapPinned, ArrowRight, UserRound, Image as ImageIcon } from 'lucide-react'
import Button from '../components/Button'
import IssueCard from '../components/IssueCard'
import DetectionOverlay from '../components/DetectionOverlay'
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

function HeroComposition() {
  return (
    <div className="relative mx-auto w-full max-w-md lg:max-w-none">
      <div className="rounded-3xl bg-civic-900 p-4 shadow-lift sm:p-5">
        <div className="flex items-center justify-between px-1 text-xs font-medium text-civic-100/70">
          <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-signal-tealLight" aria-hidden="true" /> Citizen report</span>
          <span className="font-mono">CL-2026-00123</span>
        </div>
        <div className="mt-3 overflow-hidden rounded-xl">
          <DetectionOverlay
            src={SAMPLE_IMAGES.garbage}
            alt="Example report: garbage dumped along a roadside wall"
            detections={[{ issue: 'garbage_dumping', confidence: 0.91, bbox: [168, 238, 612, 528] }]}
            imageWidth={800}
            imageHeight={600}
            maxHeight="max-h-none"
          />
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
          <div className="rounded-lg bg-civic-800 px-3 py-2.5">
            <p className="text-civic-100/60">Issue</p>
            <p className="mt-0.5 font-semibold text-white">Garbage</p>
          </div>
          <div className="rounded-lg bg-civic-800 px-3 py-2.5">
            <p className="text-civic-100/60">Severity</p>
            <p className="mt-0.5 font-semibold text-red-300">High</p>
          </div>
          <div className="rounded-lg bg-civic-800 px-3 py-2.5">
            <p className="text-civic-100/60">Routed to</p>
            <p className="mt-0.5 font-semibold text-white">Sanitation</p>
          </div>
        </div>
      </div>

      <ol className="mt-5 flex items-center justify-between gap-1 px-1" aria-label="How a report flows">
        {flow.map((f, i) => (
          <li key={f.label} className="flex flex-1 items-center gap-1 last:flex-none">
            <div className="flex flex-col items-center gap-1.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-full border border-ink-300 bg-white text-civic-700">
                <f.icon className="h-4 w-4" aria-hidden="true" />
              </span>
              <span className="whitespace-nowrap text-[11px] font-medium text-ink-500">{f.label}</span>
            </div>
            {i < flow.length - 1 && <span className="mb-5 h-px flex-1 border-t border-dashed border-ink-300" aria-hidden="true" />}
          </li>
        ))}
      </ol>
    </div>
  )
}

export default function Home() {
  return (
    <>
      <section className="border-b border-ink-300/60 bg-white">
        <div className="mx-auto grid max-w-6xl gap-12 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-[1.05fr,1fr] lg:items-center lg:gap-16 lg:py-24">
          <div>
            <p className="text-sm font-semibold text-civic-600">Computer vision for civic reporting</p>
            <h1 className="mt-4 font-display text-4xl font-extrabold leading-[1.08] tracking-tight text-ink-900 sm:text-5xl lg:text-[3.5rem]">
              See it. Report it.<br className="hidden sm:block" /> <span className="text-civic-600">Improve your city.</span>
            </h1>
            <p className="mt-5 max-w-md text-lg leading-relaxed text-ink-500">
              CityLens uses computer vision to help citizens report civic problems quickly, accurately, and transparently.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button as={Link} to="/report" size="lg" icon={ArrowRight} iconPosition="right">Report an Issue</Button>
              <Button as={Link} to="/track" size="lg" variant="secondary">Track Complaint</Button>
            </div>
            <dl className="mt-10 grid max-w-md grid-cols-3 gap-4 border-t border-ink-200 pt-6">
              {[['3', 'civic issues detected'], ['5', 'steps to resolution'], ['1', 'photo is all it takes']].map(([n, l]) => (
                <div key={l}>
                  <dt className="sr-only">{l}</dt>
                  <dd className="font-display text-2xl font-bold text-ink-900">{n}</dd>
                  <dd className="text-xs leading-snug text-ink-500">{l}</dd>
                </div>
              ))}
            </dl>
          </div>
          <HeroComposition />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
        <div className="max-w-xl">
          <h2 className="font-display text-3xl font-bold tracking-tight text-ink-900">Three issues. One photo each.</h2>
          <p className="mt-3 text-ink-500">CityLens focuses on the civic problems that affect road safety and public spaces the most.</p>
        </div>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          <IssueCard issue="pothole" image={SAMPLE_IMAGES.pothole} />
          <IssueCard issue="illegal_parking" image={SAMPLE_IMAGES.parking} />
          <IssueCard issue="garbage_dumping" image={SAMPLE_IMAGES.garbage} />
        </div>
      </section>

      <section className="border-y border-ink-300/60 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
          <div className="max-w-xl">
            <h2 className="font-display text-3xl font-bold tracking-tight text-ink-900">How CityLens works</h2>
            <p className="mt-3 text-ink-500">From a single photo to a resolved civic issue — one continuous loop between citizens and authorities.</p>
          </div>

          <ol className="relative mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-5 lg:gap-6">
            <span className="absolute left-0 right-0 top-[3.25rem] hidden h-px bg-ink-200 lg:block" aria-hidden="true" />
            {steps.map((step) => (
              <li key={step.n} className="relative">
                <p className="font-display text-sm font-bold text-civic-500">{step.n}</p>
                <div className="relative mt-3 flex h-10 w-10 items-center justify-center rounded-xl bg-civic-100 text-civic-700 ring-4 ring-white">
                  <step.icon className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
                </div>
                <h3 className="mt-4 font-display text-base font-semibold text-ink-900">{step.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-500">{step.description}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
        <div className="flex flex-col items-start justify-between gap-6 rounded-3xl bg-civic-900 p-8 sm:flex-row sm:items-center sm:p-14">
          <div>
            <h2 className="font-display text-2xl font-bold text-white sm:text-3xl">Spotted a civic issue nearby?</h2>
            <p className="mt-2 max-w-md text-civic-100/80">Report it in under a minute — CityLens routes it to the right department.</p>
          </div>
          <Button as={Link} to="/report" size="lg" variant="secondary" icon={ArrowRight} iconPosition="right">Report an Issue</Button>
        </div>
      </section>
    </>
  )
}
