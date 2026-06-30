const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { loadConfig, rootDir } = require('./load-config');

const config = loadConfig();
const packagePath = path.join(rootDir, 'package.json');
const pluginFilePath = path.join(rootDir, `${config.slug}.php`);
const changelogPath = path.join(rootDir, 'CHANGELOG.md');
const readmeMdPath = path.join(rootDir, 'README.md');
const readmeTxtPath = path.join(rootDir, 'readme.txt');
const repoSlug = String(config.githubRepo);

const packageData = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
const version = packageData.version;
const today = new Date().toISOString().slice(0, 10);
const versionConstant = String(config.versionConstant);

function runGit(command) {
	return execSync(command, {
		cwd: rootDir,
		encoding: 'utf8',
		stdio: ['pipe', 'pipe', 'ignore'],
	}).trim();
}

function updatePluginMainFile() {
	let content = fs.readFileSync(pluginFilePath, 'utf8');
	content = content.replace(/Version:\s*[0-9]+\.[0-9]+\.[0-9]+/, `Version: ${version}`);
	content = content.replace(
		new RegExp(`define\\(\\s*'${versionConstant}',\\s*'[^']*'\\s*\\);`),
		`define( '${versionConstant}', '${version}' );`
	);
	fs.writeFileSync(pluginFilePath, content, 'utf8');
}

function updateReadmeStableTag(readmePath, markdown) {
	if (!fs.existsSync(readmePath)) {
		return;
	}

	let content = fs.readFileSync(readmePath, 'utf8');
	if (markdown) {
		content = content.replace(/\*\*Stable tag:\*\*\s*[0-9]+\.[0-9]+\.[0-9]+/, `**Stable tag:** ${version}`);
	} else {
		content = content.replace(/Stable tag:\s*[0-9]+\.[0-9]+\.[0-9]+/, `Stable tag: ${version}`);
	}
	fs.writeFileSync(readmePath, content, 'utf8');
}

function ensureChangelogExists() {
	if (fs.existsSync(changelogPath)) {
		return;
	}

	const initial = `# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

`;
	fs.writeFileSync(changelogPath, initial, 'utf8');
}

function buildEntryBody() {
	try {
		let lastTag = '';
		try {
			lastTag = runGit('git describe --tags --abbrev=0');
		} catch (error) {
			lastTag = '';
		}

		const range = lastTag ? `${lastTag}..HEAD` : '-20';
		const log = runGit(`git log ${range} --pretty=format:%s --no-merges`);
		if (!log) {
			return '- Version update';
		}

		const lines = log
			.split('\n')
			.map((line) => line.trim())
			.filter((line) => line.length > 0)
			.filter((line) => !/^Release v[0-9]+\.[0-9]+\.[0-9]+$/i.test(line))
			.filter((line) => !/^Version update$/i.test(line))
			.slice(0, 12)
			.map((line) => `- ${line}`);

		return lines.length > 0 ? lines.join('\n') : '- Version update';
	} catch (error) {
		return '- Version update';
	}
}

/**
 * @param {string} targetVersion
 * @return {string}
 */
function getChangelogEntryBody(targetVersion) {
	if (!fs.existsSync(changelogPath)) {
		return '';
	}

	const content = fs.readFileSync(changelogPath, 'utf8');
	const escapedVersion = targetVersion.replace(/\./g, '\\.');
	const match = content.match(
		new RegExp(`## \\[${escapedVersion}\\] - [0-9-]+\\n\\n([\\s\\S]*?)(?=\\n## \\[|$)`)
	);

	return match && match[1] ? match[1].trim() : '';
}

/**
 * @param {string} body
 * @return {string}
 */
function markdownBulletsToReadmeTxt(body) {
	return body
		.split('\n')
		.map((line) => line.replace(/^- /, '* '))
		.filter((line) => line.length > 0)
		.join('\n');
}

/**
 * @param {string} body
 * @param {string} sectionTitle
 * @return {string}
 */
function upsertMarkdownChangelogSection(body, sectionTitle) {
	if (!fs.existsSync(readmeMdPath) || '' === body) {
		return;
	}

	let content = fs.readFileSync(readmeMdPath, 'utf8');
	content = content.replace(/\n### Unreleased\n[\s\S]*?(?=\n### |\n---|\n## |$)/, '\n');
	content = content.replace(/\*\*Version:\*\*\s*[0-9]+\.[0-9]+\.[0-9]+/, `**Version:** ${version}`);

	const section = `### ${sectionTitle}\n\n${body}\n`;
	const escapedTitle = sectionTitle.replace(/\./g, '\\.');
	const sectionPattern = new RegExp(`### ${escapedTitle}\\n\\n[\\s\\S]*?(?=\\n### |\\n---|\\n## |$)`);

	if (sectionPattern.test(content)) {
		content = content.replace(sectionPattern, `${section.trim()}\n`);
	} else {
		content = content.replace(/(## Changelog\n\n)/, `$1${section}\n`);
	}

	fs.writeFileSync(readmeMdPath, content, 'utf8');
}

/**
 * @param {string} body
 * @param {string} sectionTitle
 * @return {void}
 */
function upsertReadmeTxtChangelogSection(body, sectionTitle) {
	if (!fs.existsSync(readmeTxtPath) || '' === body) {
		return;
	}

	let content = fs.readFileSync(readmeTxtPath, 'utf8');
	content = content.replace(/\n= Unreleased =\n[\s\S]*?(?=\n= |\n== |$)/, '\n');

	const section = `= ${sectionTitle} =\n${markdownBulletsToReadmeTxt(body)}\n`;
	const escapedTitle = sectionTitle.replace(/\./g, '\\.');
	const sectionPattern = new RegExp(`= ${escapedTitle} =\\n[\\s\\S]*?(?=\\n= |\\n== |$)`);

	if (sectionPattern.test(content)) {
		content = content.replace(sectionPattern, section.trim());
	} else {
		content = content.replace(/(== Changelog ==\n\n)/, `$1${section}\n`);
	}

	fs.writeFileSync(readmeTxtPath, content, 'utf8');
}

function syncPublicChangelogs() {
	const entryBody = getChangelogEntryBody(version);
	if ('' === entryBody) {
		return;
	}

	upsertMarkdownChangelogSection(entryBody, version);
	upsertReadmeTxtChangelogSection(entryBody, version);
}

function upsertChangelog() {
	ensureChangelogExists();
	let content = fs.readFileSync(changelogPath, 'utf8');
	const escapedVersion = version.replace(/\./g, '\\.');
	const hasVersion = new RegExp(`## \\[${escapedVersion}\\]`).test(content);

	if (!hasVersion) {
		const entryBody = buildEntryBody();
		const newEntry = `## [${version}] - ${today}

${entryBody}

`;
		const firstVersionHeaderIndex = content.search(/^## \[/m);
		if (firstVersionHeaderIndex >= 0) {
			content = content.slice(0, firstVersionHeaderIndex) + newEntry + content.slice(firstVersionHeaderIndex);
		} else {
			content = `${content.trim()}\n\n${newEntry}`;
		}
	}

	content = content.replace(/\n## \[Unreleased\][\s\S]*?(?=\n## \[|$)/, '');

	const linkLine = `[${version}]: https://github.com/${repoSlug}/releases/tag/v${version}`;
	if (!content.includes(linkLine)) {
		content = `${content.trim()}\n\n${linkLine}\n`;
	}

	fs.writeFileSync(changelogPath, content, 'utf8');
}

updatePluginMainFile();
updateReadmeStableTag(readmeMdPath, true);
updateReadmeStableTag(readmeTxtPath, false);
upsertChangelog();
syncPublicChangelogs();

console.log(`Version synchronized to ${version}.`);
