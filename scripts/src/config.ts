import * as wh from '@certusone/wormhole-sdk';
import { nativeChainIds, toChain } from '@wormhole-foundation/sdk';
import { group } from 'console';
import fs from 'fs';

// Many chains have the same underlying runtime
export type ChainType =
  | 'EVM'
  | 'Solana'
  | 'Cosmos'
  | 'Sui'
  | 'Aptos'
  | 'Algorand'
  | '';

// Get the blockchain environment that the chain belongs to (i.e., EVM)
export function getChainType(cid: wh.ChainId): ChainType {
  if (wh.isEVMChain(cid)) return 'EVM';
  if (wh.isCosmWasmChain(cid) || wh.isTerraChain(cid)) return 'Cosmos';
  //if(wh.isSolanaChain(cid) in wh.SolanaChainName)

  const name = wh.coalesceChainName(cid);

  if (name === 'osmosis') return 'Cosmos';
  if (name === 'solana' || name === 'pythnet') return 'Solana';
  if (name === 'algorand') return 'Algorand';
  if (name === 'aptos') return 'Aptos';
  if (name === 'sui') return 'Sui';

  return '';
}

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

export type Contracts = {
  // core
  core?: string;
  token_bridge?: string;
  nft_bridge?: string;
  // relayer
  wormholeRelayerAddress?: string;
  mockDeliveryProviderAddress?: string;
  mockIntegrationAddress?: string;
  // CCTP
  cctp?: string;
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

export function networkString(net?: NetworkDescription): string {
  if (!net) return '';

  const { name, id } = net;
  const alias =
    name === '' || name === 'Mainnet' || name === 'Testnet'
      ? ''
      : `<code>${name}</code> - `;
  return `${alias}<code>${id}</code>`;
}

export interface ExtraDetails {
  notes?: string[];
  finality?: Finality;
  title?: string; // title case name of the chain
  homepage?: string; // Url to the homepage of the chain
  explorer?: SiteDescription[]; // urls to explorer sites
  developer?: SiteDescription[]; // set of sites to help devs
  contractSource?: string; // url to core contract
  examples?: SiteDescription[];
  testnet?: NetworkDescription;
  mainnet?: NetworkDescription;
}

function getChainDetails(name: string): ExtraDetails {
  try {
    const details = fs.readFileSync(`./src/chains/${name}.json`);
    return JSON.parse(details.toString()) as ExtraDetails;
  } catch (e) {
    console.error('No detail file for ', name);

    const chain = toChain(wh.coalesceChainId(name as wh.ChainName));
    const testnetId = nativeChainIds.networkChainToNativeChainId.get(
      'Testnet',
      chain
    );
    const testnet = testnetId
      ? {
          name: 'Testnet',
          id: testnetId.toString(),
        }
      : undefined;

    const mainnetId = nativeChainIds.networkChainToNativeChainId.get(
      'Mainnet',
      chain
    );
    const mainnet = mainnetId
      ? {
          name: 'Mainnet',
          id: mainnetId.toString(),
        }
      : undefined;

    const deets: ExtraDetails = {
      title: chain,
      testnet,
      mainnet,
    };
    fs.writeFileSync(`./src/chains/${name}.json`, JSON.stringify(deets));
  }
  return {} as ExtraDetails;
}

export function getDocChains(): DocChain[] {
  // Uses the Wormhole SDK to get the list of contract addresses for
  // the core contract, token bridge, and nft bridge
  const mainnetContracts: wh.ChainContracts = wh.CONTRACTS.MAINNET;
  const testnetContracts: wh.ChainContracts = wh.CONTRACTS.TESTNET;
  const devnetContracts: wh.ChainContracts = wh.CONTRACTS.DEVNET;

  // Uses the Wormhole SDK to get the list of relayer contract addresses
  const mainnetRelayers = wh.relayer.RELAYER_CONTRACTS.MAINNET;
  const testnetRelayers = wh.relayer.RELAYER_CONTRACTS.TESTNET;
  const devnetRelayers = wh.relayer.RELAYER_CONTRACTS.DEVNET;

  // Manually define the list of CCTP contract addresses
  const mainnetCCTP = {
    arbitrum: { cctp: '0x2703483B1a5a7c577e8680de9Df8Be03c6f30e3c' },
    avalanche: { cctp: '0x09Fb06A271faFf70A651047395AaEb6265265F13' },
    ethereum: { cctp: '0xAaDA05BD399372f0b0463744C09113c137636f6a' },
    optimism: { cctp: '0x2703483B1a5a7c577e8680de9Df8Be03c6f30e3c' },
    base: { cctp: '0x03faBB06Fa052557143dC28eFCFc63FC12843f1D' },
    polygon: { cctp: '0x0FF28217dCc90372345954563486528aa865cDd6' },
  };

  const testnetCCTP = {
    avalanche: { cctp: '0x58f4c17449c90665891c42e14d34aae7a26a472e' },
    arbitrum_sepolia: { cctp: '0x2703483B1a5a7c577e8680de9Df8Be03c6f30e3c' },
    sepolia: { cctp: '0x2703483B1a5a7c577e8680de9Df8Be03c6f30e3c' },
    optimism_sepolia: { cctp: '0x2703483B1a5a7c577e8680de9Df8Be03c6f30e3c' },
    base_sepolia: { cctp: '0x2703483B1a5a7c577e8680de9Df8Be03c6f30e3c' },
    polygon: { cctp: '0x2703483B1a5a7c577e8680de9Df8Be03c6f30e3c' },
  };

  // Chains we don't want to appear on the docs
  const skipChains = {
    wormchain: true,
    btc: true,
    aurora: true,
    goerli: true,
  };

  // Do an initial loop over the chains to get a list of the chains that
  // map the testnets to the mainnets (i.e., combine arbitrum_sepolia and arbitrum)
  const groupedChains: any = {};
  const chainMap = new Map(Object.entries(wh.CHAINS));

  // Iterate over the entries to find ones with underscores and perform the grouping
  for (const [cn, cid] of chainMap) {
    if (cid === 0) continue;

    // Use the Wormhole chain ID to get the chain name
    const name = wh.toChainName(cid);

    if (name in skipChains) continue;

    // Need to group the chain with a base chain
    // Split the name by '_'
    const [baseChain] = name.split('_');

    // Get the testnet chain name
    const chain_details =  getChainDetails(baseChain).testnet?.name.toLowerCase();

    if (name.includes('_')) {
      // Need to group the chain with a base chain
      // Split the name by '_'
      const [baseChain] = name.split('_');

      // Initialize the base chain in groupedChains if it doesn't exist
      if (!groupedChains[baseChain]) {
        groupedChains[baseChain] = {
          chainType: getChainType(cid),
          mainnet: {
            name: baseChain,
            id: chainMap.get(baseChain),
            contracts: {
              ...mainnetContracts[baseChain as wh.ChainName],
              ...mainnetRelayers[baseChain as wh.ChainName],
              // @ts-ignore
              ...mainnetCCTP[baseChain],
            },
            extraDetails: getChainDetails(baseChain),
          },
          testnets: [], // List to hold all testnet chains
          devnets: [], // List to hold all devnet chains
        };
      }

      // Add the associated testnet chains to the corresponding base chain entry
      groupedChains[baseChain].testnets.push({
        name: name,
        id: chainMap.get(name),
        extraDetails: getChainDetails(name),
        contracts: {
          ...testnetContracts[name],
          ...testnetRelayers[name],
          // @ts-ignore
          ...testnetCCTP[name],
        },
      });    

      // Add the associated devnet chains to the corresponding base chain entry
      // if they exist
      if (devnetContracts[name] || devnetRelayers[name]) {
        groupedChains[baseChain].devnets.push({
          name: name,
          id: chainMap.get(name),
          contracts: {
            ...devnetContracts[name],
            ...devnetRelayers[name],
          },
          extraDetails: getChainDetails(name),
        });
      }
    } else if (name === 'sepolia' || name === 'holesky') {
      // Create grouping for Ethereum chains

      // Initialize the base chain in groupedChains if it doesn't exist
      const baseChain = 'ethereum';
      if (!groupedChains[baseChain]) {
        groupedChains[baseChain] = {
          chainType: getChainType(cid),
          mainnet: {
            name: baseChain,
            id: chainMap.get(baseChain),
            contracts: {
              ...mainnetContracts[baseChain],
              ...mainnetRelayers[baseChain],
              // @ts-ignore
              ...mainnetCCTP[baseChain],
            },
            extraDetails: getChainDetails(baseChain),
          },
          testnets: [], // List to hold all testnet chains
          devnets: [], // List to hold all devnet chains
        };
      }

      // Add the associated chain to the corresponding base chain entry
      groupedChains[baseChain].testnets.push({
        name: name,
        id: chainMap.get(name),
        contracts: {
          ...testnetContracts[name],
          ...testnetRelayers[name],
          // @ts-ignore
          ...testnetCCTP[name],
        },
        extraDetails: getChainDetails(name),
      });

      // Add the associated devnet chains to the corresponding base chain entry
      // if they exist
      if (devnetContracts[name] || devnetRelayers[name]) {
        groupedChains[baseChain].devnets.push({
          name: name,
          id: chainMap.get(name),
          contracts: {
            ...devnetContracts[name],
            ...devnetRelayers[name],
          },
          extraDetails: getChainDetails(name),
        });
      }
    } else {
      // No grouping necessary
      groupedChains[name] = {
        chainType: getChainType(cid),
        mainnet: {
          name: name,
          id: cid,
          contracts: {
            ...mainnetContracts[name],
            ...mainnetRelayers[name],
            // @ts-ignore
            ...mainnetCCTP[name],
          },
          extraDetails: getChainDetails(name),
        },
        testnets: [],
        devnets: [],
      };

      if (!chain_details?.includes('goerli')){
        if (
          testnetContracts[name] ||
          testnetRelayers[name] ||
          // @ts-ignore
          testnetCCTP[name]
        ) {
          groupedChains[name].testnets.push({
            name: name,
            id: chainMap.get(name),
            contracts: {
              ...testnetContracts[name],
              ...testnetRelayers[name],
              // @ts-ignore
              ...testnetCCTP[name],
            },
            extraDetails: getChainDetails(name),
          });
      }

        // Add the associated devnet chains to the corresponding base chain entry
        // if they exist
        if (devnetContracts[name] || devnetRelayers[name]) {
          groupedChains[name].devnets.push({
            name: name,
            id: chainMap.get(name),
            contracts: {
              ...devnetContracts[name],
              ...devnetRelayers[name],
            },
            extraDetails: getChainDetails(name),
          });
        }
      }
    }
  }

  const chains: DocChain[] = Object.values(groupedChains);

  return chains.sort((a, b) => {
    return a.mainnet.name.localeCompare(b.mainnet.name);
  });
}
