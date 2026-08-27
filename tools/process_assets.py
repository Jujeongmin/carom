from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "assets"
OUT.mkdir(parents=True, exist_ok=True)
SRC = Path(r"C:\Users\anjsh\.codex\generated_images\01a0378c-e069-7523-8c4c-2396fc844f88")

CHAR = SRC / "exec-08fa0639-c29a-4a6e-8974-299bf381f039.png"
ROCK = SRC / "exec-92ceaeaa-fb91-4d2a-9dae-23aeb1287023.png"
METAL = SRC / "exec-c46ed8fd-2551-43b8-80ee-cc3038fc3b15.png"
BG = SRC / "exec-f649be29-00e5-4d80-b3a6-e9661fc9e2e8.png"
LOGO = SRC / "exec-b34d4760-1c9f-4605-bf11-ba2a5b13f9c8.png"
COVER = SRC / "exec-2a29262a-3105-404e-97c0-b2ff6b9470f8.png"
ICONS = SRC / "exec-c744965a-d534-4deb-aa9a-a28c0d73f190.png"
APP_ICON = SRC / "exec-f3a9678c-5f6a-42f2-851d-5aac50cb9531.png"
SPLASH = SRC / "exec-c07793ce-0ad4-42a0-b571-01e136302fa4.png"
BOMBS = SRC / "exec-918ce9b8-0158-4181-9d4f-3e74861846ca.png"
PORTAL = SRC / "exec-dad6e977-f7eb-4468-8d3d-ace5c7f515c7.png"
DEADLINE_LOGO = SRC / "exec-99675094-3011-4aa2-b16e-ee38ac5c7c49.png"
CAROM_LOGO = SRC / "exec-acdee6d9-b30b-4f42-b588-a7365bb71345.png"
CAROM_COVER = SRC / "exec-704c4fdd-926f-4610-b490-8b289ce80175.png"


def alpha_fit(cell: Image.Image, size: tuple[int, int], pad: int) -> Image.Image:
    cell = cell.convert("RGBA")
    bbox = cell.getchannel("A").getbbox()
    if bbox is None:
        raise ValueError("empty transparent cell")
    obj = cell.crop(bbox)
    max_w, max_h = size[0] - pad * 2, size[1] - pad * 2
    scale = min(max_w / obj.width, max_h / obj.height)
    resized = obj.resize((max(1, round(obj.width * scale)), max(1, round(obj.height * scale))), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", size, (0, 0, 0, 0))
    canvas.alpha_composite(resized, ((size[0] - resized.width) // 2, (size[1] - resized.height) // 2))
    return canvas


def split_grid(path: Path, cols: int, rows: int):
    im = Image.open(path).convert("RGBA")
    for row in range(rows):
        for col in range(cols):
            x0, x1 = round(col * im.width / cols), round((col + 1) * im.width / cols)
            y0, y1 = round(row * im.height / rows), round((row + 1) * im.height / rows)
            yield im.crop((x0, y0, x1, y1))


def save_sheet(path: Path, cols: int, rows: int, specs):
    cells = list(split_grid(path, cols, rows))
    for cell, (name, size, pad) in zip(cells, specs, strict=True):
        alpha_fit(cell, size, pad).save(OUT / name, optimize=True)


save_sheet(CHAR, 3, 1, [
    ("char_base.png", (256, 256), 12),
    ("char_skin_pulse.png", (256, 256), 12),
    ("char_skin_ember.png", (256, 256), 12),
])
# The generated rock sheet intentionally uses different object diameters, so
# split it at transparent gutters rather than equal-width cells.
rock_im = Image.open(ROCK).convert("RGBA")
rock_spans = [(50, 300), (395, 665), (740, 1220), (1275, 1730)]
for (x0, x1), (name, size, pad) in zip(rock_spans, [
    ("ob_shard_a.png", (128, 128), 8),
    ("ob_shard_b.png", (128, 128), 8),
    ("ob_asteroid_a.png", (256, 256), 10),
    ("ob_asteroid_b.png", (256, 256), 10),
], strict=True):
    alpha_fit(rock_im.crop((x0, 0, x1, rock_im.height)), size, pad).save(OUT / name, optimize=True)
save_sheet(METAL, 2, 1, [
    ("ob_metal_a.png", (256, 256), 8),
    ("ob_metal_b.png", (256, 256), 8),
])
save_sheet(ICONS, 4, 2, [
    ("icon_coin.png", (64, 64), 3), ("icon_energy.png", (64, 64), 3),
    ("icon_shield.png", (64, 64), 3), ("icon_revive.png", (64, 64), 3),
    ("icon_ad.png", (64, 64), 3), ("icon_vx.png", (64, 64), 3),
    ("icon_settings.png", (64, 64), 3), ("icon_rank.png", (64, 64), 3),
])

# Preserve previous titles while promoting the document-requested CAROM logo.
alpha_fit(Image.open(LOGO), (1024, 512), 20).save(OUT / "logo_title_pushwave.png", optimize=True)
alpha_fit(Image.open(DEADLINE_LOGO), (1024, 512), 20).save(OUT / "logo_title_deadline.png", optimize=True)
alpha_fit(Image.open(CAROM_LOGO), (1024, 512), 20).save(OUT / "logo_title.png", optimize=True)

# Second-wave gameplay objects.
save_sheet(BOMBS, 2, 1, [
    ("ob_bomb_a.png", (256, 256), 5),
    ("ob_bomb_b.png", (256, 256), 5),
])
alpha_fit(Image.open(PORTAL), (256, 256), 4).save(OUT / "portal_ring.png", optimize=True)

# Covers: preserve the retired PUSHWAVE scene and promote the CAROM scene.
def save_cover(source: Path, name: str):
    cover = Image.open(source).convert("RGB")
    target_ratio = 16 / 9
    if cover.width / cover.height > target_ratio:
        new_w = round(cover.height * target_ratio)
        left = (cover.width - new_w) // 2
        cover = cover.crop((left, 0, left + new_w, cover.height))
    else:
        new_h = round(cover.width / target_ratio)
        top = (cover.height - new_h) // 2
        cover = cover.crop((0, top, cover.width, top + new_h))
    cover.resize((1280, 720), Image.Resampling.LANCZOS).save(OUT / name, optimize=True)

save_cover(COVER, "cover_store_pushwave.png")
save_cover(CAROM_COVER, "cover_store.png")

# Vertical seamless tile: move the original boundary to the center, then feather it.
bg = Image.open(BG).convert("RGB").resize((540, 960), Image.Resampling.LANCZOS)
half = bg.height // 2
shifted = Image.new("RGB", bg.size)
shifted.paste(bg.crop((0, half, bg.width, bg.height)), (0, 0))
shifted.paste(bg.crop((0, 0, bg.width, half)), (0, bg.height - half))
band = 96
for y in range(half - band, half + band):
    t = (y - (half - band)) / (2 * band - 1)
    a = bg.crop((0, y, bg.width, y + 1))
    b_y = (y + half) % bg.height
    b = bg.crop((0, b_y, bg.width, b_y + 1))
    shifted.paste(Image.blend(a, b, t), (0, y))
shifted.save(OUT / "bg_space_tile.png", optimize=True)

# Additional launch/distribution assets. Keep the icon square without applying
# rounded corners; each target platform supplies its own mask.
app_icon = Image.open(APP_ICON).convert("RGB")
side = min(app_icon.size)
left = (app_icon.width - side) // 2
top = (app_icon.height - side) // 2
app_icon = app_icon.crop((left, top, left + side, top + side))
for name, size in [
    ("app_icon_1024.png", 1024),
    ("app_icon_512.png", 512),
    ("app_icon_192.png", 192),
    ("apple_touch_icon.png", 180),
    ("favicon_64.png", 64),
    ("favicon_32.png", 32),
]:
    app_icon.resize((size, size), Image.Resampling.LANCZOS).save(OUT / name, optimize=True)

splash = Image.open(SPLASH).convert("RGB")
target_ratio = 1080 / 1920
if splash.width / splash.height > target_ratio:
    new_w = round(splash.height * target_ratio)
    x = (splash.width - new_w) // 2
    splash = splash.crop((x, 0, x + new_w, splash.height))
else:
    new_h = round(splash.width / target_ratio)
    y = (splash.height - new_h) // 2
    splash = splash.crop((0, y, splash.width, y + new_h))
splash.resize((1080, 1920), Image.Resampling.LANCZOS).save(OUT / "splash_portrait.png", optimize=True)

# Small-size QA contact sheet.
qa = Image.new("RGB", (640, 520), "#0a0a1a")
draw = ImageDraw.Draw(qa)
draw.text((16, 12), "CAROM asset QA: gameplay sizes", fill="#ffffff")
x = 20
for name in ["char_base.png", "char_skin_pulse.png", "char_skin_ember.png"]:
    im = Image.open(OUT / name).convert("RGBA").resize((36, 36), Image.Resampling.LANCZOS)
    qa.paste(im, (x, 50), im); x += 54
x = 20
for name in ["ob_shard_a.png", "ob_shard_b.png", "ob_asteroid_a.png", "ob_asteroid_b.png", "ob_metal_a.png", "ob_metal_b.png"]:
    im = Image.open(OUT / name).convert("RGBA").resize((48 if "asteroid" in name else 24, 48 if "asteroid" in name else 24), Image.Resampling.LANCZOS)
    qa.paste(im, (x, 112), im); x += 70
x = 20
for name, size in [("ob_bomb_a.png", 42), ("ob_bomb_b.png", 42), ("portal_ring.png", 60)]:
    im = Image.open(OUT / name).convert("RGBA").resize((size, size), Image.Resampling.LANCZOS)
    qa.paste(im, (x, 188), im); x += 84
x, y = 20, 280
for i, name in enumerate(["icon_coin.png", "icon_energy.png", "icon_shield.png", "icon_revive.png", "icon_ad.png", "icon_vx.png", "icon_settings.png", "icon_rank.png"]):
    im = Image.open(OUT / name).convert("RGBA")
    qa.paste(im, (x, y), im)
    x += 76
    if i == 3: x, y = 20, 366
qa.save(ROOT / "docs" / "asset-qa-contact-sheet.png", optimize=True)

print(f"Wrote assets to {OUT}")
