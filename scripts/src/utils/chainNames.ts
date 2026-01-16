const CHAIN_NAME_OVERRIDES: Record<string, string> = {
  Klaytn: 'Kaia',
};

export function normalizeChainName(name: string): string {
  return CHAIN_NAME_OVERRIDES[name] ?? name;
}
