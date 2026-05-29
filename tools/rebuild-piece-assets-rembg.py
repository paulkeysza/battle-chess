import colorsys
import os
import shutil
from pathlib import Path

from PIL import Image

os.environ.setdefault("NUMBA_CACHE_DIR", str(Path(__file__).resolve().parent.parent / ".numba-cache"))

from rembg import new_session, remove


ROOT = Path(__file__).resolve().parent.parent
ASSET_DIR = ROOT / "assets"
SOURCE_DIR = Path("C:/Users/paulv/OneDrive/Desktop/BC")
PIECE_FILES = {
    "king": "King.png",
    "queen": "Queen.png",
    "rook": "Rook.png",
    "bishop": "Bishop.png",
    "knight": "Knight.png",
    "pawn": "Pawn.png",
}
CANVAS_SIZE = 1024


def normalize_frame(image):
    image = image.convert("RGBA")
    bbox = image.getbbox()

    if not bbox:
        return Image.new("RGBA", (CANVAS_SIZE, CANVAS_SIZE), (0, 0, 0, 0))

    cropped = image.crop(bbox)
    max_width = round(CANVAS_SIZE * 0.78)
    max_height = round(CANVAS_SIZE * 0.92)
    scale = min(max_width / cropped.width, max_height / cropped.height)
    resized = cropped.resize(
        (round(cropped.width * scale), round(cropped.height * scale)),
        Image.Resampling.LANCZOS,
    )

    output = Image.new("RGBA", (CANVAS_SIZE, CANVAS_SIZE), (0, 0, 0, 0))
    x = (CANVAS_SIZE - resized.width) // 2
    y = CANVAS_SIZE - resized.height - round(CANVAS_SIZE * 0.035)
    output.alpha_composite(resized, (x, y))
    return output


def remove_background(image, session):
    return remove(
        image.convert("RGBA"),
        session=session,
        alpha_matting=True,
        alpha_matting_foreground_threshold=240,
        alpha_matting_background_threshold=16,
        alpha_matting_erode_size=8,
    ).convert("RGBA")


def is_red_armour_pixel(r, g, b, a):
    if a < 24:
        return False

    h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
    red_hue = h <= 0.055 or h >= 0.92
    red_dominant = r > 70 and r > g * 1.18 and r > b * 1.05
    return red_hue and red_dominant and s > 0.28 and v > 0.16


def make_blue_variant(image):
    image = image.copy()
    pixels = image.load()
    width, height = image.size

    for y in range(height):
        for x in range(width):
            r, g, b, a = pixels[x, y]
            if not is_red_armour_pixel(r, g, b, a):
                continue

            _, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
            nr, ng, nb = colorsys.hsv_to_rgb(0.58, min(1, s * 1.05), min(1, v * 1.08))
            pixels[x, y] = (round(nr * 255), round(ng * 255), round(nb * 255), a)

    return image


def main():
    ASSET_DIR.mkdir(exist_ok=True)
    session = new_session("u2net")

    for piece, filename in PIECE_FILES.items():
        source = SOURCE_DIR / filename
        cutout = normalize_frame(remove_background(Image.open(source), session))

        base_destination = ASSET_DIR / f"{piece}.png"
        red_destination = ASSET_DIR / f"piece-red-{piece}-clean.png"
        blue_destination = ASSET_DIR / f"piece-blue-{piece}-clean.png"

        cutout.save(base_destination)
        shutil.copyfile(base_destination, red_destination)
        make_blue_variant(cutout).save(blue_destination)

        print(f"Rebuilt {piece}")


if __name__ == "__main__":
    main()
