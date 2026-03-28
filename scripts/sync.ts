import { $ } from "bun";
import { mkdir } from "node:fs/promises";
import os from "node:os";

const PLATFORM = process.platform;
const IS_WSL = PLATFORM === "linux" && os.release().toLowerCase().includes("microsoft");

const toWinPath = async (p: string): Promise<string> => {
	return (await $`wslpath -w -a ${p}`.text()).trim();
};

const ROBOCOPY_FLAGS = ["/MIR", "/COPY:DT", "/DCOPY:DAT", "/R:0", "/W:0", "/MT:32", "/XJ"] as const;

const robocopy = async (src: string, dest: string): Promise<void> => {
	const { exitCode, stdout } = await $`robocopy.exe ${src} ${dest} ${ROBOCOPY_FLAGS}`
		.nothrow()
		.quiet();

	if (exitCode >= 8) {
		throw new Error(`Robocopy failed (${exitCode}): ${stdout.toString()}`);
	}
};

const rsync = async (src: string, dest: string): Promise<void> => {
	const srcPath = src.endsWith("/") ? src : `${src}/`;

	await mkdir(dest, { recursive: true });

	const { exitCode, stderr } = await $`rsync -az --delete ${srcPath} ${dest}`.nothrow().quiet();

	if (exitCode >= 1) {
		throw new Error(`rsync failed (${exitCode}): ${stderr.toString()}`);
	}
};

export const syncDirectory = async (src: string, dest: string): Promise<void> => {
	if (PLATFORM === "win32") {
		return robocopy(src, dest);
	}

	if (IS_WSL) {
		const [winSrc, winDest] = await Promise.all([toWinPath(src), toWinPath(dest)]);

		const srcIsWin = /^[a-zA-Z]:/.test(winSrc);
		const destIsWin = /^[a-zA-Z]:/.test(winDest);

		if (srcIsWin || destIsWin) {
			return robocopy(winSrc, winDest);
		}
	}

	if (PLATFORM === "linux" || PLATFORM === "darwin") {
		return rsync(src, dest);
	}

	throw new Error(`Unsupported platform: ${PLATFORM}`);
};
