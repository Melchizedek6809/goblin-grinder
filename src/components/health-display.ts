import { LitElement, css, html } from "lit";
import { customElement, property } from "lit/decorators.js";

@customElement("health-display")
export class HealthDisplay extends LitElement {
	@property({ type: Number })
	health = 100;

	@property({ type: Number })
	maxHealth = 100;

	static styles = css`
		:host {
			display: block;
			position: absolute;
			top: 20px;
			left: 20px;
			font-family: monospace;
			font-size: 32px;
			pointer-events: none;
			user-select: none;
		}

		.hearts {
			display: flex;
			gap: 6px;
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
	`;

	render() {
		const hearts = [];
		const totalHearts = Math.ceil(this.maxHealth / 20);
		const fullHearts = Math.floor(this.health / 20);
		const hasHalfHeart = (this.health % 20) >= 10;

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

		return html`<div class="hearts">${hearts}</div>`;
	}
}

declare global {
	interface HTMLElementTagNameMap {
		"health-display": HealthDisplay;
	}
}
