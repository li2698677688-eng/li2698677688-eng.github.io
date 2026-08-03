from pathlib import Path

from PIL import Image, ImageFilter


ROOT = Path(__file__).resolve().parent.parent
POSTER_DIRECTORY = ROOT / "home-v2" / "spline-posters"
SOURCE_DIRECTORY = ROOT / "artifacts" / "spline-transparent-sources"
POSTERS = (
    ("game-console", SOURCE_DIRECTORY / "game-console.png", 7),
    ("modite-console", SOURCE_DIRECTORY / "modite-console.png", 25),
)


def build_poster(stem: str, source_path: Path, mask_filter_size: int) -> None:
    with Image.open(source_path) as source:
        image = source.convert("RGBA")
        alpha = image.getchannel("A")
        if alpha.getextrema() != (0, 255):
            raise ValueError(f"{source_path} does not contain a complete alpha mask")

        poster_path = POSTER_DIRECTORY / f"{stem}.webp"
        image.save(poster_path, "WEBP", quality=73, method=6)

        fitted_alpha = alpha.filter(ImageFilter.MinFilter(mask_filter_size))
        mask = Image.new("RGBA", image.size, (255, 255, 255, 0))
        mask.putalpha(fitted_alpha)
        mask_path = POSTER_DIRECTORY / f"{stem}-mask.png"
        mask.save(mask_path, "PNG", optimize=True)

        print(f"{poster_path.relative_to(ROOT)}: {poster_path.stat().st_size} bytes")
        print(f"{mask_path.relative_to(ROOT)}: {mask_path.stat().st_size} bytes")


POSTER_DIRECTORY.mkdir(parents=True, exist_ok=True)
for poster_stem, poster_source, poster_mask_filter_size in POSTERS:
    build_poster(poster_stem, poster_source, poster_mask_filter_size)
