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
import nttSupport from './generated/ntt-support.json';

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
  products?: Products; // Supported products
};

export type ProductSupport = {
  mainnet: boolean;
  testnet: boolean;
  devnet: boolean;
};

export type Products = Record<string, ProductSupport>;

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
  products?: Products;
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

const chainNameOverrides: Record<string, string> = {
  Klaytn: 'Kaia',
};

function getChainType(platformName: Platform): ChainType {
  return chainTypeMapping[platformName] ?? '';
}

function getChainDetails(chainName: string): ExtraDetails {
  let existingDetails: ExtraDetails = {} as ExtraDetails;

  try {
    const raw = fs.readFileSync(`./src/chains/${chainName}.json`);
    existingDetails = JSON.parse(raw.toString()) as ExtraDetails;
  } catch (e) {
    console.error('No detail file for ', chainName);

    const testnetId = nativeChainIds.networkChainToNativeChainId.get('Testnet', chainName);
    const mainnetId = nativeChainIds.networkChainToNativeChainId.get('Mainnet', chainName);

    existingDetails.title = chainName;
    existingDetails.testnet = testnetId ? { name: 'Testnet', id: testnetId.toString() } : undefined;
    existingDetails.mainnet = mainnetId ? { name: 'Mainnet', id: mainnetId.toString() } : undefined;
  }

  // Compute new product support based on SDK contracts
  const products: Products = existingDetails.products || {};
  const networks = ['Mainnet', 'Testnet', 'Devnet'] as const;

  for (const net of networks) {
    const contracts = getContracts(net, chainName as Chain);

    // Token Bridge
    if (contracts.tokenBridge) {
      if (!products.tokenBridge) products.tokenBridge = { mainnet: false, testnet: false, devnet: false };
      products.tokenBridge[net.toLowerCase() as keyof ProductSupport] = true;
    }

    // CCTP
    if (contracts.cctp?.wormhole) {
      if (!products.cctp) products.cctp = { mainnet: false, testnet: false, devnet: false };
      products.cctp[net.toLowerCase() as keyof ProductSupport] = true;
    }

    // NTT
    // Only allow EVM and Solana (not other SVMs like Pythnet)
    const effectiveChainName = chainNameOverrides[chainName] || chainName;
    const isNTTSupported = (nttSupport[net] || []).includes(effectiveChainName) || (chainName === 'Solana' && net === 'Devnet');

    // Ensure `products.ntt` is initialized even if unsupported
    if (!products.ntt) {
      products.ntt = { mainnet: false, testnet: false, devnet: false };
    }

    products.ntt[net.toLowerCase() as keyof ProductSupport] = isNTTSupported;

    // Multigov
    const platform = chainToPlatform(chainName as Chain);
    const chainType = getChainType(platform);

    const isMultigovEligible =
    chainType === 'EVM' || (chainType === 'SVM' && chainName === 'Solana');

    if (isMultigovEligible) {
      if (!products.multigov) {
        products.multigov = { mainnet: false, testnet: false, devnet: false };
      }
      products.multigov[net.toLowerCase() as keyof ProductSupport] = true;
    }
  }

  // Remove any product with no support in any environment
  for (const productKey of Object.keys(products) as (keyof Products)[]) {
    const product = products[productKey];
    if (!product?.mainnet && !product?.testnet && !product?.devnet) {
      delete products[productKey];
    }
  }

  // Only write if something was added
  const updatedDetails = {
    ...existingDetails,
    products,
  };

  fs.writeFileSync(`./src/chains/${chainName}.json`, JSON.stringify(updatedDetails, null, 2));

  return updatedDetails;
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

    const details = getChainDetails(c);

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
      extraDetails: details,
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
        extraDetails: details,
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
        extraDetails: details,
      });
    }

    chains.push({
      chainType,
      mainnet,
      testnets,
      devnets,
      products: details.products || {},
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
