import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators.js";

@customElement("top-bar")
export class TopBar extends LitElement {
	@property({ type: Number })
	health = 100;

	@property({ type: Number })
	maxHealth = 100;

	@property({ type: Number })
	score = 0;

	@property({ type: Number })
	coins = 0;

	@property({ type: Number })
	fps = 0;

	@property({ type: Boolean })
	visible = true;

	@state()
	private previousScore = 0;

	@state()
	private previousCoins = 0;

	@state()
	private previousHealth = 100;

	@state()
	private animatingScoreDigits = new Set<number>();

	@state()
	private animatingCoinDigits = new Set<number>();

	@state()
	private animatingHearts = false;

	static styles = css`
		:host {
			display: block;
			position: absolute;
			top: 20px;
			left: 0;
			right: 0;
			font-family: monospace;
			pointer-events: none;
			user-select: none;
		}

		.top-bar-container {
			display: grid;
			grid-template-columns: auto 1fr auto;
			grid-template-rows: auto;
			gap: 0;
			padding: 0 20px;
		}

		/* Desktop layout: single row */
		.health-section {
			grid-column: 1;
			grid-row: 1;
			justify-self: start;
		}

		.container-icon {
			float: left;
		}

		.score-coins-section {
			grid-column: 2;
			grid-row: 1;
			justify-self: center;
			display: flex;
			gap: 12px;
		}

		.fps-section {
			grid-column: 3;
			grid-row: 1;
			justify-self: end;
		}

		/* Health display */
		.hearts {
			display: flex;
			gap: 6px;
			font-size: 32px;
		}

		.heart {
			display: inline-block;
			text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);
		}

		.heart.full {
			filter: drop-shadow(0 0 4px rgba(255, 100, 100, 0.6));
		}

		.heart.half {
			opacity: 0.5;
		}

		.heart.empty {
			filter: grayscale(100%) brightness(0.5);
		}

		/* Score and coins display */
		.score-container,
		.coins-container {
			background-color: rgba(0, 0, 0, 0.7);
			padding: 8px 16px;
			border-radius: 4px;
			text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);
			font-size: 22px;
			color: #ffffff;
			min-width: 120px;
			text-align: right;
			display: inline-block;
		}

		.coins-container {
			color: #ffd700; /* Gold color for coins */
		}

		/* Digit animation */
		.digit {
			display: inline-block;
			transition: transform 0.1s ease-out;
		}

		.digit.pulse {
			animation: pulse 0.15s ease-out;
		}

		@keyframes pulse {
			0% {
				transform: scale(1);
			}
			50% {
				transform: scale(1.5);
			}
			100% {
				transform: scale(1);
			}
		}

		/* FPS display */
		.fps-container {
			background-color: rgba(0, 0, 0, 0.7);
			padding: 8px 12px;
			border-radius: 4px;
			font-size: 16px;
			color: #cccccc;
		}

		/* Mobile layout: single row, smaller elements */
		@media (max-width: 700px) {
			.top-bar-container {
				grid-template-columns: auto auto auto;
				grid-template-rows: auto;
				gap: 8px;
				justify-content: center;
			}

			.health-section {
				grid-column: 1;
				grid-row: 1;
			}

			.score-coins-section {
				grid-column: 2;
				grid-row: 1;
				gap: 8px;
			}

			.fps-section {
				grid-column: 3;
				grid-row: 1;
			}

			.hearts {
				font-size: 24px;
				gap: 4px;
			}

			.score-container,
			.coins-container {
				font-size: 18px;
				padding: 6px 12px;
				min-width: 110px;
			}

			.fps-container {
				font-size: 14px;
				padding: 6px 10px;
			}
		}

		/* Extra small screens: even more compact */
		@media (max-width: 600px) {
			:host {
				top: 10px;
			}

			.top-bar-container {
				gap: 4px;
				padding: 0 10px;
			}

			.score-coins-section {
				gap: 4px;
			}

			.hearts {
				font-size: 20px;
				gap: 3px;
			}

			.score-container,
			.coins-container {
				font-size: 14px;
				padding: 4px 8px;
				min-width: 85px;
			}

			.fps-container {
				font-size: 12px;
				padding: 4px 8px;
			}
		}

		/* Ultra small screens: stack vertically if needed */
		@media (max-width: 450px) {
			.top-bar-container {
				grid-template-columns: 1fr;
				grid-template-rows: auto auto auto;
				gap: 6px;
				padding: 0 5px;
			}

			.health-section,
			.score-coins-section,
			.fps-section {
				grid-column: 1;
				justify-self: center;
			}

			.health-section {
				grid-row: 1;
			}

			.score-coins-section {
				grid-row: 2;
				gap: 6px;
			}

			.fps-section {
				grid-row: 3;
			}

			.hearts {
				font-size: 18px;
				gap: 2px;
			}

			.score-container,
			.coins-container {
				font-size: 12px;
				padding: 3px 6px;
				min-width: 70px;
			}

			.fps-container {
				font-size: 10px;
				padding: 3px 6px;
			}
		}
	`;

	updated(changedProperties: Map<string, unknown>) {
		// Check if score changed
		if (changedProperties.has("score") && this.score !== this.previousScore) {
			this.detectChangedDigits(
				this.previousScore,
				this.score,
				this.animatingScoreDigits,
			);
			this.previousScore = this.score;

			// Clear animation after animation duration
			setTimeout(() => {
				this.animatingScoreDigits.clear();
				this.requestUpdate();
			}, 150);
		}

		// Check if coins changed
		if (changedProperties.has("coins") && this.coins !== this.previousCoins) {
			this.detectChangedDigits(
				this.previousCoins,
				this.coins,
				this.animatingCoinDigits,
			);
			this.previousCoins = this.coins;

			// Clear animation after animation duration
			setTimeout(() => {
				this.animatingCoinDigits.clear();
				this.requestUpdate();
			}, 150);
		}

		// Check if health increased (healing)
		if (changedProperties.has("health") && this.health > this.previousHealth) {
			this.animatingHearts = true;
			this.previousHealth = this.health;

			// Clear animation after animation duration
			setTimeout(() => {
				this.animatingHearts = false;
				this.requestUpdate();
			}, 150);
		} else if (changedProperties.has("health")) {
			// Update previous health even if it decreased
			this.previousHealth = this.health;
		}
	}

	private detectChangedDigits(
		oldValue: number,
		newValue: number,
		animatingSet: Set<number>,
	) {
		const oldStr = oldValue.toString();
		const newStr = newValue.toString();
		const maxLength = Math.max(oldStr.length, newStr.length);

		// Compare from right to left (least significant to most significant)
		for (let i = 0; i < maxLength; i++) {
			const oldDigit = oldStr[oldStr.length - 1 - i] || "";
			const newDigit = newStr[newStr.length - 1 - i] || "";

			if (oldDigit !== newDigit) {
				// Mark this position (from the right) as animating
				animatingSet.add(newStr.length - 1 - i);
			}
		}
	}

	private renderNumber(value: number, animatingDigits: Set<number>) {
		const str = value.toString();
		return html`${str.split("").map((digit, index) => {
			const shouldAnimate = animatingDigits.has(index);
			return html`<span class="digit ${shouldAnimate ? "pulse" : ""}"
				>${digit}</span
			>`;
		})}`;
	}

	render() {
		if (!this.visible) {
			return html``;
		}

		// Calculate hearts for health display
		const hearts = [];
		const totalHearts = Math.ceil(this.maxHealth / 20);
		const fullHearts = Math.floor(this.health / 20);
		const hasHalfHeart = this.health % 20 >= 10;

		// Full hearts
		for (let i = 0; i < fullHearts; i++) {
			hearts.push(
				html`<span class="heart full ${this.animatingHearts ? "pulse" : ""}"
					>❤️</span
				>`,
			);
		}

		// Half heart
		if (hasHalfHeart && fullHearts < totalHearts) {
			hearts.push(
				html`<span class="heart half ${this.animatingHearts ? "pulse" : ""}"
					>❤️</span
				>`,
			);
		}

		// Empty hearts
		const emptyHearts = totalHearts - fullHearts - (hasHalfHeart ? 1 : 0);
		for (let i = 0; i < emptyHearts; i++) {
			hearts.push(html`<span class="heart empty">❤️</span>`);
		}

		return html`
			<div class="top-bar-container">
				<div class="health-section">
					<div class="hearts">${hearts}</div>
				</div>
				<div class="score-coins-section">
					<div class="score-container">
						<span class="container-icon">⭐</span>${this.renderNumber(this.score, this.animatingScoreDigits)}
					</div>
					<div class="coins-container">
						<span class="container-icon">💰</span> ${this.renderNumber(this.coins, this.animatingCoinDigits)}
					</div>
				</div>
				<div class="fps-section">
					<div class="fps-container">FPS: ${Math.round(this.fps)}</div>
				</div>
			</div>
		`;
	}
}

declare global {
	interface HTMLElementTagNameMap {
		"top-bar": TopBar;
	}
}
