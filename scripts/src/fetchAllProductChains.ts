import fs from 'fs';
import path from 'path';
import { generateProductSupport } from './generateProductSupport';

const configPath = path.resolve(__dirname, 'config/product-support-config.json');

async function main() {
	const raw = fs.readFileSync(configPath, 'utf-8');
	const configs = JSON.parse(raw);

	for (const entry of configs) {
		await generateProductSupport(entry);
	}
}

main();
