import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return Response.json(
        { error: "No file uploaded" },
        { status: 400 }
      );
    }

    const elevenForm = new FormData();

    elevenForm.append("file", file);

    // ⭐ 반드시 필요
    elevenForm.append("model_id", "scribe_v1");

    const response = await fetch(
      "https://api.elevenlabs.io/v1/speech-to-text",
      {
        method: "POST",
        headers: {
          "xi-api-key": process.env.ELEVENLABS_API_KEY!,
        },
        body: elevenForm,
      }
    );

    const data = await response.json();


    return Response.json({
      text: data.text ?? "",
      raw: data,
    });

  } catch (error) {
    console.error("transcribe route error:", error);

    return Response.json(
      { error: "transcription failed" },
      { status: 500 }
    );
  }
}