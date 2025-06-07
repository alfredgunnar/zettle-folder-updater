# Zettle Folder Updater

This script updates the POS folder for a list of products in Zettle.

`update_folder.mjs` reads from a file called `product.json` and updates the POS folder for each UUID in the file.

You can run `scrape_product_uuids.mjs` to get a list of product UUIDs.

## Usage

```bash
node scrape_product_uuids.mjs > product.json
node update_folder.mjs
```
