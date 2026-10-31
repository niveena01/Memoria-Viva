# backend/app/routers/spirit.py
"""Spirit Channeler router — Ollama → Groq → Offline waterfall."""
import csv
import io
import logging
import random
from typing import List, Optional

from fastapi import APIRouter, File, UploadFile

from app.schemas import (
    AncestralTimelineResponse,
    FamilyMember,
    FamilyTreeResponse,
    SpiritQueryRequest,
    SpiritQueryResponse,
)
from app.services.groq_service import generate_response as groq_generate_response
from app.services.ollama_service import ollama_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/spirit", tags=["Spirit Channeler"])

# ──────────────────────────────────────────────
# Offline fallback poetry (used only if BOTH
# Ollama and Groq are unavailable)
# ──────────────────────────────────────────────
_FALLBACKS = [
    "🕯️ *The candles glow softly across the marigold petals.* Whispers of your ancestors echo through the silent vaults—tales of triumph, enduring devotion, and quiet laughter, preserved forever in this sacred digital ofrenda.",
    "✨ *A gentle warmth stirs the parchment pages.* Your words summon memories from decades past. The elders watch over your journey, holding their blessings close, never forgotten.",
    "🍂 *Gold cempasúchil petals drift upon the digital veil.* Though the heavy winds howl outside, within this archive the flame burns steadily. Every name inscribed here sheltered from cloud decay and time itself.",
    "🔮 *From the deep mahogany corridors of the archive:* The spirits acknowledge your voice. What was cherished in life is honored in memory—shining like an eternal lantern in the quiet dark.",
]
_MISSING_FALLBACKS = [
    "🕯️ *The candle flame wavers gently.* That memory rests just beyond the current pages of our ledger. No soul is truly lost—their essence lingers in the warmth around you.",
    "✨ *A quiet breeze rustles the ancient scrolls.* The archive searches the shadowed corridors but finds no direct record yet. Light another candle; in time, their story may whisper back.",
]
_FAMILY_FALLBACKS = [
    "🕯️ *The ofrenda illuminates with radiant gold.* Behold the ancestral lineage gathered before you—each portrait a beacon of courage, each year a testament to enduring love across the generations.",
    "✨ *The ledger opens upon the ancestral arbor.* Here rest the names and memories of those who walked before you, their stories etched into living history.",
]

# ──────────────────────────────────────────────
# In-memory family store (pre-seeded sample)
# ──────────────────────────────────────────────
DEFAULT_FAMILY: List[dict] = [
    {"name": "Abuela Rosa",      "born_year": 1900, "death_year": 1975, "image_url": "/no_image.png", "relationship": "Grandmother", "generation": 1},
    {"name": "Abuelo Miguel",    "born_year": 1898, "death_year": 1972, "image_url": "/no_image.png", "relationship": "Grandfather", "generation": 1},
    {"name": "Carmen Silva",     "born_year": 1928, "death_year": 2005, "image_url": "/no_image.png", "relationship": "Mother",      "generation": 2},
    {"name": "Ernesto de la Cruz","born_year": 1925,"death_year": 2015, "image_url": "/no_image.png", "relationship": "Father",      "generation": 2},
    {"name": "Sofia Rivas",      "born_year": 1955, "death_year": None, "image_url": "/no_image.png", "relationship": "Daughter",    "generation": 3},
    {"name": "Lucia Morales",    "born_year": 1958, "death_year": None, "image_url": "/no_image.png", "relationship": "Daughter",    "generation": 3},
    {"name": "Valentina Cruz",   "born_year": 1985, "death_year": None, "image_url": "/no_image.png", "relationship": "Granddaughter","generation": 4},
]

CURRENT_FAMILY_STORE: List[dict] = list(DEFAULT_FAMILY)


# ──────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────
def _is_family_query(text: str) -> bool:
    keywords = ["family", "tree", "ancestor", "lineage", "relative", "who are",
                "who is", "members", "ofrenda", "generation", "grandmother",
                "grandfather", "mother", "father", "daughter", "granddaughter"]
    t = text.lower()
    return any(k in t for k in keywords)


def _is_missing_query(text: str) -> bool:
    keywords = ["unknown", "lost", "forgotten", "missing", "where is",
                "can't find", "cant find", "not found"]
    t = text.lower()
    return any(k in t for k in keywords)


def _family_context() -> str:
    lines = []
    for m in CURRENT_FAMILY_STORE:
        rel = f" [{m['relationship']}]" if m.get("relationship") else ""
        died = f"–{m['death_year']}" if m.get("death_year") else "–present"
        lines.append(f"- {m['name']}{rel} ({m.get('born_year', '?')} {died})")
    return "\n".join(lines)


def _family_members() -> Optional[List[dict]]:
    return list(CURRENT_FAMILY_STORE) if CURRENT_FAMILY_STORE else None


# ──────────────────────────────────────────────
# Main channel endpoint
# ──────────────────────────────────────────────
@router.post("/channel", response_model=SpiritQueryResponse)
async def channel_spirit(payload: SpiritQueryRequest):
    """
    Priority waterfall:
      1. Local Ollama  →  2. Groq API  →  3. Offline poetic fallback
    """
    user_prompt = payload.prompt.strip()
    temp = payload.temperature
    asks_family = _is_family_query(user_prompt)
    family_ctx = _family_context()

    # ── TIER 1: Local Ollama ──────────────────
    try:
        result = await ollama_service.generate_response(prompt=user_prompt, temperature=temp)
        logger.info("[Channel] Ollama responded. model=%s", result.get("model"))
        return SpiritQueryResponse(
            response=result["response"],
            model=result.get("model", "Ollama"),
            tokens_eval=result.get("tokens_eval"),
            family_data=_family_members() if asks_family else None,
        )
    except Exception as exc:
        logger.warning("[Channel] Ollama failed: %s — falling through to Groq", exc)

    # ── TIER 2: Groq API ─────────────────────
    try:
        result = await groq_generate_response(
            prompt=user_prompt,
            temperature=temp,
            family_context=family_ctx if asks_family else None,
        )
        logger.info("[Channel] Groq responded. model=%s", result.get("model"))
        return SpiritQueryResponse(
            response=result["response"],
            model=result.get("model", "Groq Fallback"),
            tokens_eval=result.get("tokens_eval"),
            family_data=_family_members() if asks_family else None,
        )
    except Exception as exc:
        logger.warning("[Channel] Groq failed: %s — falling through to offline fallback", exc)

    # ── TIER 3: Offline poetic fallback ──────
    logger.info("[Channel] Both Ollama and Groq unavailable. Using offline fallback.")
    if asks_family:
        text = random.choice(_FAMILY_FALLBACKS)
        fdata = _family_members()
    elif _is_missing_query(user_prompt):
        text = random.choice(_MISSING_FALLBACKS)
        fdata = None
    else:
        text = random.choice(_FALLBACKS)
        fdata = None

    return SpiritQueryResponse(
        response=text,
        model="Offline Fallback Mode",
        tokens_eval=random.randint(35, 60),
        family_data=fdata,
    )


# ──────────────────────────────────────────────
# Family tree endpoints
# ──────────────────────────────────────────────
@router.get("/family-tree", response_model=FamilyTreeResponse)
async def get_family_tree():
    """Retrieve current family tree."""
    return FamilyTreeResponse(family=[FamilyMember(**m) for m in CURRENT_FAMILY_STORE])


@router.post("/family-tree", response_model=FamilyTreeResponse)
async def set_family_tree(members: List[FamilyMember]):
    """Replace family tree via JSON body."""
    global CURRENT_FAMILY_STORE
    CURRENT_FAMILY_STORE = [
        {
            "name": m.name,
            "born_year": m.born_year,
            "death_year": m.death_year,
            "image_url": m.image_url or "/no_image.png",
            "relationship": m.relationship,
            "generation": m.generation,
        }
        for m in members
    ]
    return FamilyTreeResponse(family=[FamilyMember(**m) for m in CURRENT_FAMILY_STORE])


@router.post("/family-tree/upload", response_model=FamilyTreeResponse)
async def upload_family_tree(file: UploadFile = File(...)):
    """Upload CSV → columns: name, born_year, death_year, image_url, relationship, generation"""
    global CURRENT_FAMILY_STORE
    content = await file.read()
    reader = csv.DictReader(io.StringIO(content.decode("utf-8", errors="replace")))

    new_members: List[dict] = []
    for row in reader:
        name = (row.get("name") or "").strip()
        if not name:
            continue

        def _int(val: str, default: int = 0) -> int:
            try:
                return int(float(val.strip()))
            except Exception:
                return default

        def _opt_int(val: Optional[str]) -> Optional[int]:
            if not val or not val.strip():
                return None
            try:
                return int(float(val.strip()))
            except Exception:
                return None

        img = (row.get("image_url") or row.get("image") or "").strip()
        if not img or img.lower() in ("nan", "none", ""):
            img = "/no_image.png"

        relationship = (row.get("relationship") or row.get("role") or "").strip() or None

        gen_raw = row.get("generation") or row.get("gen") or ""
        generation = _opt_int(gen_raw)

        # Auto-assign generation from relationship if missing
        if generation is None and relationship:
            rl = relationship.lower()
            if any(x in rl for x in ["great-grand", "great grand"]):
                generation = 1
            elif any(x in rl for x in ["grandfather", "grandmother", "grandparent"]):
                generation = 1
            elif any(x in rl for x in ["mother", "father", "parent", "uncle", "aunt"]):
                generation = 2
            elif any(x in rl for x in ["son", "daughter", "child", "sibling", "brother", "sister"]):
                generation = 3
            elif any(x in rl for x in ["grandson", "granddaughter", "grandchild"]):
                generation = 4

        new_members.append({
            "name": name,
            "born_year": _int(row.get("born_year") or row.get("born") or "0"),
            "death_year": _opt_int(row.get("death_year") or row.get("died")),
            "image_url": img,
            "relationship": relationship,
            "generation": generation,
        })

    if new_members:
        CURRENT_FAMILY_STORE = new_members

    return FamilyTreeResponse(family=[FamilyMember(**m) for m in CURRENT_FAMILY_STORE])


# ──────────────────────────────────────────────
# Ancestral timeline upload
# ──────────────────────────────────────────────
@router.post("/ancestral-timeline/upload", response_model=AncestralTimelineResponse)
async def upload_ancestral_timeline(file: UploadFile = File(...)):
    """CSV → year, season, documents_archived, letters_exchanged, anomaly_score_log, target"""
    content = await file.read()
    reader = csv.DictReader(io.StringIO(content.decode("utf-8", errors="replace")))
    events = []
    for row in reader:
        try:
            events.append({
                "year": int(float(row.get("year", 0) or 0)),
                "season": (row.get("season") or "Unknown").strip(),
                "documents_archived": int(float(row.get("documents_archived", 0) or 0)),
                "letters_exchanged": int(float(row.get("letters_exchanged", 0) or 0)),
                "anomaly_score_log": float(row.get("anomaly_score_log", 0.0) or 0.0),
                "target": (row.get("target") or "Unknown").strip(),
            })
        except Exception:
            continue
    return AncestralTimelineResponse(events=events)