import { LitElement, css, html } from "lit";
import { customElement, property } from "lit/decorators.js";

@customElement("main-menu")
export class MainMenu extends LitElement {
	@property({ type: Boolean, reflect: true })
	visible = true;

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
			background-color: rgba(0, 0, 0, 0.8);
			display: flex;
			flex-direction: column;
			align-items: center;
			justify-content: center;
			gap: 30px;
		}

		.title {
			font-family: monospace;
			font-size: 48px;
			color: #ffffff;
			text-shadow: 4px 4px 8px rgba(0, 0, 0, 0.9);
			margin-bottom: 20px;
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
	`;

	private handleStartGame() {
		this.dispatchEvent(new CustomEvent("start-game", { bubbles: true, composed: true }));
	}

	render() {
		if (!this.visible) {
			return html``;
		}

		return html`
			<div class="overlay">
				<div class="title">GOBLIN GRINDER</div>
				<button class="button" @click=${this.handleStartGame}>Start Game</button>
			</div>
		`;
	}
}

declare global {
	interface HTMLElementTagNameMap {
		"main-menu": MainMenu;
	}
}
