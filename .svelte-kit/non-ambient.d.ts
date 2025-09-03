
// this file is generated — do not edit it


declare module "svelte/elements" {
	export interface HTMLAttributes<T> {
		'data-sveltekit-keepfocus'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-noscroll'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-preload-code'?:
			| true
			| ''
			| 'eager'
			| 'viewport'
			| 'hover'
			| 'tap'
			| 'off'
			| undefined
			| null;
		'data-sveltekit-preload-data'?: true | '' | 'hover' | 'tap' | 'off' | undefined | null;
		'data-sveltekit-reload'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-replacestate'?: true | '' | 'off' | undefined | null;
	}
}

export {};


declare module "$app/types" {
	export interface AppTypes {
		RouteId(): "/" | "/api" | "/api/leaderboard" | "/api/log" | "/api/place" | "/map-test" | "/test-map" | "/test-osm" | "/test" | "/verify-map" | "/ws";
		RouteParams(): {
			
		};
		LayoutParams(): {
			"/": Record<string, never>;
			"/api": Record<string, never>;
			"/api/leaderboard": Record<string, never>;
			"/api/log": Record<string, never>;
			"/api/place": Record<string, never>;
			"/map-test": Record<string, never>;
			"/test-map": Record<string, never>;
			"/test-osm": Record<string, never>;
			"/test": Record<string, never>;
			"/verify-map": Record<string, never>;
			"/ws": Record<string, never>
		};
		Pathname(): "/" | "/api" | "/api/" | "/api/leaderboard" | "/api/leaderboard/" | "/api/log" | "/api/log/" | "/api/place" | "/api/place/" | "/map-test" | "/map-test/" | "/test-map" | "/test-map/" | "/test-osm" | "/test-osm/" | "/test" | "/test/" | "/verify-map" | "/verify-map/" | "/ws" | "/ws/";
		ResolvedPathname(): `${"" | `/${string}`}${ReturnType<AppTypes['Pathname']>}`;
		Asset(): "/favicon.png" | "/manifest.webmanifest" | "/map-test.html" | "/osm-test.html" | string & {};
	}
}