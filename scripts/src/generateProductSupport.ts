import axios from 'axios';
import { promises as fs } from 'fs';

// --- Local, file-scoped network canonicalization ---
type Network = 'Mainnet' | 'Testnet' | 'Devnet';

const NETWORK_CANON_MAP: Record<string, Network> = {
  mainnet: 'Mainnet',
  testnet: 'Testnet',
  devnet: 'Devnet',
};
const ALLOWED_NETWORKS = new Set<Network>(['Mainnet', 'Testnet', 'Devnet']);

const canonicalizeNetwork = (s: string): Network | undefined => NETWORK_CANON_MAP[s.toLowerCase()];

// Map SDK chain names to doc-preferred names
const chainNameOverrides: Record<string, string> = {
  Klaytn: 'Kaia',
};

const normalizeChainName = (name: string) => chainNameOverrides[name] || name;

function mergeTestnets(productChains: Record<Network, string[]>) {
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

type GenArgs = {
  product: string;
  url?: string; // single source
  urls?: string[]; // multiple sources
  outputFile: string;
  customChains?: Record<string, string[]>;
  excludeChains?: string[]; // optional: global excludes for this product
  filterUrls?: string[]; // optional: final allowlist sources (e.g., NTT)
  manualAdd?: Record<string, string[]>; // NEW: force-include chains per network at the end
};

export async function generateProductSupport({ product, url, urls, outputFile, customChains, excludeChains, filterUrls, manualAdd }: GenArgs) {
  const exclusionSet = new Set((excludeChains ?? []).map((s) => s.toLowerCase()));

  // -------------------
  // Fetch one or many sources for the main product discovery
  // -------------------
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

  // Aggregated chains across sources (keyed by canonical network)
  const productChains: Record<Network, string[]> = {
    Mainnet: [],
    Testnet: [],
    Devnet: [],
  };

  // Matches tuples like: ["Mainnet", [[ "Ethereum", "0x..." ], ...]]
  const networkBlockRegex = /\[\s*["'](\w+)["']\s*,\s*\[\s*((?:\s*\[[^\]]+\]\s*,?\s*)+)\s*\]\s*\]/gm;

  for (const text of sources) {
    let match;
    while ((match = networkBlockRegex.exec(text)) !== null) {
      const net = canonicalizeNetwork(match[1]);
      if (!net || !ALLOWED_NETWORKS.has(net)) continue;

      const body = match[2];

      // Each entry: ["ChainName","0xAddressOrSomething"]
      const chainRegex = /\[\s*["']([^"']+)["']\s*,\s*["'][^"']+["']\s*\]/g;

      let chainMatch;
      while ((chainMatch = chainRegex.exec(body)) !== null) {
        const originalName = chainMatch[1];
        const normalizedName = normalizeChainName(originalName);

        if (exclusionSet.has(normalizedName.toLowerCase())) continue;

        productChains[net].push(normalizedName);
      }
    }
  }

  // Add any manual chains from config.customChains (legacy behavior for other products)
  if (customChains) {
    for (const netRaw of Object.keys(customChains)) {
      const net = canonicalizeNetwork(netRaw);
      if (!net || !ALLOWED_NETWORKS.has(net)) continue;

      for (const name of customChains[netRaw]) {
        const normalized = normalizeChainName(name);
        if (!exclusionSet.has(normalized.toLowerCase())) {
          productChains[net].push(normalized);
        }
      }
    }
  }

  // Deduplicate early
  for (const net of ALLOWED_NETWORKS) {
    productChains[net] = [...new Set(productChains[net])];
  }

  // Merge Sepolia/Holesky into base (existing behavior)
  mergeTestnets(productChains);

  // Final dedupe after merge
  productChains.Testnet = [...new Set(productChains.Testnet)];

  // -------------------
  // FINAL FILTER (ALLOWLIST): only if filterUrls provided (e.g., for NTT)
  // Keep ONLY chains that also appear in the filter sources. Do not add new ones here.
  // -------------------
  if (filterUrls && filterUrls.length > 0) {
    const filterSources: string[] = [];
    for (const u of filterUrls) {
      const res = await axios.get(u);
      filterSources.push(res.data);
    }

    const allowed: Record<Network, Set<string>> = {
      Mainnet: new Set<string>(),
      Testnet: new Set<string>(),
      Devnet: new Set<string>(),
    };

    for (const text of filterSources) {
      let match;
      while ((match = networkBlockRegex.exec(text)) !== null) {
        const net = canonicalizeNetwork(match[1]);
        if (!net || !ALLOWED_NETWORKS.has(net)) continue;

        const body = match[2];
        const chainRegex = /\[\s*["']([^"']+)["']\s*,\s*["'][^"']+["']\s*\]/g;

        let chainMatch;
        while ((chainMatch = chainRegex.exec(body)) !== null) {
          const normalizedName = normalizeChainName(chainMatch[1]);
          allowed[net].add(normalizedName);
        }
      }
    }

    for (const net of ALLOWED_NETWORKS) {
      productChains[net] = productChains[net].filter((name) => allowed[net].has(name));
    }
  }

  // -------------------
  // MANUAL ADD (FORCE INCLUDE): applied at the very end so it survives allowlist
  // -------------------
  if (manualAdd) {
    for (const netRaw of Object.keys(manualAdd)) {
      const net = canonicalizeNetwork(netRaw);
      if (!net || !ALLOWED_NETWORKS.has(net)) continue;

      const names = manualAdd[netRaw] || [];
      for (const name of names) {
        const normalized = normalizeChainName(name);
        if (!productChains[net].includes(normalized)) {
          productChains[net].push(normalized);
        }
      }
    }
  }

  // Final dedupe (in case manualAdd introduced duplicates)
  for (const net of ALLOWED_NETWORKS) {
    productChains[net] = [...new Set(productChains[net])];
  }

  // Write output
  await fs.mkdir('./src/generated', { recursive: true });
  await fs.writeFile(outputFile, JSON.stringify(productChains, null, 2));
  console.log(`Wrote ${product} support to ${outputFile}`);
}
