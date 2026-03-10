import OpenAI from "openai";
import { NextResponse } from "next/server";
import { mkdir, readFile, unlink, writeFile } from "fs/promises";
import path from "path";
import os from "os";
import { execFile } from "child_process";
import { promisify } from "util";
import { auth } from "@/auth";
import { isAllowedEmail } from "@/lib/allowed-users";

export const runtime = "nodejs";

const execFileAsync = promisify(execFile);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  let inputPath = "";
  let ttsPath = "";
  let outputPath = "";

  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const allowed = await isAllowedEmail(session.user.email);

    if (!allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const text = formData.get("text") as string | null;

    if (!file) {
      return NextResponse.json({ error: "Missing file" }, { status: 400 });
    }

    if (!text || !text.trim()) {
      return NextResponse.json({ error: "Missing text" }, { status: 400 });
    }

    const tempDir = path.join(os.tmpdir(), `dub-${Date.now()}`);
    await mkdir(tempDir, { recursive: true });

    const originalName = file.name || "input";
    const ext =
      path.extname(originalName) ||
      (file.type.startsWith("video/") ? ".mp4" : ".mp3");

    inputPath = path.join(tempDir, `input${ext}`);
    ttsPath = path.join(tempDir, "tts.mp3");
    outputPath = path.join(
      tempDir,
      file.type.startsWith("video/") ? "output.mp4" : "output.mp3"
    );

    const inputBuffer = Buffer.from(await file.arrayBuffer());
    await writeFile(inputPath, inputBuffer);

    const ttsResponse = await openai.audio.speech.create({
      model: "gpt-4o-mini-tts",
      voice: "alloy",
      input: text,
    });

    const ttsBuffer = Buffer.from(await ttsResponse.arrayBuffer());
    await writeFile(ttsPath, ttsBuffer);

    if (file.type.startsWith("video/")) {
      await execFileAsync("ffmpeg", [
        "-y",
        "-i",
        inputPath,
        "-i",
        ttsPath,
        "-map",
        "0:v:0",
        "-map",
        "1:a:0",
        "-c:v",
        "copy",
        "-c:a",
        "aac",
        "-shortest",
        outputPath,
      ]);

      const out = await readFile(outputPath);

      return new Response(out, {
        status: 200,
        headers: {
          "Content-Type": "video/mp4",
          "Content-Disposition": 'attachment; filename="dubbed-video.mp4"',
        },
      });
    }

    const out = await readFile(ttsPath);

    return new Response(out, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Disposition": 'attachment; filename="dubbed-audio.mp3"',
      },
    });
  } catch (error: any) {
    console.error("dub error:", error);
    if (error?.stderr) {
      console.error("ffmpeg stderr:", error.stderr);
    }

    return NextResponse.json({ error: "Dub generation failed" }, { status: 500 });
  } finally {
    for (const filePath of [inputPath, ttsPath, outputPath]) {
      if (!filePath) continue;
      try {
        await unlink(filePath);
      } catch {}
    }
  }
}