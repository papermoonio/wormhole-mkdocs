import axios from 'axios';
import fs from 'fs';

const chainNameOverrides: Record<string, string> = {
	Klaytn: 'Kaia',
};

function mergeTestnets(productChains: Record<string, string[]>) {
	const add = (base: string) => {
		if (!productChains.Testnet.includes(base)) productChains.Testnet.push(base);
	};

	for (const name of [...productChains.Testnet]) {
		if (name.endsWith('Sepolia')) {
			// Strip the suffix → base chain.  "Sepolia" alone maps to "Ethereum".
			const base = name.replace(/Sepolia$/, '') || 'Ethereum';
			add(base);
		} else if (name.endsWith('Holesky')) {
			// Holesky is an Ethereum testnet
			add('Ethereum');
		}
	}
}

export async function generateProductSupport({
	product,
	url,
	outputFile,
	customChains,
}: {
	product: string;
	url: string;
	outputFile: string;
	customChains?: Record<string, string[]>;
}) {
	const res = await axios.get(url);
	const text = res.data;

	const productChains: Record<string, string[]> = {
		Mainnet: [],
		Testnet: [],
		Devnet: [],
	};

	const networkBlockRegex =
		/\[\s*["'](\w+)["']\s*,\s*\[\s*((?:\s*\[[^\]]+\]\s*,?\s*)+)\s*\]\s*\]/gm;

	let match;
	while ((match = networkBlockRegex.exec(text)) !== null) {
		const network = match[1];
		const body = match[2];

		const chainRegex = /\[\s*["']([^"']+)["']\s*,\s*["'][^"']+["']\s*\]/g;

		let chainMatch;
		while ((chainMatch = chainRegex.exec(body)) !== null) {
			const originalName = chainMatch[1];
			const normalizedName = chainNameOverrides[originalName] || originalName;

			productChains[network].push(normalizedName);
		}
	}

	// Add any extra manual entries
	if (customChains) {
		for (const net of Object.keys(customChains)) {
			productChains[net].push(...customChains[net]);
		}
	}

	// Deduplicate
	for (const net of Object.keys(productChains)) {
		productChains[net] = [...new Set(productChains[net])];
	}

	// Merge Sepolia-style testnets into main testnets
	mergeTestnets(productChains);
	productChains.Testnet = [...new Set(productChains.Testnet)];

	try {
		await fs.mkdirSync('./src/generated', { recursive: true });
		await fs.writeFileSync(outputFile, JSON.stringify(productChains, null, 2));
		console.log(`Wrote ${product} support to ${outputFile}`);
	} catch (error) {
		console.error(`Failed to write ${product} support to ${outputFile}:`, error);
		throw error;
	}
}
