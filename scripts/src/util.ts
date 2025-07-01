import * as types from './types/chains';

export function fmtNum(n?: number): string {
  return n === undefined ? " " : n.toString();
}

export function fmtStr(s?: string): string {
  return s === undefined ? "**N/A**" : `\`${s}\``;
}

export function fmtCodeStr(s?: string): string {
  return s === undefined ? "<code>-</code>" : `<code>${s}</code>`;
}

export function buildHTMLTable(tableHeader: string, tableBody: string): string {
  if (tableBody.trim() == "") {
    return 'N/A';
  }

  return `
    <table data-full-width="true" markdown>
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

export function sortMainnets(dc: types.DocChain[]): types.DocChain[] {
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

export function sortTestnets (
  testnets: types.ChainDetails[]
): types.ChainDetails[] {
  return testnets.sort((a, b) => {
    const aTitle = a.extraDetails?.title || 'N/A';
    const bTitle = b.extraDetails?.title || 'N/A';
    if (aTitle === 'Ethereum') return -1;
    if (bTitle === 'Ethereum') return 1;
    if (aTitle === 'Solana') return -1;
    if (bTitle === 'Solana') return 1;
    return aTitle.localeCompare(bTitle);
  });
}

export function sortChainTypes(dc: types.DocChain[]): types.DocChain[] {
  return dc.sort((a, b) => {
    // Define chain type priorities
    const chainTypePriority: Record<string, number> = {
      EVM: 1, // Highest priority
      SVM: 2, // Second priority
      // Other chain types are sorted alphabetically by type
    };

    // Get chain type priorities, default to a higher number for unknown types
    const aPriority = chainTypePriority[a.chainType] ?? 99;
    const bPriority = chainTypePriority[b.chainType] ?? 99;

    // Primary sort by chain type priority
    if (aPriority !== bPriority) {
      return aPriority - bPriority;
    }

    // For chain types not explicitly prioritized, sort alphabetically by chain type
    if (aPriority === 99 && bPriority === 99) {
      return a.chainType.localeCompare(b.chainType);
    }

    // Secondary sort within the same chain type
    const aTitle = a.mainnet.extraDetails?.title ?? 'N/A';
    const bTitle = b.mainnet.extraDetails?.title ?? 'N/A';

    // Special handling for prioritized chain names within types
    if (a.chainType === 'EVM') {
      if (aTitle === 'Ethereum') return -1;
      if (bTitle === 'Ethereum') return 1;
    }

    if (a.chainType === 'SVM') {
      if (aTitle === 'Solana') return -1;
      if (bTitle === 'Solana') return 1;
    }

    // Sort alphabetically by title for other chains within the same type
    return aTitle.localeCompare(bTitle);
  });
}
