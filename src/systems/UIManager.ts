import type { GameOverScreen } from "../components/game-over-screen.ts";
import type { LevelUpModal } from "../components/level-up-modal.ts";
import type { MainMenu } from "../components/main-menu.ts";
import type { TopBar } from "../components/top-bar.ts";

export const GameState = {
	MENU: 0,
	PLAYING: 1,
	GAME_OVER: 2,
} as const;

export type GameState = (typeof GameState)[keyof typeof GameState];

/**
 * Manages all UI updates and visibility
 * Handles FPS tracking, health/score/coins display, and game state UI
 */
export class UIManager {
	private topBar: TopBar | null = null;
	private mainMenu: MainMenu | null = null;
	private gameOverScreen: GameOverScreen | null = null;
	private levelUpModal: LevelUpModal | null = null;

	// FPS tracking
	private fpsFrameTimes: number[] = [];
	private fpsUpdateCounter: number = 0;

	constructor() {
		// UI elements will be set after custom elements are defined
	}

	/**
	 * Initialize UI elements (call after custom elements are defined)
	 */
	async init(): Promise<void> {
		await Promise.all([
			customElements.whenDefined("top-bar"),
			customElements.whenDefined("main-menu"),
			customElements.whenDefined("game-over-screen"),
			customElements.whenDefined("level-up-modal"),
		]);

		this.topBar = document.querySelector("top-bar");
		this.mainMenu = document.querySelector("main-menu");
		this.gameOverScreen = document.querySelector("game-over-screen");
		this.levelUpModal = document.querySelector("level-up-modal");
	}

	/**
	 * Set up event listeners for UI interactions
	 */
	setupEventListeners(
		onStartGame: () => void,
		onRestartGame: () => void,
		onBackToMenu: () => void,
	): void {
		this.mainMenu?.addEventListener("start-game", onStartGame);
		this.gameOverScreen?.addEventListener("restart-game", onRestartGame);
		this.gameOverScreen?.addEventListener("back-to-menu", onBackToMenu);
	}

	/**
	 * Update UI visibility based on game state
	 */
	updateVisibility(gameState: GameState): void {
		if (!this.mainMenu || !this.gameOverScreen || !this.topBar) {
			return;
		}

		switch (gameState) {
			case GameState.MENU:
				this.mainMenu.visible = true;
				this.gameOverScreen.visible = false;
				this.topBar.visible = false;
				this.hideLevelUpModal();
				break;
			case GameState.PLAYING:
				this.mainMenu.visible = false;
				this.gameOverScreen.visible = false;
				this.topBar.visible = true;
				break;
			case GameState.GAME_OVER:
				this.mainMenu.visible = false;
				this.gameOverScreen.visible = true;
				this.topBar.visible = false;
				this.hideLevelUpModal();
				break;
		}
	}

	/**
	 * Set loading state on main menu
	 */
	setMainMenuLoading(loading: boolean): void {
		if (this.mainMenu) {
			this.mainMenu.loading = loading;
		}
	}

	/**
	 * Update game over screen with final score
	 */
	showGameOver(score: number): void {
		if (this.gameOverScreen) {
			this.gameOverScreen.score = score;
		}
	}

	/**
	 * Update top bar with current game stats
	 * @param deltaTime Time since last frame in seconds
	 * @param health Current player health
	 * @param maxHealth Maximum player health
	 * @param score Current score
	 * @param coins Current coin count
	 */
	update(
		deltaTime: number,
		health: number,
		maxHealth: number,
		score: number,
		coins: number,
		xpProgress: number,
	): void {
		// Calculate FPS (rolling average over last 60 frames)
		if (deltaTime > 0) {
			this.fpsFrameTimes.push(1 / deltaTime);
			if (this.fpsFrameTimes.length > 60) {
				this.fpsFrameTimes.shift();
			}
		}

		// Update top bar (only every 10 frames for FPS to reduce jitter)
		this.fpsUpdateCounter++;
		if (this.fpsUpdateCounter >= 10 && this.topBar) {
			const avgFps =
				this.fpsFrameTimes.reduce((a, b) => a + b, 0) /
				this.fpsFrameTimes.length;
			this.topBar.health = health;
			this.topBar.maxHealth = maxHealth;
			this.topBar.score = score;
			this.topBar.coins = coins;
			this.topBar.fps = avgFps;
			this.topBar.xpProgress = xpProgress;
			this.fpsUpdateCounter = 0;
		}
	}

	/**
	 * Reset FPS tracking (useful when starting a new game)
	 */
	resetFPS(): void {
		this.fpsFrameTimes = [];
		this.fpsUpdateCounter = 0;
	}

	showLevelUpModal(optionElements: HTMLElement[]): void {
		if (!this.levelUpModal) {
			return;
		}
		this.setLevelUpOptions(optionElements);
		this.levelUpModal.visible = true;
	}

	hideLevelUpModal(): void {
		if (!this.levelUpModal) {
			return;
		}
		this.levelUpModal.visible = false;
		this.clearLevelUpOptions();
	}

	private setLevelUpOptions(optionElements: HTMLElement[]): void {
		if (!this.levelUpModal) {
			return;
		}
		this.clearLevelUpOptions();
		for (const element of optionElements) {
			this.levelUpModal.append(element);
		}
	}

	private clearLevelUpOptions(): void {
		if (!this.levelUpModal) {
			return;
		}
		while (this.levelUpModal.firstChild) {
			this.levelUpModal.removeChild(this.levelUpModal.firstChild);
		}
	}
}
