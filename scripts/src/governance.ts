import { readFile } from 'fs/promises';
import { fetchText } from './utils/http';
import { buildHTMLTable, formatHTMLTable, makePrioritizedAlphaCompare } from './util';

type GeneralPurposeGovernance = { address: string; chainId: number };
type ContractsJson = {
  GeneralPurposeGovernances: GeneralPurposeGovernance[];
};

type ChainsJson = {
  chains: Array<{
    description: string;
    chainId: number;
  }>;
};

type ContractsConfig = {
  sources: {
    ntt_testnet: {
      contracts_url: string;
      chains_url: string;
    };
  };
};

// --- Load local config (scripts/src/config/contracts-config.json) ---
async function loadContractsConfig(): Promise<ContractsConfig> {
  const url = new URL('./config/contracts-config.json', import.meta.url);
  const raw = await readFile(url, 'utf8');
  const cfg = JSON.parse(raw) as ContractsConfig;
  if (!cfg?.sources?.ntt_testnet?.contracts_url || !cfg?.sources?.ntt_testnet?.chains_url) {
    throw new Error('governance: invalid contracts-config.json (missing sources.ntt_testnet URLs)');
  }
  return cfg;
}

export async function generateGovernanceTestnetTable(): Promise<string> {
  // Use URLs from local JSON config
  const cfg = await loadContractsConfig();
  const { contracts_url, chains_url } = cfg.sources.ntt_testnet;

  const [contractsRaw, chainsRaw] = await Promise.all([fetchText(contracts_url), fetchText(chains_url)]);

  const contracts = JSON.parse(contractsRaw) as ContractsJson;
  const chains = JSON.parse(chainsRaw) as ChainsJson;

  // Map chainId -> display name (with overrides)
  const idToName = new Map<number, string>();
  const overrides: Record<string, string> = {
    'Sepolia': 'Ethereum Sepolia',
    'XRPL EVM Testnet': 'XRPL-EVM',
  };

  for (const c of chains.chains) {
    const name = overrides[c.description] ?? c.description;
    idToName.set(c.chainId, name);
  }

  // Build rows just for GeneralPurposeGovernances
  const rows: Array<{ name: string; address: string }> = [];
  for (const g of contracts.GeneralPurposeGovernances) {
    const name = idToName.get(g.chainId);
    if (!name) continue; // ignore any ids not in chains.json
    rows.push({ name, address: g.address });
  }

  // De-dupe and sort (if any duplicates slip in)
  const seen = new Set<string>();
  const compareName = makePrioritizedAlphaCompare(['Ethereum Sepolia']);

  const uniqueSorted = rows
    .filter((r) => {
      const k = `${r.name}:${r.address.toLowerCase()}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .sort((a, b) => {
      const n = compareName(a.name, b.name); // Ethereum Sepolia first, then A–Z
      if (n !== 0) return n;
      // stable tie-breaker
      return a.address.toLowerCase().localeCompare(b.address.toLowerCase());
    });

  const tableHeader = `
  <thead>
    <th>Chain Name</th>
    <th>Contract Address</th>
  </thead>`;

  const body = uniqueSorted
    .map(
      (r) => `\
<tr>
  <td>${r.name}</td>
  <td><code>${r.address}</code></td>
</tr>`,
    )
    .join('\n');

  return formatHTMLTable(buildHTMLTable(tableHeader, body));
}
