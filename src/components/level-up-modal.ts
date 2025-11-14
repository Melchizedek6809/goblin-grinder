import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";

@customElement("level-up-modal")
export class LevelUpModal extends LitElement {
	@property({ type: Boolean })
	visible: boolean = false;

	static styles = css`
		:host {
			position: fixed;
			top: 0;
			left: 0;
			right: 0;
			bottom: 0;
			display: block;
			pointer-events: none;
			z-index: 1000;
		}

		.backdrop {
			position: absolute;
			top: 0;
			left: 0;
			right: 0;
			bottom: 0;
			display: flex;
			align-items: center;
			justify-content: center;
			background: rgba(5, 8, 20, 0.7);
			opacity: 0;
			pointer-events: none;
			transition: opacity 0.15s ease;
		}

		.backdrop.visible {
			opacity: 1;
			pointer-events: auto;
		}

		.modal {
			background: rgba(7, 12, 25, 0.95);
			border: 2px solid rgba(59, 224, 255, 0.6);
			box-shadow: 0 0 24px rgba(35, 139, 255, 0.8);
			padding: 24px;
			border-radius: 12px;
			width: min(90vw, 420px);
			text-align: center;
			font-family: monospace;
			color: #e8f4ff;
		}

		.modal h2 {
			margin: 0 0 8px;
			font-size: 24px;
			color: #3be0ff;
			text-shadow: 0 0 8px rgba(59, 224, 255, 0.6);
		}

		.modal p {
			margin: 0 0 16px;
			color: #b7c6ff;
			font-size: 16px;
		}

		.actions {
			display: flex;
			flex-direction: column;
			gap: 12px;
		}

		::slotted(button) {
			font-family: monospace;
			font-size: 18px;
			padding: 12px 16px;
			background: linear-gradient(90deg, #3be0ff, #238bff);
			border: none;
			border-radius: 6px;
			color: #041024;
			cursor: pointer;
			text-transform: uppercase;
			font-weight: bold;
			transition: transform 0.1s ease, opacity 0.1s ease;
		}

		::slotted(button:hover) {
			transform: translateY(-2px);
		}

		::slotted(button:active) {
			transform: translateY(0);
			opacity: 0.85;
		}
	`;

	render() {
		return html`
			<div class="backdrop ${this.visible ? "visible" : ""}">
				<div class="modal">
					<h2>Level Up!</h2>
					<p>Choose an upgrade:</p>
					<div class="actions">
						<slot></slot>
					</div>
				</div>
			</div>
		`;
	}
}

declare global {
	interface HTMLElementTagNameMap {
		"level-up-modal": LevelUpModal;
	}
}
