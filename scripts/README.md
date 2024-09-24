# Scripts for Autogenerating Content

The scripts in this directory automate the generation and insertion of blockchain-specific content into documentation files. The content that gets automatically generated is as follows:

- The supported chains
- The Wormhole chain ID table
- Each of the contract addresses tables
- The finality/consistency level table

## Understand How the Scripts Work

The scripts perform two major actions:

1. **Generates chain data** - using the Wormhole SDK, the scripts collect details about the supported chains and then create formatted tables based off of this chain data
2. **Inserts generated content** - it finds specific <!--tag--> comments in the documentation files and replaces the content between these tags with the newly generated HTML, markdown, or data tables. The script looks specifically in the `.snippets/text` directory for these tags. So please make sure that if you're expanding upon the scripts' capabilities, you store any new tags in the text snippets directory

This process ensures that documentation stays up to date with minimal manual intervention by dynamically generating and injecting relevant data.

## Generate Updated Content: Run the Scripts

Before you can generate the content, you'll need to ensure you have the [`wormhole-docs` repository](https://github.com/wormhole-foundation/wormhole-docs) nested inside of the `wormhole-mkdocs` repository.

Next, you'll need to change directories to the `scripts` directory and install the dependencies:

```sh
cd scripts && npm i
```

To generate the content, run the following command:

```sh
npm run generate
```

Now, you should be able to check out the changes made in the `wormhole-docs` repository and open a PR with these changes.

## Update Chain Configurations

To update chain configurations, such as chain IDs, finality levels, explorers, faucets, and more, you'll need to modify the JSON chain file in the `scripts/src/chains/` directory. There should be a chain file for each of the supported chains.

The information from the chain files gets pulled into the blockchain environment pages found under Build > Start Building > Supported Networks. Additionally, the `title` parameter in the chain file is used in the Supported Networks page and the Reference section pages. If you modify the `title`, please make sure it is in human-readable format, with proper spacing between words.
