import { pack } from "@/packer";
import { syncDirectory } from "@/sync";
import { getEnvRequired, parseVersionString } from "@/utils";
import fs from "node:fs/promises";
import path from "node:path";
import { parseArgs, styleText } from "node:util";
import pDebounce from "p-debounce";

const { values: cliValues } = parseArgs({
	options: {
		watch: {
			type: "boolean",
			short: "w",
			default: false,
		},
		dev: {
			type: "boolean",
			short: "d",
			default: false,
		},
		version: {
			type: "string",
			short: "v",
			default: "0.0.1",
		},
	},
});
const shouldWatch = cliValues.watch;
const devMode = cliValues.dev;
const versionRaw = cliValues.version;

const slug = "slasher-sword";
const projectName = "Slasher Sword";
const description = "Chainsaw-sword addon";
const minEngineVersion = [1, 26, 0];
const versionArray = parseVersionString(versionRaw); // [0, 0, 1]
const versionLabel = `v${versionArray.join(".")}`; // "v0.0.1"
const displayName = `${projectName} ${devMode ? "DEV" : versionLabel}`;

const uuids = {
	bpHeader: "37de318b-ef42-4bd1-809d-8be964c3249e",
	bpDataModule: "06a4760a-e514-4f0e-94b8-d70a5baeb30f",
	bpScriptsModule: "137e8456-6770-43ca-8100-477d7f2267ef",
	rpHeader: "e8bdbf8b-a05c-4e83-bf56-35676834ef21",
	rpResourcesModule: "cab58695-9e0f-4c3c-871f-283ec3588ba5",
};

const bpManifest: Record<string, unknown> = {
	format_version: 2,
	header: {
		name: displayName,
		description,
		uuid: uuids.bpHeader,
		version: versionArray,
		min_engine_version: minEngineVersion,
	},
	modules: [
		{
			type: "data",
			uuid: uuids.bpDataModule,
			version: versionArray,
		},
		{
			language: "javascript",
			type: "script",
			uuid: uuids.bpScriptsModule,
			version: versionArray,
			entry: "scripts/entry.js",
		},
	],
	dependencies: [
		{
			uuid: uuids.rpHeader,
			version: versionArray,
		},
		{
			module_name: "@minecraft/server",
			version: "2.5.0",
		},
	],
};

const rpManifest: Record<string, unknown> = {
	format_version: 2,
	header: {
		name: displayName,
		description,
		uuid: uuids.rpHeader,
		version: versionArray,
		min_engine_version: minEngineVersion,
	},
	modules: [
		{
			type: "resources",
			uuid: uuids.rpResourcesModule,
			version: versionArray,
		},
	],
	capabilities: ["pbr"],
};

const bpSrcDir = "packs/bp";
const rpSrcDir = "packs/rp";

const outDirPrefix = devMode ? `dist/dev` : `dist/${versionLabel}`;
const bpOutDir = path.join(outDirPrefix, "bp");
const rpOutDir = path.join(outDirPrefix, "rp");

const bpTarget = devMode ? path.join(getEnvRequired("DEV_BP_PREFIX"), slug) : undefined;
const rpTarget = devMode ? path.join(getEnvRequired("DEV_RP_PREFIX"), slug) : undefined;

const buildBp = async () => {
	await fs.rm(bpOutDir, { recursive: true, force: true });
	await fs.mkdir(bpOutDir, { recursive: true });

	await pack([bpSrcDir], bpOutDir);

	const scriptsOutDir = path.join(bpOutDir, "scripts");
	await fs.mkdir(scriptsOutDir, { recursive: true });
	await Bun.build({
		entrypoints: [path.join(bpSrcDir, "scripts", "entry.ts")],
		outdir: scriptsOutDir,
		tsconfig: path.join(bpSrcDir, "tsconfig.json"),
		external: ["@minecraft"],
		format: "esm",
	});

	const manifestPath = path.join(bpOutDir, "manifest.json");
	const manifestText = JSON.stringify(bpManifest, null, "\t");
	await Bun.write(manifestPath, manifestText);

	if (bpTarget !== undefined) {
		await syncDirectory(bpOutDir, bpTarget);
	}
};

const buildRp = async () => {
	await fs.rm(rpOutDir, { recursive: true, force: true });
	await fs.mkdir(rpOutDir, { recursive: true });

	await pack([rpSrcDir], rpOutDir);

	const manifestPath = path.join(rpOutDir, "manifest.json");
	const manifestText = JSON.stringify(rpManifest, null, "\t");
	await Bun.write(manifestPath, manifestText);

	if (rpTarget !== undefined) {
		await syncDirectory(rpOutDir, rpTarget);
	}
};

const executeBuild = async () => {
	console.log(`Building...`);

	const startTime = performance.now();

	await Promise.all([buildBp(), buildRp()]);

	const endTime = performance.now();
	const totalTimeText = (endTime - startTime).toFixed(2);

	console.log(styleText("greenBright", `Build finished in ${totalTimeText} ms`));
};

await executeBuild();

if (shouldWatch) {
	const buildDebounced = pDebounce(async () => {
		console.clear();
		await executeBuild();
	}, 250);

	const watcher = fs.watch("packs", { recursive: true });

	console.log(`Watching for file changes...`);

	for await (const _event of watcher) {
		buildDebounced();
	}
}
