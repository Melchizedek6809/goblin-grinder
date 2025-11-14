import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";

@customElement("game-over-screen")
export class GameOverScreen extends LitElement {
	@property({ type: Boolean, reflect: true })
	visible = false;

	@property({ type: Number })
	score = 0;

	static styles = css`
		:host {
			display: block;
			position: absolute;
			top: 0;
			left: 0;
			width: 100%;
			height: 100%;
			pointer-events: none;
		}

		:host([visible]) {
			pointer-events: auto;
		}

		.overlay {
			width: 100%;
			height: 100%;
			background-color: rgba(0, 0, 0, 0.85);
			display: flex;
			flex-direction: column;
			align-items: center;
			justify-content: center;
			gap: 30px;
		}

		.title {
			font-family: monospace;
			font-size: 56px;
			color: #ff3333;
			text-shadow: 4px 4px 8px rgba(0, 0, 0, 0.9);
			margin-bottom: 10px;
		}

		.score-text {
			font-family: monospace;
			font-size: 32px;
			color: #ffffff;
			text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);
			margin-bottom: 20px;
		}

		.buttons {
			display: flex;
			gap: 20px;
		}

		.button {
			font-family: monospace;
			font-size: 24px;
			padding: 12px 32px;
			background-color: #4a4a4a;
			color: #ffffff;
			border: 2px solid #666666;
			border-radius: 4px;
			cursor: pointer;
			transition: all 0.2s;
			text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);
		}

		.button:hover {
			background-color: #5a5a5a;
			border-color: #888888;
			transform: translateY(-2px);
		}

		.button:active {
			background-color: #3a3a3a;
			transform: translateY(0);
		}

		.button.primary {
			background-color: #ff6633;
			border-color: #ff8855;
		}

		.button.primary:hover {
			background-color: #ff7744;
			border-color: #ff9966;
		}

		.button.primary:active {
			background-color: #ee5522;
		}

		@media (max-width: 550px) {
			.buttons {
				flex-direction: column;
			}
		}
	`;

	private handleRestart() {
		this.dispatchEvent(
			new CustomEvent("restart-game", { bubbles: true, composed: true }),
		);
	}

	private handleBackToMenu() {
		this.dispatchEvent(
			new CustomEvent("back-to-menu", { bubbles: true, composed: true }),
		);
	}

	render() {
		if (!this.visible) {
			return html``;
		}

		return html`
			<div class="overlay">
				<div class="title">🪦 YOU DIED 🪦</div>
				<div class="score-text">Final Score: ${this.score}</div>
				<div class="buttons">
					<button class="button" @click=${this.handleBackToMenu}>🏠 Back to Menu</button>
					<button class="button primary" @click=${this.handleRestart}>🔥 Restart</button>
				</div>
			</div>
		`;
	}
}

declare global {
	interface HTMLElementTagNameMap {
		"game-over-screen": GameOverScreen;
	}
}
