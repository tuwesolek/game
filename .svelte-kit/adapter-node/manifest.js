export const manifest = (() => {
function __memo(fn) {
	let value;
	return () => value ??= (value = fn());
}

return {
	appDir: "_app",
	appPath: "_app",
	assets: new Set(["favicon.png","manifest.webmanifest","map-test.html","osm-test.html"]),
	mimeTypes: {".png":"image/png",".webmanifest":"application/manifest+json",".html":"text/html"},
	_: {
		client: {start:"_app/immutable/entry/start.CCho9PUb.js",app:"_app/immutable/entry/app.P5ICwBMf.js",imports:["_app/immutable/entry/start.CCho9PUb.js","_app/immutable/chunks/BgbncjP5.js","_app/immutable/chunks/CuXZQ5wZ.js","_app/immutable/chunks/BRHkLRMZ.js","_app/immutable/entry/app.P5ICwBMf.js","_app/immutable/chunks/CuXZQ5wZ.js","_app/immutable/chunks/IHki7fMi.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:false},
		nodes: [
			__memo(() => import('./nodes/0.js')),
			__memo(() => import('./nodes/1.js')),
			__memo(() => import('./nodes/2.js')),
			__memo(() => import('./nodes/3.js')),
			__memo(() => import('./nodes/4.js')),
			__memo(() => import('./nodes/5.js')),
			__memo(() => import('./nodes/6.js')),
			__memo(() => import('./nodes/7.js'))
		],
		remotes: {
			
		},
		routes: [
			{
				id: "/",
				pattern: /^\/$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 2 },
				endpoint: null
			},
			{
				id: "/api/leaderboard",
				pattern: /^\/api\/leaderboard\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/leaderboard/_server.ts.js'))
			},
			{
				id: "/api/place",
				pattern: /^\/api\/place\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/place/_server.ts.js'))
			},
			{
				id: "/map-test",
				pattern: /^\/map-test\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 3 },
				endpoint: null
			},
			{
				id: "/test-map",
				pattern: /^\/test-map\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 5 },
				endpoint: null
			},
			{
				id: "/test-osm",
				pattern: /^\/test-osm\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 6 },
				endpoint: null
			},
			{
				id: "/test",
				pattern: /^\/test\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 4 },
				endpoint: null
			},
			{
				id: "/verify-map",
				pattern: /^\/verify-map\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 7 },
				endpoint: null
			},
			{
				id: "/ws",
				pattern: /^\/ws\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/ws/_server.ts.js'))
			}
		],
		prerendered_routes: new Set([]),
		matchers: async () => {
			
			return {  };
		},
		server_assets: {}
	}
}
})();

export const prerendered = new Set([]);

export const base = "";