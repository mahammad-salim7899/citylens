// ─────────────────────────────────────────────────────────────
// MOCK DATA — CityLens frontend prototype (MOCK MODE only)
//
// Simulates what the FastAPI backend + database return. Nothing
// here is a real detection result. In REAL MODE this file is not
// used for complaints at all.
//
// Sample images live in /public/samples. They are illustrations —
// replace them with your own photos (same file names, or edit
// SAMPLE_IMAGES below) for the presentation.
// ─────────────────────────────────────────────────────────────

export const SAMPLE_IMAGES = {
  garbage: '/samples/garbage.svg',
  garbageSmall: '/samples/garbage-small.svg',
  garbageAfter: '/samples/garbage-after.svg',
  pothole: '/samples/pothole.svg',
  potholeAfter: '/samples/pothole-after.svg',
  parking: '/samples/parking.svg',
  parkingAfter: '/samples/parking-after.svg',
}

// Mock authority accounts — replaced by real login + role checks
// once the backend has authentication.
export const AUTHORITY_ACCOUNTS = [
  { id: 'auth-sanitation', name: 'Ravi Shenoy', designation: 'Health Inspector', department: 'sanitation' },
  { id: 'auth-roads', name: 'Anitha Kamath', designation: 'Assistant Executive Engineer', department: 'roads' },
  { id: 'auth-traffic', name: 'Divya Poojary', designation: 'Traffic Sub-Inspector', department: 'traffic' },
]

const det = (issue, confidence, bbox, extra = {}) => ({
  ai_issue: issue,
  ai_confidence: confidence,
  image_width: 800,
  image_height: 600,
  detections: [{ issue, className: issue, confidence, bbox }],
  source: 'mock',
  corrected_by_citizen: false,
  ...extra,
})

const h = (status, at, by, department, note, kind = 'status') => ({ status, at, by, department, note, kind })

export const MOCK_COMPLAINTS = [
  {
    id: 'CL-2026-00122',
    issue: 'garbage_dumping',
    severity: 'Low',
    confidence: 0.79,
    image_url: SAMPLE_IMAGES.garbageSmall,
    after_image_url: null,
    address: 'Kadri, Mangaluru, Karnataka',
    latitude: 12.8945,
    longitude: 74.8484,
    location_source: 'device_gps',
    description: 'Small pile of household waste near the park entrance.',
    department: 'sanitation',
    status: 'new',
    created_at: '2026-09-25T19:20:00+05:30',
    detection: det('garbage_dumping', 0.79, [318, 372, 492, 486]),
    history: [
      h('new', '2026-09-25T19:20:00+05:30', 'Citizen', null, 'Complaint submitted.', 'submitted'),
      h('new', '2026-09-25T19:20:05+05:30', 'CityLens', 'sanitation', 'Routed to Municipal Solid Waste / Sanitation Department.', 'routed'),
    ],
  },
  {
    id: 'CL-2026-00121',
    issue: 'pothole',
    severity: 'High',
    confidence: 0.9,
    image_url: SAMPLE_IMAGES.pothole,
    after_image_url: null,
    address: 'Kottara, Mangaluru, Karnataka',
    latitude: 12.9168,
    longitude: 74.8551,
    location_source: 'image_exif',
    description: 'Large pothole in the left lane near Kottara Chowki junction.',
    department: 'roads',
    status: 'action_in_progress',
    created_at: '2026-09-22T08:10:00+05:30',
    detection: det('pothole', 0.9, [236, 318, 560, 478]),
    history: [
      h('new', '2026-09-22T08:10:00+05:30', 'Citizen', null, 'Complaint submitted.', 'submitted'),
      h('new', '2026-09-22T08:10:04+05:30', 'CityLens', 'roads', 'Routed to Road / Public Works Department.', 'routed'),
      h('under_review', '2026-09-22T11:30:00+05:30', 'Anitha Kamath', 'roads', 'Site verified from photo and location.'),
      h('action_assigned', '2026-09-23T10:00:00+05:30', 'Anitha Kamath', 'roads', 'Pothole repair was assigned to the road maintenance team.'),
      h('action_in_progress', '2026-09-25T09:15:00+05:30', 'Anitha Kamath', 'roads', 'Patch work started; lane partially closed.'),
    ],
  },
  {
    id: 'CL-2026-00118',
    issue: 'pothole',
    severity: 'Medium',
    confidence: 0.84,
    image_url: SAMPLE_IMAGES.pothole,
    after_image_url: null,
    address: 'Balmatta, Mangaluru, Karnataka',
    latitude: 12.8698,
    longitude: 74.8422,
    location_source: 'device_gps',
    description: 'Deep pothole causing two-wheelers to swerve.',
    department: 'roads',
    status: 'under_review',
    created_at: '2026-09-20T08:40:00+05:30',
    detection: det('pothole', 0.84, [236, 318, 560, 478]),
    history: [
      h('new', '2026-09-20T08:40:00+05:30', 'Citizen', null, 'Complaint submitted.', 'submitted'),
      h('new', '2026-09-20T08:40:03+05:30', 'CityLens', 'roads', 'Routed to Road / Public Works Department.', 'routed'),
      h('under_review', '2026-09-20T12:05:00+05:30', 'Anitha Kamath', 'roads', 'Authority reviewed the complaint.'),
    ],
  },
  {
    id: 'CL-2026-00115',
    issue: 'illegal_parking',
    severity: 'High',
    confidence: 0.88,
    image_url: SAMPLE_IMAGES.parking,
    after_image_url: SAMPLE_IMAGES.parkingAfter,
    address: 'Hampankatta, Mangaluru, Karnataka',
    latitude: 12.8657,
    longitude: 74.8427,
    location_source: 'image_exif',
    description: 'Truck parked across the junction blocking traffic.',
    department: 'traffic',
    status: 'resolved',
    created_at: '2026-09-14T17:05:00+05:30',
    detection: det('illegal_parking', 0.88, [142, 168, 662, 474]),
    history: [
      h('new', '2026-09-14T17:05:00+05:30', 'Citizen', null, 'Complaint submitted.', 'submitted'),
      h('new', '2026-09-14T17:05:04+05:30', 'CityLens', 'traffic', 'Routed to Traffic / Municipal Enforcement Department.', 'routed'),
      h('under_review', '2026-09-14T17:40:00+05:30', 'Divya Poojary', 'traffic', 'Authority reviewed the complaint.'),
      h('action_assigned', '2026-09-14T18:10:00+05:30', 'Divya Poojary', 'traffic', 'Enforcement team notified.'),
      h('action_in_progress', '2026-09-15T09:00:00+05:30', 'Divya Poojary', 'traffic', 'Team dispatched to the junction.'),
      h('resolved', '2026-09-15T09:45:00+05:30', 'Divya Poojary', 'traffic', 'Vehicle was removed and enforcement action was taken.'),
    ],
  },
  {
    id: 'CL-2026-00109',
    issue: 'garbage_dumping',
    severity: 'High',
    confidence: 0.93,
    image_url: SAMPLE_IMAGES.garbage,
    after_image_url: SAMPLE_IMAGES.garbageAfter,
    address: 'Bejai, Mangaluru, Karnataka',
    latitude: 12.8858,
    longitude: 74.8455,
    location_source: 'image_exif',
    description: 'Garbage bags dumped along the compound wall for over a week.',
    department: 'sanitation',
    status: 'resolved',
    created_at: '2026-09-10T07:30:00+05:30',
    detection: det('garbage_dumping', 0.93, [168, 238, 612, 528]),
    history: [
      h('new', '2026-09-10T07:30:00+05:30', 'Citizen', null, 'Complaint submitted.', 'submitted'),
      h('new', '2026-09-10T07:30:04+05:30', 'CityLens', 'sanitation', 'Routed to Municipal Solid Waste / Sanitation Department.', 'routed'),
      h('under_review', '2026-09-10T10:15:00+05:30', 'Ravi Shenoy', 'sanitation', 'Authority reviewed the complaint.'),
      h('action_assigned', '2026-09-10T11:00:00+05:30', 'Ravi Shenoy', 'sanitation', 'Cleanup crew assigned for next morning round.'),
      h('action_in_progress', '2026-09-11T07:00:00+05:30', 'Ravi Shenoy', 'sanitation', 'Crew on site.'),
      h('resolved', '2026-09-11T09:30:00+05:30', 'Ravi Shenoy', 'sanitation', 'Garbage was cleared from the reported location.'),
    ],
  },
  {
    id: 'CL-2026-00104',
    issue: 'illegal_parking',
    severity: 'Medium',
    confidence: 0.81,
    image_url: SAMPLE_IMAGES.parking,
    after_image_url: null,
    address: 'Lalbagh, Mangaluru, Karnataka',
    latitude: 12.8801,
    longitude: 74.8393,
    location_source: 'device_gps',
    description: 'Cars regularly parked on the footpath outside the bus stop.',
    department: 'traffic',
    status: 'action_assigned',
    created_at: '2026-09-08T18:45:00+05:30',
    detection: det('illegal_parking', 0.81, [142, 168, 662, 474]),
    history: [
      h('new', '2026-09-08T18:45:00+05:30', 'Citizen', null, 'Complaint submitted.', 'submitted'),
      h('new', '2026-09-08T18:45:03+05:30', 'CityLens', 'traffic', 'Routed to Traffic / Municipal Enforcement Department.', 'routed'),
      h('under_review', '2026-09-09T09:20:00+05:30', 'Divya Poojary', 'traffic', 'Authority reviewed the complaint.'),
      h('action_assigned', '2026-09-09T10:00:00+05:30', 'Divya Poojary', 'traffic', 'Patrol team asked to check during evening peak.'),
    ],
  },
]
