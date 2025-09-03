import { c as create_ssr_component, d as add_attribute } from "../../../chunks/ssr.js";
import "maplibre-gl";
/* empty css                          */
const Page = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  return `<div style="width: 100%; height: 100vh;"${add_attribute()}></div>`;
});
export {
  Page as default
};
