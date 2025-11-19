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
			background:
				radial-gradient(circle at 20% 20%, rgba(255, 223, 152, 0.06), transparent 35%),
				radial-gradient(circle at 80% 70%, rgba(122, 171, 255, 0.06), transparent 35%),
				rgba(6, 6, 12, 0.92);
			display: flex;
			flex-direction: column;
			align-items: center;
			justify-content: center;
			gap: 30px;
		}

		.title {
			font-family: Georgia, "Times New Roman", serif;
			font-size: 54px;
			color: #f6e3bf;
			text-shadow:
				0 0 10px rgba(255, 223, 152, 0.28),
				0 0 18px rgba(122, 171, 255, 0.16);
			margin-bottom: 10px;
			letter-spacing: 4px;
			text-transform: uppercase;
			position: relative;
		}

		.score-text {
			font-family: Georgia, "Times New Roman", serif;
			font-size: 24px;
			color: rgba(246, 227, 191, 0.9);
			text-shadow: 0 0 8px rgba(93, 159, 255, 0.16);
			margin-bottom: 14px;
		}

		.buttons {
			display: flex;
			gap: 20px;
		}

		.button {
			font-family: "Courier New", monospace;
			font-size: 24px;
			padding: 12px 30px;
			background: linear-gradient(135deg, rgba(255, 223, 152, 0.92), rgba(122, 171, 255, 0.9));
			color: #0f101a;
			border: 1px solid rgba(255, 223, 152, 0.8);
			border-radius: 14px;
			cursor: pointer;
			transition: all 0.2s;
			text-shadow: none;
			box-shadow:
				0 10px 18px rgba(0, 0, 0, 0.42),
				0 0 16px rgba(255, 223, 152, 0.18);
		}

		.button:hover {
			transform: translateY(-3px);
			box-shadow:
				0 14px 26px rgba(0, 0, 0, 0.44),
				0 0 22px rgba(122, 171, 255, 0.32);
		}

		.button:active {
			transform: translateY(-1px);
		}

		.button.primary {
			background: linear-gradient(135deg, rgba(93, 159, 255, 0.95), rgba(255, 223, 152, 0.9));
			border-color: rgba(122, 171, 255, 0.9);
		}

		.button.primary:hover {
			box-shadow:
				0 16px 30px rgba(0, 0, 0, 0.5),
				0 0 28px rgba(93, 159, 255, 0.5);
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
