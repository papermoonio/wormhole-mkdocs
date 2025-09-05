import axios from 'axios';
import { promises as fs } from 'fs';

const chainNameOverrides: Record<string, string> = {
  Klaytn: 'Kaia',
};

const canonicalizeNetwork = (s: string) => {
  const map: Record<string, 'Mainnet' | 'Testnet' | 'Devnet'> = {
    mainnet: 'Mainnet',
    testnet: 'Testnet',
    devnet: 'Devnet',
  };
  return map[s.toLowerCase()] ?? (s as any);
};

function mergeTestnets(productChains: Record<string, string[]>) {
  const add = (base: string) => {
    if (!productChains.Testnet.includes(base)) productChains.Testnet.push(base);
  };

  for (const name of [...productChains.Testnet]) {
    if (name.endsWith('Sepolia')) {
      const base = name.replace(/Sepolia$/, '') || 'Ethereum';
      add(base);
    } else if (name.endsWith('Holesky')) {
      add('Ethereum');
    }
  }
}

export async function generateProductSupport({
  product,
  url, // single source (still supported)
  urls, // multiple sources (new)
  outputFile,
  customChains, // still supported for other products
  excludeChains, // NEW: global excludes for this product
}: {
  product: string;
  url?: string;
  urls?: string[];
  outputFile: string;
  customChains?: Record<string, string[]>;
  excludeChains?: string[];
}) {
  // Build an exclusion set (normalize to lowercase after overrides later)
  const exclusionSet = new Set((excludeChains ?? []).map((s) => s.toLowerCase()));

  // --- fetch one or many sources ---
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

  // Aggregated chains across sources
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
      const net = canonicalizeNetwork(match[1]);
      if (net !== 'Mainnet' && net !== 'Testnet' && net !== 'Devnet') continue;

      if (!productChains[net]) productChains[net] = [];
      const body = match[2];

      // Each element: ["ChainName", "0xAddressOrWhatever"]
      const chainRegex = /\[\s*["']([^"']+)["']\s*,\s*["'][^"']+["']\s*\]/g;

      let chainMatch;
      while ((chainMatch = chainRegex.exec(body)) !== null) {
        const originalName = chainMatch[1];
        const normalizedName = chainNameOverrides[originalName] || originalName;

        // Skip excluded chains (compare post-normalization, case-insensitive)
        if (exclusionSet.has(normalizedName.toLowerCase())) continue;

        productChains[net].push(normalizedName);
      }
    }
  }

  // Add any manual chains (for other products) then apply excludes again
  if (customChains) {
    for (const net of Object.keys(customChains)) {
      if (!productChains[net]) productChains[net] = [];
      for (const name of customChains[net]) {
        if (!exclusionSet.has((chainNameOverrides[name] || name).toLowerCase())) {
          productChains[net].push(chainNameOverrides[name] || name);
        }
      }
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
