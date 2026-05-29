from collections import deque
from pathlib import Path

from PIL import Image


ASSET_DIR = Path(__file__).resolve().parent.parent / "assets"
PIECES = ("king", "queen", "rook", "bishop", "knight", "pawn")


def is_background_like(pixel):
    r, g, b, _ = pixel
    value = max(r, g, b)
    chroma = value - min(r, g, b)

    # The generated piece sheets use a neutral dark gray backdrop. Keep this
    # conservative and edge-connected so dark fur inside the character survives.
    return value < 125 and chroma < 30


def soften_alpha(image, mask):
    width, height = image.size
    alpha = image.getchannel("A")
    alpha_pixels = alpha.load()

    for y in range(height):
        for x in range(width):
            if mask[y][x]:
                alpha_pixels[x, y] = 0
                continue

            neighbor_background = False
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    nx = x + dx
                    ny = y + dy
                    if 0 <= nx < width and 0 <= ny < height and mask[ny][nx]:
                        neighbor_background = True
                        break
                if neighbor_background:
                    break

            if neighbor_background:
                alpha_pixels[x, y] = min(alpha_pixels[x, y], 210)

    image.putalpha(alpha)


def remove_background(path):
    image = Image.open(path).convert("RGBA")
    width, height = image.size
    pixels = image.load()
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

        if mask[y][x] or not is_background_like(pixels[x, y]):
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

    soften_alpha(image, mask)
    image.save(path)


for piece in PIECES:
    remove_background(ASSET_DIR / f"{piece}.png")
    print(f"Updated {piece}.png")
