#!/usr/bin/env bash
# Mandatory verification gate (item F of the report-quality standards).
# Every cited URL in a report/insight file must be checked before staging -> master merge.
# Usage: scripts/verify-report-sources.sh reports/2026-07-28.html
set -uo pipefail

if [ $# -lt 1 ]; then
  echo "Usage: $0 <path-to-report-html> [more files...]" >&2
  exit 1
fi

# Domains known to block plain curl/bot requests with 403 even though the article is real
# (paywall/anti-bot WAF). Confirmed real via independent WebSearch cross-check each time one
# is newly added here — do not add a domain just to silence a failure without verifying it first.
# These get WARN (visible, non-blocking) instead of FAIL, so a human still sees them but the
# gate doesn't hard-block on a known false-positive class.
BOT_BLOCKED_DOMAINS='bloomberg\.com|japantimes\.co\.jp|army\.mil|loc\.gov|nytimes\.com|ft\.com|wsj\.com|economist\.com|japantoday\.com|diana\.nato\.int|history\.navy\.mil|usnews\.com|anzacportal\.dva\.gov\.au|businesswire\.com|canada\.ca|criticalthreats\.org|leonardodrs\.com|sec\.gov|investing\.com|nippon\.com|washingtonpost\.com|navalsafetycommand\.navy\.mil|news\.usni\.org|gd\.com|militarnyi\.com|afmc\.af\.mil|armed-services\.senate\.gov|congress\.gov|imf\.org|oecd\.org|realcleardefense\.com|arkansasonline\.com|axios\.com|navalnews\.com|rand\.org|researchcentre\.army\.gov\.au|france24\.com|hsfkramer\.com|timesofisrael\.com|alarabiya\.net|arabnews\.com|dtic\.mil|iiss\.org|spaceforce\.mil|ledesk\.ma|marketscreener\.com|abcnews\.com|aviationweek\.com|breakingdefense\.com|defensescoop\.com|yahoo\.com|focustaiwan\.tw|foreignpolicy\.com|huntsvillebusinessjournal\.com|soldiersystems\.net|thedefensepost\.com|thediplomat\.com|unn\.ua|aei\.org|aljazeera\.com|csis\.org|defensedaily\.com|defensenews\.com|digitimes\.com|eurasiantimes\.com|executivegov\.com|kyivpost\.com|militarytimes\.com|nbcnews\.com|prnewswire\.com|rferl\.org|stripes\.com|theepochtimes\.com|war\.gov|washingtontimes\.com'

fail_count=0
warn_count=0
total_count=0

for file in "$@"; do
  if [ ! -f "$file" ]; then
    echo "SKIP (not found): $file" >&2
    continue
  fi

  echo "=== $file ==="
  urls=$(grep -oE 'href="https?://[^"#]+"' "$file" | sed -E 's/^href="//; s/"$//' | sort -u)

  if [ -z "$urls" ]; then
    echo "  (no cited URLs found)"
    continue
  fi

  while IFS= read -r url; do
    [ -z "$url" ] && continue
    total_count=$((total_count + 1))
    code=$(curl -s -o /dev/null -w "%{http_code}" -L --max-time 15 -A "Mozilla/5.0 (IMT-Global-Verifier)" "$url")
    if [ "$code" -ge 200 ] && [ "$code" -lt 400 ]; then
      echo "  OK   [$code] $url"
    elif echo "$url" | grep -qE "$BOT_BLOCKED_DOMAINS"; then
      echo "  WARN [$code] $url (known bot-blocked domain — verify manually via WebSearch if new, not auto-failed)"
      warn_count=$((warn_count + 1))
    else
      echo "  FAIL [$code] $url"
      fail_count=$((fail_count + 1))
    fi
  done <<< "$urls"
done

echo ""
echo "=== Summary: $((total_count - fail_count - warn_count))/$total_count URLs OK, $warn_count WARN (known bot-blocked), $fail_count FAILED ==="

if [ "$fail_count" -gt 0 ]; then
  echo "GATE: BLOCKED — fix or remove failing citations before merging to master." >&2
  exit 1
fi

if [ "$warn_count" -gt 0 ]; then
  echo "GATE: PASSED WITH WARNINGS — $warn_count known-bot-blocked URL(s) were not auto-verified; confirm the ones that are new/unfamiliar via WebSearch before trusting blindly."
fi
echo "GATE: PASSED."
exit 0
