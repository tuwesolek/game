

export const index = 5;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/test-map/_page.svelte.js')).default;
export const imports = ["_app/immutable/nodes/5.B-dySV9F.js","_app/immutable/chunks/CuXZQ5wZ.js","_app/immutable/chunks/IHki7fMi.js","_app/immutable/chunks/CE8XP-mx.js"];
export const stylesheets = ["_app/immutable/assets/maplibre-gl.CuCRB34y.css","_app/immutable/assets/3.gw_2Blqw.css"];
export const fonts = [];
