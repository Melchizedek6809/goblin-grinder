import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";

@customElement("main-menu")
export class MainMenu extends LitElement {
	@property({ type: Boolean, reflect: true })
	visible = true;

	@property({ type: Boolean, reflect: true })
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
			font-family: Georgia, "Times New Roman", serif;
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
			background:
				radial-gradient(circle at 20% 15%, rgba(255, 228, 179, 0.07), transparent 25%),
				radial-gradient(circle at 80% 20%, rgba(120, 183, 255, 0.1), transparent 30%),
				conic-gradient(from 140deg at 50% 60%, rgba(14, 19, 41, 0.7), rgba(9, 10, 18, 0.95), rgba(24, 20, 48, 0.7));
			overflow: hidden;
		}

		.overlay::after {
			content: "";
			position: absolute;
			inset: 0;
			background:
				linear-gradient(90deg, rgba(255, 231, 186, 0.05) 1px, transparent 1px),
				linear-gradient(180deg, rgba(255, 231, 186, 0.05) 1px, transparent 1px);
			background-size: 120px 120px;
			opacity: 0.7;
			mix-blend-mode: soft-light;
			pointer-events: none;
		}

		.panel {
			position: relative;
			display: flex;
			flex-direction: column;
			align-items: center;
			gap: 18px;
			padding: 52px 64px;
			background: radial-gradient(circle at 30% 30%, rgba(255, 245, 223, 0.06), transparent 35%),
				radial-gradient(circle at 70% 70%, rgba(158, 202, 255, 0.06), transparent 35%),
				rgba(10, 12, 24, 0.86);
			border: 1px solid rgba(255, 223, 152, 0.5);
			border-radius: 28px;
			box-shadow:
				0 26px 60px rgba(0, 0, 0, 0.6),
				0 0 38px rgba(255, 223, 152, 0.06),
				inset 0 0 0 1px rgba(93, 159, 255, 0.18);
			backdrop-filter: blur(16px);
			text-align: center;
			max-width: 520px;
			width: calc(100% - 40px);
		}

		.panel::before,
		.panel::after {
			content: "";
			position: absolute;
			inset: 14px;
			border: 1px solid rgba(93, 159, 255, 0.25);
			border-radius: 20px;
			pointer-events: none;
		}

		.panel::after {
			inset: 20px 28px;
			border-image: linear-gradient(90deg, rgba(255, 223, 152, 0.5), rgba(93, 159, 255, 0.5), rgba(255, 223, 152, 0.5)) 1;
			opacity: 0.75;
		}

		.title {
			font-size: 48px;
			color: #f6e3bf;
			margin-bottom: 20px;
			text-transform: uppercase;
			letter-spacing: 5px;
			text-shadow:
				0 0 10px rgba(255, 223, 152, 0.28),
				0 0 16px rgba(93, 159, 255, 0.2);
		}

		.emblem {
			width: 72px;
			height: 72px;
			border-radius: 50%;
			background: radial-gradient(circle, #f4e3b7 0%, #cda86f 45%, #4b3724 100%);
			display: flex;
			align-items: center;
			justify-content: center;
			color: #140f0c;
			font-size: 32px;
			box-shadow:
				inset 0 6px 14px rgba(255, 255, 255, 0.18),
				0 16px 28px rgba(0, 0, 0, 0.5),
				0 0 26px rgba(255, 223, 152, 0.2);
			position: relative;
		}

		.emblem::after {
			content: "";
			position: absolute;
			inset: -12px;
			border-radius: 50%;
			border: 1px dashed rgba(255, 223, 152, 0.4);
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
			background: linear-gradient(90deg, transparent, rgba(255, 223, 152, 0.55), transparent);
		}

		.subtitle {
			font-size: 15px;
			letter-spacing: 3px;
			text-transform: uppercase;
			color: rgba(246, 227, 191, 0.8);
			text-shadow: 0 0 10px rgba(93, 159, 255, 0.25);
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
			background:
				linear-gradient(90deg, rgba(255, 223, 152, 0.95), rgba(122, 171, 255, 0.9)),
				radial-gradient(circle at 20% 20%, rgba(255, 255, 255, 0.2), transparent 40%);
			color: #ffffff;
			border: 1px solid rgba(255, 223, 152, 0.8);
			border-radius: 16px;
			cursor: pointer;
			transition: transform 0.2s ease, box-shadow 0.2s ease;
			font-weight: 600;
			touch-action: manipulation;
			-webkit-tap-highlight-color: rgba(255, 255, 255, 0.1);
			min-width: 220px;
			box-shadow:
				0 10px 24px rgba(0, 0, 0, 0.45),
				0 0 18px rgba(255, 223, 152, 0.28);
		}

		.button:hover {
			transform: translateY(-3px);
			box-shadow:
				0 16px 34px rgba(0, 0, 0, 0.42),
				0 0 24px rgba(122, 171, 255, 0.48);
		}

		.button:active {
			transform: translateY(-1px);
		}

		.button:disabled {
			opacity: 0.6;
			cursor: not-allowed;
			transform: none;
		}

		.button:disabled:hover {
			transform: none;
			box-shadow:
				0 10px 24px rgba(0, 0, 0, 0.45),
				0 0 16px rgba(255, 223, 152, 0.24);
		}

		.hints {
			display: grid;
			grid-template-columns: repeat(3, minmax(0, 1fr));
			gap: 16px 24px;
			width: 100%;
			text-align: left;
		}

		.hint {
			color: rgba(246, 227, 191, 0.9);
			font-size: 15px;
			display: flex;
			flex-direction: column;
			gap: 4px;
		}

		.hint-label {
			font-size: 12px;
			text-transform: uppercase;
			letter-spacing: 2px;
			color: rgba(122, 171, 255, 0.6);
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
					<div class="subtitle">Trials of steel and arcana</div>
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
