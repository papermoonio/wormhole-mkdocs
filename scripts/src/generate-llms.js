// scripts/src/generate-llms.js
const path = require('path');
const fs = require('fs');

// Define the path to wormhole-docs
const docsDir = path.join(__dirname, '..', '..', 'wormhole-docs'); 
const outputFile = path.join(__dirname, '..', '..', 'llms.txt');
const snippetDir = path.join(__dirname, '..', '..', 'wormhole-docs', '.snippets');

// Regex to find lines like: --8<-- 'code/build/applications/...'
const SNIPPET_REGEX = /--8<--\s*["']([^"']+)["']/g;

// Utility function to gather .md files
function getAllMarkdownFiles(dir) {
    let results = [];
    if (!fs.existsSync(dir)) {
      console.warn(`Docs directory not found: ${dir}`);
      return results;
    }

    const items = fs.readdirSync(dir);
    for (const item of items) {
      const itemPath = path.join(dir, item);
      const stat = fs.statSync(itemPath);
      if (stat.isDirectory()) {
        // Recursively get files from subfolders
        results = results.concat(getAllMarkdownFiles(itemPath));
      } else if (item.endsWith('.md') || item.endsWith('.mdx')) {
        results.push(itemPath);
      }
    }
    return results;
}

// Build an index of doc pages (URLs only)
function buildIndexSection(files) {
    let section = `# List of doc pages (from learn/):\n`;
    files.forEach(file => {
      const relativePath = path.relative(docsDir, file);
      const docUrlPath = relativePath.replace(/\.(md|mdx)$/, '');
      const docUrl = `https://wormhole.com/docs/${docUrlPath}`;
      section += `Doc-Page: ${docUrl}\n`;
    });
    return section;
}

function parseLineRange(snippetPath) {
    // snippetPath e.g. "code/build/applications/wormhole-sdk/get-vaa.ts:13:20" split by ':'
    const parts = snippetPath.split(':');
  
    const fileOnly = parts[0];
    if (parts.length >= 3) {
      const lineStart = parseInt(parts[1], 10);
      const lineEnd   = parseInt(parts[2], 10);
      return { fileOnly, lineStart, lineEnd };
    } else {
      // no line range
      return { fileOnly, lineStart: null, lineEnd: null };
    }
}

function replaceSnippetPlaceholders(markdown, snippetDir) {
    return markdown.replace(SNIPPET_REGEX, (match, snippetRef) => {
      
      // Parse out lineStart/lineEnd
      const { fileOnly, lineStart, lineEnd } = parseLineRange(snippetRef);
  
      const absoluteSnippetPath = path.join(snippetDir, fileOnly);
  
      if (!fs.existsSync(absoluteSnippetPath)) {
        console.warn(`Snippet file not found: ${absoluteSnippetPath}. Leaving placeholder unchanged.`);
        return match; 
      }
  
      // Read snippet file
      let snippetContent = fs.readFileSync(absoluteSnippetPath, 'utf8');
  
      // If there's a line range, slice
      if (lineStart && lineEnd) {
        const lines = snippetContent.split('\n');
        snippetContent = lines.slice(lineStart, lineEnd).join('\n');
      }
  
      // Return the snippet raw:
      return snippetContent.trim();
  
    });
}

// Build content sections for each page
function buildContentSection(files) {
    let section = `\n# Full content for each doc page\n\n`;

    const snippetDir = path.join(__dirname, '..', '..', 'wormhole-docs', '.snippets');

    files.forEach(file => {
      const relativePath = path.relative(docsDir, file);
      const docUrlPath = relativePath.replace(/\.(md|mdx)$/, '');
      const docUrl = `https://wormhole.com/docs/learn/${docUrlPath}`;
  
      // Read the file content
      let fileContent = fs.readFileSync(file, 'utf8');

      // Replace snippet placeholders
      fileContent = replaceSnippetPlaceholders(fileContent, snippetDir);
  
      section += `Doc-Content: ${docUrl}\n`;
      section += `--- BEGIN CONTENT ---\n`;
      section += fileContent.trim();
      section += `\n--- END CONTENT ---\n\n`;
    });
    return section;
}

// Main execution
function main() {
    const files = getAllMarkdownFiles(docsDir);
  
    // Header
    let llmsContent = `# llms.txt\n`;
    llmsContent += `# Generated automatically. Do not edit directly.\n\n`;
    llmsContent += `Documentation: https://wormhole.com/docs\n`;
  
    // Add the index of pages
    llmsContent += buildIndexSection(files);
  
    // Add the full content
    llmsContent += buildContentSection(files);
  
    // Write to llms.txt
    fs.writeFileSync(outputFile, llmsContent, 'utf8');
    console.log(`llms.txt created or updated at: ${outputFile}`);
  }
  
// Execute
main();