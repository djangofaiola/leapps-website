#!/usr/bin/env python3
"""Create a Mailjet campaign draft digesting recent LEAPP tool releases.

Runs daily from .github/workflows/release-mailing-draft.yml. Looks across all
tool repos for releases published inside the lookback window; if there are
none it exits quietly, otherwise it creates ONE Mailjet campaign DRAFT that
digests them all — same-day releases of several tools become a single email.
Like the blog announcement flow, it never sends: review the draft in the
Mailjet dashboard (Campaigns) and send it from there.

Usage:
    python3 scripts/create_release_digest_draft.py [--dry-run] [--hours N]

Environment:
    GITHUB_TOKEN                           optional, raises API rate limits
    MAILJET_API_KEY / MAILJET_API_SECRET   API credentials (unless --dry-run)
    MAILJET_LIST_ID                        numeric contact list ID
    MAILJET_SENDER_EMAIL                   validated sender address in Mailjet
    MAILJET_SENDER_NAME                    sender display name
"""

from __future__ import annotations

import html
import json
import os
import re
import sys
import urllib.error
import urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from create_mailing_draft import SITE, mailjet_post  # noqa: E402

# (display name, github repo, anchor on leapps.org/releases)
TOOLS = (
    ("iLEAPP", "abrignoni/iLEAPP", "section-ileapp"),
    ("ALEAPP", "abrignoni/ALEAPP", "section-aleapp"),
    ("RLEAPP", "abrignoni/RLEAPP", "section-rleapp"),
    ("VLEAPP", "abrignoni/VLEAPP", "section-vleapp"),
    ("LAVA", "leapps-org/LAVA-releases", "section-lava"),
    ("Batch LEAPP", "abrignoni/batch-leapp", "section-batch-leapp"),
)

NOTES_MAX_CHARS = 700


def github_releases(repo: str) -> list:
    request = urllib.request.Request(
        f"https://api.github.com/repos/{repo}/releases?per_page=10",
        headers={"Accept": "application/vnd.github+json"},
    )
    token = os.environ.get("GITHUB_TOKEN")
    if token:
        request.add_header("Authorization", f"Bearer {token}")
    try:
        with urllib.request.urlopen(request) as response:
            return json.load(response)
    except urllib.error.HTTPError as err:
        print(f"warning: could not list releases for {repo}: HTTP {err.code}",
              file=sys.stderr)
        return []


def recent_releases(hours: int) -> list:
    """Releases across all tools published within the last `hours` hours."""
    cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)
    found = []
    for tool, repo, anchor in TOOLS:
        for release in github_releases(repo):
            if release.get("draft") or release.get("prerelease"):
                continue
            published = datetime.fromisoformat(
                release["published_at"].replace("Z", "+00:00"))
            if published >= cutoff:
                found.append({
                    "tool": tool,
                    "anchor": anchor,
                    "tag": release.get("tag_name", ""),
                    "name": release.get("name") or release.get("tag_name", ""),
                    "notes": release.get("body") or "",
                    "published": published,
                })
    found.sort(key=lambda r: r["published"])
    return found


def notes_excerpt(markdown: str) -> str:
    """Crude markdown -> short plain text for the email body."""
    text = re.sub(r"```.*?```", "", markdown, flags=re.DOTALL)      # code blocks
    text = re.sub(r"!\[[^\]]*\]\([^)]*\)", "", text)                # images
    text = re.sub(r"\[([^\]]+)\]\([^)]*\)", r"\1", text)            # links -> text
    text = re.sub(r"^#{1,6}\s*", "", text, flags=re.MULTILINE)      # headings
    text = re.sub(r"[*_`]", "", text)                               # emphasis
    text = re.sub(r"\r\n", "\n", text).strip()
    if len(text) > NOTES_MAX_CHARS:
        text = text[:NOTES_MAX_CHARS].rsplit(None, 1)[0] + " …"
    return text


def build_email(releases: list) -> tuple[str, str, str]:
    """Return (subject, html_part, text_part) for the digest."""
    versions = ", ".join(f"{r['tool']} {r['tag']}" for r in releases)
    subject = f"New LEAPPs release{'s' if len(releases) > 1 else ''}: {versions}"

    sections_html = []
    sections_text = []
    for r in releases:
        notes = notes_excerpt(r["notes"])
        notes_html = html.escape(notes).replace("\n", "<br />")
        link = f"{SITE}/releases#{r['anchor']}"
        sections_html.append(f"""
      <div style="padding:24px 28px; border-top:1px solid #2C2C2C;">
        <p style="margin:0 0 6px; font-size:12px; letter-spacing:2px; text-transform:uppercase; color:#F5C020;">
          {html.escape(r["tool"])}
        </p>
        <h2 style="margin:0 0 12px; font-size:22px; line-height:1.2; color:#F0EDE6;">
          {html.escape(r["name"])}
        </h2>
        <p style="margin:0 0 18px; font-size:14px; line-height:1.6; color:#CFC9BE;">
          {notes_html}
        </p>
        <a href="{link}"
           style="display:inline-block; background:#F5C020; color:#0E0E0E; font-size:13px; font-weight:bold;
                  letter-spacing:1px; text-transform:uppercase; text-decoration:none; padding:10px 22px;">
          Download {html.escape(r["tool"])}
        </a>
      </div>""")
        sections_text.append(
            f"{r['tool']} — {r['name']}\n\n{notes}\n\nDownload: {link}\n")

    html_part = f"""<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8" /></head>
<body style="margin:0; padding:0; background:#0E0E0E; font-family:Arial,Helvetica,sans-serif; color:#F0EDE6;">
  <div style="max-width:600px; margin:0 auto; padding:24px 16px;">
    <div style="background:#161616; border:1px solid #2C2C2C;">
      <div style="padding:32px 28px 24px;">
        <p style="margin:0 0 6px; font-size:12px; letter-spacing:2px; text-transform:uppercase; color:#F5C020;">
          LEAPPs Project
        </p>
        <h1 style="margin:0; font-size:28px; line-height:1.1; color:#F0EDE6;">
          New Release{'s' if len(releases) > 1 else ''}
        </h1>
      </div>
      {''.join(sections_html)}
    </div>
    <p style="margin:20px 8px 0; font-size:12px; line-height:1.6; color:#888888; text-align:center;">
      You are receiving this because you subscribed to the LEAPPs mailing list at
      <a href="{SITE}/mailing" style="color:#888888;">leapps.org</a>.<br />
      <a href="[[UNSUB_LINK_EN]]" style="color:#888888;">Unsubscribe</a>
    </p>
  </div>
</body>
</html>"""

    text_part = (
        "New LEAPPs releases\n\n"
        + "\n----------------------------------------\n\n".join(sections_text)
        + "\nYou are receiving this because you subscribed to the LEAPPs "
        f"mailing list at {SITE}/mailing\n"
    )
    return subject, html_part, text_part


def main() -> int:
    argv = sys.argv[1:]
    dry_run = "--dry-run" in argv
    hours = 24
    if "--hours" in argv:
        hours = int(argv[argv.index("--hours") + 1])

    releases = recent_releases(hours)
    if not releases:
        print(f"No releases published in the last {hours} hours; nothing to do.")
        return 0

    subject, html_part, text_part = build_email(releases)
    print(f"Found {len(releases)} release(s): "
          + ", ".join(f"{r['tool']} {r['tag']}" for r in releases))

    if dry_run:
        print(f"--- DRY RUN ---\nSubject: {subject}\n\n{text_part}")
        return 0

    try:
        key = os.environ["MAILJET_API_KEY"]
        secret = os.environ["MAILJET_API_SECRET"]
        list_id = int(os.environ["MAILJET_LIST_ID"])
        sender_email = os.environ["MAILJET_SENDER_EMAIL"]
        sender_name = os.environ["MAILJET_SENDER_NAME"]
    except KeyError as missing:
        print(f"Missing required environment variable: {missing}", file=sys.stderr)
        return 1

    today = datetime.now(timezone.utc).date().isoformat()
    draft = mailjet_post(
        "/campaigndraft",
        {
            "Locale": "en_US",
            "Subject": subject,
            "Title": f"Release digest: {today}",
            "Sender": sender_name,
            "SenderName": sender_name,
            "SenderEmail": sender_email,
            "ContactsListID": list_id,
            "EditMode": "html2",
        },
        key,
        secret,
    )
    draft_id = draft["Data"][0]["ID"]
    mailjet_post(
        f"/campaigndraft/{draft_id}/detailcontent",
        {"Html-part": html_part, "Text-part": text_part},
        key,
        secret,
    )
    print(f"Created Mailjet draft {draft_id}.")
    print("Review and send it at https://app.mailjet.com/campaigns (Drafts).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
