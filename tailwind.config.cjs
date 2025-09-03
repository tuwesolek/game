/** @type {import('tailwindcss').Config} */
module.exports = {
	content: ['./src/**/*.{html,js,svelte,ts}'],
	darkMode: 'class',
	theme: {
		extend: {
			colors: {
				'game-bg': '#1a1a1a',
				'game-panel': '#2d2d2d',
				'game-accent': '#4f46e5',
				'territory-gray': '#6b7280',
				'building-primary': '#3b82f6',
				'px-color': '#fbbf24',
				'exp-color': '#10b981',
				'apx-color': '#ef4444'
			},
			fontFamily: {
				'mono': ['JetBrains Mono', 'Consolas', 'Monaco', 'monospace']
			},
			animation: {
				'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
				'ping-slow': 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite'
			}
		}
	},
	plugins: []
};