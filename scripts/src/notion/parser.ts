import { ContractTableRow } from '../util';
import { NotionPage, NotionPropertyValue, NotionRichText } from './types';

export type ContractRow = ContractTableRow;

export function extractTitle(property: NotionPropertyValue | undefined): string | undefined {
  if (!property || property.type !== 'title' || !Array.isArray(property.title)) return undefined;
  return joinPlainText(property.title);
}

export function extractRichText(property: NotionPropertyValue | undefined): { text: string; href?: string } | undefined {
  if (!property || property.type !== 'rich_text' || !Array.isArray(property.rich_text)) return undefined;

  const text = joinPlainText(property.rich_text);
  if (!text || text.trim().length === 0) return undefined;

  const href = property.rich_text.find((entry) => entry.href)?.href ?? undefined;

  return { text: text.trim(), href };
}

export function extractContractRows(
  pages: NotionPage[],
  propertyName: string,
  options?: { chainProperty?: string }
): ContractTableRow[] {
  const chainProp = options?.chainProperty ?? 'Chain';
  const rows = new Map<string, ContractTableRow>();

  for (const page of pages) {
    const chainName = extractTitle(page.properties?.[chainProp]);
    if (!chainName) continue;

    const property = extractRichText(page.properties?.[propertyName]);
    if (!property) continue;

    const normalized = property.text.trim();
    if (!normalized || normalized.toLowerCase() === 'n/a') continue;

    const key = chainName.trim();
    const row: ContractRow = {
      chain: key,
      address: normalized,
      href: property.href,
    };

    rows.set(key.toLowerCase(), row);
  }

  return Array.from(rows.values());
}

function joinPlainText(entries: NotionRichText[]): string {
  return entries.map((entry) => entry.plain_text ?? '').join('').trim();
}
