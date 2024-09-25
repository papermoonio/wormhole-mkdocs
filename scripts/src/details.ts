import { Chain, finality, toChain } from '@wormhole-foundation/sdk';
import * as cfg from './config';
import { fmtNum, fmtStr, fmtCodeStr } from './util';

const SRC_BASE = 'https://github.com/wormhole-foundation/wormhole/blob/main/';

export function contractTable(contracts: cfg.Contracts): string {
  let core = `
|Type|Contract|
|----|--------|
|Core|${fmtStr(contracts.core)}|
|Token Bridge|${fmtStr(contracts.token_bridge)}|
|NFT Bridge|${fmtStr(contracts.nft_bridge)}|`;

  if (contracts.wormholeRelayerAddress !== undefined) {
    core += `\n|Relayer|${fmtStr(contracts.wormholeRelayerAddress)}|`;
    if (contracts.mockDeliveryProviderAddress)
      core += `\n|MockProvider|${fmtStr(
        contracts.mockDeliveryProviderAddress
      )}|`;
    if (contracts.mockIntegrationAddress)
      core += `\n|MockIntegration|${fmtStr(contracts.mockIntegrationAddress)}|`;
  }

  if (contracts.cctp !== undefined) {
    core += `\n|CCTP|${fmtStr(contracts.cctp)}|`;
  }

  return core;
}

export function finalityOptionTable(
  finality: cfg.Finality | undefined
): [string, string] {
  let finalityOptions = '';
  let finalityDetails = '';

  if (finality === undefined) return [finalityOptions, finalityDetails];

  const { confirmed, finalized, instant, safe, otherwise, details } = finality;

  if (details !== undefined) {
    finalityDetails = `\nFor more information see [${details}](${details})\n`;
  }

  let otherwiseText = '';
  if (otherwise) {
    otherwiseText = `\nIf a value is passed that is _not_ in the set above it's assumed to mean ${otherwise}`;
  }

  let settingTexts = {
    Confirmed: fmtNum(confirmed),
    Instant: fmtNum(instant),
    Safe: fmtNum(safe),
    Finalized: fmtNum(finalized),
  };

  if (finalized === 0) {
    otherwiseText += `\n\nThis field is may be ignored since the chain provides instant finality.`;
  }

  finalityOptions = `|Level|Value|\n|-----|-----|`;
  for (const [level, value] of Object.entries(settingTexts)) {
    if (value !== ' ') finalityOptions += `\n|${level}|${value}|`;
  }

  finalityOptions += otherwiseText;

  return [finalityOptions, finalityDetails];
}

export function chainDetailsPage(chain: cfg.DocChain): string {
  const { mainnet, testnets, devnets } = chain;
  const { name, id, extraDetails } = mainnet;

  const updateLink = `https://github.com/wormhole-foundation/docs.wormhole.com/blob/main/scripts/src/chains/${name}.json`;

  let webpage = `No webpage, update [here](${updateLink})`;
  let explorerLinks = `No explorer, update [here](${updateLink})`;
  let devdocs = `No dev docs, update [here](${updateLink})`;
  let src = `No source file, update [here](${updateLink})`;

  let mainnetAlias = '';
  let testnetAlias = '';

  let noteHints = '';

  const [finalityOptions, finalityDetails] = finalityOptionTable(
    extraDetails?.finality
  );

  let title = extraDetails?.title || name;

  if (extraDetails !== undefined) {
    const { contractSource, homepage, explorer, finality, notes } =
      extraDetails;

    if (notes !== undefined) {
      noteHints = `\n${notes
        .map((n) => {
          return `{% hint style='info' %}\n${n}\n{% endhint %}`;
        })
        .join('\n')}\n`;
    }

    if (contractSource !== undefined) {
      src = `[${contractSource}](${SRC_BASE}${contractSource})`;
    }

    if (homepage !== undefined) {
      webpage = `[Web site](${homepage})`;
    }

    if (explorer !== undefined) {
      const explorers: string[] = [];
      for (const exp of explorer) {
        explorers.push(
          `[${exp.description ? exp.description : exp.url}](${exp.url})`
        );
      }
      explorerLinks = explorers.join(' | ');
    }

    if (extraDetails.developer !== undefined) {
      const docs: string[] = [];
      for (const dd of extraDetails.developer) {
        docs.push(`[${dd.description ? dd.description : dd.url}](${dd.url})`);
      }
      devdocs = docs.join(' | ');
    }

    if (extraDetails.mainnet !== undefined) {
      mainnetAlias = `(${cfg.networkString(extraDetails.mainnet)})`;
    }

    if (extraDetails.testnet !== undefined) {
      testnetAlias = `(${cfg.networkString(extraDetails.testnet)})`;
    }
  }

  let testNetTables = '';
  for (const testnet of testnets) {
    if (testnet.name === mainnet.name) {
      testNetTables += `### TestNet Contracts ${testnetAlias}\n${contractTable(
        testnet.contracts
      )}`;
    }
  }

  let devNetTables = '';
  for (const devnet of devnets) {
    if (devnet.name === mainnet.name) {
      devNetTables += `### Local Network Contracts\n${contractTable(
        devnet.contracts
      )}`;
    }
  }

  return `
# ${title}
${noteHints}
## Ecosystem

- ${webpage}
- ${explorerLinks}
- ${devdocs}

## Wormhole Details

- **Name**: \`${name}\`
- **Chain ID**: \`${id}\`
- **Contract Source**: ${src}

${
  finalityOptions === ''
    ? ''
    : `### Consistency Levels

The options for [consistencyLevel](../../reference/components/core-contracts.md#consistencyLevel) (i.e finality) are:`
}

${finalityOptions}

${finalityDetails}

### Mainnet Contracts ${mainnetAlias}
${contractTable(mainnet.contracts)}

${testNetTables}

${devNetTables}
`;
}

function sortChainNames(dc: cfg.DocChain[]): cfg.DocChain[] {
  return dc.sort((a, b) => {
    const aTitle =
      a.mainnet.extraDetails && a.mainnet.extraDetails.title
        ? a.mainnet.extraDetails.title
        : 'N/A';
    const bTitle =
      b.mainnet.extraDetails && b.mainnet.extraDetails.title
        ? b.mainnet.extraDetails.title
        : 'N/A';

    if (aTitle === 'Ethereum') return -1; // Ethereum should be first
    if (bTitle === 'Ethereum') return 1; // Ethereum should be first
    if (aTitle === 'Solana') return -1; // Solana should be second
    if (bTitle === 'Solana') return 1; // Solana should be second
    return aTitle.localeCompare(bTitle); // Sort the rest alphabetically
  });
}

function buildHTMLTable(tableHeader: string, tableBody: string): string {
  return `
    <table data-full-width="true">
      ${tableHeader}
      <tbody>
        ${tableBody}
      </tbody>
    </table>
  `;
 
}

// Function to format an HTML table string with consistent indentation and newlines
export function formatHTMLTable(htmlTable: string): string {
  const indentStep = '  '; // Define the indent step
  let indentLevel = 0; // Initial indentation level

  // Helper function to add proper indentation
  function addIndentation(html: string): string {
    return html
      .split('\n')
      .map((line) => indentStep.repeat(indentLevel) + line.trim())
      .join('\n');
  }

  // Clean up extra spaces and newlines around tags
  const cleanedHtmlTable = htmlTable
    .replace(/>\s+</g, '><') // Remove spaces between tags
    .replace(/(^|\n)\s+</g, '\n<') // Remove leading spaces before opening tags
    .replace(/\s+(<\/\w+>)/g, '$1') // Remove trailing spaces before closing tags
    .trim(); // Remove leading and trailing whitespace

  const lines = cleanedHtmlTable.split('\n');
  const result: string[] = [];

  for (const line of lines) {
    // Handle opening and closing tags for indentation levels
    if (line.match(/^<\/\w/)) {
      indentLevel--; // Decrease indentation level for closing tags
    }

    result.push(addIndentation(line));

    if (line.match(/^<\w[^>]*[^\/]>/)) {
      indentLevel++; // Increase indentation level for opening tags
    }
  }

  // Handle the case where the last line is not properly closed
  return result.join('\n').trim();
}

export function generateAllChainIdsTable(dc: cfg.DocChain[]): string {
  // Create MainNet Chain Table
  const orderedDc = sortChainNames(dc);
  const tableHeader = `
    <thead>
      <th>Chain Name</th>
      <th style="width:26%">Wormhole Chain ID</th>
      <th>Network ID</th>
    </thead>`;
  let mainNetTableBody: string[] = [];
  let testNetTableBody: string[] = [];

  for (const c of orderedDc) {
    // Assemble the MainNet table data
    const mainnetAlias = cfg.networkString(c.mainnet.extraDetails?.mainnet);
    mainNetTableBody.push(
      `<tr>
        <td>${
          c.mainnet.extraDetails ? c.mainnet.extraDetails.title : c.mainnet.name
        }</td>
        <td><code>${c.mainnet.id}</code></td>
        <td>${mainnetAlias}</td>
      </tr>`
    );

    // Assemble the TestNet table data
    if (c.testnets.length > 1) {
      const orderedTestnets = c.testnets.sort((a, b) => {
        const aTitle =
          a.extraDetails && a.extraDetails.title ? a.extraDetails.title : 'N/A';
        const bTitle =
          b.extraDetails && b.extraDetails.title ? b.extraDetails.title : 'N/A';

        if (aTitle === 'Ethereum') return -1; // Ethereum should be first
        if (bTitle === 'Ethereum') return 1; // Ethereum should be first
        if (aTitle === 'Solana') return -1; // Solana should be second
        if (bTitle === 'Solana') return 1; // Solana should be second
        return aTitle.localeCompare(bTitle); // Sort the rest alphabetically
      });

      orderedTestnets.forEach((testnet) => {
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
    } else {
      c.testnets.forEach((testnet) => {
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
  }

  return `
=== "MainNet"

    ${formatHTMLTable(buildHTMLTable(tableHeader, mainNetTableBody.join('')))}

=== "TestNet"

    ${formatHTMLTable(buildHTMLTable(tableHeader, testNetTableBody.join('')))}
`;
}

export function generateAllConsistencyLevelsTable(dc: cfg.DocChain[]): string {
  const orderedDc = sortChainNames(dc);

  const header = `
<thead>
  <th>Chain</th>
  <th>Instant</th>
  <th>Safe</th>
  <th>Finalized</th>
  <th>Otherwise</th>
  <th>Time to Finalize</th>
  <th>Details</th>
</thead>`;

  const rows: string[] = [];
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
    const details = f.details ? `<a href="${f.details}" target="_blank">Details</a>` : ' ';

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
      const finalizationTime = `~ ${Math.ceil(
        ((finalizationBlocks + 1) * blockTime) / 1000
      )}s`;
      rows.push(`
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

  return formatHTMLTable(buildHTMLTable(header, rows.join('\n')))
}

export function generateAllContractsTable(
  dc: cfg.DocChain[],
  module: string
): string {
  // Create MainNet Chain Table
  const orderedDc = sortChainNames(dc);
  const tableHeader =`
  <thead>
    <th>Chain Name</th>
    <th>Contract Address</th>
  </thead>`;
  let mainNetTableBody: string[] = [];
  let testNetTableBody: string[] = [];
  let devNetTableBody: string[] = [];

  const m = module as keyof cfg.Contracts;

  for (const c of orderedDc) {
    // Assemble the MainNet table data
    mainNetTableBody.push(
      `<tr>
        <td>${c.mainnet.extraDetails ? c.mainnet.extraDetails.title : c.mainnet.name}</td>
        <td>${fmtCodeStr(c.mainnet.contracts[m])}</td>
      </tr>`
    )

    // Assemble the TestNet table data
    if (c.testnets.length > 1) {
      const orderedTestnets = c.testnets.sort((a, b) => {
        const aTitle =
          a.extraDetails && a.extraDetails.title ? a.extraDetails.title : 'N/A';
        const bTitle =
          b.extraDetails && b.extraDetails.title ? b.extraDetails.title : 'N/A';

        if (aTitle === 'Ethereum') return -1; // Ethereum should be first
        if (bTitle === 'Ethereum') return 1; // Ethereum should be first
        if (aTitle === 'Solana') return -1; // Solana should be second
        if (bTitle === 'Solana') return 1; // Solana should be second
        return aTitle.localeCompare(bTitle); // Sort the rest alphabetically
      });

      orderedTestnets.forEach((testnet) => {
        testNetTableBody.push(`
          <tr>
            <td>${testnet.extraDetails ? testnet.extraDetails.title : testnet.name}</td>
            <td>${fmtCodeStr(testnet.contracts[m])}</td>
          </tr>`,
        );
      });
    } else {
      c.testnets.forEach((testnet) => {
        testNetTableBody.push(`
          <tr>
            <td>${testnet.extraDetails ? testnet.extraDetails.title : testnet.name}</td>
            <td>${fmtCodeStr(testnet.contracts[m])}</td>
          </tr>`,
        );
      });
    }

    // Assemble the DevNet table data
    c.devnets.forEach((devnet) => {
      devNetTableBody.push(`
        <tr>
          <td>${devnet.extraDetails ? devnet.extraDetails.title : devnet.name}</td>
          <td>${fmtCodeStr(devnet.contracts[m])}</td>
        </tr>`,
      );
    });
  }

  return `
=== "MainNet"

    ${formatHTMLTable(buildHTMLTable(tableHeader, mainNetTableBody.join('')))}

=== "TestNet"

    ${formatHTMLTable(buildHTMLTable(tableHeader, testNetTableBody.join('')))}

=== "DevNet"

    ${formatHTMLTable(buildHTMLTable(tableHeader, devNetTableBody.join('')))}
`;
}
