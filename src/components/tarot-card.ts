import { LitElement, html, css } from "lit";
import { customElement, property } from "lit/decorators.js";
import type { Upgrade } from "../systems/UpgradeSystem";
import { UpgradeSystem } from "../systems/UpgradeSystem";

declare global {
	interface HTMLElementTagNameMap {
		"tarot-card": TarotCard;
	}
}

@customElement("tarot-card")
export class TarotCard extends LitElement {
	@property({ type: Object })
	upgrade: Upgrade | null = null;

	@property({ type: Boolean })
	faceDown = true;

	@property({ type: Boolean })
	selected = false;

	@property({ type: Boolean })
	mystery = false; // True for the mystery card

	static styles = css`
		:host {
			display: block;
			perspective: 1000px;
			cursor: pointer;
		}

		.card-container {
			position: relative;
			width: 180px;
			height: 270px;
			transition: transform 0.3s ease;
		}

		/* Mobile: smaller cards */
		@media (max-width: 768px) {
			.card-container {
				width: 140px;
				height: 210px;
			}
		}

		/* Very small screens: even smaller */
		@media (max-width: 400px) {
			.card-container {
				width: 120px;
				height: 180px;
			}
		}

		.card-container:hover {
			transform: translateY(-8px);
		}

		.card-inner {
			position: relative;
			width: 100%;
			height: 100%;
			transition: transform 0.6s ease-out;
			transform-style: preserve-3d;
		}

		.card-inner.flipped {
			transform: rotateY(180deg);
		}

		.card-face {
			position: absolute;
			width: 100%;
			height: 100%;
			backface-visibility: hidden;
			border-radius: 12px;
			display: flex;
			flex-direction: column;
			overflow: hidden;
		}

		.card-front {
			transform: rotateY(180deg);
			background: linear-gradient(135deg, rgba(7, 12, 25, 0.98), rgba(15, 20, 35, 0.98));
			border: 2px solid var(--rarity-color, #9ca3af);
			box-shadow:
				0 4px 12px rgba(0, 0, 0, 0.5),
				0 0 20px var(--rarity-glow, rgba(156, 163, 175, 0.3));
		}

		.card-back {
			background: linear-gradient(135deg, rgba(7, 12, 25, 0.98), rgba(20, 15, 35, 0.98));
			border: 2px solid rgba(59, 224, 255, 0.4);
			box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
			display: flex;
			align-items: center;
			justify-content: center;
		}

		.card-back-pattern {
			width: 100%;
			height: 100%;
			background:
				radial-gradient(circle at 50% 50%, transparent 30%, rgba(59, 224, 255, 0.05) 31%, transparent 32%),
				radial-gradient(circle at 50% 50%, transparent 50%, rgba(59, 224, 255, 0.05) 51%, transparent 52%),
				linear-gradient(45deg, transparent 48%, rgba(59, 224, 255, 0.1) 49%, rgba(59, 224, 255, 0.1) 51%, transparent 52%),
				linear-gradient(-45deg, transparent 48%, rgba(59, 224, 255, 0.1) 49%, rgba(59, 224, 255, 0.1) 51%, transparent 52%);
			position: relative;
			display: flex;
			align-items: center;
			justify-content: center;
		}

		.card-back-symbol {
			font-size: 64px;
			opacity: 0.6;
			filter: drop-shadow(0 0 10px rgba(59, 224, 255, 0.5));
		}

		.card-header {
			padding: 16px;
			text-align: center;
			border-bottom: 1px solid var(--rarity-color, #9ca3af);
			background: rgba(0, 0, 0, 0.3);
		}

		.card-icon {
			font-size: 64px;
			margin-bottom: 8px;
			filter: drop-shadow(0 0 8px var(--rarity-glow, rgba(156, 163, 175, 0.5)));
		}

		.card-name {
			font-family: 'Georgia', serif;
			font-size: 20px;
			font-weight: bold;
			color: var(--rarity-color, #9ca3af);
			text-shadow: 0 0 10px var(--rarity-glow, rgba(156, 163, 175, 0.4));
			margin: 0;
		}

		.card-body {
			flex: 1;
			padding: 20px;
			display: flex;
			align-items: center;
			justify-content: center;
		}

		.card-description {
			font-family: 'Georgia', serif;
			font-size: 16px;
			color: rgba(255, 255, 255, 0.9);
			text-align: center;
			line-height: 1.6;
			margin: 0;
		}

		/* Mobile text scaling */
		@media (max-width: 768px) {
			.card-icon {
				font-size: 48px;
			}

			.card-name {
				font-size: 16px;
			}

			.card-header {
				padding: 12px;
			}

			.card-body {
				padding: 14px;
			}

			.card-description {
				font-size: 13px;
				line-height: 1.4;
			}
		}

		@media (max-width: 400px) {
			.card-icon {
				font-size: 40px;
			}

			.card-name {
				font-size: 14px;
			}

			.card-header {
				padding: 10px;
			}

			.card-body {
				padding: 12px;
			}

			.card-description {
				font-size: 12px;
			}
		}

		.card-container.selected {
			transform: translateY(-12px) scale(1.05);
		}

		.card-container.selected .card-front {
			border-color: #fbbf24;
			box-shadow:
				0 4px 16px rgba(0, 0, 0, 0.6),
				0 0 30px rgba(251, 191, 36, 0.6);
		}

		@media (max-width: 768px) {
			.card-container:hover {
				transform: translateY(-4px);
			}

			.card-back-symbol {
				font-size: 48px;
			}
		}

		@media (max-width: 400px) {
			.card-back-symbol {
				font-size: 40px;
			}
		}
	`;

	private handleClick() {
		if (!this.faceDown || this.mystery) {
			this.dispatchEvent(
				new CustomEvent("card-selected", {
					detail: { upgrade: this.upgrade },
					bubbles: true,
					composed: true,
				}),
			);
		}
	}

	render() {
		const rarityColor = this.upgrade
			? UpgradeSystem.getRarityColor(this.upgrade.rarity)
			: "#9ca3af";
		const rarityGlow = this.upgrade
			? `${rarityColor}80` // Add alpha for glow
			: "rgba(156, 163, 175, 0.5)";

		return html`
			<div
				class="card-container ${this.selected ? "selected" : ""}"
				@click=${this.handleClick}
				style="--rarity-color: ${rarityColor}; --rarity-glow: ${rarityGlow}"
			>
				<div class="card-inner ${!this.faceDown ? "flipped" : ""}">
					<!-- Card Back -->
					<div class="card-face card-back">
						<div class="card-back-pattern">
							<div class="card-back-symbol">✦</div>
						</div>
					</div>

					<!-- Card Front -->
					<div class="card-face card-front">
						${
							this.upgrade
								? html`
									<div class="card-header">
										<div class="card-icon">${this.upgrade.icon}</div>
										<h3 class="card-name">${this.upgrade.name}</h3>
									</div>
									<div class="card-body">
										<p class="card-description">
											${this.upgrade.description}
										</p>
									</div>
							  `
								: html`<div class="card-body">
									<p class="card-description">Unknown</p>
							  </div>`
						}
					</div>
				</div>
			</div>
		`;
	}
}
