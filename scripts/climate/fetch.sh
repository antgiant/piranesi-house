#!/usr/bin/env bash
# Fetch ten years of hourly precipitation for the places the weather is checked against. Open-Meteo's historical archive (ERA5-based reanalysis),
# free for this use under CC BY 4.0: https://open-meteo.com/ . Usage: scripts/climate/fetch.sh <outdir>
set -euo pipefail
out="${1:?outdir}"; mkdir -p "$out"
declare -A SITES=( [derbyshire_author_home]="53.00,-1.50" [nottingham]="52.95,-1.15" [whitby_ne_coast]="54.49,-0.61" [plymouth_sw_coast]="50.37,-4.14" [liverpool_nw_coast]="53.41,-2.99" [keswick_wet_lakes]="54.60,-3.13" [miami_subtropical]="25.76,-80.19" )
for k in "${!SITES[@]}"; do IFS=, read -r lat lon <<< "${SITES[$k]}"; curl -sS -m 120 -o "$out/$k.json" "https://archive-api.open-meteo.com/v1/archive?latitude=$lat&longitude=$lon&start_date=2014-01-01&end_date=2023-12-31&hourly=precipitation&timezone=UTC" & done; wait
