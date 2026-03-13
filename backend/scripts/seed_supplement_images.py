"""
Download real herb/supplement photos from Wikimedia Commons and assign to supplements.
Run from the backend/ directory:
    python scripts/seed_supplement_images.py
"""
import asyncio
import sys
import os
import http.client
import ssl
import time
import urllib.request
import urllib.parse
import json

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import AsyncSessionLocal
from app.models.plan import Supplement

# Map supplement names → Wikipedia article titles for image lookup.
# Uses botanical/common names that have good Wikipedia images.
WIKI_TITLES: dict[str, str] = {
    "Ashwagandha":           "Withania somnifera",
    "Shatavari":             "Asparagus racemosus",
    "Amalaki":               "Phyllanthus emblica",
    "Brahmi":                "Bacopa monnieri",
    "Shankhapushpi":         "Convolvulus pluricaulis",
    "Guduchi":               "Tinospora cordifolia",
    "Triphala":              "Triphala",
    "Trikatu":               "Long pepper",
    "Dashamula":             "Aegle marmelos",
    "Haritaki":              "Terminalia chebula",
    "Bibhitaki":             "Terminalia bellirica",
    "Licorice Root (Yashtimadhu)": "Glycyrrhiza glabra",
    "Turmeric (Haridra)":    "Turmeric",
    "Neem (Nimba)":          "Azadirachta indica",
    "Punarnava":             "Boerhavia diffusa",
    "Gokshura (Tribulus)":   "Tribulus terrestris",
    "Manjistha":             "Rubia cordifolia",
    "Vidanga":               "Embelia ribes",
    "Kutki (Picrorhiza)":    "Picrorhiza kurroa",
    "Bhumyamalaki":          "Phyllanthus niruri",
    "Arjuna":                "Terminalia arjuna",
    "Garlic (Lasuna)":       "Garlic",
    "Guggulu":               "Commiphora wightii",
    "Sarpagandha":           "Rauvolfia serpentina",
    "Jatamansi":             "Nardostachys jatamansi",
    "Bala":                  "Sida cordifolia",
    "Chyawanprash":          "Chyawanprash",
    "Shilajit":              "Shilajit",
    "Kanchanar Guggulu":     "Bauhinia variegata",
    "Avipattikar Churna":    "Emblica officinalis",
    "Hingvastak Churna":     "Asafoetida",
    "Sitopaladi Churna":     "Bambusa arundinacea",
    "Talisadi Churna":       "Abies spectabilis",
    "Saraswatarishta":       "Bacopa monnieri",
    "Chandraprabha Vati":    "Shilajit",
    "Mahatriphala Ghrita":   "Ghee",
    "Dashamoolarishta":      "Aegle marmelos",
    "Vasarishta":            "Justicia adhatoda",
    "Kutajarishta":          "Holarrhena pubescens",
    "Bhringraj":             "Eclipta prostrata",
    "Kumari (Aloe Vera)":    "Aloe vera",
    "Karela (Bitter Melon)": "Momordica charantia",
    "Methi (Fenugreek)":     "Fenugreek",
    "Coriander (Dhanyaka)":  "Coriander",
    "Cumin (Jiraka)":        "Cumin",
    "Fennel (Shatapushpa)":  "Fennel",
    "Ginger (Shunthi)":      "Ginger",
    "Cinnamon (Twak)":       "Cinnamon",
    "Cardamom (Ela)":        "Cardamom",
    "Clove (Lavanga)":       "Clove",
    "Black Pepper (Maricha)":"Black pepper",
    "Pippali (Long Pepper)": "Long pepper",
    "Kalonji (Nigella sativa)": "Nigella sativa",
    "Moringa (Shigru)":      "Moringa oleifera",
    "Holy Basil (Tulsi)":    "Ocimum tenuiflorum",
    "Giloy Satva":           "Tinospora cordifolia",
}

UPLOAD_DIR = os.path.join("uploads", "supplements")
USER_AGENT = "DhanvantariSeedScript/1.0 (Ayurveda demo; contact@example.com)"
SSL_CTX = ssl.create_default_context()


def fetch_wiki_image_url(title: str, thumb_size: int = 400) -> str | None:
    """Use Wikipedia API to get the main page image thumbnail URL."""
    params = (
        f"action=query&titles={urllib.parse.quote(title)}"
        f"&prop=pageimages&pithumbsize={thumb_size}&format=json"
    )
    url = f"https://en.wikipedia.org/w/api.php?{params}"
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read().decode())
        pages = data.get("query", {}).get("pages", {})
        for page in pages.values():
            thumb = page.get("thumbnail", {}).get("source")
            if thumb:
                return thumb
    except Exception as e:
        print(f"  [WARN] Wikipedia API failed for '{title}': {e}")
    return None


def download_image(image_url: str, filepath: str) -> bool:
    """Download image using http.client (avoids urllib redirect header stripping)."""
    parsed = urllib.parse.urlparse(image_url)
    try:
        conn = http.client.HTTPSConnection(parsed.hostname, context=SSL_CTX, timeout=30)
        conn.request("GET", parsed.path, headers={
            "User-Agent": "Mozilla/5.0 (compatible; DhanvantariSeed/1.0)",
            "Accept": "image/*",
        })
        resp = conn.getresponse()

        # Follow redirects
        if resp.status in (301, 302, 307, 308):
            location = resp.getheader("Location")
            conn.close()
            if location:
                return download_image(location, filepath)
            return False

        if resp.status != 200:
            print(f"  [WARN] HTTP {resp.status}")
            conn.close()
            return False

        data = resp.read()
        conn.close()

        if len(data) < 1000:
            return False

        with open(filepath, "wb") as f:
            f.write(data)
        return True
    except Exception as e:
        print(f"  [WARN] Download failed: {e}")
        return False


async def main():
    os.makedirs(UPLOAD_DIR, exist_ok=True)

    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Supplement).order_by(Supplement.id))
        supplements = result.scalars().all()

        print(f"Found {len(supplements)} supplements in database.\n")
        success = 0
        skipped = 0
        failed = 0

        for s in supplements:
            # Skip if already has an image
            if s.image_url:
                print(f"  [SKIP] {s.name} — already has image")
                skipped += 1
                continue

            wiki_title = WIKI_TITLES.get(s.name)
            if not wiki_title:
                print(f"  [SKIP] {s.name} — no Wikipedia mapping")
                skipped += 1
                continue

            print(f"  Fetching image for {s.name} ({wiki_title})...", end=" ")

            image_url = fetch_wiki_image_url(wiki_title)
            if not image_url:
                print("no image found on Wikipedia")
                failed += 1
                continue

            # Determine extension from URL
            ext = "jpg"
            lower_url = image_url.lower()
            if ".png" in lower_url:
                ext = "png"
            elif ".webp" in lower_url:
                ext = "webp"

            filename = f"supplement_{s.id}.{ext}"
            filepath = os.path.join(UPLOAD_DIR, filename)

            if download_image(image_url, filepath):
                s.image_url = f"/uploads/supplements/{filename}"
                print(f"OK -> {filename}")
                success += 1
            else:
                print("download failed")
                failed += 1

            # Rate-limit to avoid 429 from Wikimedia CDN
            time.sleep(2.5)

        await db.commit()
        print(f"\nDone! {success} images downloaded, {skipped} skipped, {failed} failed.")


if __name__ == "__main__":
    asyncio.run(main())
