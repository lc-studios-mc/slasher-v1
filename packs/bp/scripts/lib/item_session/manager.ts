import * as mc from "@minecraft/server";
import type { SessionHandler } from "./handler";

export type SessionConfig = {
	readonly itemTypeId: string;
	readonly createHandler: (ctx: SessionContext) => SessionHandler;
};

export type SessionContext = {
	readonly config: SessionConfig;
	readonly player: mc.Player;
	readonly equippable: mc.EntityEquippableComponent;
	readonly health: mc.EntityHealthComponent;
	readonly slotIndex: number;
	readonly initialItemStack: mc.ItemStack;
};

type SessionInstance = {
	handler: SessionHandler;
	ctx: SessionContext;
};

const configsByItemTypeId = new Map<string, SessionConfig>();
const sessionsByPlayerId = new Map<string, SessionInstance>();

export const registerItemSession = (config: SessionConfig): void => {
	configsByItemTypeId.set(config.itemTypeId, config);
};

const stopActiveSession = (player: mc.Player, logError = true): void => {
	const session = sessionsByPlayerId.get(player.id);
	if (!session) return;

	try {
		session.handler.onSessionStop();
	} catch (error) {
		if (logError) {
			console.error(`[ItemSession] Error stopping session for ${player.name}:`, error);
			if (error instanceof Error && error.stack) console.error(error.stack);
		}
	} finally {
		sessionsByPlayerId.delete(player.id);
	}
};

const tickPlayer = (player: mc.Player): void => {
	let session = sessionsByPlayerId.get(player.id);

	const health = player.getComponent(mc.EntityComponentTypes.Health)!;
	const equippable = player.getComponent(mc.EntityComponentTypes.Equippable)!;
	const itemStack = equippable.getEquipment(mc.EquipmentSlot.Mainhand);

	// Validate current session
	if (session) {
		let isValid = true;

		if (!player.isValid) isValid = false;
		else if (health.currentValue <= 0) isValid = false;
		else if (player.selectedSlotIndex !== session.ctx.slotIndex) isValid = false;
		else if (!itemStack || itemStack.typeId !== session.ctx.config.itemTypeId) isValid = false;

		if (!isValid) {
			stopActiveSession(player);
			session = undefined;
		}
	}

	const canStartNewSession = player.isValid && health.currentValue > 0 && itemStack;

	// Try start new session if none exists
	if (!session && canStartNewSession) {
		const config = configsByItemTypeId.get(itemStack.typeId);

		if (config) {
			try {
				const ctx: SessionContext = {
					config,
					player,
					equippable,
					health,
					slotIndex: player.selectedSlotIndex,
					initialItemStack: itemStack,
				};

				const handler = config.createHandler(ctx);
				handler.onSessionStart();

				session = { handler, ctx };
				sessionsByPlayerId.set(player.id, session);
			} catch (error) {
				console.error(`[ItemSession] Error starting session for ${player.name}:`, error);
				if (error instanceof Error && error.stack) console.error(error.stack);
			}
		}
	}

	if (!session) return;

	try {
		session.handler.tick();
	} catch (error) {
		console.error(`[ItemSession] Error ticking session for ${player.name}:`, error);
		if (error instanceof Error && error.stack) console.error(error.stack);
	}
};

mc.system.runInterval(() => {
	for (const player of mc.world.getPlayers()) {
		tickPlayer(player);
	}
});

mc.world.beforeEvents.playerLeave.subscribe(({ player }) => {
	stopActiveSession(player, false);
});
