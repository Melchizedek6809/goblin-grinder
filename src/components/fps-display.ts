import { LitElement, css, html } from "lit";
import { customElement, property } from "lit/decorators.js";

@customElement("fps-display")
export class FpsDisplay extends LitElement {
	@property({ type: Number })
	fps = 0;

	@property({ type: Boolean })
	visible = true;

	static styles = css`
		:host {
			position: absolute;
			top: 20px;
			right: 20px;
			font-family: monospace;
			font-size: 16px;
			color: #cccccc;
			pointer-events: none;
			user-select: none;
		}

		.fps-container {
			background-color: rgba(0, 0, 0, 0.7);
			padding: 8px 12px;
			border-radius: 4px;
		}
	`;

	render() {
		if (!this.visible) {
			return html``;
		}

		return html`<div class="fps-container">FPS: ${Math.round(this.fps)}</div>`;
	}
}

declare global {
	interface HTMLElementTagNameMap {
		"fps-display": FpsDisplay;
	}
}
