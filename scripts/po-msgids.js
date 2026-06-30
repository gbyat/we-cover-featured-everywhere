/**
 * Small PO helpers for extracting msgids and applying catalog translations.
 */

/**
 * @param {string} value
 * @return {string}
 */
function unescapePo(value) {
	return value
		.replace(/\\n/g, '\n')
		.replace(/\\"/g, '"')
		.replace(/\\\\/g, '\\');
}

/**
 * @param {string} value
 * @return {string}
 */
function escapePo(value) {
	return value
		.replace(/\\/g, '\\\\')
		.replace(/"/g, '\\"')
		.replace(/\n/g, '\\n');
}

/**
 * Extract non-empty msgids from POT/PO content (handles multiline msgid/msgstr).
 *
 * @param {string} content
 * @return {string[]}
 */
function extractMsgids(content) {
	/** @type {string[]} */
	const msgids = [];
	let state = null;
	let buffer = '';

	const flushMsgid = () => {
		if ('msgid' !== state) {
			return;
		}

		const unescaped = unescapePo(buffer);
		if ('' !== unescaped) {
			msgids.push(unescaped);
		}
	};

	for (const line of content.replace(/^\uFEFF/, '').split(/\r?\n/)) {
		if (line.startsWith('msgid ')) {
			flushMsgid();
			buffer = line.slice(6).trim().replace(/^"/, '').replace(/"$/, '');
			state = 'msgid';
			continue;
		}

		if (line.startsWith('msgstr ')) {
			flushMsgid();
			buffer = line.slice(7).trim().replace(/^"/, '').replace(/"$/, '');
			state = 'msgstr';
			continue;
		}

		if (/^\s*"/.test(line) && state) {
			buffer += line.trim().slice(1, -1);
			continue;
		}

		if ('' === line.trim() && state) {
			flushMsgid();
			buffer = '';
			state = null;
		}
	}

	flushMsgid();

	return msgids;
}

/**
 * @param {string[]} lines
 * @param {number} start
 * @param {'msgid'|'msgstr'} field
 * @return {{ value: string, rawLines: string[], nextIndex: number }}
 */
function readPoField(lines, start, field) {
	const prefix = `${field} `;
	if (start >= lines.length || !lines[start].startsWith(prefix)) {
		return { value: '', rawLines: [], nextIndex: start };
	}

	/** @type {string[]} */
	const rawLines = [];
	let value = lines[start].slice(prefix.length).trim().replace(/^"/, '').replace(/"$/, '');
	rawLines.push(lines[start]);
	let index = start + 1;

	while (index < lines.length && /^\s*"/.test(lines[index])) {
		value += lines[index].trim().slice(1, -1);
		rawLines.push(lines[index]);
		index += 1;
	}

	return { value, rawLines, nextIndex: index };
}

/**
 * @param {string} translation
 * @return {string[]}
 */
function formatMsgstrLines(translation) {
	return [`msgstr "${escapePo(translation)}"`];
}

/**
 * @param {string} poContent
 * @param {Record<string, string>} catalog
 * @return {{ content: string, applied: number }}
 */
function applyCatalogToPo(poContent, catalog) {
	const lines = poContent.replace(/^\uFEFF/, '').split(/\r?\n/);
	/** @type {string[]} */
	const out = [];
	let applied = 0;
	let index = 0;

	while (index < lines.length) {
		/** @type {string[]} */
		const comments = [];

		while (index < lines.length && lines[index].startsWith('#')) {
			comments.push(lines[index]);
			index += 1;
		}

		if (index >= lines.length) {
			break;
		}

		if (!lines[index].startsWith('msgid ')) {
			out.push(...comments, lines[index]);
			index += 1;
			continue;
		}

		const msgid = readPoField(lines, index, 'msgid');
		const msgstr = readPoField(lines, msgid.nextIndex, 'msgstr');
		index = msgstr.nextIndex;

		const msgidText = unescapePo(msgid.value);
		let msgstrLines = msgstr.rawLines;

		if (
			Object.prototype.hasOwnProperty.call(catalog, msgidText) &&
			'string' === typeof catalog[msgidText] &&
			'' !== catalog[msgidText]
		) {
			applied += 1;
			msgstrLines = formatMsgstrLines(catalog[msgidText]);
		}

		out.push(...comments, ...msgid.rawLines, ...msgstrLines);

		if (index < lines.length && '' === lines[index].trim()) {
			out.push('');
			index += 1;
		}
	}

	return { content: `${out.join('\n')}\n`, applied };
}

module.exports = {
	unescapePo,
	escapePo,
	extractMsgids,
	applyCatalogToPo,
};
