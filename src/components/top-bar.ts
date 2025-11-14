import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";

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
			grid-template-rows: auto auto;
			gap: 0;
			padding: 0 20px;
		}

		/* Desktop layout: 2x2 grid */
		.health-section {
			grid-column: 1;
			grid-row: 1;
			justify-self: start;
		}

		.score-section {
			grid-column: 2;
			grid-row: 1;
			justify-self: center;
		}

		.fps-section {
			grid-column: 3;
			grid-row: 1;
			justify-self: end;
		}

		.coins-section {
			grid-column: 2;
			grid-row: 2;
			justify-self: center;
			margin-top: 10px;
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

		.heart.full::before {
			content: "♥";
			color: #ff3333;
		}

		.heart.half::before {
			content: "♥";
			color: #ff3333;
			opacity: 0.5;
		}

		.heart.empty::before {
			content: "♥";
			color: #555555;
		}

		/* Score and coins display */
		.score-container,
		.coins-container {
			background-color: rgba(0, 0, 0, 0.7);
			padding: 8px 16px;
			border-radius: 4px;
			text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);
			font-size: 24px;
			color: #ffffff;
		}

		.coins-container {
			color: #ffd700; /* Gold color for coins */
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
		@media (max-width: 600px) {
			.top-bar-container {
				grid-template-columns: auto auto auto auto;
				grid-template-rows: auto;
				gap: 8px;
				justify-content: center;
			}

			.health-section {
				grid-column: 1;
				grid-row: 1;
			}

			.score-section {
				grid-column: 2;
				grid-row: 1;
			}

			.coins-section {
				grid-column: 3;
				grid-row: 1;
				margin-top: 0;
			}

			.fps-section {
				grid-column: 4;
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
			}

			.fps-container {
				font-size: 14px;
				padding: 6px 10px;
			}
		}

		/* Extra small screens: even more compact */
		@media (max-width: 400px) {
			:host {
				top: 10px;
			}

			.top-bar-container {
				gap: 4px;
				padding: 0 10px;
			}

			.hearts {
				font-size: 20px;
				gap: 3px;
			}

			.score-container,
			.coins-container {
				font-size: 14px;
				padding: 4px 8px;
			}

			.fps-container {
				font-size: 12px;
				padding: 4px 8px;
			}
		}
	`;

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
			hearts.push(html`<span class="heart full"></span>`);
		}

		// Half heart
		if (hasHalfHeart && fullHearts < totalHearts) {
			hearts.push(html`<span class="heart half"></span>`);
		}

		// Empty hearts
		const emptyHearts = totalHearts - fullHearts - (hasHalfHeart ? 1 : 0);
		for (let i = 0; i < emptyHearts; i++) {
			hearts.push(html`<span class="heart empty"></span>`);
		}

		return html`
			<div class="top-bar-container">
				<div class="health-section">
					<div class="hearts">${hearts}</div>
				</div>
				<div class="score-section">
					<div class="score-container">Score: ${this.score}</div>
				</div>
				<div class="fps-section">
					<div class="fps-container">FPS: ${Math.round(this.fps)}</div>
				</div>
				<div class="coins-section">
					<div class="coins-container">Coins: ${this.coins}</div>
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
