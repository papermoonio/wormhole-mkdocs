---
title: Features
description: Explore features for creating clear, concise, and user-friendly documentation that engages and informs your audience.
---

# Features

## Admonitions

!!! note
    There can even be customized admonitions!

!!! warning
    Make sure to properly store and manage your private keys.

## Tables

| Endpoint       | URL                                  |
|----------------|--------------------------------------|
| Lorem ipsum    | <pre>```dolor sit amet```</pre>      |
| consectetur    | <pre>```adipiscing elit```</pre>     |
| sed do eiusmod | <pre>```tempor incididunt```</pre>   |
| ut labore et   | <pre>```dolore magna aliqua```</pre> |

## Tabbed Elements

=== "HTTP"

    | Endpoint       | URL                                  |
    |----------------|--------------------------------------|
    | Lorem ipsum    | <pre>```dolor sit amet```</pre>      |
    | consectetur    | <pre>```adipiscing elit```</pre>     |
    | sed do eiusmod | <pre>```tempor incididunt```</pre>   |
    | ut labore et   | <pre>```dolore magna aliqua```</pre> |

=== "WSS"

    | Endpoint     | URL                                  |
    |--------------|--------------------------------------|
    | Lorem ipsum  | <pre>```adipiscing elit```</pre>     |
    | ut labore et | <pre>```dolore magna aliqua```</pre> |

## Code Blocks

The following features are available for code blocks:

- Customized colors based on your branding
- Titles (i.e., the file name)
- Line numbers
- Highlighting specific lines
- Annnotations

For example:

```js title="example.js" linenums="1" hl_lines="10 11"
// Function to greet a user
function greetUser(name) {
  if (name) {
    console.log(`Hello, ${name}! Welcome to our documentation site.`);
  } else {
    console.log('Hello! Welcome to our documentation site.');
  }
}

// Call the function with a user's name
greetUser('Alice');

greetUser(); // (1)!
```

1. Call the function without a user's name

## Snippets

Snippets can be reusable text or code files. With the snippets, you can pull reusable content from a directory within your docs or an external URL. For example, if your code is in a separate GitHub repository, you can access it using the Raw GitHub URL

The following snippet is pulled in from a [GitHub URL](https://raw.githubusercontent.com/moonbeam-foundation/moonbeam-docs/master/.snippets/code/builders/build/substrate-api/polkadot-js-api/adding-accounts-mnemonic.js){target=\_blank}:

```js
--8<-- "text/example.md"
```

```js
--8<-- "https://raw.githubusercontent.com/moonbeam-foundation/moonbeam-docs/master/.snippets/code/builders/substrate/libraries/polkadot-js-api/adding-accounts-mnemonic.js"
```

## Terminal Window

Easy to update and create terminal output that provides visual confirmation of commands to be run and what the expected output should look like.

<div id="termynal" data-termynal>
  <span data-ty="input"><span class="file-path"></span>npx hardhat init</span>
  <span data-ty>888&nbsp;&nbsp;&nbsp;&nbsp;888&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;888&nbsp;888&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;888</span>
  <span data-ty>888&nbsp;&nbsp;&nbsp;&nbsp;888&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;888&nbsp;888&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;888</span>
  <span data-ty>888&nbsp;&nbsp;&nbsp;&nbsp;888&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;888&nbsp;888&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;888</span>
  <span data-ty>8888888888&nbsp;&nbsp;8888b.&nbsp;&nbsp;888d888&nbsp;.d88888&nbsp;88888b.&nbsp;&nbsp;&nbsp;8888b.&nbsp;&nbsp;888888</span>
  <span data-ty>888&nbsp;&nbsp;&nbsp;&nbsp;888&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"88b&nbsp;888P"&nbsp;&nbsp;d88"&nbsp;888&nbsp;888&nbsp;"88b&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"88b&nbsp;888</span>
  <span data-ty>888&nbsp;&nbsp;&nbsp;&nbsp;888&nbsp;.d888888&nbsp;888&nbsp;&nbsp;&nbsp;&nbsp;888&nbsp;&nbsp;888&nbsp;888&nbsp;&nbsp;888&nbsp;.d888888&nbsp;888</span>
  <span data-ty>888&nbsp;&nbsp;&nbsp;&nbsp;888&nbsp;888&nbsp;&nbsp;888&nbsp;888&nbsp;&nbsp;&nbsp;&nbsp;Y88b&nbsp;888&nbsp;888&nbsp;&nbsp;888&nbsp;888&nbsp;&nbsp;888&nbsp;Y88b.</span>
  <span data-ty>888&nbsp;&nbsp;&nbsp;&nbsp;888&nbsp;"Y888888&nbsp;888&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"Y88888&nbsp;888&nbsp;&nbsp;888&nbsp;"Y888888&nbsp;&nbsp;"Y888</span>
    <br>
  <span data-ty>👷 Welcome to Hardhat v2.22.2 👷‍</span>
    <br>
  <span data-ty="input" data-ty-prompt="?">&nbsp;What do you want to do? …</span>
  <span data-ty>&nbsp;&nbsp;Create a JavaScript project </span>
  <span data-ty>&nbsp;&nbsp;Create a TypeScript project </span>
  <span data-ty>&nbsp;&nbsp;Create a TypeScript project (with Viem) </span>
  <span data-ty="input" data-ty-prompt="❯ Create an empty hardhat.config.js"></span>
  <span data-ty>&nbsp;&nbsp;Quit </span>
</div>
