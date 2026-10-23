"""Offline similarity analysis for tuning MATCH_THRESHOLD and AMBIGUITY_MARGIN.

    python scripts/e2e_scores.py --data-dir ~/classsight-data

e2e_verify.py shows what a teacher sees (a verdict and one confidence value). To choose
thresholds we also need the best score and the runner-up for every probe, which the API
doesn't return. This script embeds every photo once with the app's own
face_recognition module and replays the same probes in memory:

  held-out  gallery without photo P, probe P            (genuine)
  known     full gallery, verify/known photos            (genuine)
  stranger  gallery without that student, their photos   (must be rejected)

then sweeps threshold x margin through the real match_embeddings. Photos are never
written anywhere; results hold real roll numbers, so they go to the git-ignored
e2e-results/ folder. Needs the buffalo_l weights (~/.insightface), as in the container.
"""

from __future__ import annotations

import argparse
import csv
import statistics
import sys
from datetime import datetime
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.services import face_recognition as fr  # noqa: E402
from e2e_common import Dataset, load_dataset  # noqa: E402

THRESHOLDS = [round(0.30 + 0.05 * i, 2) for i in range(9)]  # 0.30 .. 0.70
MARGINS = [0.0, 0.03, 0.05, 0.08, 0.10]


def embed_photos(ds: Dataset, augment: bool):
    """One embedding per photo, plus augmented copies of enrollment photos if asked."""
    single: dict[Path, np.ndarray] = {}
    augmented: dict[Path, list[np.ndarray]] = {}
    problems: list[str] = []
    every = [p for photos in ds.enroll.values() for p in photos]
    every += [p for photos in ds.known.values() for p in photos] + ds.unknown
    for path in every:
        data = path.read_bytes()
        try:
            faces = fr.extract_face_embeddings(data)
        except fr.InvalidImageError:
            problems.append(f"{path.parent.name}/{path.name}: could not decode image")
            continue
        if len(faces) != 1:
            problems.append(f"{path.parent.name}/{path.name}: {len(faces)} face(s) detected")
            continue
        single[path] = faces[0]
        if augment and any(path in photos for photos in ds.enroll.values()):
            kept = []
            for variant in fr.augment_variants(fr.decode_image(data)):
                found = fr.embed_image(variant)
                if len(found) == 1:
                    kept.append(found[0])
            augmented[path] = kept
    return single, augmented, problems


def gallery_vector(photos, single, augmented):
    vectors = []
    for photo in photos:
        if photo in single:
            vectors.append(single[photo])
            vectors.extend(augmented.get(photo, []))
    return fr.mean_embedding(vectors) if vectors else None


def build_scenarios(ds: Dataset, single, augmented):
    """Yield (kind, expected_roll, photo, {roll: gallery vector})."""
    def galleries(rolls_photos):
        built = {roll: gallery_vector(photos, single, augmented) for roll, photos in rolls_photos}
        return {roll: vec for roll, vec in built.items() if vec is not None}  # none usable: not enrolled

    full = galleries(ds.enroll.items())

    for roll, photos in ds.known.items():
        for photo in photos:
            if photo in single:
                yield "known", roll, photo, full
    for roll, photos in ds.enroll.items():
        if len(photos) < 2:
            continue
        for held_out in photos:
            if held_out not in single:
                continue
            gallery = dict(full)
            rest = gallery_vector([p for p in photos if p != held_out], single, augmented)
            if rest is None:
                continue
            gallery[roll] = rest
            yield "held-out", roll, held_out, gallery
    for roll in ds.enroll:
        gallery = {r: v for r, v in full.items() if r != roll}
        for photo in ds.enroll[roll] + ds.known.get(roll, []):
            if photo in single:
                yield "stranger", None, photo, gallery
    for photo in ds.unknown:
        if photo in single:
            yield "stranger", None, photo, full


def score_row(kind, expected, photo, probe, gallery):
    rolls = sorted(gallery)
    sims = np.array([float(probe @ gallery[r]) for r in rolls])
    order = np.argsort(-sims)
    top = rolls[order[0]]
    return {
        "kind": kind,
        "expected": expected or "",
        "photo": photo.name,
        "top1": top,
        "top1_score": round(float(sims[order[0]]), 4),
        "runner_up_score": round(float(sims[order[1]]), 4) if len(rolls) > 1 else "",
        "own_score": round(float(sims[rolls.index(expected)]), 4) if expected else "",
    }


def decide(probe, gallery, threshold, margin):
    rolls = sorted(gallery)
    result = fr.match_embeddings(
        probe[None, :], [(i, gallery[r]) for i, r in enumerate(rolls)], threshold, margin
    )
    decision = result.decisions[0]
    return rolls[decision.student_id] if decision.student_id is not None else None


def sweep(scenarios, single):
    rows = []
    for threshold in THRESHOLDS:
        for margin in MARGINS:
            correct = wrong = miss = false_accept = genuine = strangers = 0
            for kind, expected, photo, gallery in scenarios:
                got = decide(single[photo], gallery, threshold, margin)
                if kind == "stranger":
                    strangers += 1
                    false_accept += got is not None
                else:
                    genuine += 1
                    if got is None:
                        miss += 1
                    elif got == expected:
                        correct += 1
                    else:
                        wrong += 1
            rows.append(
                {
                    "threshold": threshold,
                    "margin": margin,
                    "genuine": genuine,
                    "correct": correct,
                    "wrong_person": wrong,
                    "miss": miss,
                    "strangers": strangers,
                    "false_accepts": false_accept,
                }
            )
    return rows


def describe(values):
    return (
        f"n={len(values)} min={min(values):.3f} mean={statistics.fmean(values):.3f} "
        f"max={max(values):.3f}"
        if values
        else "n=0"
    )


def write_csv(path: Path, rows: list[dict]):
    if rows:
        with path.open("w", newline="") as fh:
            writer = csv.DictWriter(fh, fieldnames=list(rows[0]))
            writer.writeheader()
            writer.writerows(rows)


def analyse(ds: Dataset, augment: bool, run_dir: Path):
    label = "augment-on" if augment else "augment-off"
    print(f"\n===== {label} =====")
    single, augmented, problems = embed_photos(ds, augment)
    for problem in problems:
        print(f"  skipped (not exactly one face): {problem}")
    scenarios = list(build_scenarios(ds, single, augmented))

    rows = [
        score_row(kind, expected, photo, single[photo], gallery)
        for kind, expected, photo, gallery in scenarios
    ]
    write_csv(run_dir / f"scores-{label}.csv", rows)
    genuine_own = [r["own_score"] for r in rows if r["kind"] != "stranger"]
    genuine_wrong_top = sum(r["top1"] != r["expected"] for r in rows if r["kind"] != "stranger")
    stranger_top = [r["top1_score"] for r in rows if r["kind"] == "stranger"]
    print(f"  same person, score to own enrollment : {describe(genuine_own)}")
    print(f"  same person, closest was someone else: {genuine_wrong_top}")
    print(f"  stranger, best score to anyone       : {describe(stranger_top)}")
    gap = (min(genuine_own) - max(stranger_top)) if genuine_own and stranger_top else None
    if gap is not None:
        print(f"  lowest genuine minus highest stranger: {gap:+.3f}  (positive = cleanly separable)")

    table = sweep(scenarios, single)
    write_csv(run_dir / f"sweep-{label}.csv", table)
    print("\n  threshold margin | correct wrong miss | false-accepts")
    for r in table:
        if r["margin"] in (0.0, 0.05, 0.10):
            print(
                f"  {r['threshold']:.2f}      {r['margin']:.2f}   | "
                f"{r['correct']:>3}/{r['genuine']:<3} {r['wrong_person']:>4} {r['miss']:>4} | "
                f"{r['false_accepts']}/{r['strangers']}"
            )


def main():
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    parser.add_argument("--data-dir", default="~/classsight-data")
    parser.add_argument("--out-dir", default=str(Path(__file__).resolve().parents[2] / "e2e-results"))
    parser.add_argument("--augment", choices=["off", "on", "both"], default="both")
    args = parser.parse_args()

    ds = load_dataset(Path(args.data_dir).expanduser())
    run_dir = Path(args.out_dir) / f"{datetime.now():%Y%m%d-%H%M%S}-scores"
    run_dir.mkdir(parents=True)
    print(f"{len(ds.rolls)} students -> {run_dir}")
    for augment in {"off": [False], "on": [True], "both": [False, True]}[args.augment]:
        analyse(ds, augment, run_dir)


if __name__ == "__main__":
    main()
