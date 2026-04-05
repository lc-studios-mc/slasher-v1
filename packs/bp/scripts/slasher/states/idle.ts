import * as mc from "@minecraft/server";
import { SlasherState } from "./base";
import { SlashingState } from "./slashing";

export class IdleState extends SlasherState {
	override onSwing(_event: mc.PlayerSwingStartAfterEvent): void {
		this.s.changeState(new SlashingState(this.s));
	}
}
