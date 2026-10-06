import sharp from "sharp";
import { stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const currentDir = dirname(fileURLToPath(import.meta.url));
const workspace = resolve(currentDir, "../..");
const logo = resolve(workspace, "app/assets/swingers-world.png");
const emblem = resolve(workspace, "app/assets/Luxurious Gold W Globe Emblem.png");
const background = resolve(workspace, "play-store/source/feature-background.png");
const iconOutput = resolve(workspace, "play-store/assets/swingers-world-icon-512.png");
const symbolOutput = resolve(workspace, "play-store/assets/swingers-world-icon-symbol-512.png");
const graphicOutput = resolve(workspace, "play-store/assets/swingers-world-feature-es-1024x500.png");
const graphicEnOutput = resolve(workspace, "play-store/assets/swingers-world-feature-en-1024x500.png");

// The source app icon has white exterior corners. Replace only the near-white
// region connected to the canvas edges; Google Play applies its own mask.
async function makeStoreIcon(input, output) {
  const { data: pixels, info } = await sharp(input)
    .resize(512, 512, { fit: "cover" })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const seen = new Uint8Array(info.width * info.height);
  const queue = [];
  const isExterior = (pixel) => {
    const i = pixel * 4;
    const red = pixels[i];
    const green = pixels[i + 1];
    const blue = pixels[i + 2];
    return red > 165 && green > 165 && blue > 165 && Math.max(red, green, blue) - Math.min(red, green, blue) < 30;
  };
  for (let x = 0; x < info.width; x++) queue.push(x, (info.height - 1) * info.width + x);
  for (let y = 0; y < info.height; y++) queue.push(y * info.width, y * info.width + info.width - 1);
  for (let head = 0; head < queue.length; head++) {
    const pixel = queue[head];
    if (seen[pixel] || !isExterior(pixel)) continue;
    seen[pixel] = 1;
    const i = pixel * 4;
    pixels[i] = 18;
    pixels[i + 1] = 9;
    pixels[i + 2] = 20;
    const x = pixel % info.width;
    const y = Math.floor(pixel / info.width);
    if (x > 0) queue.push(pixel - 1);
    if (x + 1 < info.width) queue.push(pixel + 1);
    if (y > 0) queue.push(pixel - info.width);
    if (y + 1 < info.height) queue.push(pixel + info.width);
  }
  await sharp(pixels, { raw: { width: 512, height: 512, channels: 4 } })
    .png({ compressionLevel: 9, palette: false, effort: 10 })
    .toFile(output);
}

await makeStoreIcon(logo, iconOutput);
await makeStoreIcon(emblem, symbolOutput);

const lettering = Buffer.from(`
<svg width="1024" height="500" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="shade" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#0c0710" stop-opacity=".92" />
      <stop offset=".54" stop-color="#0c0710" stop-opacity=".30" />
      <stop offset="1" stop-color="#0c0710" stop-opacity="0" />
    </linearGradient>
  </defs>
  <rect width="1024" height="500" fill="url(#shade)" />
  <text x="70" y="214" fill="#ffe2aa" font-family="Georgia, 'Times New Roman', serif" font-size="86" font-weight="bold" letter-spacing="-3">Swingers</text>
  <text x="72" y="303" fill="#ffe2aa" font-family="Georgia, 'Times New Roman', serif" font-size="86" font-weight="bold" letter-spacing="-3">World</text>
  <rect x="75" y="341" width="62" height="4" rx="2" fill="#f42b86" />
  <text x="74" y="391" fill="#f7e8e9" font-family="Arial, sans-serif" font-size="23" font-weight="bold" letter-spacing="2">CONECTÁ A TU MANERA</text>
</svg>`);

await sharp(background)
  .resize(1024, 500, { fit: "cover", position: "centre" })
  .composite([{ input: lettering, blend: "over" }])
  .png({ compressionLevel: 9 })
  .toFile(graphicOutput);

const letteringEn = Buffer.from(`
<svg width="1024" height="500" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="shade" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#0c0710" stop-opacity=".92" />
      <stop offset=".54" stop-color="#0c0710" stop-opacity=".30" />
      <stop offset="1" stop-color="#0c0710" stop-opacity="0" />
    </linearGradient>
  </defs>
  <rect width="1024" height="500" fill="url(#shade)" />
  <text x="70" y="214" fill="#ffe2aa" font-family="Georgia, 'Times New Roman', serif" font-size="86" font-weight="bold" letter-spacing="-3">Swingers</text>
  <text x="72" y="303" fill="#ffe2aa" font-family="Georgia, 'Times New Roman', serif" font-size="86" font-weight="bold" letter-spacing="-3">World</text>
  <rect x="75" y="341" width="62" height="4" rx="2" fill="#f42b86" />
  <text x="74" y="391" fill="#f7e8e9" font-family="Arial, sans-serif" font-size="23" font-weight="bold" letter-spacing="2">CONNECT YOUR WAY</text>
</svg>`);

await sharp(background)
  .resize(1024, 500, { fit: "cover", position: "centre" })
  .composite([{ input: letteringEn, blend: "over" }])
  .png({ compressionLevel: 9 })
  .toFile(graphicEnOutput);

for (const path of [iconOutput, symbolOutput, graphicOutput, graphicEnOutput]) {
  const info = await sharp(path).metadata();
  const file = await stat(path);
  console.log(`${path}: ${info.width}x${info.height}, ${file.size} bytes`);
}
