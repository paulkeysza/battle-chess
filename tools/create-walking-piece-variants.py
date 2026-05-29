import colorsys
from pathlib import Path

from PIL import Image


ASSET_DIR = Path(__file__).resolve().parent.parent / "assets"
TEAMS = ("blue", "red")
PIECES = ("king", "queen", "rook", "bishop", "knight", "pawn")


def is_pedestal_pixel(r, g, b, a):
    if a < 16:
        return False

    h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
    brass = 0.08 <= h <= 0.18 and s > 0.12 and v > 0.18
    dark_brass_shadow = 0.06 <= h <= 0.2 and s > 0.08 and 0.12 < v < 0.42
    neutral_stand_shadow = s < 0.16 and 0.16 < v < 0.55

    return brass or dark_brass_shadow or neutral_stand_shadow


def create_walking_variant(source, destination):
    image = Image.open(source).convert("RGBA")
    pixels = image.load()
    width, height = image.size
    bbox = image.getbbox()

    if not bbox:
        image.save(destination)
        return

    _, _, _, bottom = bbox
    pedestal_top = round(bottom - height * 0.16)
    fade_band = max(8, round(height * 0.025))

    for y in range(max(0, pedestal_top - fade_band), bottom):
        fade = min(1, max(0, (y - (pedestal_top - fade_band)) / fade_band))

        for x in range(width):
            r, g, b, a = pixels[x, y]

            if y >= pedestal_top and is_pedestal_pixel(r, g, b, a):
                pixels[x, y] = (r, g, b, 0)
            elif is_pedestal_pixel(r, g, b, a):
                pixels[x, y] = (r, g, b, round(a * (1 - fade * 0.72)))

    image.save(destination)


def main():
    for team in TEAMS:
        for piece in PIECES:
            source = ASSET_DIR / f"{team}-{piece}.png"
            destination = ASSET_DIR / f"{team}-{piece}-walk.png"
            create_walking_variant(source, destination)
            print(f"Created {destination.name}")


if __name__ == "__main__":
    main()
