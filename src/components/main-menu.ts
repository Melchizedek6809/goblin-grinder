import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";

@customElement("main-menu")
export class MainMenu extends LitElement {
	@property({ type: Boolean, reflect: true })
	visible = true;

	@property({ type: Boolean })
	loading = false;

	static styles = css`
		:host {
			display: block;
			position: absolute;
			top: 0;
			left: 0;
			width: 100%;
			height: 100%;
			pointer-events: none;
			font-family: "Space Mono", "Fira Code", monospace;
		}

		:host([visible]) {
			pointer-events: auto;
		}

		.overlay {
			width: 100%;
			height: 100%;
			position: relative;
			display: flex;
			flex-direction: column;
			align-items: center;
			justify-content: center;
			gap: 30px;
			background: radial-gradient(
					circle at top,
					rgba(44, 255, 201, 0.15),
					transparent 45%
				),
				radial-gradient(
					circle at bottom,
					rgba(255, 115, 137, 0.16),
					transparent 40%
				),
				linear-gradient(135deg, rgba(9, 9, 9, 0.95), rgba(10, 5, 20, 0.95));
			overflow: hidden;
		}

		.overlay::after {
			content: "";
			position: absolute;
			inset: 0;
			background-image: url("data:image/svg+xml,%3Csvg width='120' height='120' viewBox='0 0 120 120' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 60h120M60 0v120' stroke='rgba(255,255,255,0.025)' stroke-width='1'/%3E%3C/svg%3E");
			opacity: 0.6;
			mix-blend-mode: screen;
			pointer-events: none;
		}

		.panel {
			position: relative;
			display: flex;
			flex-direction: column;
			align-items: center;
			gap: 18px;
			padding: 48px 56px;
			background: rgba(12, 9, 18, 0.75);
			border: 1px solid rgba(255, 255, 255, 0.12);
			border-radius: 24px;
			box-shadow:
				0 25px 60px rgba(0, 0, 0, 0.7),
				0 0 40px rgba(0, 255, 153, 0.08);
			backdrop-filter: blur(18px);
			text-align: center;
			max-width: 520px;
			width: calc(100% - 40px);
		}

		.title {
			font-size: 48px;
			color: #ffffff;
			margin-bottom: 20px;
			text-transform: uppercase;
			letter-spacing: 6px;
			text-shadow:
				0 0 12px rgba(0, 255, 153, 0.4),
				0 0 20px rgba(255, 71, 120, 0.35);
		}

		.emblem {
			width: 72px;
			height: 72px;
			border-radius: 50%;
			background: radial-gradient(circle, #1fdfb4 0%, #14a570 45%, #0b4535 100%);
			display: flex;
			align-items: center;
			justify-content: center;
			color: #06110f;
			font-size: 32px;
			box-shadow:
				inset 0 4px 12px rgba(255, 255, 255, 0.3),
				0 18px 30px rgba(0, 0, 0, 0.55);
			position: relative;
		}

		.emblem::after {
			content: "";
			position: absolute;
			inset: -12px;
			border-radius: 50%;
			border: 1px dashed rgba(31, 223, 180, 0.3);
			animation: pulse 6s linear infinite;
		}

		@keyframes pulse {
			0% {
				transform: scale(0.9);
				opacity: 0.5;
			}
			50% {
				transform: scale(1.1);
				opacity: 1;
			}
			100% {
				transform: scale(0.9);
				opacity: 0.5;
			}
		}

		.divider {
			width: 100%;
			height: 1px;
			background: linear-gradient(
				90deg,
				transparent,
				rgba(255, 255, 255, 0.4),
				transparent
			);
		}

		@media (max-width: 650px) {
			.title {
				font-size: 40px;
			}
		}

		@media (max-width: 550px) {
			.title {
				font-size: 34px;
			}
		}

		@media (max-width: 450px) {
			.title {
				font-size: 28px;
			}
		}

		@media (max-width: 400px) {
			.title {
				font-size: 24px;
			}
		}

		.button {
			font-size: 24px;
			padding: 12px 32px;
			background: linear-gradient(135deg, #19d49d, #13a77a);
			color: #ffffff;
			border: none;
			border-radius: 999px;
			cursor: pointer;
			transition: transform 0.2s, box-shadow 0.2s;
			font-weight: 700;
			touch-action: manipulation;
			-webkit-tap-highlight-color: rgba(255, 255, 255, 0.1);
			min-width: 220px;
			box-shadow:
				0 12px 30px rgba(0, 0, 0, 0.5),
				0 0 18px rgba(25, 212, 157, 0.55);
		}

		.button:hover {
			transform: translateY(-3px) scale(1.02);
			box-shadow:
				0 18px 40px rgba(0, 0, 0, 0.4),
				0 0 26px rgba(25, 212, 157, 0.7);
		}

		.button:active {
			transform: translateY(-1px);
		}

		.button:disabled {
			opacity: 0.7;
			cursor: not-allowed;
		}

		.button:disabled:hover {
			transform: none;
			box-shadow:
				0 12px 30px rgba(0, 0, 0, 0.5),
				0 0 18px rgba(25, 212, 157, 0.55);
		}

		.hints {
			display: grid;
			grid-template-columns: repeat(3, minmax(0, 1fr));
			gap: 16px 24px;
			width: 100%;
			text-align: left;
		}

		.hint {
			color: rgba(255, 255, 255, 0.85);
			font-size: 15px;
			display: flex;
			flex-direction: column;
			gap: 4px;
		}

		.hint-label {
			font-size: 12px;
			text-transform: uppercase;
			letter-spacing: 2px;
			color: rgba(255, 255, 255, 0.45);
		}

		@media (max-width: 560px) {
			.panel {
				padding: 36px 28px;
			}

			.hints {
				grid-template-columns: 1fr;
			}
		}

		@media (max-width: 840px) and (min-width: 561px) {
			.hints {
				grid-template-columns: repeat(2, minmax(0, 1fr));
			}
		}
	`;

	private handleStartGame() {
		this.dispatchEvent(
			new CustomEvent("start-game", { bubbles: true, composed: true }),
		);
	}

	render() {
		if (!this.visible) {
			return html``;
		}

		return html`
			<div class="overlay">
				<div class="panel">
					<div class="emblem">⚔️</div>
					<div class="title">Goblin Grinder</div>
					<div class="divider"></div>
					<div class="hints">
						<div class="hint">
							<span class="hint-label">move</span>
							<span>WASD / Click or Touch</span>
						</div>
						<div class="hint">
							<span class="hint-label">rotate</span>
							<span>QE / Wheel or Swipe</span>
						</div>
						<div class="hint">
							<span class="hint-label">objective</span>
							<span>SURVIVE</span>
						</div>
					</div>
					<div class="divider"></div>
					<button
						class="button"
						type="button"
						?disabled=${this.loading}
						@click=${this.handleStartGame}
					>${this.loading ? "Loading..." : "Start Game"}</button>
				</div>
			</div>
		`;
	}
}

declare global {
	interface HTMLElementTagNameMap {
		"main-menu": MainMenu;
	}
}
