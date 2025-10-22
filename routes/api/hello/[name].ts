import { defineHandler } from "nitro/h3";

export default defineHandler((event) => {
  const name = event.context.params?.name;

  return {
    message: `Hello, ${name ?? "Guest"}!`,
  };
});
