import { randomFloat } from "@/lib/math";
import { vec3_fromObject, vec3_offsetRelative, vec3_toObject } from "@/lib/vec3_utils";
import * as mc from "@minecraft/server";
import { vec3 } from "gl-matrix";
import { COOLDOWN_IDS } from "../cooldown";
import { SlasherState } from "./base";
import { IdleState } from "./idle";

const ALLOW_RESTART_THLD = 0.3 * mc.TicksPerSecond;
const EXIT_THLD = 0.4 * mc.TicksPerSecond;
const TRAIL_PARTICLE_OFFSET = vec3.fromValues(1, 0, 1);

export class SlashingState extends SlasherState {
	private _animIndex = 0;
	private _restartQueued = false;

	override onEnter(): void {
		const headLoc = this.s.player.getHeadLocation();
		const viewDir = this.s.player.getViewDirection();

		this.s.dimension.playSound("slasher.slasher.slash", this.s.getFaceLocation(headLoc, viewDir), {
			volume: 1.5,
			pitch: randomFloat(0.93, 1.07),
		});

		if (this._animIndex === 0) {
			this.s.player.startItemCooldown(COOLDOWN_IDS.SLASH_2, 0);
			this.s.player.startItemCooldown(COOLDOWN_IDS.SLASH_1, 2);
		} else {
			this.s.player.startItemCooldown(COOLDOWN_IDS.SLASH_1, 0);
			this.s.player.startItemCooldown(COOLDOWN_IDS.SLASH_2, 2);
		}

		const trailParticleOrigin = vec3.create();
		vec3_offsetRelative(
			trailParticleOrigin,
			vec3_fromObject(headLoc),
			vec3_fromObject(viewDir),
			TRAIL_PARTICLE_OFFSET,
		);

		const molangMap = new mc.MolangVariableMap();
		this.s.dimension.spawnParticle(
			"slasher:slasher_trail_emitter",
			vec3_toObject(trailParticleOrigin),
			molangMap,
		);
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
