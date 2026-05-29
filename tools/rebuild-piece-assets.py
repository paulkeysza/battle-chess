import colorsys
import shutil
from collections import deque
from pathlib import Path

from PIL import Image, ImageFilter


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


def color_distance(left, right):
    return sum((left[index] - right[index]) ** 2 for index in range(3)) ** 0.5


def backdrop_color(image):
    width, height = image.size
    samples = []

    for x, y in (
        (0, 0),
        (width - 1, 0),
        (0, height - 1),
        (width - 1, height - 1),
        (width // 2, 0),
        (width // 2, height - 1),
    ):
        samples.append(image.getpixel((x, y))[:3])

    return tuple(round(sum(pixel[index] for pixel in samples) / len(samples)) for index in range(3))


def polish_alpha(image):
    image = image.convert("RGBA")
    alpha = image.getchannel("A")
    alpha = alpha.point(lambda value: 0 if value < 24 else 255 if value > 232 else value)
    image.putalpha(alpha)
    return image


def remove_studio_background(image):
    image = image.convert("RGBA")
    width, height = image.size
    pixels = image.load()
    background = backdrop_color(image)
    mask = [[False for _ in range(width)] for _ in range(height)]
    queue = deque()

    for x in range(width):
        queue.append((x, 0))
        queue.append((x, height - 1))

    for y in range(height):
        queue.append((0, y))
        queue.append((width - 1, y))

    while queue:
        x, y = queue.popleft()

        if mask[y][x]:
            continue

        r, g, b, _ = pixels[x, y]
        if color_distance((r, g, b), background) > 68:
            continue

        mask[y][x] = True

        if x > 0:
            queue.append((x - 1, y))
        if x < width - 1:
            queue.append((x + 1, y))
        if y > 0:
            queue.append((x, y - 1))
        if y < height - 1:
            queue.append((x, y + 1))

    alpha = image.getchannel("A")
    alpha_pixels = alpha.load()

    for y in range(height):
        for x in range(width):
            r, g, b, _ = pixels[x, y]
            if mask[y][x] or color_distance((r, g, b), background) < 36:
                alpha_pixels[x, y] = 0

    image.putalpha(alpha.filter(ImageFilter.GaussianBlur(radius=0.55)))
    return polish_alpha(image)


def normalize_frame(image):
    bbox = image.getbbox()
    if not bbox:
        return Image.new("RGBA", (CANVAS_SIZE, CANVAS_SIZE), (0, 0, 0, 0))

    cropped = image.crop(bbox)
    max_width = round(CANVAS_SIZE * 0.74)
    max_height = round(CANVAS_SIZE * 0.9)
    scale = min(max_width / cropped.width, max_height / cropped.height)
    resized = cropped.resize(
        (round(cropped.width * scale), round(cropped.height * scale)),
        Image.Resampling.LANCZOS,
    )
    output = Image.new("RGBA", (CANVAS_SIZE, CANVAS_SIZE), (0, 0, 0, 0))
    x = (CANVAS_SIZE - resized.width) // 2
    y = CANVAS_SIZE - resized.height - round(CANVAS_SIZE * 0.045)
    output.alpha_composite(resized, (x, y))
    return polish_alpha(output)


def is_red_armour_pixel(r, g, b, a):
    if a < 16:
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
            nr, ng, nb = colorsys.hsv_to_rgb(0.58, min(1, s * 1.04), min(1, v * 1.08))
            pixels[x, y] = (round(nr * 255), round(ng * 255), round(nb * 255), a)

    return image


def main():
    ASSET_DIR.mkdir(exist_ok=True)

    for piece, filename in PIECE_FILES.items():
        source = SOURCE_DIR / filename
        cleaned = normalize_frame(remove_studio_background(Image.open(source)))
        base_destination = ASSET_DIR / f"{piece}.png"
        red_destination = ASSET_DIR / f"red-{piece}.png"
        blue_destination = ASSET_DIR / f"blue-{piece}.png"

        cleaned.save(base_destination)
        shutil.copyfile(base_destination, red_destination)
        make_blue_variant(cleaned).save(blue_destination)

        for team in ("red", "blue"):
            idle = Image.open(ASSET_DIR / f"{team}-{piece}.png").convert("RGBA")
            idle.save(ASSET_DIR / f"{team}-{piece}-walk.png")

        print(f"Rebuilt {piece}")


if __name__ == "__main__":
    main()
