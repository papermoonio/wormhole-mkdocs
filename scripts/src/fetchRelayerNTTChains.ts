import axios from 'axios';
import fs from 'fs';

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
			relayerChains[network].push(chainMatch[1]);
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
