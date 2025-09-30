import { promises as fs } from 'fs';
import { extractArrayAfterConst, stripCommentsPreserveStrings, toJsonArray } from './utils/parsing.ts';
import { fetchText } from './utils/http.ts';

// -------------------- Networks + helpers --------------------
type Network = 'Mainnet' | 'Testnet' | 'Devnet';
const NETWORKS: Network[] = ['Mainnet', 'Testnet', 'Devnet'];
const NETWORK_CANON_MAP: Record<string, Network> = {
  mainnet: 'Mainnet',
  mainnets: 'Mainnet',
  testnet: 'Testnet',
  testnets: 'Testnet',
  devnet: 'Devnet',
  devnets: 'Devnet',
};

const canonicalizeNetwork = (s: string): Network | undefined => NETWORK_CANON_MAP[s.toLowerCase()];

function createEmptyNetworkRecord<T>(init: () => T): Record<Network, T> {
  return { Mainnet: init(), Testnet: init(), Devnet: init() };
}

// -------------------- Chain normalization --------------------
const chainNameOverrides: Record<string, string> = { Klaytn: 'Kaia' };
const normalizeChainName = (name: string) => chainNameOverrides[name] || name;

// -------------------- Main logic --------------------
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
  url?: string;
  urls?: string[];
  consts?: string[];
  outputFile: string;
  customChains?: Record<string, string[]>;
  excludeChains?: string[];
  filterUrls?: string[]; // optional: final allowlist sources
  filterConsts?: string[]; // optional: target constants in allowlist sources
  manualAdd?: Record<string, string[]>; // optional: force include at end
};

function pickConstCandidates(product: string): string[] {
  // Heuristics by product; add more if you need
  if (product.toUpperCase() === 'CCTP') return ['usdcContracts'];
  if (product.toUpperCase() === 'NTT') return ['relayerContracts', 'executorContracts'];
  // default: any "*Contracts" is acceptable
  return ['relayerContracts', 'executorContracts', 'coreBridgeContracts', 'tokenBridgeContracts', 'usdcContracts'];
}

function parseContractsArray(rawSource: string, product: string, preferredConsts?: string[]): Array<[string, Array<[string, unknown]>]> {
  const srcNoComments = stripCommentsPreserveStrings(rawSource);
  const candidates = preferredConsts?.length ? preferredConsts : pickConstCandidates(product);
  let arrayText: string | undefined;
  for (const name of candidates) {
    arrayText = extractArrayAfterConst(srcNoComments, name);
    if (arrayText) break;
  }
  if (!arrayText) return [];
  try {
    return toJsonArray(arrayText);
  } catch {
    return [];
  }
}

export async function generateProductSupport(args: GenArgs) {
  const { outputFile, product, url, urls, consts, filterUrls, filterConsts, excludeChains, customChains, manualAdd } = args;
  const exclusionSet = new Set((excludeChains ?? []).map((s) => s.toLowerCase()));
  const productChains = createEmptyNetworkRecord<string[]>(() => []);

  // ---- 1) Fetch sources and parse only the target constant array
  const allSources: string[] = [];
  if (urls?.length) {
    for (const u of urls) allSources.push(await fetchText(u));
  } else if (url) {
    allSources.push(await fetchText(url));
  } else {
    throw new Error(`No url(s) provided for ${product}`);
  }

  for (const src of allSources) {
    const entries = parseContractsArray(src, product, consts);
    for (const [netRaw, pairs] of entries) {
      const net = canonicalizeNetwork(String(netRaw));
      if (!net || !Array.isArray(pairs)) continue;
      for (const item of pairs) {
        if (!Array.isArray(item) || item.length < 2) continue;
        const chain = normalizeChainName(String(item[0]));
        if (exclusionSet.has(chain.toLowerCase())) continue;
        productChains[net].push(chain);
      }
    }
  }

  // ---- 2) Legacy customChains (other products)
  if (customChains) {
    for (const netRaw of Object.keys(customChains)) {
      const net = canonicalizeNetwork(netRaw);
      if (!net) continue;
      for (const name of customChains[netRaw]) {
        const chain = normalizeChainName(name);
        if (!exclusionSet.has(chain.toLowerCase())) productChains[net].push(chain);
      }
    }
  }

  // ---- 3) Dedup + merge testnet bases
  for (const n of NETWORKS) productChains[n] = [...new Set(productChains[n])];
  mergeTestnets(productChains);
  productChains.Testnet = [...new Set(productChains.Testnet)];

  // ---- 4) Final allowlist (filterUrls): keep-only what appears in those files
  if (filterUrls?.length) {
    const allowed = createEmptyNetworkRecord<Set<string>>(() => new Set<string>());
    for (const u of filterUrls) {
      const raw = await fetchText(u);
      const entries = parseContractsArray(raw, product, filterConsts);
      if (!entries.length) {
        console.warn(`[${product}] No filter const(s) ${filterConsts?.join(', ')} found in ${u}; ignoring this file for allow-list.`);
        continue;
      } else {
        for (const [netRaw, pairs] of entries) {
          const net = canonicalizeNetwork(String(netRaw));
          if (!net) continue;
          for (const item of pairs || []) {
            if (!Array.isArray(item) || item.length < 2) continue;
            allowed[net].add(normalizeChainName(String(item[0])));
          }
        }
      }
    }
    for (const n of NETWORKS) {
      productChains[n] = productChains[n].filter((name) => allowed[n].has(name));
    }
  }

  // ---- 5) Manual additions (force include at the end)
  if (manualAdd) {
    for (const netRaw of Object.keys(manualAdd)) {
      const net = canonicalizeNetwork(netRaw);
      if (!net) continue;
      for (const name of manualAdd[netRaw] || []) {
        const chain = normalizeChainName(name);
        if (!productChains[net].includes(chain)) productChains[net].push(chain);
      }
    }
  }

  // ---- 6) Final dedupe + write
  for (const n of NETWORKS) productChains[n] = [...new Set(productChains[n])];

  await fs.mkdir('./src/generated', { recursive: true });
  await fs.writeFile(outputFile, JSON.stringify(productChains, null, 2));
  console.log(`[${product}] wrote -> ${outputFile}`);
}
