"""
Build a garbage detector WITHOUT training — open-vocabulary detection.

YOLOE (from Ultralytics) detects objects described in plain English. It
pairs a YOLO segmentation network with a text encoder (MobileCLIP), so
you give it prompts like "garbage bag" instead of a labelled dataset.
This script bakes the prompts into an ordinary .pt file the backend loads
like any other model — no text encoder needed at runtime.

    python training/make_garbage_model.py
    # → models/citylens_garbage.pt   (restart uvicorn to load it)

The first run downloads the YOLOE weights (~30 MB) and the text encoder
(~570 MB, one time only) into models/.cache/, which git ignores.

One-time setup (only this script needs these, not the server):
    pip install openai-clip "setuptools<81"

Prompt design matters more than anything else here:
  * GARBAGE prompts describe the problem itself — bags, spilled waste.
  * DECOY prompts ("dumpster", "garbage bin") give bins somewhere to go.
    Without them an EMPTY bin was labelled "pile of garbage" at 0.59;
    with them, bins score 0.84–0.86 as "dumpster" and are ignored, while
    overflowing bags are still found. Decoys are deliberately missing
    from CLASS_ALIASES in app/config.py, so the backend drops them.

Edit the lists, re-run, restart. Once you have a model trained on real
garbage photos, save it as models/citylens_garbage.pt instead — it
replaces this one, no code changes.
"""
import argparse
import os
import sys
from pathlib import Path

GARBAGE = ["overflowing garbage", "garbage bag", "litter"]
DECOYS = ["garbage bin", "dumpster"]

BACKEND = Path(__file__).resolve().parent.parent
CACHE = BACKEND / "models" / ".cache"   # Ultralytics downloads into the working directory


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[1])
    ap.add_argument("--base", default="yoloe-11s-seg.pt", help="YOLOE weights (s = fast, m/l = more accurate)")
    ap.add_argument("--out", default=str(BACKEND / "models" / "citylens_garbage.pt"))
    ap.add_argument("--test", help="optional photo to try the model on")
    args = ap.parse_args()
    args.out = str(Path(args.out).resolve())
    if Path(args.base).is_file():          # a local weights file, not a name to download
        args.base = str(Path(args.base).resolve())
    if args.test:
        args.test = str(Path(args.test).resolve())
    CACHE.mkdir(parents=True, exist_ok=True)
    os.chdir(CACHE)   # keep the big one-time downloads out of the project folders

    try:
        import clip  # noqa: F401 — tokenizer for the text encoder
    except ImportError:
        sys.exit('Missing text tokenizer. Run:  pip install openai-clip "setuptools<81"')
    from ultralytics import YOLOE

    classes = GARBAGE + DECOYS
    print(f"Base model: {args.base} (downloaded on first run)")
    model = YOLOE(args.base)
    model.set_classes(classes, model.get_text_pe(classes))
    Path(args.out).parent.mkdir(parents=True, exist_ok=True)
    model.save(args.out)
    print(f"Saved {args.out}")
    print(f"  garbage classes: {GARBAGE}")
    print(f"  decoys (ignored by the backend): {DECOYS}")

    if args.test:
        from ultralytics import YOLO

        r = YOLO(args.out).predict(args.test, conf=0.2, verbose=False)[0]
        print(f"\nTest on {args.test}:")
        for b in sorted(r.boxes, key=lambda b: -float(b.conf)):
            name = classes[int(b.cls)]
            tag = "" if name in GARBAGE else "   (decoy — ignored)"
            print(f"  {name:<20} {float(b.conf):.2f}{tag}")

    print("\nRestart uvicorn; the log should show: garbage model loaded … (open-vocabulary, conf 0.2)")


if __name__ == "__main__":
    main()
