# Mkdocs Framework and Material Theme for the Wormhole Docs

This repo contains the Mkdocs config files, theme overrides, and custom CSS for the Wormhole documentation site.

- [Mkdocs](https://www.mkdocs.org/)
- [Material for Mkdocs](https://squidfunk.github.io/mkdocs-material/)

The actual content is stored in the wormhole-docs repo and pulled into the wormhole-docs directory during build.

- [Wormhole Docs](https://github.com/wormhole-foundation/wormhole-docs)

## Install Dependencies

To get started, you need to install [mkdocs](https://www.mkdocs.org/). All dependencies, including mkdocs, can be installed with a single command; you can run:

```bash
pip install -r requirements.txt
```

## Getting Started

With the dependencies installed, you can proceed to clone the necessary repos. For everything to work correctly, the file structure needs to be as follows:

```text
wormhole-mkdocs
|--- /material-overrides/ (folder)
|--- /wormhole-docs/ (repository)
|--- mkdocs.yml
```

To set up the structure, follow these steps:

1. Clone this repository:

    ```bash
    git clone https://github.com/papermoonio/wormhole-mkdocs
    ```

2. Inside the folder just created, clone the [wormhole-docs repository](https://github.com/wormhole-foundation/wormhole-docs):

    ```bash
    cd wormhole-mkdocs
    git clone https://github.com/wormhole-foundation/wormhole-docs.git
    ```

3. In the `wormhole-mkdocs` folder (which should be the current one), you can build the site by running:

    ```bash
    mkdocs serve
    ```

After a successful build, the site should be available at `http://127.0.0.1:8000`.

## Editing Theme Files

If you're editing any of the files in the `material-overrides` directory, you can run the following command to watch for these changes and render them automatically:

```bash
mkdocs serve --watch-theme
```

Otherwise, you'll need to stop the server (`control + C`) and restart it (`mkdocs serve`) to see the changes.
