import {
  wormhole,
  nativeChainIds,
  chain,
  chainToPlatform,
  Platform,
  getContracts,
  chainToChainId,
  Contracts,
  Chain,
} from '@wormhole-foundation/sdk';
import fs from 'fs';

// Many chains have the same underlying runtime
export type ChainType =
  | 'EVM'
  | 'SVM'
  | 'CosmWasm'
  | 'Sui Move VM'
  | 'Move VM'
  | 'AVM'
  | 'NEAR VM'
  | 'BTC'
  | '';

export type DocChain = {
  chainType: ChainType; // Chain type
  mainnet: ChainDetails; // MainNet details
  testnets: ChainDetails[]; // TestNet details
  devnets: ChainDetails[]; // DevNet details
};

export type ChainDetails = {
  name: string; // Chain name
  id: number; // Chain ID
  contracts: Contracts; // Contracts
  extraDetails?: ExtraDetails;
};

export interface Finality {
  // Url to get more details about finality/commitment
  details?: string;
  confirmed?: number;
  finalized?: number;
  instant?: number;
  safe?: number;
  otherwise?: string;
}

export interface SiteDescription {
  url: string;
  description?: string;
}

export interface NetworkDescription {
  name: string;
  id: string;
}

export interface Faucet {
  url?: string;
  description?: string;
  token?: string;
}

export interface ExtraDetails {
  [x: string]: any;
  notes?: string[];
  finality?: Finality;
  title?: string; // title case name of the chain
  homepage?: string; // Url to the homepage of the chain
  explorer?: SiteDescription[]; // urls to explorer sites
  devDocs?: string;
  faucet?: Faucet;
  contractSource?: string; // url to core contract
  examples?: SiteDescription[];
  testnet?: NetworkDescription;
  mainnet?: NetworkDescription;
}

export function networkString(net?: NetworkDescription): string {
  if (!net) return '';

  const { name, id } = net;
  const alias =
    name === '' || name === 'Mainnet' || name === 'Testnet'
      ? ''
      : `<code>${name}</code> - `;
  return `${alias}<code>${id}</code>`;
}

const chainTypeMapping: Record<Platform, ChainType> = {
  Solana: 'SVM',
  Evm: 'EVM',
  Cosmwasm: 'CosmWasm',
  Algorand: 'AVM',
  Near: 'NEAR VM',
  Sui: 'Sui Move VM',
  Aptos: 'Move VM',
  Btc: 'BTC',
};

function getChainType(platformName: Platform): ChainType {
  return chainTypeMapping[platformName] ?? '';
}

function getChainDetails(chainName: string): ExtraDetails {
  try {
    const details = fs.readFileSync(`./src/chains/${chainName}.json`);
    return JSON.parse(details.toString()) as ExtraDetails;
  } catch (e) {
    console.error('No detail file for ', chainName);

    const testnetId = nativeChainIds.networkChainToNativeChainId.get(
      'Testnet',
      chainName
    );
    const testnet = testnetId
      ? {
          name: 'Testnet',
          id: testnetId.toString(),
        }
      : undefined;

    const mainnetId = nativeChainIds.networkChainToNativeChainId.get(
      'Mainnet',
      chainName
    );
    const mainnet = mainnetId
      ? {
          name: 'Mainnet',
          id: mainnetId.toString(),
        }
      : undefined;

    const deets: ExtraDetails = {
      title: chainName,
      testnet,
      mainnet,
    };
    fs.writeFileSync(`./src/chains/${chainName}.json`, JSON.stringify(deets));
  }
  return {} as ExtraDetails;
}

export async function getDocChains(): Promise<DocChain[]> {
  // We need to get a list of all of the chains.
  const chainsList = chain.chains;

  // Chains we don't want to appear on the docs
  const skipChains = ['Wormchain', 'Btc', 'Aurora'];

  // Filter Holesky and Sepolia chains
  const filteredTestnetChains = chainsList.filter((chain) => {
    return chain.includes('Sepolia') || chain.includes('Holesky');
  });

  const chains: DocChain[] = [];
  for (const c of chainsList) {
    // Skip iteration if chain is in skipChains
    if (skipChains.includes(c)) continue;
    // Skip filtered testnet chains for now
    if (filteredTestnetChains.includes(c)) continue;

    // Get ChainType
    const platform = chainToPlatform(c);
    const chainType = getChainType(platform);

    // Get Contracts
    const mainnetContracts = getContracts('Mainnet', c);
    const testnetContracts = getContracts('Testnet', c);
    const devnetContracts = getContracts('Devnet', c);

    // Get mainnet configs
    const mainnet = {
      name: c,
      id: chainToChainId(c),
      contracts: {
        ...mainnetContracts,
      },
      extraDetails: getChainDetails(c),
    };

    // Get testnet configs
    let testnetWh = await wormhole('Testnet', []);
    const testnetConfigs = testnetWh.config.chains[c];
    const testnets: ChainDetails[] = [];
    if (testnetConfigs) {
      testnets.push({
        name: c,
        id: testnetConfigs.chainId,
        contracts: testnetContracts,
        extraDetails: getChainDetails(c),
      });
    }

    // Get devnet configs
    const devnetWh = await wormhole('Devnet', []);
    const devnetConfigs = devnetWh.config.chains[c];
    const devnets: ChainDetails[] = [];
    if (devnetConfigs) {
      devnets.push({
        name: c,
        id: devnetConfigs?.chainId,
        contracts: devnetContracts,
        extraDetails: getChainDetails(c),
      });
    }

    chains.push({
      chainType,
      mainnet,
      testnets,
      devnets,
    });
  }

  // Iterate over the filtered testnet chains and override the existing chains
  // to add them to the mainnet chains
  for (const c of filteredTestnetChains) {
    // Find the mainnet the testnet belongs to
    let mainnetChain: Chain | string = '';

    if (c === 'Holesky') {
      mainnetChain = 'Ethereum';
    } else {
      mainnetChain =
        c.replace('Sepolia', '') === '' ? 'Ethereum' : c.replace('Sepolia', '');
    }

    const mainnetChainId = chainToChainId(mainnetChain as Chain);

    for (const dc of chains) {
      if (dc.mainnet.name === mainnetChain) {
        // TODO: implement a more sound way of handling this
        // If there is an existing testnet entry, and it has the same chain ID as mainnet,
        // we should remove it. This is a workaround to remove all of the old Goerli chain info.
        for (const t of dc.testnets) {
          if (t.id === mainnetChainId) {
            dc.testnets = dc.testnets.filter(testnet => testnet.id !== mainnetChainId);
          }
        }
        // Modify the chain configs to include the testnet information
        dc.testnets.push({
          name: c,
          id: chainToChainId(c),
          contracts: getContracts('Testnet', c),
          extraDetails: getChainDetails(c),
        });
      }
    }
  }

  return chains.sort((a, b) => {
    return a.mainnet.name.localeCompare(b.mainnet.name);
  });
}
