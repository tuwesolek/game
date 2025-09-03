import { c as create_ssr_component } from "../../chunks/ssr.js";
const Layout = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { params = {} } = $$props;
  if ($$props.params === void 0 && $$bindings.params && params !== void 0) $$bindings.params(params);
  return `<main class="h-screen w-screen overflow-hidden bg-game-bg text-gray-100">${slots.default ? slots.default({}) : ``}</main> ${$$result.head += `<!-- HEAD_svelte-19xd2qx_START -->${$$result.title = `<title>Pixel Dominion - Real-time Pixel RTS</title>`, ""}<meta name="description" content="Real-time pixel-based strategy game with territory control and building mechanics"><meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no"><meta name="theme-color" content="#1a1a1a"><link rel="manifest" href="/manifest.webmanifest"><!-- HEAD_svelte-19xd2qx_END -->`, ""}`;
});
export {
  Layout as default
};
