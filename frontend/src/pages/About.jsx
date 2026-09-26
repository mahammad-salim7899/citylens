import React from 'react'
import { Link } from 'react-router-dom'
import {
  Camera, MapPin, ScanEye, Gauge, ClipboardCheck, FileCheck2, Landmark, Wrench, CheckCircle2,
  Smartphone, Server, Cpu, Route, Database, ShieldCheck, ImageUp, RefreshCw, MapPinned,
} from 'lucide-react'
import IssueIcon from '../components/IssueIcon'
import { MOCK_MODE } from '../services/api'

const flow = [
  { icon: Camera, label: 'Citizen captures an image' },
  { icon: MapPin, label: 'Location is extracted from the photo’s GPS data (or the device, if the photo has none)' },
  { icon: ScanEye, label: 'Computer vision identifies the issue' },
  { icon: Gauge, label: 'Severity is estimated from what was detected' },
  { icon: ClipboardCheck, label: 'Citizen confirms or corrects the result' },
  { icon: FileCheck2, label: 'A complaint is created with an ID' },
  { icon: Landmark, label: 'It is routed to the responsible authority' },
  { icon: Wrench, label: 'The authority reviews and takes action' },
  { icon: CheckCircle2, label: 'Resolution — with before/after evidence the citizen can track' },
]

const detection = [
  {
    issue: 'garbage_dumping',
    title: 'Garbage Dumping',
    how: 'A YOLO object-detection model trained on labelled photos of dumped garbage (the team’s own citylens_garbage-2 model). It draws a box around each garbage pile it finds.',
    severity: 'How much of the photo the garbage covers, and how many separate piles there are.',
  },
  {
    issue: 'pothole',
    title: 'Pothole',
    how: 'A second YOLO model trained the same way on a labelled pothole dataset. It boxes each pothole on the road surface.',
    severity: 'The size of the largest pothole relative to the image, and the number of potholes.',
  },
  {
    issue: 'illegal_parking',
    title: 'Illegal Parking',
    how: '“Illegal” is a rule, not something a camera can see. A standard pre-trained YOLO model finds vehicles (car, motorbike, bus, truck); CityLens then checks the report’s GPS position against configured no-parking zones and how much of the road the vehicle blocks. The citizen confirms before anything is filed.',
    severity: 'Inside a no-parking zone or blocking a large part of the frame raises severity.',
  },
]

const layers = [
  { name: 'Citizen layer', items: [{ icon: Smartphone, label: 'React web app', note: 'Upload, EXIF location, confirmation, tracking' }] },
  {
    name: 'Backend layer',
    items: [
      { icon: Server, label: 'FastAPI', note: 'REST API' },
      { icon: ImageUp, label: 'OpenCV preprocessing', note: 'Decode, orientation, resize' },
      { icon: Cpu, label: 'YOLO detection', note: 'Garbage · pothole · vehicle models' },
      { icon: Gauge, label: 'Severity engine', note: 'Rules on box size, count, zones' },
      { icon: Route, label: 'Department routing', note: 'Configurable issue → department' },
      { icon: Database, label: 'Complaint management', note: 'Complaints, history, evidence' },
    ],
  },
  {
    name: 'Authority layer',
    items: [
      { icon: ShieldCheck, label: 'Authority dashboard', note: 'Department-filtered queue' },
      { icon: Wrench, label: 'Review & action', note: 'Status + action notes' },
      { icon: ImageUp, label: 'Resolution evidence', note: 'After-action photo' },
      { icon: RefreshCw, label: 'Status update', note: 'Recorded with officer & time' },
    ],
  },
  { name: 'Citizen', items: [{ icon: MapPinned, label: 'Track resolution', note: 'Timeline, authority notes, before/after' }] },
]

export default function About() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-14 sm:px-6 sm:py-20">
      <p className="text-xs font-semibold uppercase tracking-wide text-civic-600">About the project</p>
      <h1 className="mt-3 font-display text-4xl font-bold tracking-tight text-ink-900">What is CityLens?</h1>
      <p className="mt-5 max-w-2xl text-lg leading-relaxed text-ink-700">
        CityLens is a computer-vision-based civic reporting platform designed to make reporting urban problems easier, faster, and more transparent.
      </p>
      <p className="mt-4 max-w-2xl leading-relaxed text-ink-500">
        It focuses on three civic issues: <strong className="text-ink-900">potholes</strong>, <strong className="text-ink-900">illegal parking</strong>, and{' '}
        <strong className="text-ink-900">garbage dumping</strong>. One photo is enough to identify the issue, estimate its severity, locate it, and
        route it to the correct civic authority — then the citizen follows it all the way to resolution.
      </p>

      <section className="mt-16">
        <h2 className="font-display text-2xl font-bold text-ink-900">How a report moves through the system</h2>
        <ol className="mt-8">
          {flow.map((s, i) => (
            <li key={s.label} className="relative flex gap-4 pb-7 last:pb-0">
              {i !== flow.length - 1 && <span className="absolute left-5 top-10 h-[calc(100%-2.5rem)] w-px bg-ink-300" aria-hidden="true" />}
              <span className="z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-civic-100 text-civic-700">
                <s.icon className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
              </span>
              <p className="mt-2 text-[15px] font-medium text-ink-900">{s.label}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-16">
        <h2 className="font-display text-2xl font-bold text-ink-900">How each issue is detected</h2>
        <p className="mt-2 max-w-2xl text-ink-500">
          Detection and severity are separate steps: YOLO finds <em>what</em> and <em>where</em>; a rule-based severity engine on the server decides <em>how serious</em>.
        </p>
        <div className="mt-8 space-y-4">
          {detection.map((d) => (
            <div key={d.issue} className="rounded-2xl border border-ink-300/60 bg-white p-6">
              <div className="flex items-center gap-3">
                <IssueIcon issue={d.issue} />
                <h3 className="font-display text-lg font-semibold text-ink-900">{d.title}</h3>
              </div>
              <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-[1.6fr,1fr]">
                <div><dt className="text-xs font-semibold uppercase tracking-wide text-ink-400">Detection</dt><dd className="mt-1 leading-relaxed text-ink-700">{d.how}</dd></div>
                <div><dt className="text-xs font-semibold uppercase tracking-wide text-ink-400">Severity based on</dt><dd className="mt-1 leading-relaxed text-ink-700">{d.severity}</dd></div>
              </dl>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-16">
        <h2 className="font-display text-2xl font-bold text-ink-900">System architecture</h2>
        <div className="mt-8 space-y-3">
          {layers.map((layer, li) => (
            <div key={layer.name}>
              <div className="rounded-2xl border border-ink-300/60 bg-white p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-civic-600">{layer.name}</p>
                <div className={`mt-3 grid gap-3 ${layer.items.length > 1 ? 'sm:grid-cols-2 lg:grid-cols-3' : ''}`}>
                  {layer.items.map((it) => (
                    <div key={it.label} className="flex items-start gap-3 rounded-xl bg-ink-50 p-3">
                      <it.icon className="mt-0.5 h-4 w-4 shrink-0 text-civic-700" aria-hidden="true" />
                      <div>
                        <p className="text-sm font-semibold text-ink-900">{it.label}</p>
                        <p className="text-xs text-ink-500">{it.note}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {li < layers.length - 1 && <div className="mx-auto h-4 w-px bg-ink-300" aria-hidden="true" />}
            </div>
          ))}
        </div>
      </section>

      <div className="mt-16 rounded-2xl border border-ink-300/60 bg-white p-6">
        <h3 className="font-display text-base font-semibold text-ink-900">{MOCK_MODE ? 'Running in demo mode' : 'Connected to the CityLens server'}</h3>
        <p className="mt-2 text-sm leading-relaxed text-ink-500">
          {MOCK_MODE
            ? 'This copy uses simulated detection and stores complaints in your browser, so the complete experience can be shown without the server. Every simulated result is labelled. Location extraction from photos is real.'
            : 'Detections come from the YOLO models running on the FastAPI backend, and complaints are stored on the server.'}
        </p>
        <Link to="/report" className="mt-4 inline-block text-sm font-medium text-civic-700 hover:underline">Try reporting an issue →</Link>
      </div>
    </div>
  )
}
