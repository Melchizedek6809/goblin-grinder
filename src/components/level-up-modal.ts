import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";
import type { Upgrade } from "../systems/UpgradeSystem";
import "./tarot-card";

@customElement("level-up-modal")
export class LevelUpModal extends LitElement {
	@property({ type: Boolean })
	visible: boolean = false;

	@property({ type: Array })
	upgrades: Upgrade[] = [];

	@property({ type: Object })
	mysteryUpgrade: Upgrade | null = null;

	@property({ type: Array })
	private cardStates: boolean[] = [true, true, true, true]; // All start face-down

	private flipTimeouts: number[] = [];

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
			padding: 32px;
			border-radius: 12px;
			max-width: min(95vw, 920px);
			text-align: center;
			font-family: monospace;
			color: #e8f4ff;
		}

		.modal h2 {
			margin: 0 0 8px;
			font-size: 28px;
			color: #3be0ff;
			text-shadow: 0 0 8px rgba(59, 224, 255, 0.6);
			font-family: 'Georgia', serif;
		}

		.modal p {
			margin: 0 0 24px;
			color: #b7c6ff;
			font-size: 16px;
		}

		.cards-container {
			display: grid;
			grid-template-columns: repeat(4, 1fr);
			gap: 16px;
			justify-items: center;
			padding: 8px;
		}

		/* Tablet and mobile: 2x2 grid with smaller cards */
		@media (max-width: 768px) {
			.cards-container {
				grid-template-columns: repeat(2, 1fr);
				gap: 12px;
			}

			.modal {
				padding: 20px;
				max-width: 95vw;
			}

			.modal h2 {
				font-size: 24px;
			}

			.modal p {
				margin-bottom: 16px;
				font-size: 14px;
			}
		}

		/* Very small screens */
		@media (max-width: 400px) {
			.modal {
				padding: 16px;
			}

			.cards-container {
				gap: 8px;
			}
		}
	`;

	updated(changedProperties: Map<string, unknown>) {
		if (changedProperties.has("visible") && this.visible) {
			this.startFlipSequence();
		} else if (changedProperties.has("visible") && !this.visible) {
			// Reset card states when modal closes
			this.cardStates = [true, true, true, true];
			this.clearFlipTimeouts();
		}
	}

	disconnectedCallback(): void {
		super.disconnectedCallback();
		this.clearFlipTimeouts();
	}

	private async startFlipSequence() {
		this.clearFlipTimeouts();

		// Ensure the initial face-down state has rendered before flipping
		await this.updateComplete;

		this.flipTimeouts.push(
			window.setTimeout(() => this.setCardFaceUp(0), 100),
			window.setTimeout(() => this.setCardFaceUp(1), 250),
			window.setTimeout(() => this.setCardFaceUp(2), 400),
		);
		// Mystery card stays face-down until selection
	}

	private clearFlipTimeouts() {
		for (const timeoutId of this.flipTimeouts) {
			clearTimeout(timeoutId);
		}
		this.flipTimeouts = [];
	}

	private setCardFaceUp(index: number) {
		this.cardStates = this.cardStates.map((state, i) =>
			i === index ? false : state,
		);
	}

	private handleCardSelected(event: CustomEvent) {
		const { upgrade } = event.detail;

		// Check if this is the mystery card
		const isMysteryCard = upgrade === this.mysteryUpgrade;

		if (isMysteryCard) {
			// Flip the mystery card first
			this.setCardFaceUp(3);

			// Wait for flip animation (600ms) + reveal time (2000ms), then dispatch event
			setTimeout(() => {
				this.dispatchEvent(
					new CustomEvent("upgrade-selected", {
						detail: { upgrade },
						bubbles: true,
						composed: true,
					}),
				);
			}, 2600);
		} else {
			// Regular card - dispatch immediately
			this.dispatchEvent(
				new CustomEvent("upgrade-selected", {
					detail: { upgrade },
					bubbles: true,
					composed: true,
				}),
			);
		}
	}

	render() {
		return html`
			<div class="backdrop ${this.visible ? "visible" : ""}">
				<div class="modal">
					<h2>Level Up!</h2>
					<p>Choose your destiny:</p>
					<div class="cards-container" @card-selected=${this.handleCardSelected}>
						${this.upgrades.slice(0, 3).map(
							(upgrade, index) => html`
								<tarot-card
									.upgrade=${upgrade}
									.faceDown=${this.cardStates[index]}
								></tarot-card>
							`,
						)}
						<tarot-card
							.upgrade=${this.mysteryUpgrade}
							.faceDown=${this.cardStates[3]}
							.mystery=${true}
						></tarot-card>
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
