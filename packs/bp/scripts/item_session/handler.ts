import * as mc from "@minecraft/server";
import type { SessionContext } from "./manager";

export abstract class SessionHandler {
	private _currentTick = 0;
	private _isUsing = true;

	private _onItemStartUseEvent = (event: mc.ItemStartUseAfterEvent) => {
		if (event.source.id !== this.ctx.player.id) return;
		if (!this.canStartUse(event)) return;
		this._isUsing = true;
		this.onStartUse(event);
	};

	private _onItemStopUseEvent = (event: mc.ItemStopUseAfterEvent) => {
		if (event.source.id !== this.ctx.player.id) return;
		this._isUsing = false;
		this.onStopUse(event);
	};

	private _onSwingEvent = (event: mc.PlayerSwingStartAfterEvent) => {
		if (event.player.id !== this.ctx.player.id) return;
		this.onSwing(event);
	};

	constructor(readonly ctx: SessionContext) {}

	onSessionStart(): void {
		mc.world.afterEvents.itemStartUse.subscribe(this._onItemStartUseEvent);
		mc.world.afterEvents.itemStopUse.subscribe(this._onItemStopUseEvent);
		mc.world.afterEvents.playerSwingStart.subscribe(this._onSwingEvent);
	}

	onSessionStop(): void {
		mc.world.afterEvents.itemStartUse.unsubscribe(this._onItemStartUseEvent);
		mc.world.afterEvents.itemStopUse.unsubscribe(this._onItemStopUseEvent);
		mc.world.afterEvents.playerSwingStart.unsubscribe(this._onSwingEvent);
	}

	tick(): void {
		try {
			this.onTick();
		} finally {
			this._currentTick++;
		}
	}

	protected onTick(): void {}

	protected canStartUse(event: mc.ItemStartUseAfterEvent): boolean {
		return true;
	}

	protected onStartUse(event: mc.ItemStartUseAfterEvent): void {}

	protected onStopUse(event: mc.ItemStopUseAfterEvent): void {}

	protected onSwing(event: mc.PlayerSwingStartAfterEvent): void {}

	get currentTick(): number {
		return this._currentTick;
	}

	get dimension(): mc.Dimension {
		return this.ctx.player.dimension;
	}

	get player(): mc.Player {
		return this.ctx.player;
	}

	get equippable(): mc.EntityEquippableComponent {
		return this.ctx.equippable;
	}

	get health(): mc.EntityHealthComponent {
		return this.ctx.health;
	}

	get isUsing(): boolean {
		return this._isUsing;
	}
}
