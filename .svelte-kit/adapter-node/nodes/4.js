

export const index = 4;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/test/_page.svelte.js')).default;
export const imports = ["_app/immutable/nodes/4.vs2qVdiL.js","_app/immutable/chunks/CuXZQ5wZ.js","_app/immutable/chunks/IHki7fMi.js","_app/immutable/chunks/CE8XP-mx.js"];
export const stylesheets = ["_app/immutable/assets/maplibre-gl.CuCRB34y.css"];
export const fonts = [];
