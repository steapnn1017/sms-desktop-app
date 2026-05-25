# Resources

Place your app icons here:

- `icon.ico` — Windows app icon (256x256 recommended, ICO format)
- `icon.png` — Linux app icon (512x512 PNG)
- `icon.icns` — macOS app icon (ICNS format)

## Quick icon generation

You can use tools like:
- https://www.icoconverter.com/ — PNG to ICO
- https://cloudconvert.com/png-to-icns — PNG to ICNS

Or use ImageMagick:
```bash
convert icon.png -resize 256x256 icon.ico
```

For development, a placeholder icon is sufficient. The app will use a system default if no icon is found.
