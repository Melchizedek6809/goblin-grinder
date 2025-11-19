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
			font-family: Georgia, "Times New Roman", serif;
		}

		.card-container {
			position: relative;
			width: 180px;
			height: 270px;
			transition: transform 0.3s ease;
			filter: drop-shadow(0 10px 18px rgba(0, 0, 0, 0.38));
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
			background: radial-gradient(circle at 50% 30%, rgba(255, 223, 152, 0.15), transparent 60%),
				radial-gradient(circle at 30% 70%, rgba(93, 159, 255, 0.12), transparent 55%);
			border-radius: 14px;
		}

		.card-inner.flipped {
			transform: rotateY(180deg) translateZ(1px);
		}

		.card-face {
			position: absolute;
			inset: 0;
			width: 100%;
			height: 100%;
			backface-visibility: hidden;
			border-radius: 14px;
			display: flex;
			flex-direction: column;
			overflow: hidden;
			box-shadow: inset 0 0 0 1px rgba(255, 223, 152, 0.35);
		}

		.card-front {
			transform: rotateY(180deg);
			background: linear-gradient(135deg, rgba(12, 13, 26, 0.95), rgba(20, 19, 36, 0.95));
			border: 1px solid var(--rarity-color, #9ca3af);
			box-shadow:
				0 4px 10px rgba(0, 0, 0, 0.38),
				0 0 16px var(--rarity-glow, rgba(156, 163, 175, 0.18));
			position: absolute;
			transform: rotateY(180deg) translateZ(2px);
			z-index: 2;
			backface-visibility: hidden;
		}

		.card-back {
			background: linear-gradient(135deg, rgba(12, 13, 26, 0.95), rgba(19, 18, 34, 0.95));
			border: 1px solid rgba(255, 223, 152, 0.4);
			box-shadow: 0 4px 12px rgba(0, 0, 0, 0.45);
			box-shadow: 0 4px 10px rgba(0, 0, 0, 0.36);
			display: flex;
			align-items: center;
			justify-content: center;
			position: absolute;
			transform: translateZ(0);
			z-index: 1;
			backface-visibility: hidden;
		}

		.card-back-pattern {
			width: 100%;
			height: 100%;
			background:
				repeating-linear-gradient(45deg, rgba(255, 223, 152, 0.08) 0, rgba(255, 223, 152, 0.08) 2px, transparent 2px, transparent 8px),
				repeating-linear-gradient(-45deg, rgba(93, 159, 255, 0.08) 0, rgba(93, 159, 255, 0.08) 2px, transparent 2px, transparent 8px);
			position: relative;
			display: flex;
			align-items: center;
			justify-content: center;
		}

		.card-back-symbol {
			font-size: 58px;
			opacity: 0.7;
			filter: drop-shadow(0 0 10px rgba(255, 223, 152, 0.45));
			color: #f6e3bf;
		}

		.card-header {
			padding: 16px;
			text-align: center;
			border-bottom: 1px solid var(--rarity-color, #9ca3af);
			background: linear-gradient(90deg, rgba(255, 223, 152, 0.08), transparent, rgba(93, 159, 255, 0.08));
			position: relative;
		}

		.card-icon {
			font-size: 64px;
			margin-bottom: 8px;
			filter: drop-shadow(0 0 8px var(--rarity-glow, rgba(156, 163, 175, 0.3)));
		}

		.card-name {
			font-family: Georgia, "Times New Roman", serif;
			font-size: 20px;
			font-weight: bold;
			color: var(--rarity-color, #9ca3af);
			text-shadow: 0 0 8px var(--rarity-glow, rgba(156, 163, 175, 0.26));
			margin: 0;
		}

		.card-body {
			flex: 1;
			padding: 20px;
			display: flex;
			align-items: center;
			justify-content: center;
			position: relative;
			background:
				radial-gradient(circle at 50% 20%, rgba(255, 223, 152, 0.08), transparent 50%),
				radial-gradient(circle at 30% 70%, rgba(93, 159, 255, 0.08), transparent 50%);
		}

		.card-description {
			font-family: Georgia, "Times New Roman", serif;
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
				0 4px 14px rgba(0, 0, 0, 0.5),
				0 0 22px rgba(251, 191, 36, 0.5);
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
