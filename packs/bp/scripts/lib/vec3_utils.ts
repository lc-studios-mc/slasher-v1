import type { Vector3 } from "@minecraft/server";
import { vec3 } from "gl-matrix";

const AXIS_UP = vec3.fromValues(0, 1, 0);
const AXIS_FWD = vec3.fromValues(0, 0, 1);
const AXIS_RIGHT = vec3.fromValues(1, 0, 0);

const scratchUp = vec3.create();
const scratchFwd = vec3.create();
const scratchRight = vec3.create();

export const vec3_fromObject = (obj?: Partial<Vector3>, defaults?: Partial<Vector3>) => {
	const x = obj?.x ?? defaults?.x ?? 0;
	const y = obj?.y ?? defaults?.y ?? 0;
	const z = obj?.z ?? defaults?.z ?? 0;
	return vec3.fromValues(x, y, z);
};

export const vec3_toObject = (vec: vec3): Vector3 => ({
	x: vec[0],
	y: vec[1],
	z: vec[2],
});

export const vec3_offsetRelative = (
	out: vec3,
	origin: vec3,
	direction: vec3,
	offset: vec3,
): vec3 => {
	vec3.normalize(scratchFwd, direction);
	vec3.cross(scratchRight, scratchFwd, AXIS_UP);

	if (vec3.squaredLength(scratchRight) < 0.0001) {
		vec3.copy(scratchRight, AXIS_RIGHT);
	} else {
		vec3.normalize(scratchRight, scratchRight);
	}

	vec3.cross(scratchUp, scratchRight, scratchFwd);

	vec3.copy(out, origin);
	vec3.scaleAndAdd(out, out, scratchRight, offset[0]);
	vec3.scaleAndAdd(out, out, scratchUp, offset[1]);
	vec3.scaleAndAdd(out, out, scratchFwd, offset[2]);

	return out;
};

export const vec3_redirect = (out: vec3, source: vec3, direction: vec3): vec3 => {
	if (vec3.squaredLength(direction) < 0.0001) {
		return vec3.copy(out, source);
	}

	const magnitude = vec3.length(source);
	vec3.normalize(out, direction);
	vec3.scale(out, out, magnitude);

	return out;
};
