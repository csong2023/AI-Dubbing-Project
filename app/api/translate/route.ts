import OpenAI from "openai";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { text, targetLang } = body;

    if (!text || !text.trim()) {
      return NextResponse.json(
        { error: "Missing text to translate" },
        { status: 400 }
      );
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a professional translator. Return only the translated text with no explanation.",
        },
        {
          role: "user",
          content: `Translate the following text into ${targetLang}.\n\nText:\n${text}`,
        },
      ],
    });

    const translatedText = completion.choices[0]?.message?.content?.trim() || "";


    return NextResponse.json({
      translatedText,
    });
  } catch (error) {
    console.error("translate error:", error);
    return NextResponse.json({ error: "Translation failed" }, { status: 500 });
  }
}