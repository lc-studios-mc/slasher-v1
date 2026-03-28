import { deepmerge as deepmergeFactory } from "@fastify/deepmerge";
import { Glob, JSON5 } from "bun";
import path from "node:path";

const deepmerge = deepmergeFactory();

const shouldExclude = (p: string): boolean => {
	if (p.startsWith("scripts")) return true;
	if (p === "tsconfig.json") return true;
	if (p === ".gitkeep") return true;
	return false;
};

const getMapEntryArray = <K, V extends unknown[]>(map: Map<K, V>, key: K): V => {
	let array = map.get(key);
	if (array === undefined) {
		array = [] as unknown[] as V;
		map.set(key, array);
	}
	return array;
};

export const pack = async (layers: string[], outDir: string): Promise<void> => {
	const objectsToMerge = new Map<string, object[]>();

	// Initial scan and processing
	for (const srcDir of layers) {
		const glob = new Glob("**/*");
		const scanner = glob.scan({ cwd: srcDir, dot: true, onlyFiles: true });

		for await (const relativePath of scanner) {
			if (shouldExclude(relativePath)) continue;

			const ext = path.extname(relativePath);
			const srcPath = path.join(srcDir, relativePath);
			const destPath = path.join(outDir, relativePath);
			const srcFile = Bun.file(srcPath);

			// Queue JSON5 files to merge later
			if (ext === ".json5") {
				const text = await srcFile.text();
				const data = JSON5.parse(text);
				if (typeof data === "object" && data !== null) {
					const parsedPath = path.parse(relativePath);
					parsedPath.ext = ".json";
					parsedPath.base = `${parsedPath.name}.json`;
					const jsonPath = path.format(parsedPath);
					getMapEntryArray(objectsToMerge, jsonPath).push(data);
				}
				continue;
			}

			// Copy immediately
			await Bun.write(destPath, srcFile);
		}
	}

	// Merge and write objects
	for (const [relativePath, objects] of objectsToMerge) {
		const merged = objects.reduce((acc, current) => {
			return deepmerge(acc, current);
		}, {});
		const text = JSON.stringify(merged, null, "\t") ?? "{}";
		const destPath = path.join(outDir, relativePath);
		await Bun.write(destPath, Buffer.from(text, "utf8"));
	}
};
