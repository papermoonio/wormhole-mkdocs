// This script fetches the relayer NTT chains from the Wormhole SDK repository
// and generates a JSON file with the supported chains for each network.

import axios from 'axios';
import fs from 'fs';

// The below mapping is used to override the chain names in the output.
const chainNameOverrides: Record<string, string> = {
  Klaytn: "Kaia",
};

// The URL to the relayer file in the Wormhole SDK repository.
const RELAYER_FILE_URL =
	'https://raw.githubusercontent.com/wormhole-foundation/wormhole-sdk-ts/main/core/base/src/constants/contracts/relayer.ts';

async function extractRelayerNTTChains() {
	const res = await axios.get(RELAYER_FILE_URL);
	const text = res.data;

	const relayerChains: Record<string, string[]> = {
		Mainnet: [],
		Testnet: [],
		Devnet: [],
	};

	const networkBlockRegex = /\[\s*"(\w+)"\s*,\s*\[((?:.|\n)*?)\]\s*\]/gm;
	let match;
	while ((match = networkBlockRegex.exec(text)) !== null) {
		const network = match[1];
		const body = match[2];

		const chainRegex = /\[\s*"([\w\d]+)"\s*,\s*"0x[a-fA-F0-9]{40}"\s*\]/g;
		let chainMatch;
		while ((chainMatch = chainRegex.exec(body)) !== null) {
			const originalName = chainMatch[1];
			const normalizedName = chainNameOverrides[originalName] || originalName;

			relayerChains[network].push(normalizedName);
		}
	}

	relayerChains.Mainnet.push('Solana');
	relayerChains.Testnet.push('Solana');

	for (const net of Object.keys(relayerChains)) {
		relayerChains[net] = [...new Set(relayerChains[net])];
	}

	fs.mkdirSync('./src/generated', { recursive: true });
	fs.writeFileSync('./src/generated/ntt-support.json', JSON.stringify(relayerChains, null, 2));

	console.log('Wrote NTT relayer support to scripts/generated/ntt-support.json');
}

extractRelayerNTTChains();
