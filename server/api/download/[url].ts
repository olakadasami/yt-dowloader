import { defineEventHandler, getRouterParam } from "nitro/h3";
import { execa } from "execa";

// server/routes/download/[url].ts
export default defineEventHandler(async (event) => {
  const url = getRouterParam(event, "url");

  try {
    if (!url) {
      return {
        status: 400,
        body: "Video URL is required.",
      };
    }

    const { stdout } = await execa("yt-dlp", [url, "-o", "video.mp4"]);

    return {
      status: 200,
      body: "Download successful!",
      output: stdout,
    };
  } catch (err: unknown) {
    if (err instanceof Error) {
      return {
        status: 500,
        body: `Download failed: ${err.message}`,
      };
    }
    return {
      status: 500,
      body: "Download failed: Unknown error",
    };
  }
});
