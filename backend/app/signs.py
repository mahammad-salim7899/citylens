"""
Reads parking signs in the photo, so a car under a "NO PARKING" board is
reported even when it isn't on the footpath or in a known no-parking zone.

Two independent detectors, because real boards come in two kinds:

  1. TEXT  — OCR (EasyOCR, English + Kannada by default) reads every bit of
     text in the photo. Nearby lines are grouped into one board ("NO" above
     "PARKING"), then matched against phrases like NO PARKING / DO NOT PARK /
     TOW AWAY ZONE / ವಾಹನ ನಿಲುಗಡೆ ನಿಷೇಧ. One OCR slip is tolerated
     ("N0 PARKlNG" still counts), but plain "PARKING" never does.
  2. SYMBOL — the standard Indian no-parking sign has no words: a blue disc,
     red ring and red diagonal slash. Classic OpenCV colour segmentation
     finds red rings, then checks for the blue inside and the red slash.

Both only run when a vehicle was detected (see main.py). Any failure to
load OCR is logged once and the rest of the app works as before.

Text that says parking IS allowed ("PARKING", "PAY AND PARK", "PAYANT") is
reported too, as context for the "looks legally parked" note.
"""
from __future__ import annotations

import logging
import re
from dataclasses import asdict, dataclass

import cv2
import numpy as np

from . import config
from .preprocessing import PreparedImage

log = logging.getLogger("citylens.signs")


@dataclass
class SignHit:
    kind: str            # "no_parking" | "parking_allowed"
    text: str            # clean label: "NO PARKING", "TOW AWAY ZONE", "no-parking symbol"…
    source: str          # "ocr" | "symbol"
    bbox: list[float]    # original-image pixels
    confidence: float
    raw: str = ""        # exactly what OCR read, e.g. "N0 IPARKINGI" (the red border reads as I)

    def to_json(self) -> dict:
        d = asdict(self)
        d["bbox"] = [round(v, 1) for v in self.bbox]
        d["confidence"] = round(self.confidence, 3)
        return d


# ── Text matching ─────────────────────────────────────────────────────
# Phrases are compared with spaces removed. English is matched fuzzily;
# Kannada exactly (on its own words), because OCR mistakes there differ.
# phrase as matched (no spaces) → label shown to the user
NO_PARKING_PHRASES = {
    "NOPARKINGZONE": "NO PARKING ZONE", "NOPARKINGHERE": "NO PARKING HERE", "NOPARKING": "NO PARKING",
    "DONOTPARK": "DO NOT PARK", "DONTPARK": "DON'T PARK", "PARKINGPROHIBITED": "PARKING PROHIBITED",
    "PARKINGNOTALLOWED": "PARKING NOT ALLOWED", "NOSTOPPING": "NO STOPPING",
    "TOWAWAYZONE": "TOW AWAY ZONE", "TOWAWAY": "TOW AWAY",
}
ALLOWED_PHRASES = {
    "PAYANDPARK": "PAY AND PARK", "PARKINGAREA": "PARKING AREA", "CARPARK": "CAR PARK",
    "PARKHERE": "PARK HERE", "PAYANT": "PAYANT", "PARKING": "PARKING",
}
# ವಾಹನ ನಿಲುಗಡೆ ನಿಷೇಧ = "vehicle parking prohibited";  ನೋ ಪಾರ್ಕಿಂಗ್ = "no parking" written in Kannada
KANNADA_NO_PARKING = [("ನಿಲುಗಡೆ", "ನಿಷೇಧ"), ("ನೋ", "ಪಾರ್ಕಿಂಗ್"), ("ಪಾರ್ಕಿಂಗ್", "ನಿಷೇಧ")]

# Common OCR confusions between digits and letters in sign text.
_OCR_FIX = str.maketrans({"0": "O", "1": "I", "5": "S", "8": "B", "|": "I", "!": "I"})


def normalize(text: str) -> str:
    """Upper-case Latin text, fix digit/letter slips, drop spaces and punctuation."""
    t = text.upper().translate(_OCR_FIX)
    return re.sub(r"[^A-Z]", "", t)


def _substring_distance(haystack: str, phrase: str) -> int:
    """Fewest edits turning `phrase` into some substring of `haystack`
    (approximate string matching; Sellers' algorithm)."""
    prev = [0] * (len(haystack) + 1)          # a match may start anywhere
    for i, pc in enumerate(phrase, 1):
        cur = [i] + [0] * len(haystack)
        for j, hc in enumerate(haystack, 1):
            cur[j] = min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (pc != hc))
        prev = cur
    return min(prev)                          # ...and end anywhere


def _allowed_edits(phrase: str) -> int:
    # One OCR slip per phrase, two for long ones. Strict on purpose:
    # "PARKING" is only 2 edits from "NOPARKING", and must not match it.
    return 1 if len(phrase) <= 12 else 2


def _match(flat: str, phrases: dict[str, str]) -> tuple[float, str]:
    """(score, label) of the best phrase within the edit budget; score 1.0 =
    exact, lower per edit. Longer phrases win ties ("NO PARKING ZONE" over
    "NO PARKING"). (0.0, "") when nothing matches."""
    best = (0.0, 0, "")
    for p, label in phrases.items():
        d = _substring_distance(flat, p)
        if d <= _allowed_edits(p):
            best = max(best, (1.0 - d / len(p), len(p), label))
    return best[0], best[2]


def classify_text(text: str) -> tuple[str | None, float, str]:
    """(kind, score, label) for one board's text; kind is "no_parking",
    "parking_allowed" or None."""
    for a, b in KANNADA_NO_PARKING:
        if a in text and b in text:
            return "no_parking", 1.0, text.strip()
    flat = normalize(text)
    if len(flat) < 4:
        return None, 0.0, ""
    score, label = _match(flat, NO_PARKING_PHRASES)
    if score:
        return "no_parking", score, label
    # "PARKING" alone means the opposite — but only if no NO-word is around.
    if not re.search(r"(^|[^A-Z])(NO|DO\s*NOT|DONT)([^A-Z]|$)", text.upper().translate(_OCR_FIX)):
        score, label = _match(flat, ALLOWED_PHRASES)
        if score:
            return "parking_allowed", score, label
    return None, 0.0, ""


def group_lines(items: list[tuple[list[float], str, float]]) -> list[tuple[list[float], str, float]]:
    """Merge OCR lines that sit together on one board.

    items: (bbox [x1,y1,x2,y2], text, confidence). Two lines join when the
    gap between them is smaller than the shorter line's height. Returns one
    (union bbox, text in reading order, mean confidence) per group.
    """
    n = len(items)
    parent = list(range(n))

    def find(i):
        while parent[i] != i:
            parent[i] = parent[parent[i]]
            i = parent[i]
        return i

    for i in range(n):
        for j in range(i + 1, n):
            a, b = items[i][0], items[j][0]
            h = min(a[3] - a[1], b[3] - b[1])
            gap_x = max(0.0, max(a[0], b[0]) - min(a[2], b[2]))
            gap_y = max(0.0, max(a[1], b[1]) - min(a[3], b[3]))
            if gap_x <= h and gap_y <= h:
                parent[find(i)] = find(j)

    groups: dict[int, list[int]] = {}
    for i in range(n):
        groups.setdefault(find(i), []).append(i)
    out = []
    for idx in groups.values():
        idx.sort(key=lambda k: (round(items[k][0][1] / max(1.0, items[k][0][3] - items[k][0][1])), items[k][0][0]))
        boxes = [items[k][0] for k in idx]
        bbox = [min(b[0] for b in boxes), min(b[1] for b in boxes), max(b[2] for b in boxes), max(b[3] for b in boxes)]
        out.append((bbox, " ".join(items[k][1] for k in idx), float(np.mean([items[k][2] for k in idx]))))
    return out


# ── Symbol detection (OpenCV, no model) ──────────────────────────────
def _hsv_masks(bgr: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    hsv = cv2.cvtColor(bgr, cv2.COLOR_BGR2HSV)
    red = cv2.inRange(hsv, (0, 90, 60), (10, 255, 255)) | cv2.inRange(hsv, (165, 90, 60), (180, 255, 255))
    blue = cv2.inRange(hsv, (95, 80, 40), (130, 255, 255))
    return red > 0, blue > 0


def _score_circle(red: np.ndarray, blue: np.ndarray, cx: float, cy: float, r: float) -> float:
    """How much (cx, cy, r) looks like a no-parking sign: 0 = not at all.
    Ring must be red, a diagonal band inside must be red, the rest blue."""
    h, w = red.shape
    x1, y1, x2, y2 = int(max(0, cx - r)), int(max(0, cy - r)), int(min(w, cx + r + 1)), int(min(h, cy + r + 1))
    if x2 - x1 < r or y2 - y1 < r:          # mostly outside the photo
        return 0.0
    yy, xx = np.mgrid[y1:y2, x1:x2]
    dx, dy = xx - cx, yy - cy
    dist = np.sqrt(dx * dx + dy * dy) / r
    R, B = red[y1:y2, x1:x2], blue[y1:y2, x1:x2]
    ring, inner = (dist >= 0.8) & (dist <= 1.0), dist < 0.7
    if ring.sum() < 20 or inner.sum() < 20:
        return 0.0
    ring_red = R[ring].mean()
    best = 0.0
    for sign in (1, -1):                     # "\" or "/" slash
        band = inner & (np.abs(dx - sign * dy) / np.sqrt(2) < 0.12 * r)
        rest = inner & (np.abs(dx - sign * dy) / np.sqrt(2) > 0.25 * r)
        if band.sum() < 10 or rest.sum() < 10:
            continue
        slash_red, inner_blue = R[band].mean(), B[rest].mean()
        if ring_red >= 0.5 and slash_red >= 0.55 and inner_blue >= 0.5:
            best = max(best, float((ring_red + slash_red + inner_blue) / 3))
    return best


def _candidates(red: np.ndarray, blue: np.ndarray, min_r: int) -> list[tuple[float, float, float]]:
    """Rough circles that might be a sign: (cx, cy, r).

    From the BLUE inside — the slash cuts it into two halves, so single
    halves and touching pairs are both tried — and from red blobs. Blue is
    the more reliable start: the red ring often merges with a brown wall or
    a red car behind it, but the blue disc stays a clean shape.
    """
    out = []
    blobs = []
    cs, _ = cv2.findContours(blue.astype(np.uint8) * 255, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    for c in cs:
        if cv2.contourArea(c) >= 0.4 * min_r * min_r:
            blobs.append((c, cv2.boundingRect(c)))
    blobs = sorted(blobs, key=lambda b: -cv2.contourArea(b[0]))[:40]
    for i, (c, _) in enumerate(blobs):
        (cx, cy), r = cv2.minEnclosingCircle(c)
        out.append((cx, cy, r / 0.8))                 # blue ends ~where the red ring starts
        for c2, (x, y, w, h) in blobs[i + 1:]:
            x1, y1, w1, h1 = blobs[i][1]
            gap = max(max(x, x1) - min(x + w, x1 + w1), max(y, y1) - min(y + h, y1 + h1))
            if gap <= 0.4 * min(max(w, h), max(w1, h1)):
                (cx, cy), r = cv2.minEnclosingCircle(np.vstack([c, c2]))
                out.append((cx, cy, r / 0.8))
    cs, _ = cv2.findContours(red.astype(np.uint8) * 255, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    for c in cs:
        if cv2.contourArea(c) >= 0.5 * min_r * min_r:
            (cx, cy), r = cv2.minEnclosingCircle(c)
            out.append((cx, cy, r))
    return out


def find_symbols(bgr: np.ndarray) -> list[tuple[list[float], float]]:
    """Find no-parking symbols: red ring + blue inside + red diagonal slash.

    Rough candidate circles (_candidates) are refined by trying nearby
    centres and radii, and scored by _score_circle; all three parts must be
    clearly present, which keeps red cars, tail-lights and blue shop boards
    from triggering it. Returns (bbox in the given image's pixels, confidence).
    """
    h, w = bgr.shape[:2]
    red, blue = _hsv_masks(bgr)
    min_r, max_r = config.SIGN_SYMBOL_MIN_RADIUS, int(0.45 * min(h, w))

    found: list[tuple[list[float], float]] = []
    for cx, cy, r in _candidates(red, blue, min_r):
        if not min_r <= r <= max_r:
            continue
        best = (0.0, cx, cy, r)
        for k in (0.85, 0.95, 1.05, 1.15, 1.25):
            for ox in (-0.1, 0.0, 0.1):
                for oy in (-0.1, 0.0, 0.1):
                    x, y, rr = cx + ox * r, cy + oy * r, r * k
                    best = max(best, (_score_circle(red, blue, x, y, rr), x, y, rr))
        score, x, y, rr = best
        if score <= 0:
            continue
        box = [x - rr, y - rr, x + rr, y + rr]
        if any(abs(box[0] - b[0]) < rr and abs(box[1] - b[1]) < rr for b, _ in found):
            continue                          # same sign found twice
        found.append((box, score))
    return found


# ── Reader ────────────────────────────────────────────────────────────
class SignReader:
    def __init__(self) -> None:
        self.langs = [s.strip() for s in config.OCR_LANGS.split(",") if s.strip()]
        self.status_text = "not loaded"
        self._ocr = None

    def load(self) -> None:
        if not self.langs:
            self.status_text = "OCR disabled (symbol detection only)"
            return
        try:
            import easyocr
        except ImportError:
            self.status_text = "easyocr not installed (symbol detection only)"
            log.warning("sign OCR disabled — run: pip install easyocr  (no-parking symbols are still detected)")
            return
        try:
            import torch

            self._ocr = easyocr.Reader(self.langs, gpu=torch.cuda.is_available(), verbose=False)
            self.status_text = "loaded"
            log.info("sign OCR loaded (%s)", "+".join(self.langs))
        except Exception as e:  # noqa: BLE001 — usually no internet on first run
            self._ocr = None
            self.status_text = f"error: {e}"
            log.warning("sign OCR unavailable (%s) — no-parking symbols are still detected",
                        str(e).splitlines()[0][:160])

    @property
    def loaded(self) -> bool:
        return self._ocr is not None

    def status(self) -> dict:
        return {"status": self.status_text, "languages": self.langs, "symbols": True}

    def read(self, img: PreparedImage) -> list[SignHit]:
        back = 1.0 / (img.scale or 1.0)          # prepared px → original px
        hits: list[SignHit] = []

        if self._ocr is not None:
            lines = []
            for pts, text, conf in self._ocr.readtext(img.bgr):
                if conf < config.SIGN_OCR_MIN_CONF or not text.strip():
                    continue
                xs, ys = [p[0] for p in pts], [p[1] for p in pts]
                lines.append(([min(xs), min(ys), max(xs), max(ys)], text, float(conf)))
            for bbox, text, conf in group_lines(lines):
                kind, score, label = classify_text(text)
                if kind:
                    hits.append(SignHit(kind, label, "ocr", [v * back for v in bbox], conf * score, raw=text))

        for bbox, conf in find_symbols(img.bgr):
            hits.append(SignHit("no_parking", "no-parking symbol", "symbol", [v * back for v in bbox], conf))

        hits.sort(key=lambda s: (s.kind != "no_parking", -s.confidence))
        return hits
