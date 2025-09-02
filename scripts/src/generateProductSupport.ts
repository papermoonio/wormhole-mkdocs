import axios from 'axios';
import { promises as fs } from 'fs';

const chainNameOverrides: Record<string, string> = {
  Klaytn: 'Kaia',
};

function mergeTestnets(productChains: Record<string, string[]>) {
  const add = (base: string) => {
    if (!productChains.Testnet.includes(base)) productChains.Testnet.push(base);
  };

  for (const name of [...productChains.Testnet]) {
    if (name.endsWith('Sepolia')) {
      // Strip the suffix → base chain.  "Sepolia" alone maps to "Ethereum".
      const base = name.replace(/Sepolia$/, '') || 'Ethereum';
      add(base);
    } else if (name.endsWith('Holesky')) {
      // Holesky is an Ethereum testnet
      add('Ethereum');
    }
  }
}

export async function generateProductSupport({
  product,
  url,
  urls,
  outputFile,
  customChains,
}: {
  product: string;
  url?: string;
  urls?: string[];
  outputFile: string;
  customChains?: Record<string, string[]>;
}) {
  // --- NEW: fetch one or many sources ---------------------------------------
  const sources: string[] = [];
  if (urls && urls.length > 0) {
    for (const u of urls) {
      const res = await axios.get(u);
      sources.push(res.data);
    }
  } else if (url) {
    const res = await axios.get(url);
    sources.push(res.data);
  } else {
    throw new Error(`No url(s) provided for ${product}`);
  }

  // Holder for aggregated chains across sources
  const productChains: Record<string, string[]> = {
    Mainnet: [],
    Testnet: [],
    Devnet: [],
  };

  // Matches entries like: ["Mainnet", [[ "Ethereum", "0x..." ], ...]]
  const networkBlockRegex = /\[\s*["'](\w+)["']\s*,\s*\[\s*((?:\s*\[[^\]]+\]\s*,?\s*)+)\s*\]\s*\]/gm;

  for (const text of sources) {
    let match;
    while ((match = networkBlockRegex.exec(text)) !== null) {
      const network = match[1];
      const body = match[2];

      const chainRegex = /\[\s*["']([^"']+)["']\s*,\s*["'][^"']+["']\s*\]/g;

      let chainMatch;
      while ((chainMatch = chainRegex.exec(body)) !== null) {
        const originalName = chainMatch[1];
        const normalizedName = chainNameOverrides[originalName] || originalName;

        if (!productChains[network]) productChains[network] = [];
        productChains[network].push(normalizedName);
      }
    }
  }

  // Add any extra manual entries (still works for other products)
  if (customChains) {
    for (const net of Object.keys(customChains)) {
      productChains[net].push(...customChains[net]);
    }
  }

  // Deduplicate per environment
  for (const net of Object.keys(productChains)) {
    productChains[net] = [...new Set(productChains[net])];
  }

  // Merge Sepolia/Holesky into base
  mergeTestnets(productChains);

  // Final dedupe
  productChains.Testnet = [...new Set(productChains.Testnet)];

  try {
    await fs.mkdir('./src/generated', { recursive: true });
    await fs.writeFile(outputFile, JSON.stringify(productChains, null, 2));
    console.log(`Wrote ${product} support to ${outputFile}`);
  } catch (error) {
    console.error(`Failed to write ${product} support to ${outputFile}:`, error);
    throw error;
  }
}
