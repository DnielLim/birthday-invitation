"""
🎂 Alvien & Vinella — 3D Digital Birthday Invitation
====================================================

Run locally:
    streamlit run app.py

Everything you normally need to change lives in the CONFIGURATION block below.
The cinematic experience itself (Three.js + GSAP + HTML5 Audio) is located in
`frontend/` and is rendered through a lightweight bidirectional Streamlit
component, so RSVP answers from the page are sent back to Python.
"""

from __future__ import annotations

import csv
import hashlib
import json
import shutil
import urllib.request
from datetime import datetime
from pathlib import Path

import streamlit as st
import streamlit.components.v1 as components

# =============================================================================
# 🎉 CONFIGURATION — edit everything here
# =============================================================================

BIRTHDAY_PERSON_1 = "Alvien's 30<sup>th</sup>"
BIRTHDAY_PERSON_2 = "Vinella's 2<sup>th</sup>"

EVENT_TITLE = "Birthday Celebration 🎂"
EVENT_SUBTITLE = "Two Birthdays, One Special Celebration ✨"

EVENT_DATE = "Sabtu, 17 Oktober 2026"     # shown on the invitation
EVENT_TIME = "15:30 WIB - Selesai"          # shown on the invitation
EVENT_VENUE = "Kampung Kecil Summarecon Serpong"  # venue name
EVENT_ADDRESS = "Summarecon Serpong, Tangerang"
DRESS_CODE = ""

# Machine-readable start/end (used for the countdown + "Add to Calendar").
# Format: YYYY-MM-DDTHH:MM  (local time of the event)
EVENT_START = "2026-10-17T15:30"
EVENT_END = "2026-10-17T19:30"
EVENT_TIMEZONE = "Asia/Jakarta"

# Optional: custom Google Maps query/link. Leave "" to use venue + address.
GOOGLE_MAPS_QUERY = "https://share.google/bBRyOOnWS18cbC9u6"

INVITATION_MESSAGE = """
Join us as we celebrate another beautiful year of life, laughter, and memories.
Two birthdays, one unforgettable night.
"""

# Digits shown on the golden number balloons floating in the background
# (e.g. an age like "25" or the year "26"). Use "" to disable.
NUMBER_BALLOONS = "30"

# Optional nicer titles for the songs in assets/music/ (filename -> title).
# Files not listed here get an automatic title from their filename.
PLAYLIST_TITLES = {
    "birthday_song.m4a": "Selamat Ulang Tahun · Jamrud 🎸🎂",
    "birthday_song.mp3": "Selamat Ulang Tahun · Jamrud 🎸🎂",
    "song_2.mp3": "Celebration Mood ✨",
    "song_3.mp3": "Party All Night 🎉",
}

# ---- RSVP storage -----------------------------------------------------------
# 1) Always: Streamlit session_state (per visitor session)
# 2) Always: local CSV file (data/rsvp.csv) — fine locally, NOT persistent on
#    Streamlit Community Cloud (the container can restart).
# 3) Optional: Google Sheets through a Google Apps Script Web App URL
#    (see README). Can also be set in .streamlit/secrets.toml as
#    GOOGLE_SHEETS_WEBHOOK_URL = "https://script.google.com/macros/s/.../exec"
GOOGLE_SHEETS_WEBHOOK_URL = ""
# 4) Google Form URL: Tamu dapat mengisi Google Form langsung tertanam (embedded) di website.
# Masukkan link Google Form Anda (link biasa atau link dengan ?embedded=true).
# Jika kosong, pengunjung dapat memasukkan link langsung di tab Google Form pada website.
GOOGLE_FORM_URL = ""

# Secret key to view RSVP responses:  http://localhost:8501/?admin=<ADMIN_KEY>
# Can also be set in secrets.toml as ADMIN_KEY = "..."
ADMIN_KEY = "alvien-vinella-2026"

# =============================================================================
# Internal settings (normally no need to touch below this line)
# =============================================================================

BASE_DIR = Path(__file__).resolve().parent
ASSETS_DIR = BASE_DIR / "assets"
IMAGES_DIR = ASSETS_DIR / "images"
MUSIC_DIR = ASSETS_DIR / "music"
MODEL_DIR = ASSETS_DIR / "3d"
FRONTEND_DIR = BASE_DIR / "frontend"
MEDIA_DIR = FRONTEND_DIR / "_media"          # auto-generated, served by the component
DATA_DIR = BASE_DIR / "data"
RSVP_CSV = DATA_DIR / "rsvp.csv"

IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".webp"}
AUDIO_EXTS = {".mp3", ".ogg", ".m4a", ".wav", ".aac"}
MAX_IMAGE_SIDE = 1400          # px — images are downscaled for fast loading
PORTRAIT_SIDE = 900

st.set_page_config(
    page_title=f"{BIRTHDAY_PERSON_1} & {BIRTHDAY_PERSON_2} · Birthday Celebration 🎂",
    page_icon="🎂",
    layout="wide",
    initial_sidebar_state="collapsed",
)


def _secret(name: str, default: str = "") -> str:
    """Read a value from st.secrets without crashing when no secrets file exists."""
    try:
        return str(st.secrets.get(name, default))
    except Exception:  # noqa: BLE001 - secrets file missing
        return default


# =============================================================================
# Asset pipeline: optimise images + copy music into frontend/_media
# =============================================================================

def _dir_signature(*folders: Path) -> str:
    """Cheap fingerprint of folder contents (names, sizes, mtimes)."""
    h = hashlib.md5()
    for folder in folders:
        if not folder.exists():
            continue
        for p in sorted(folder.iterdir()):
            if p.is_file():
                s = p.stat()
                h.update(f"{p.name}:{s.st_size}:{int(s.st_mtime)}".encode())
    return h.hexdigest()


def _pretty_title(filename: str) -> str:
    stem = Path(filename).stem.replace("_", " ").replace("-", " ").strip()
    return stem.title() if stem else filename


def _optimise_image(src: Path, dst: Path, max_side: int) -> bool:
    """Resize + recompress an image to JPEG. Falls back to a plain copy."""
    try:
        from PIL import Image, ImageOps

        with Image.open(src) as im:
            im = ImageOps.exif_transpose(im)
            im = im.convert("RGB")
            im.thumbnail((max_side, max_side), Image.LANCZOS)
            im.save(dst, "JPEG", quality=82, optimize=True, progressive=True)
        return True
    except Exception:  # noqa: BLE001 - Pillow missing or broken image
        try:
            shutil.copy2(src, dst.with_suffix(src.suffix.lower()))
            return True
        except Exception:  # noqa: BLE001
            return False


def build_media(signature: str) -> dict:
    """Prepare all media directly inside frontend/assets/ for reliable loading."""
    fe_assets = FRONTEND_DIR / "assets"
    fe_img = fe_assets / "images"
    fe_music = fe_assets / "music"
    fe_3d = fe_assets / "3d"
    for d in (fe_img, fe_music, fe_3d):
        d.mkdir(parents=True, exist_ok=True)

    # Sync any updated files from ASSETS_DIR to FRONTEND_DIR/assets
    if IMAGES_DIR.exists():
        for p in IMAGES_DIR.iterdir():
            if p.is_file() and p.suffix.lower() in IMAGE_EXTS:
                dst = fe_img / p.name
                if not dst.exists() or dst.stat().st_size != p.stat().st_size:
                    shutil.copy2(p, dst)

    if MUSIC_DIR.exists():
        for p in MUSIC_DIR.iterdir():
            if p.is_file() and p.suffix.lower() in AUDIO_EXTS:
                dst = fe_music / p.name
                if not dst.exists() or dst.stat().st_size != p.stat().st_size:
                    shutil.copy2(p, dst)

    # Celebrant portraits
    portraits = {}
    for key, person in (("person1", BIRTHDAY_PERSON_1), ("person2", BIRTHDAY_PERSON_2)):
        stem = person.lower()
        found = None
        for ext in IMAGE_EXTS:
            cand = fe_img / f"{stem}{ext}"
            if cand.exists():
                found = f"assets/images/{cand.name}"
                break
        portraits[key] = found

    # Gallery
    reserved = {BIRTHDAY_PERSON_1.lower(), BIRTHDAY_PERSON_2.lower()}
    gallery = []
    if fe_img.exists():
        files = sorted(
            (p for p in fe_img.iterdir()
             if p.suffix.lower() in IMAGE_EXTS and p.stem.lower() not in reserved),
            key=lambda p: p.name.lower(),
        )
        for p in files[:12]:
            gallery.append({"src": f"assets/images/{p.name}", "alt": _pretty_title(p.name)})

    # Playlist
    tracks = []
    if fe_music.exists():
        songs = [p for p in fe_music.iterdir() if p.suffix.lower() in AUDIO_EXTS]
        songs.sort(key=lambda p: (p.stem.lower() != "birthday_song", p.name.lower()))
        for p in songs:
            tracks.append({
                "title": PLAYLIST_TITLES.get(p.name, _pretty_title(p.name)),
                "src": f"assets/music/{p.name}",
            })

    cake_model = None
    glb = MODEL_DIR / "cake.glb"
    if glb.exists() and glb.stat().st_size > 1024:
        shutil.copy2(glb, fe_3d / "cake.glb")
        cake_model = "assets/3d/cake.glb"

    return {"portraits": portraits, "gallery": gallery, "tracks": tracks, "cake_model": cake_model}


# =============================================================================
# RSVP storage
# =============================================================================

RSVP_FIELDS = ["timestamp", "id", "attending", "name", "guests", "message"]


def save_rsvp(entry: dict) -> tuple[bool, str]:
    """Persist an RSVP to session_state, CSV and (optionally) Google Sheets."""
    row = {
        "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "id": str(entry.get("id", ""))[:64],
        "attending": "Yes" if entry.get("attending") else "No",
        "name": str(entry.get("name", "")).strip()[:120],
        "guests": int(entry.get("guests") or 0) if entry.get("attending") else 0,
        "message": str(entry.get("message", "")).strip()[:1000],
    }
    st.session_state.setdefault("rsvps", []).append(row)

    try:
        DATA_DIR.mkdir(parents=True, exist_ok=True)
        new_file = not RSVP_CSV.exists()
        with RSVP_CSV.open("a", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=RSVP_FIELDS)
            if new_file:
                writer.writeheader()
            writer.writerow(row)
    except Exception:  # noqa: BLE001 - read-only FS etc.
        pass

    webhook = GOOGLE_SHEETS_WEBHOOK_URL or _secret("GOOGLE_SHEETS_WEBHOOK_URL")
    if webhook:
        try:
            req = urllib.request.Request(
                webhook,
                data=json.dumps(row).encode("utf-8"),
                headers={"Content-Type": "application/json"},
                method="POST",
            )
            urllib.request.urlopen(req, timeout=8).read()
            return True, "sheets"
        except Exception as exc:  # noqa: BLE001
            return True, f"local-only ({exc.__class__.__name__})"
    return True, "local"


def load_rsvps() -> list[dict]:
    if not RSVP_CSV.exists():
        return []
    try:
        with RSVP_CSV.open(newline="", encoding="utf-8") as f:
            return list(csv.DictReader(f))
    except Exception:  # noqa: BLE001
        return []


# =============================================================================
# Admin view  (?admin=<ADMIN_KEY>)
# =============================================================================

def render_admin() -> None:
    st.title("💌 RSVP Responses")
    st.caption(f"{BIRTHDAY_PERSON_1} & {BIRTHDAY_PERSON_2} · {EVENT_DATE}")
    rows = load_rsvps()
    yes = [r for r in rows if r.get("attending") == "Yes"]
    c1, c2, c3 = st.columns(3)
    c1.metric("Responses", len(rows))
    c2.metric("Attending", len(yes))
    c3.metric("Total guests", sum(int(r.get("guests") or 0) for r in yes))
    if rows:
        st.dataframe(rows, use_container_width=True, hide_index=True)
        with RSVP_CSV.open("rb") as f:
            st.download_button("⬇️ Download CSV", f, file_name="rsvp.csv", mime="text/csv")
    else:
        st.info("No RSVP yet. (On Streamlit Cloud use the Google Sheets webhook for persistence.)")
    st.markdown("[← Back to the invitation](./)")


# =============================================================================
# Page
# =============================================================================

admin_key = ADMIN_KEY or _secret("ADMIN_KEY")
if admin_key and st.query_params.get("admin") == admin_key:
    render_admin()
    st.stop()

# Make the Streamlit chrome disappear and let the invitation take the full screen.
st.markdown(
    """
    <style>
      #MainMenu, header, footer,
      [data-testid="stHeader"], [data-testid="stToolbar"],
      [data-testid="stDecoration"], [data-testid="stStatusWidget"],
      [data-testid="stSidebar"], [data-testid="collapsedControl"] { display: none !important; }
      html, body, .stApp, .main, [data-testid="stAppViewContainer"], [data-testid="stMainBlockContainer"], [data-testid="stMain"] {
        overflow: hidden !important; background: #f6e3f1 !important;
        margin: 0 !important; padding: 0 !important; width: 100vw !important; height: 100vh !important;
      }
      .block-container, [data-testid="stMainBlockContainer"], [data-testid="stAppViewBlockContainer"] {
        padding: 0 !important; max-width: 100% !important; margin: 0 !important;
      }
      iframe, [data-testid="stCustomComponentV1"] iframe {
        position: fixed !important; top: 0 !important; left: 0 !important; right: 0 !important; bottom: 0 !important;
        width: 100vw !important; height: 100vh !important; height: 100dvh !important;
        border: 0 !important; z-index: 999990 !important; background: transparent;
        overflow: auto !important;
        pointer-events: auto !important;
      }
    </style>
    """,
    unsafe_allow_html=True,
)

_invitation = components.declare_component("birthday_invitation", path=str(FRONTEND_DIR))

media = build_media(_dir_signature(IMAGES_DIR, MUSIC_DIR, MODEL_DIR))

maps_query = GOOGLE_MAPS_QUERY or f"{EVENT_VENUE}, {EVENT_ADDRESS}"
config = {
    "person1": BIRTHDAY_PERSON_1,
    "person2": BIRTHDAY_PERSON_2,
    "title": EVENT_TITLE,
    "subtitle": EVENT_SUBTITLE,
    "date": EVENT_DATE,
    "time": EVENT_TIME,
    "venue": EVENT_VENUE,
    "address": EVENT_ADDRESS,
    "dressCode": DRESS_CODE,
    "start": EVENT_START,
    "end": EVENT_END,
    "timezone": EVENT_TIMEZONE,
    "mapsQuery": maps_query,
    "message": " ".join(INVITATION_MESSAGE.split()),
    "numberBalloons": NUMBER_BALLOONS,
    "googleFormUrl": GOOGLE_FORM_URL,
    **media,
}

# Handle RSVP answers coming back from the page (deduplicated by id).
st.session_state.setdefault("rsvp_seen", set())
st.session_state.setdefault("rsvp_ack", None)

event = _invitation(config=config, ack=st.session_state.rsvp_ack, key="invitation", default=None)

if isinstance(event, dict) and event.get("type") == "rsvp":
    rid = str(event.get("id", ""))
    if rid and rid not in st.session_state.rsvp_seen:
        st.session_state.rsvp_seen.add(rid)
        ok, where = save_rsvp(event)
        st.session_state.rsvp_ack = {"id": rid, "ok": ok, "where": where}
        st.rerun()  # send the acknowledgement back to the page
