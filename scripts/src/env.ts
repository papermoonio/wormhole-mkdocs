import path from 'node:path';

const DEFAULT_SNIPPETS_RELATIVE = '../wormhole-docs/.snippets/text';

/**
 * Directory that contains the reusable doc snippets. Can be overridden with DOCS_SNIPPETS_DIR.
 */
export const DOCS_SNIPPETS_DIR = (() => {
  const custom = process.env.DOCS_SNIPPETS_DIR;
  if (custom && custom.trim().length > 0) {
    return path.resolve(custom);
  }
  return path.resolve(process.cwd(), DEFAULT_SNIPPETS_RELATIVE);
})();
