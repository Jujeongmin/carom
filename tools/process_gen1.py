from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
STORE = ROOT / "docs" / "store-assets"
PUBLIC = ROOT / "public" / "assets"
SOURCE = Path(r"C:\Users\anjsh\.codex\generated_images\01a0378c-e069-7523-8c4c-2396fc844f88\exec-0870608c-64fc-43aa-9a68-54f36e0481d1.png")
NAMES = ["char_base", "char_skin_pulse", "char_skin_ember"]


def fit(cell: Image.Image) -> Image.Image:
    cell = cell.convert("RGBA")
    bbox = cell.getchannel("A").getbbox()
    if bbox is None:
        raise ValueError("empty GEN-1 cell")
    obj = cell.crop(bbox)
    obj.thumbnail((240, 240), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (256, 256), (0, 0, 0, 0))
    canvas.alpha_composite(obj, ((256 - obj.width) // 2, (256 - obj.height) // 2))
    return canvas


sheet = Image.open(SOURCE).convert("RGBA")
for index, name in enumerate(NAMES):
    x0 = round(index * sheet.width / 3)
    x1 = round((index + 1) * sheet.width / 3)
    final = fit(sheet.crop((x0, 0, x1, sheet.height)))
    current = STORE / f"{name}.png"
    backup = STORE / f"{name}_previous.png"
    if current.exists() and not backup.exists():
        backup.write_bytes(current.read_bytes())
    final.save(current, optimize=True)
    final.save(PUBLIC / f"{name}.webp", "WEBP", quality=88, method=6)

qa = Image.new("RGB", (180, 64), "#0a0a1a")
for index, name in enumerate(NAMES):
    sprite = Image.open(STORE / f"{name}.png").convert("RGBA").resize((36, 36), Image.Resampling.LANCZOS)
    qa.paste(sprite, (14 + index * 56, 14), sprite)
qa.save(STORE / "gen1_36px_qa.png", optimize=True)

print("GEN-1 saved as PNG originals and optimized WebP runtime assets")
