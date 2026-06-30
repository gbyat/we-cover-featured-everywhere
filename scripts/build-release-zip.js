/**
 * Build the distributable plugin ZIP (same output as the GitHub release workflow).
 *
 * Usage:
 *   node scripts/build-release-zip.js
 *   node scripts/build-release-zip.js --build
 *
 * npm scripts:
 *   npm run build        # block plugins: assets + ZIP; PHP plugins: ZIP only
 *   npm run build:assets # wp-scripts build only (block plugins)
 *   npm run zip          # package current tree without rebuilding assets
 *   npm run pack         # alias for npm run build
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const archiver = require('archiver');
const { loadConfig, rootDir } = require('./load-config');

const config = loadConfig();
const slug = String(config.slug);
const zipInclude = config.zipInclude || { files: [], directories: [] };
const stagingDir = path.join(rootDir, slug);
const zipName = `${slug}.zip`;
const zipPath = path.join(rootDir, zipName);
const shouldBuild = process.argv.includes('--build');

/**
 * @param {string} source
 * @param {string} target
 */
function copyIfExists(source, target) {
	const sourcePath = path.join(rootDir, source);
	if (!fs.existsSync(sourcePath)) {
		return;
	}

	fs.cpSync(sourcePath, target, { recursive: true });
}

/**
 * @return {void}
 */
function runBlockBuild() {
	if (!config.hasBlocks) {
		return;
	}

	const packagePath = path.join(rootDir, 'package.json');
	const packageData = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
	const buildScript = packageData.scripts && packageData.scripts['build:assets'] ? 'build:assets' : 'build';

	console.log(`Building block assets (hasBlocks=true, script=${buildScript})…`);

	const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';

	const buildResult = spawnSync(npmCmd, ['run', buildScript], {
		cwd: rootDir,
		stdio: 'inherit',
		shell: process.platform === 'win32',
	});

	if (buildResult.error || buildResult.status !== 0) {
		console.error('Block build failed. Fix build errors before creating the ZIP.');
		process.exit(buildResult.status || 1);
	}
}

/**
 * @return {Promise<void>}
 */
function createZipArchive() {
	return new Promise((resolve, reject) => {
		const output = fs.createWriteStream(zipPath);
		const archive = archiver('zip', {
			zlib: { level: 9 },
		});

		output.on('close', resolve);
		output.on('error', reject);
		archive.on('error', reject);

		archive.pipe(output);
		archive.directory(stagingDir, slug);
		archive.finalize();
	});
}

async function main() {
	if (shouldBuild) {
		runBlockBuild();
	}

	if (fs.existsSync(stagingDir)) {
		fs.rmSync(stagingDir, { recursive: true, force: true });
	}
	fs.mkdirSync(stagingDir, { recursive: true });

	try {
		(zipInclude.files || []).forEach((fileName) => {
			copyIfExists(fileName, path.join(stagingDir, fileName));
		});

		(zipInclude.directories || []).forEach((dirName) => {
			copyIfExists(dirName, path.join(stagingDir, dirName));
		});

		if (fs.existsSync(zipPath)) {
			fs.unlinkSync(zipPath);
		}

		await createZipArchive();
	} finally {
		if (fs.existsSync(stagingDir)) {
			fs.rmSync(stagingDir, { recursive: true, force: true });
		}
	}

	console.log(`Release ZIP created: ${zipName}`);
}

main().catch((error) => {
	console.error(error.message || error);
	process.exit(1);
});
