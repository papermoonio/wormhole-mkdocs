import { CHAINS } from "@certusone/wormhole-sdk";
import { encoding, toChain } from "@wormhole-foundation/sdk";
import { chainToIcon } from "@wormhole-foundation/sdk-icons";
import * as fs from "fs";
import path from "path";
import sharp from "sharp";

const WEBP_OUTPUT_PATH = path.join(__dirname, '../..', 'wormhole-docs/images/build/start-building/supported-networks');
console.log(WEBP_OUTPUT_PATH)
const prefix = "data:image/svg+xml;base64,";

for (const [name, chainId] of Object.entries(CHAINS)) {
  if (chainId === 0) continue;

  // Define the output path for the WebP image
  const webpFilePath = `${WEBP_OUTPUT_PATH}/${name}.webp`;

  // Check if the WebP file already exists
  if (fs.existsSync(webpFilePath)) {
    console.log(`WebP icon for ${name} already exists. Skipping...`);
    continue; // Skip if the WebP file already exists
  }

  // Decode SVG from base64
  const svg = encoding.bytes.decode(
    encoding.b64.decode(chainToIcon(toChain(chainId)).slice(prefix.length))
  );

  // Convert SVG to WebP using sharp
  sharp(Buffer.from(svg))
    .webp()
    .toFile(webpFilePath)
    .then(() => {
      console.log(`Successfully converted ${name}.svg to WebP.`);
    })
    .catch((err) => {
      console.error(`Failed to convert ${name}.svg to WebP:`, err);
    });
}