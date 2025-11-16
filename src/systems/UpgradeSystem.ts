import type { Player } from "../objects/Player";

/**
 * Upgrade rarity levels
 * Used for visual styling and future weighted selection
 */
export type UpgradeRarity = "common" | "rare" | "epic" | "legendary";

/**
 * Defines a single upgrade option
 */
export interface Upgrade {
	/** Unique identifier */
	id: string;
	/** Display name shown on card */
	name: string;
	/** Flavor text or stat description */
	description: string;
	/** Unicode emoji or future SVG path */
	icon: string;
	/** Rarity level for visual styling */
	rarity: UpgradeRarity;
	/** Function to apply the upgrade effect */
	effect: (player: Player) => void;
}

/**
 * Registry of all available upgrades
 */
const UPGRADE_REGISTRY: Upgrade[] = [
	{
		id: "max_hp",
		name: "Fortitude",
		description: "Increase max HP by 20",
		icon: "❤️",
		rarity: "common",
		effect: (player: Player) => {
			player.increaseMaxHealth(20);
		},
	},
	{
		id: "move_speed",
		name: "Swift Boots",
		description: "Move 15% faster",
		icon: "👟",
		rarity: "common",
		effect: (player: Player) => {
			player.increaseSpeedMultiplier(0.15);
		},
	},
	{
		id: "attack_speed",
		name: "Rapid Strike",
		description: "Attack 20% faster",
		icon: "⚡",
		rarity: "rare",
		effect: (player: Player) => {
			player.increaseAttackSpeedMultiplier(0.2);
		},
	},
	{
		id: "damage",
		name: "Brutal Force",
		description: "Deal 25% more damage",
		icon: "⚔️",
		rarity: "rare",
		effect: (player: Player) => {
			player.increaseDamageMultiplier(0.25);
		},
	},
	{
		id: "hp_regen",
		name: "Regeneration",
		description: "Recover 1 HP every 3 seconds",
		icon: "💚",
		rarity: "rare",
		effect: (player: Player) => {
			player.increaseHealthRegenRate(1 / 3); // 1 HP per 3 seconds
		},
	},
	{
		id: "knockback",
		name: "Titan's Blow",
		description: "Knock enemies back 30% further",
		icon: "💥",
		rarity: "epic",
		effect: (player: Player) => {
			player.increaseKnockbackPower(0.3);
		},
	},
	{
		id: "coin_magnet",
		name: "Greed's Pull",
		description: "Collect coins from 40% further",
		icon: "🧲",
		rarity: "common",
		effect: (player: Player) => {
			player.increaseCoinMagnetRange(0.4);
		},
	},
	{
		id: "max_hp_large",
		name: "Iron Constitution",
		description: "Increase max HP by 40",
		icon: "🛡️",
		rarity: "epic",
		effect: (player: Player) => {
			player.increaseMaxHealth(40);
		},
	},
];

/**
 * UpgradeSystem manages the pool of available upgrades
 * and provides methods for random selection
 */
export class UpgradeSystem {
	/**
	 * Get a random selection of upgrades
	 * @param count Number of upgrades to select
	 * @param excludeIds Optional array of upgrade IDs to exclude
	 * @returns Array of random upgrades
	 */
	static getRandomUpgrades(
		count: number,
		excludeIds: string[] = [],
	): Upgrade[] {
		const available = UPGRADE_REGISTRY.filter(
			(upgrade) => !excludeIds.includes(upgrade.id),
		);

		// Shuffle and take first N
		const shuffled = [...available].sort(() => Math.random() - 0.5);
		return shuffled.slice(0, Math.min(count, shuffled.length));
	}

	/**
	 * Get a single random upgrade, optionally weighted toward higher rarity
	 * @param excludeIds Optional array of upgrade IDs to exclude
	 * @param weightRarity If true, higher rarities are more likely
	 * @returns A random upgrade
	 */
	static getRandomUpgrade(
		excludeIds: string[] = [],
		weightRarity = false,
	): Upgrade {
		const available = UPGRADE_REGISTRY.filter(
			(upgrade) => !excludeIds.includes(upgrade.id),
		);

		if (available.length === 0) {
			// Fallback if all excluded
			return UPGRADE_REGISTRY[0];
		}

		if (!weightRarity) {
			return available[Math.floor(Math.random() * available.length)];
		}

		// Weighted selection (future enhancement)
		// For now, just slightly favor rare/epic
		const rarityWeights: Record<UpgradeRarity, number> = {
			common: 1,
			rare: 2,
			epic: 3,
			legendary: 4,
		};

		const weighted: Upgrade[] = [];
		for (const upgrade of available) {
			const weight = rarityWeights[upgrade.rarity] || 1;
			for (let i = 0; i < weight; i++) {
				weighted.push(upgrade);
			}
		}

		return weighted[Math.floor(Math.random() * weighted.length)];
	}

	/**
	 * Get upgrade by ID
	 * @param id Upgrade identifier
	 * @returns The upgrade or undefined
	 */
	static getUpgradeById(id: string): Upgrade | undefined {
		return UPGRADE_REGISTRY.find((upgrade) => upgrade.id === id);
	}

	/**
	 * Get all upgrades (for debugging or UI)
	 */
	static getAllUpgrades(): Upgrade[] {
		return [...UPGRADE_REGISTRY];
	}

	/**
	 * Get rarity color for styling
	 */
	static getRarityColor(rarity: UpgradeRarity): string {
		switch (rarity) {
			case "common":
				return "#9ca3af"; // Gray
			case "rare":
				return "#3be0ff"; // Cyan
			case "epic":
				return "#a855f7"; // Purple
			case "legendary":
				return "#fbbf24"; // Gold
		}
	}
}
