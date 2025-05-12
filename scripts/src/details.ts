import { Chain, finality, toChain } from '@wormhole-foundation/sdk';
import * as cfg from './config';
import {
  fmtNum,
  fmtCodeStr,
  buildHTMLTable,
  formatHTMLTable,
  sortMainnets,
  sortTestnets,
  sortChainTypes,
} from './util';

export function generateAllChainIdsTable(dc: cfg.DocChain[]): string {
  // Create Mainnet Chain Table
  const orderedDc = sortMainnets(dc);
  const tableHeader = `
    <thead>
      <th>Chain Name</th>
      <th style="width:26%">Wormhole Chain ID</th>
      <th>Network ID</th>
    </thead>`;
  let mainNetTableBody: string[] = [];
  let testNetTableBody: string[] = [];

  for (const c of orderedDc) {
    // Assemble the Mainnet table data
    const mainnetAlias = cfg.networkString(c.mainnet.extraDetails?.mainnet);
    const mainnetName = c.mainnet.extraDetails?.title
      ? c.mainnet.extraDetails.title
      : c.mainnet.name;

    mainNetTableBody.push(
      `<tr>
        <td>${mainnetName}</td>
        <td><code>${c.mainnet.id}</code></td>
        <td>${mainnetAlias}</td>
      </tr>`
    );

    function processTestnets(testnets: cfg.ChainDetails[]) {
      testnets.forEach((testnet) => {
        const testnetAlias = cfg.networkString(testnet.extraDetails?.testnet);

        testNetTableBody.push(`
          <tr>
            <td>${
              testnet.extraDetails ? testnet.extraDetails.title : testnet.name
            }</td>
            <td><code>${testnet.id}</code></td>
            <td>${testnetAlias}</td>
          </tr>`);
      });
    }

    // Assemble the Testnet table data
    if (c.testnets.length > 1) {
      const orderedTestnets = sortTestnets(c.testnets);
      processTestnets(orderedTestnets);
    } else {
      processTestnets(c.testnets);
    }
  }

  return `
=== "Mainnet"

    ${formatHTMLTable(buildHTMLTable(tableHeader, mainNetTableBody.join('')))}

=== "Testnet"

    ${formatHTMLTable(buildHTMLTable(tableHeader, testNetTableBody.join('')))}
`;
}

export function generateAllConsistencyLevelsTable(dc: cfg.DocChain[]): string {
  const orderedDc = sortMainnets(dc);

  const tableHeader = `
<thead>
  <th>Chain</th>
  <th>Instant</th>
  <th>Safe</th>
  <th>Finalized</th>
  <th>Otherwise</th>
  <th>Time to Finalize</th>
  <th>Details</th>
</thead>`;

  const tableBody: string[] = [];
  for (const c of orderedDc) {
    if (!c.mainnet.extraDetails) {
      console.log('No extra details for: ', c.mainnet.name);
      continue;
    }

    const f =
      c.mainnet.extraDetails?.finality === undefined
        ? {
            finalized: 0,
          }
        : c.mainnet.extraDetails.finality;

    const header = c.mainnet.extraDetails.title
      ? c.mainnet.extraDetails.title
      : c.mainnet.name;

    const instant = fmtNum(f.instant);
    const safe = fmtNum(
      f.safe !== undefined
        ? f.safe
        : f.confirmed !== undefined
        ? f.confirmed
        : undefined
    );
    const finalized = fmtNum(f.finalized);
    const otherwise = f.otherwise ? f.otherwise : '';
    const details = f.details
      ? `<a href="${f.details}" target="_blank">Details</a>`
      : ' ';

    let sdkChain: Chain;
    try {
      sdkChain = toChain(c.mainnet.id);
    } catch {
      console.log(
        'No sdk chain for ',
        c.mainnet.name,
        ' with id ',
        c.mainnet.id
      );
      continue;
    }

    const finalizationBlocks = finality.finalityThreshold.get(sdkChain);
    const blockTime = finality.blockTime.get(toChain(c.mainnet.id));

    if (finalizationBlocks !== undefined && blockTime !== undefined) {
      const finalizationSeconds = ((finalizationBlocks + 1) * blockTime) / 1000;
  
      const finalizationTime = finalizationSeconds < 120
      ? `~ ${Math.ceil(finalizationSeconds)}s`
      : `~ ${Math.ceil(finalizationSeconds / 60)}min`;

      tableBody.push(`
<tr>
  <td>${header}</td>
  <td>${instant}</td>
  <td>${safe}</td>
  <td>${finalized}</td>
  <td>${otherwise}</td>
  <td>${finalizationTime}</td>
  <td>${details}</td>
</tr>
`);
    }
  }

  return formatHTMLTable(buildHTMLTable(tableHeader, tableBody.join('\n')));
}

export function generateAllContractsTable(
  chains: cfg.DocChain[],
  module: string
): string {
  const orderedChains = sortMainnets(chains);
  const tableHeader = `
  <thead>
    <th>Chain Name</th>
    <th>Contract Address</th>
  </thead>`;

  // If addresses aren't yet available in the SDK, we can manually add them here
  const newMainnetAddresses: Partial<cfg.ChainDetails>[] = [
    {
      name: 'Worldchain',
      contracts: { relayer: '0x1520cc9e779c56dab5866bebfb885c86840c33d3' },
    },
  ];
  const newTestnetAddresses: Partial<cfg.ChainDetails>[] = []
  const newDevnetAddress: Partial<cfg.ChainDetails>[] = [];

  // Helper function to generate table rows
  const generateRows = (networks: cfg.ChainDetails[], chainType: string): string[] => {
    return networks
      .map((network) => {
        let address =
          module === 'cctp'
            ? network.contracts?.[module]?.wormhole
            : network.contracts?.[module];
  
        if (!address) {
          let newAddress: Partial<cfg.ChainDetails> | undefined;

          if (chainType === 'mainnet') {
            newAddress = newMainnetAddresses.find((chain) => chain?.name === network.name);
          } else if (chainType === 'testnet') {
            newAddress = newTestnetAddresses.find((chain) => chain?.name === network.name);
          } else {
            newAddress = newDevnetAddress.find((chain) => chain?.name === network.name);
          }

          if (newAddress?.contracts?.[module] && module !== 'cctp') {
            address = newAddress.contracts[module];
            // Update the network object directly if necessary
            network.contracts = network.contracts || {};
            network.contracts[module] = address;
          }
        }
  
        if (!address) {
          return null; // Skip this network
        }
  
        return `
          <tr>
            <td>${network.extraDetails?.title || network.name}</td>
            <td>${fmtCodeStr(address)}</td>
          </tr>`;
      })
      .filter((row) => row !== null); // Filter out null rows
  };

  // Generate table rows
  const mainNetTableBody = orderedChains.flatMap((chain) =>
    generateRows([chain.mainnet], 'mainnet')
  );

  const testNetTableBody = orderedChains.flatMap((chain) =>
    generateRows(sortTestnets(chain.testnets || []), 'testnet')
  );

  const devNetTableBody = orderedChains.flatMap((chain) =>
    generateRows(chain.devnets || [], 'devnet')
  );

  // Combine everything into the final table
  return `
=== "Mainnet"

    ${formatHTMLTable(buildHTMLTable(tableHeader, mainNetTableBody.join('')))}

=== "Testnet"

    ${formatHTMLTable(buildHTMLTable(tableHeader, testNetTableBody.join('')))}

=== "Devnet"

    ${formatHTMLTable(buildHTMLTable(tableHeader, devNetTableBody.join('')))}
  `;
}

export function generateSupportedNetworksTable(dc: cfg.DocChain[]): string {
  const orderedDc = sortChainTypes(dc);

  // Group chains by their chainType
  const chainsByType: Record<string, cfg.DocChain[]> = {};
  for (const chain of orderedDc) {
    if (!chainsByType[chain.chainType]) {
      chainsByType[chain.chainType] = [];
    }
    chainsByType[chain.chainType].push(chain);
  }

  const tableHeader = `
  <thead>
    <th>Blockchain</th>
    <th>Environment</th>
    <th>Mainnet</th>
    <th>Testnet</th>
    <th>Quick Links</th>
  </thead>`;

  // Generate tables for each chain type
  let tables: string[] = [];
  for (const [chainType, chains] of Object.entries(chainsByType)) {
    let tableBody: string[] = [];

    for (const c of chains) {
      const mainnetSupport =
        c.mainnet.contracts.coreBridge || c.mainnet.contracts.gateway
          ? ':white_check_mark:'
          : ':x:';
      const testnetSupport =
        c.testnets[0]?.contracts.coreBridge || c.testnets[0]?.contracts.gateway
          ? ':white_check_mark:'
          : ':x:';

      // Filter out unsupported chains that have chain IDs (i.e., if they were previously
      // supported) but are no longer supported
      if (mainnetSupport === ':x:' && testnetSupport === ':x:') {
        continue;
      }

      const website = c.mainnet.extraDetails?.homepage
        ? ':material-web: ' +
          `<a href="${c.mainnet.extraDetails.homepage}" target="_blank">Website</a>`
        : undefined;

      const devDocs = c.mainnet.extraDetails?.devDocs
        ? ':material-file-document: ' +
          `<a href="${c.mainnet.extraDetails.devDocs}" target="_blank">Developer Docs</a>`
        : undefined;

      const explorer = c.mainnet.extraDetails?.explorer
        ? ':octicons-package-16: ' +
          `<a href="${c.mainnet.extraDetails.explorer[0].url}" target="_blank">Block Explorer</a>`
        : undefined;

      tableBody.push(
        `<tr>
          <td>${c.mainnet.extraDetails?.title ?? c.mainnet.name}</td>
          <td>${c.chainType}</td>
          <td>${mainnetSupport}</td>
          <td>${testnetSupport}</td>
          <td>
            ${website ? website + '<br>' : ''}
            ${devDocs ? devDocs + '<br>' : ''}
            ${explorer ? explorer : ''}
          </td>
        </tr>`
      );
    }

    tables.push(
      `### ${chainType}\n\n${formatHTMLTable(
        buildHTMLTable(tableHeader, tableBody.join('\n'))
      )}`
    );
  }

  // Combine all tables into one string
  return `<div class="full-width" markdown>\n\n${tables.join(
    '\n\n'
  )}\n\n</div>`;
}

export function generateTestnetFaucetsTable(dc: cfg.DocChain[]): string {
  const orderedDc = sortChainTypes(dc);

  // Group chains by their chainType
  const chainsByType: Record<string, cfg.DocChain[]> = {};
  for (const chain of orderedDc) {
    if (!chainsByType[chain.chainType]) {
      chainsByType[chain.chainType] = [];
    }
    chainsByType[chain.chainType].push(chain);
  }

  const tableHeader = `
  <thead>
    <th>Testnet</th>
    <th>Environment</th>
    <th>Token</th>
    <th>Faucet</th>
  </thead>`;

  // Generate tables for each chain type
  let tables: string[] = [];
  for (const [chainType, chains] of Object.entries(chainsByType)) {
    let tableBody: string[] = [];

    for (const c of chains) {
      for (const t of c.testnets) {
        const token = t.extraDetails?.faucet
          ? t.extraDetails.faucet.token
          : 'N/A';

        const faucet = t.extraDetails?.faucet
          ? `<a href="${t.extraDetails.faucet.url}" target="_blank">${t.extraDetails.faucet.description}</a>`
          : undefined;

        if (!faucet) continue;

        tableBody.push(
          `<tr>
            <td>${t.extraDetails?.title ?? t.name}</td>
            <td>${c.chainType}</td>
            <td>${token}</td>
            <td>${faucet ? faucet : ''}</td>
          </tr>`
        );
      }
    }

    tables.push(
      `### ${chainType}\n\n${formatHTMLTable(
        buildHTMLTable(tableHeader, tableBody.join('\n'))
      )}`
    );
  }

  // Combine all tables into one string
  return `<div class="full-width" markdown>\n\n${tables.join(
    '\n\n'
  )}\n\n</div>`;
}

export function generateProductSupportTables(chains: cfg.DocChain[]): string {
  const products = ['connect', 'ntt', 'tokenBridge', 'multigov', 'settlement', 'cctp'];

  const tableHeader = `
  <thead>
    <th>Blockchain</th>
    <th>Environment</th>
    <th>Mainnet</th>
    <th>Testnet</th>
    <th>Devnet</th>
    <th>Quick Links</th>
  </thead>`;

  const productDisplayNames: Record<string, string> = {
    connect: 'Connect',
    ntt: 'NTT',
    tokenBridge: 'Token Bridge',
    multigov: 'MultiGov',
    settlement: 'Settlement',
    cctp: 'CCTP',
  };

  const tables: string[] = [];

  for (const product of products) {
    const rows: string[] = [];

    for (const chain of chains) {
      const productData = chain.products?.[product];
      if (!productData) continue;

      const mainnet = productData.mainnet ? ':white_check_mark:' : ':x:';
      const testnet = productData.testnet ? ':white_check_mark:' : ':x:';
      const devnet = productData.devnet ? ':white_check_mark:' : ':x:';

      const website = chain.mainnet.extraDetails?.homepage
        ? `:material-web: <a href="${chain.mainnet.extraDetails.homepage}" target="_blank">Website</a><br>`
        : '';
      const devDocs = chain.mainnet.extraDetails?.devDocs
        ? `:material-file-document: <a href="${chain.mainnet.extraDetails.devDocs}" target="_blank">Developer Docs</a><br>`
        : '';
      const explorer = chain.mainnet.extraDetails?.explorer?.[0]?.url
        ? `:octicons-package-16: <a href="${chain.mainnet.extraDetails.explorer[0].url}" target="_blank">Block Explorer</a>`
        : '';

      rows.push(`<tr>
        <td>${chain.mainnet.extraDetails?.title ?? chain.mainnet.name}</td>
        <td>${chain.chainType}</td>
        <td>${mainnet}</td>
        <td>${testnet}</td>
        <td>${devnet}</td>
        <td>${website}${devDocs}${explorer}</td>
      </tr>`);
    }

    tables.push(`### ${productDisplayNames[product]}\n\n${formatHTMLTable(buildHTMLTable(tableHeader, rows.join('\n')))}`);
  }

  return `<div class="full-width" markdown>\n\n${tables.join('\n\n')}\n\n</div>`;
}
