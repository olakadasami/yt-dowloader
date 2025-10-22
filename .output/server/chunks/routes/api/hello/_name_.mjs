import { defineHandler } from "nitro/h3";
var __name__default = defineHandler((event) => {
	return { message: `Hello, ${event.context.params?.name ?? "Guest"}!` };
});
export { __name__default as default };
