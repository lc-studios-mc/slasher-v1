import { SessionHandler } from "@/item_session/handler";
import { registerItemSession, type SessionContext } from "@/item_session/manager";
import * as mc from "@minecraft/server";
import { COOLDOWN_IDS } from "./cooldown";
import type { SlasherState } from "./states/base";
import { IdleState } from "./states/idle";

registerItemSession({
	itemTypeId: "slasher:slasher",
	createHandler: (ctx) => new SlasherHandler(ctx),
});

export class SlasherHandler extends SessionHandler {
	private _currentState: SlasherState;

	constructor(ctx: SessionContext) {
		super(ctx);
		this._currentState = new IdleState(this);
	}

	override onSessionStart(): void {
		super.onSessionStart();
		this._currentState.onEnter();
		this.player.startItemCooldown(COOLDOWN_IDS.PICK, 2);
	}

	changeState(to: SlasherState): void {
		this._currentState.onExit();
		this._currentState = to;
		this._currentState.onEnter();
	}

	getFaceLocation(): mc.Vector3 {
		const headLoc = this.player.getHeadLocation();
		const viewDir = this.player.getViewDirection();
		return {
			x: headLoc.x + viewDir.x,
			y: headLoc.y + viewDir.y,
			z: headLoc.z + viewDir.z,
		};
	}

	protected override onTick(): void {
		this._currentState.tick();
	}

	protected override canStartUse(event: mc.ItemStartUseAfterEvent): boolean {
		return this._currentState.canStartUse(event);
	}

	protected override onStartUse(event: mc.ItemStartUseAfterEvent): void {
		this._currentState.onStartUse(event);
	}

	protected override onStopUse(event: mc.ItemStopUseAfterEvent): void {
		this._currentState.onStopUse(event);
	}

	protected override onSwing(event: mc.PlayerSwingStartAfterEvent): void {
		this._currentState.onSwing(event);
	}
}
