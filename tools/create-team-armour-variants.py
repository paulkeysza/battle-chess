import colorsys
import shutil
from pathlib import Path

from PIL import Image


ASSET_DIR = Path(__file__).resolve().parent.parent / "assets"
PIECES = ("king", "queen", "rook", "bishop", "knight", "pawn")


def is_red_armour_pixel(r, g, b, a):
    if a < 12:
        return False

    h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
    red_hue = h <= 0.055 or h >= 0.92
    red_dominant = r > 70 and r > g * 1.18 and r > b * 1.05

    return red_hue and red_dominant and s > 0.28 and v > 0.16


def make_blue_variant(source, destination):
    image = Image.open(source).convert("RGBA")
    pixels = image.load()
    width, height = image.size

    for y in range(height):
        for x in range(width):
            r, g, b, a = pixels[x, y]

            if not is_red_armour_pixel(r, g, b, a):
                continue

            _, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
            nr, ng, nb = colorsys.hsv_to_rgb(0.58, min(1, s * 1.08), min(1, v * 1.08))
            pixels[x, y] = (round(nr * 255), round(ng * 255), round(nb * 255), a)

    image.save(destination)


def main():
    for piece in PIECES:
        source = ASSET_DIR / f"{piece}.png"
        red_destination = ASSET_DIR / f"red-{piece}.png"
        blue_destination = ASSET_DIR / f"blue-{piece}.png"

        shutil.copyfile(source, red_destination)
        make_blue_variant(source, blue_destination)

        print(f"Created red-{piece}.png and blue-{piece}.png")


if __name__ == "__main__":
    main()
