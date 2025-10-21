import OpenAI from "openai";
import { GoogleGenAI } from "@google/genai";
import 'dotenv/config'

// runtime detection
const isNode =
  typeof process !== "undefined" &&
  process.versions &&
  !!process.versions.node;

let gemini = null;
let gpt = null;

function initLLM(keys = {}) {
  const { googleApiKey, openaiApiKey } = keys;
  if (googleApiKey) gemini = new GoogleGenAI({ apiKey: googleApiKey });
  if (openaiApiKey) gpt = new OpenAI({ apiKey: openaiApiKey });
}

// ---------- helpers ----------
async function getInlineImagePart(image, model) {
  // GPT accepts url or base64 data uri
  if (model.includes("gpt")) {
    if (image.startsWith("http")) return image;

    if (isNode) {
      const fs = await import("node:fs");
      if (image.includes(".") && fs.existsSync(image)) {
        const base64Image = fs.readFileSync(image, "base64");
        return `data:image/jpeg;base64,${base64Image}`;
      }
    }

    return image.startsWith("data:")
      ? image
      : `data:image/jpeg;base64,${image}`;
  }

  // Gemini path
  if (image.startsWith("http")) {
    const res = await fetch(image);
    const buf = Buffer.from(await res.arrayBuffer());
    return {
      inlineData: { mimeType: "image/jpeg", data: buf.toString("base64") },
    };
  }

  if (isNode) {
    const fs = await import("node:fs");
    if (image.includes(".") && fs.existsSync(image)) {
      const buf = fs.readFileSync(image);
      return {
        inlineData: { mimeType: "image/jpeg", data: buf.toString("base64") },
      };
    }
  }

  return {
    inlineData: { mimeType: "image/jpeg", data: image },
  };
}

async function getInlineVideoPart(video) {
  if (!isNode) throw new Error("Video files only supported in Node");
  const fs = await import("node:fs");
  const buf = fs.readFileSync(video);
  return {
    inlineData: { mimeType: "video/mp4", data: buf.toString("base64") },
  };
}

async function getInlineDocumentPart(document) {
  if (document.startsWith("http")) {
    const res = await fetch(document);
    const buf = Buffer.from(await res.arrayBuffer());
    return {
      inlineData: { mimeType: "application/octet-stream", data: buf.toString("base64") },
    };
  }

  if (!isNode) throw new Error("Local documents only supported in Node");
  const fs = await import("node:fs");
  const buf = fs.readFileSync(document);
  return {
    inlineData: { mimeType: "application/octet-stream", data: buf.toString("base64") },
  };
}

async function getInlineAudioPart(audio) {
  if (!isNode) throw new Error("Audio files only supported in Node");
  const fs = await import("node:fs");
  const buf = fs.readFileSync(audio);
  return {
    inlineData: { mimeType: "audio/mp3", data: buf.toString("base64") },
  };
}

// ---------- main ----------
async function useLLM({
  model,
  prompt,
  systemPrompt,
  image,
  detail,
  video,
  audio,
  document,
  streamingResponse,
}) {
  if (model.includes("gpt")) {
    if (!gpt) throw new Error("OpenAI not initialized. Call initLLM first.");
    const messages = [
      {
        role: "user",
        content: [
          ...(prompt ? [{ type: "text", text: prompt }] : []),
          ...(image ? [{
            type: "image_url",
            image_url: { url: await getInlineImagePart(image, model), detail },
          }] : []),
          // GPT doesn’t support audio/video/doc natively → ignore for now
        ],
      },
    ];
    return gpt.chat.completions.create({
      model,
      messages,
      stream: streamingResponse,
    });
  }

  if (model.includes("gemini")) {
    if (!gemini) throw new Error("Gemini not initialized. Call initLLM first.");
    const contents = [
      ...(prompt ? [{ text: prompt }] : []),
      ...(image ? [await getInlineImagePart(image, model)] : []),
      ...(video ? [await getInlineVideoPart(video)] : []),
      ...(audio ? [await getInlineAudioPart(audio)] : []),
      ...(document ? [await getInlineDocumentPart(document)] : []),
    ];
    return streamingResponse
      ? gemini.models.generateContentStream({
          model,
          contents,
          ...(systemPrompt && { config: { systemInstruction: systemPrompt } }),
        })
      : gemini.models.generateContent({
          model,
          contents,
          ...(systemPrompt && { config: { systemInstruction: systemPrompt } }),
        });
  }

  throw new Error("Unknown model. Must include 'gpt' or 'gemini'");
}

export { useLLM, initLLM };
