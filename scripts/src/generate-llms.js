// scripts/src/generate-llms.js
const path = require('path');
const fs = require('fs');

// Define the path to wormhole-docs
const docsDir = path.join(__dirname, '..', '..', 'wormhole-docs'); 
const outputFile = path.join(__dirname, '..', '..', 'llms.txt');

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
      const docUrl = `https://wormhole.com/docs/learn/${docUrlPath}`;
      section += `Doc-Page: ${docUrl}\n`;
    });
    return section;
}

// Build content sections for each page
function buildContentSection(files) {
    let section = `\n# Full content for each doc page\n\n`;
    files.forEach(file => {
      const relativePath = path.relative(docsDir, file);
      const docUrlPath = relativePath.replace(/\.(md|mdx)$/, '');
      const docUrl = `https://wormhole.com/docs/learn/${docUrlPath}`;
  
      // Read the file content
      const fileContent = fs.readFileSync(file, 'utf8');
  
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