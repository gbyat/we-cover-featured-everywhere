#!/usr/bin/env node
/**
 * Apply translated msgstr values from scripts/translations/<locale>.json to PO files.
 */

const fs = require('fs');
const path = require('path');
const { loadConfig, rootDir } = require('./load-config');
const { applyCatalogToPo } = require('./po-msgids');

const config = loadConfig();
const slug = String(config.slug);
const domain = String(config.textDomain || slug);
const languagesDir = path.join(rootDir, 'languages');
const translationsDir = path.join(rootDir, 'scripts', 'translations');

/**
 * @param {string} poPath
 * @param {Record<string, string>} catalog
 * @return {number}
 */
function applyCatalog(poPath, catalog) {
	const content = fs.readFileSync(poPath, 'utf8');
	const result = applyCatalogToPo(content, catalog);
	fs.writeFileSync(poPath, result.content, 'utf8');
	return result.applied;
}

function main() {
	if (!fs.existsSync(translationsDir)) {
		console.error(`Missing translations directory: ${translationsDir}`);
		process.exit(1);
	}

	const locales = Array.isArray(config.locales) ? config.locales : [];
	let total = 0;

	locales.forEach((locale) => {
		const catalogPath = path.join(translationsDir, `${locale}.json`);
		const poPath = path.join(languagesDir, `${domain}-${locale}.po`);

		if (!fs.existsSync(catalogPath)) {
			console.warn(`Skip ${locale}: catalog not found (${catalogPath})`);
			return;
		}
		if (!fs.existsSync(poPath)) {
			console.warn(`Skip ${locale}: PO not found (${poPath})`);
			return;
		}

		const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8').replace(/^\uFEFF/, ''));
		const applied = applyCatalog(poPath, catalog);
		total += applied;
		console.log(`Applied ${applied} translation(s) to ${path.basename(poPath)}`);
	});

	console.log(`Total translations applied: ${total}`);
}

main();
