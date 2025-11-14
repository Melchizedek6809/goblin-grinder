/**
 * Mobile debug overlay to show console logs on screen
 * Useful for debugging on devices where you can't access the console
 */
export class MobileDebug {
	private debugElement: HTMLDivElement;
	private logs: string[] = [];
	private maxLogs = 20;

	constructor() {
		// Create debug overlay
		this.debugElement = document.createElement("div");
		this.debugElement.style.position = "fixed";
		this.debugElement.style.top = "0";
		this.debugElement.style.left = "0";
		this.debugElement.style.width = "100%";
		this.debugElement.style.maxHeight = "50vh";
		this.debugElement.style.overflow = "auto";
		this.debugElement.style.backgroundColor = "rgba(0, 0, 0, 0.9)";
		this.debugElement.style.color = "#0f0";
		this.debugElement.style.fontFamily = "monospace";
		this.debugElement.style.fontSize = "10px";
		this.debugElement.style.padding = "8px";
		this.debugElement.style.zIndex = "10000";
		this.debugElement.style.pointerEvents = "none";
		this.debugElement.style.whiteSpace = "pre-wrap";
		this.debugElement.style.wordBreak = "break-all";

		document.body.appendChild(this.debugElement);

		// Intercept console methods
		this.interceptConsole();
	}

	private interceptConsole() {
		const originalLog = console.log;
		const originalError = console.error;
		const originalWarn = console.warn;

		console.log = (...args: any[]) => {
			originalLog.apply(console, args);
			this.addLog("LOG", args);
		};

		console.error = (...args: any[]) => {
			originalError.apply(console, args);
			this.addLog("ERROR", args);
		};

		console.warn = (...args: any[]) => {
			originalWarn.apply(console, args);
			this.addLog("WARN", args);
		};

		// Catch unhandled errors
		window.addEventListener("error", (e) => {
			this.addLog("ERROR", [e.message, e.filename, e.lineno, e.colno]);
		});

		// Catch unhandled promise rejections
		window.addEventListener("unhandledrejection", (e) => {
			this.addLog("REJECTION", [e.reason]);
		});
	}

	private addLog(type: string, args: any[]) {
		const timestamp = new Date().toLocaleTimeString();
		const message = args.map(arg => {
			if (typeof arg === "object") {
				try {
					return JSON.stringify(arg, null, 2);
				} catch {
					return String(arg);
				}
			}
			return String(arg);
		}).join(" ");

		this.logs.push(`[${timestamp}] ${type}: ${message}`);

		// Keep only last N logs
		if (this.logs.length > this.maxLogs) {
			this.logs.shift();
		}

		this.render();
	}

	private render() {
		this.debugElement.textContent = this.logs.join("\n");
		// Auto-scroll to bottom
		this.debugElement.scrollTop = this.debugElement.scrollHeight;
	}
}
