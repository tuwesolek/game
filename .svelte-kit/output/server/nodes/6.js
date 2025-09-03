

export const index = 6;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/test-osm/_page.svelte.js')).default;
export const imports = ["_app/immutable/nodes/6.Cv7j3gMs.js","_app/immutable/chunks/CuXZQ5wZ.js","_app/immutable/chunks/IHki7fMi.js","_app/immutable/chunks/CE8XP-mx.js"];
export const stylesheets = ["_app/immutable/assets/maplibre-gl.CuCRB34y.css","_app/immutable/assets/3.gw_2Blqw.css"];
export const fonts = [];
