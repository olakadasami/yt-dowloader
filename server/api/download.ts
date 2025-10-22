import { defineEventHandler, readBody } from "nitro/h3";
import { execa } from "execa";

export interface DownloadBody {
  url: string;
}

// server/routes/download/[url].ts
export default defineEventHandler(async (event) => {
  console.log("Received download request");
  const body = await readBody(event);
  const downloadBody = body as DownloadBody;

  // Manual runtime validation to ensure the body has the 'url' property
  if (!downloadBody || typeof downloadBody.url !== "string") {
    return {
      status: 400,
      body: "Video URL is required.",
    };
  }

  const { url } = downloadBody;

  try {
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
