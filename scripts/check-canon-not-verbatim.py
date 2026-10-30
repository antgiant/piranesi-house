#!/usr/bin/env python3
"""Flag any run of N consecutive words in canon/ that also appears in the (private) source text.

Usage: python3 -I scripts/check-canon-not-verbatim.py /path/to/source.txt [N=7]
The source path is an argument; the source itself never lives in the repo.
"""
import re, sys, glob

UNITS = "first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|eleventh|twelfth|thirteenth|fourteenth|fifteenth|sixteenth|seventeenth|eighteenth|nineteenth"
TENS = "twent|thirt|fort|fift|sixt|sevent|eight|ninet"
ORD = rf"(?:(?:one[ -]hundred[ -]and[ -])?(?:(?:{TENS})(?:ieth|y)[ -]?)?(?:{UNITS})|(?:one[ -]hundred[ -]and[ -])?(?:{TENS})ieth)"
DIR = r"(?:north|south|east|west)(?:ern)?"
# a numbered place name such as "Fifth North-Western Hall" is a factual identifier, not borrowed prose
PLACE = re.compile(rf"\b{ORD}[ -]+(?:{DIR}[ -]*)*(?:hall|vestibule|vestibules|halls)\b|\b(?:first|second|third|fourth|fifth|sixth) (?:and {ORD} )?(?:{DIR}[ -]*)+halls?\b")

def words(s):
    s = PLACE.sub(" PLACE ", s.lower().replace("’", "'"))
    return re.findall(r"[a-z0-9]+", s)

def main():
    src_path = sys.argv[1]
    n = int(sys.argv[2]) if len(sys.argv) > 2 else 7
    src = words(open(src_path, encoding="utf-8", errors="ignore").read())
    grams = {tuple(src[i:i+n]) for i in range(len(src) - n + 1)}
    bad = 0
    for f in sorted(glob.glob("canon/**/*.*", recursive=True)):
        for ln, line in enumerate(open(f, encoding="utf-8"), 1):
            w = words(re.sub(r"\bsrc\b.*$", "", line))
            for i in range(len(w) - n + 1):
                if tuple(w[i:i+n]) in grams:
                    print(f"{f}:{ln}: shares {n} words: {' '.join(w[i:i+n])}")
                    bad += 1
                    break
    print("verbatim overlaps:", bad)
    sys.exit(1 if bad else 0)

main()
