

export const index = 2;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/_page.svelte.js')).default;
export const imports = ["_app/immutable/nodes/2.Xtm2GpOg.js","_app/immutable/chunks/CuXZQ5wZ.js","_app/immutable/chunks/IHki7fMi.js","_app/immutable/chunks/BRHkLRMZ.js"];
export const stylesheets = ["_app/immutable/assets/2.BPHXLZjf.css"];
export const fonts = [];
