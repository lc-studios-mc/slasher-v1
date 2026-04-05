import * as mc from "@minecraft/server";
import { SlasherState } from "./base";
import { COOLDOWN_IDS } from "../cooldown";
import { IdleState } from "./idle";

const ALLOW_RESTART_THLD = 0.3 * mc.TicksPerSecond;
const EXIT_THLD = 0.4 * mc.TicksPerSecond;

export class SlashingState extends SlasherState {
	private _animIndex = 0;
	private _restartQueued = false;

	override onEnter(): void {
		if (this._animIndex === 0) {
			this.s.player.startItemCooldown(COOLDOWN_IDS.SLASH_2, 0);
			this.s.player.startItemCooldown(COOLDOWN_IDS.SLASH_1, 2);
		} else {
			this.s.player.startItemCooldown(COOLDOWN_IDS.SLASH_1, 0);
			this.s.player.startItemCooldown(COOLDOWN_IDS.SLASH_2, 2);
		}
	}

	protected override onTick(): void {
		if (this.currentTick >= ALLOW_RESTART_THLD && this._restartQueued) {
			this.restart();
			return;
		}

		if (this.currentTick >= EXIT_THLD) {
			this.s.changeState(new IdleState(this.s));
		}
	}

	override onSwing(_event: mc.PlayerSwingStartAfterEvent): void {
		if (this.currentTick >= ALLOW_RESTART_THLD) {
			this.restart();
		} else {
			this._restartQueued = true;
		}
	}

	private restart(): void {
		const restartedState = new SlashingState(this.s);
		restartedState._animIndex = this._animIndex === 0 ? 1 : 0;
		this.s.changeState(restartedState);
	}
}
