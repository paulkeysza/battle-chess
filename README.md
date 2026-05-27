# Thunder Pride Battle Chess

A browser-based 3D battle chess prototype with original thunder-feline fantasy pieces and animated capture duels.

## What's included

- `index.html` - app shell and HUD
- `styles.css` - responsive arena layout
- `script.js` - Three.js scene, chess movement, picking, camera controls, and capture animations
- `assets/` - legacy SVG assets from the earlier 2D version

## Run locally

This uses an ES module import for Three.js, so serve the folder instead of opening the file directly:

```powershell
python -m http.server 5173
```

Then open:

```text
http://localhost:5173
```

## Controls

- Click a piece to select it.
- Click a highlighted square to move or capture.
- Drag the arena horizontally to orbit the camera.
- Use `Camera` to cycle board views.
- Use `Reset` to restart the match.
- Use `Sound On` / `Sound Off` to toggle synthesized move and battle effects.

## Artwork and inspiration

The characters are original thunder-feline chess archetypes. They aim for a theatrical animated-chess feeling without copying Battle Chess or ThunderCats characters, names, or artwork.
