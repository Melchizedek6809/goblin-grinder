import { LitElement, css, html } from "lit";
import { customElement, property } from "lit/decorators.js";

@customElement("score-display")
export class ScoreDisplay extends LitElement {
	@property({ type: Number })
	score = 0;

	@property({ type: Boolean, reflect: true })
	visible = true;

	static styles = css`
		:host {
			display: block;
			position: absolute;
			top: 20px;
			left: 50%;
			transform: translateX(-50%);
			font-family: monospace;
			font-size: 24px;
			color: #ffffff;
			pointer-events: none;
			user-select: none;
		}

		.score-container {
			background-color: rgba(0, 0, 0, 0.7);
			padding: 8px 16px;
			border-radius: 4px;
			text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);
		}
	`;

	render() {
		if (!this.visible) {
			return html``;
		}

		return html`<div class="score-container">Score: ${this.score}</div>`;
	}
}

declare global {
	interface HTMLElementTagNameMap {
		"score-display": ScoreDisplay;
	}
}
