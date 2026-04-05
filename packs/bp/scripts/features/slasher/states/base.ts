import * as mc from "@minecraft/server";
import type { SlasherHandler } from "../handler";

export abstract class SlasherState {
	private _currentTick = 0;

	constructor(protected readonly s: SlasherHandler) {}

	get currentTick(): number {
		return this._currentTick;
	}

	onEnter(): void {}

	onExit(): void {}

	tick(): void {
		try {
			this.onTick();
		} finally {
			this._currentTick++;
		}
	}

	protected onTick(): void {}

	canStartUse(event: mc.ItemStartUseAfterEvent): boolean {
		return true;
	}

	onStartUse(event: mc.ItemStartUseAfterEvent): void {}

	onStopUse(event: mc.ItemStopUseAfterEvent): void {}

	onSwing(event: mc.PlayerSwingStartAfterEvent): void {}
}
