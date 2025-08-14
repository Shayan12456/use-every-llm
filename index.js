import {
  GoogleGenAI,
  createUserContent,
  createPartFromUri,
  Modality,
} from "@google/genai";
import OpenAI from "openai";
import * as fs from "node:fs";
import { fileTypeFromBuffer } from "file-type";
import path from "path";
import "dotenv/config";

const gemini = new GoogleGenAI({
  apiKey: process.env.GOOGLE_API_KEY,
});

const gpt = new OpenAI({
  baseURL: "https://models.github.ai/inference",
  apiKey: process.env.OPENAI_API_KEY,
});

async function getInlineImagePart(image, model) {
  if (model.includes("gpt")) {
    if (image.startsWith("http")) {
      return image;
    } else if (image.includes(".") && fs.existsSync(image)) {
      const base64Image = fs.readFileSync(image, "base64"); // no await

      return `data:image/jpeg;base64,${base64Image}`;
    }

    return `data:image/jpeg;base64,${image}`;
  }

  if (image.startsWith("http")) {
    const res = await fetch(image);
    const buffer = Buffer.from(await res.arrayBuffer());
    const type = await fileTypeFromBuffer(buffer);
    return {
      inlineData: {
        mimeType: type?.mime || "image/jpeg",
        data: buffer.toString("base64"),
      },
    };
  }

  if (image.includes(".") && fs.existsSync(image)) {
    const buffer = fs.readFileSync(image);
    const type = await fileTypeFromBuffer(buffer);
    return {
      inlineData: {
        mimeType: type?.mime || "image/jpeg",
        data: buffer.toString("base64"),
      },
    };
  }

  // If already base64 string
  const buffer = Buffer.from(image, "base64");
  const type = await fileTypeFromBuffer(buffer);

  // ❗ Optional strict check — only in base64 case
  if (!type) {
    throw new Error("Could not determine MIME type from the base64 string");
  }

  return {
    inlineData: {
      mimeType: type.mime || "image/jpeg",
      data: image,
    },
  };
}

async function getInlineVideoPart(video) {
  const buffer = fs.readFileSync(video);
  const type = await fileTypeFromBuffer(buffer);

  if (!type || !type.mime.startsWith("video/")) {
    throw new Error("Unsupported or undetectable video format");
  }

  return {
    inlineData: {
      mimeType: type?.mime || "video/mp4",
      data: fs.readFileSync(video, {
        encoding: "base64",
      }),
    },
  };
}

async function getInlineDocumentPart(document) {
  if (document.startsWith("http")) {
    const res = await fetch(document);
    const buffer = Buffer.from(await res.arrayBuffer());
    const type = await fileTypeFromBuffer(buffer);
    const ext = path.extname(new URL(document).pathname).toLowerCase();

    const mimeType =
      type?.mime ||
      (ext === ".txt"
        ? "text/plain"
        : ext === ".md"
        ? "text/markdown"
        : ext === ".html"
        ? "text/html"
        : ext === ".xml"
        ? "application/xml"
        : "application/octet-stream");

    return {
      inlineData: {
        mimeType,
        data: buffer.toString("base64"),
      },
    };
  }

  const buffer = fs.readFileSync(document);
  const type = await fileTypeFromBuffer(buffer);
  const ext = path.extname(document).toLowerCase();

  // if (!type || !type.mime.startsWith("application/")) {
  //   throw new Error("Unsupported or undetectable document format");
  // } coz document mime types do start with different unlike image,video,audio

  const mimeType =
    type?.mime ||
    (ext === ".txt"
      ? "text/plain"
      : ext === ".md"
      ? "text/markdown"
      : ext === ".html"
      ? "text/html"
      : ext === ".xml"
      ? "application/xml"
      : "application/octet-stream");

  return {
    inlineData: {
      mimeType,
      data: fs.readFileSync(document, {
        encoding: "base64",
      }),
    },
  };
}

async function getInlineAudioPart(audio) {
  const buffer = fs.readFileSync(audio);
  const type = await fileTypeFromBuffer(buffer);

  if (!type || !type.mime.startsWith("audio/")) {
    throw new Error("Unsupported or undetectable audio format");
  }

  return {
    inlineData: {
      mimeType: type?.mime?.includes("mpeg")
        ? "audio/mp3"
        : type.mime || "audio/mp3",
      data: fs.readFileSync(audio, {
        encoding: "base64",
      }),
    },
  };
}

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
    let messages = [
      {
        role: "user",
        content: [
          ...(prompt?.length > 0 ? [{ type: "text", text: prompt }] : []),
          ...(image?.length > 0
            ? [
                {
                  type: "image_url",
                  image_url: {
                    url: await getInlineImagePart(image, model),
                    detail,
                  },
                },
              ]
            : []),
          ...(audio?.length > 0 ? [await getInlineAudioPart(audio)] : []),
        ],
      },
    ];

    const response = await gpt.chat.completions.create({
      //image is passed and for that role besomes must in open ai [chat comp + response]
      model,
      messages,
    });

    console.log(response.choices[0].message.content);
  } else if (model.includes("gemini")) {
    const contents = [
      //in array you can have data in several formats
      ...(prompt?.length > 0 ? [{ text: prompt }] : []),
      ...(image?.length > 0 ? [await getInlineImagePart(image, "")] : []),
      ...(video?.length > 0 ? [await getInlineVideoPart(video)] : []),
      ...(audio?.length > 0 ? [await getInlineAudioPart(audio)] : []),
      ...(document?.length > 0 ? [await getInlineDocumentPart(document)] : []),
    ];

    const response =
      streamingResponse === true
        ? await gemini.models.generateContentStream({
            model,
            contents,
            ...(systemPrompt?.length > 0 && {
              config: { systemInstruction: systemPrompt },
            }), //in object literals always in key:value that is why ternary treated as an floating expression(any line of code that evaluates to something)
          })
        : await gemini.models.generateContent({
            model,
            contents,
            ...(systemPrompt?.length > 0 && {
              config: { systemInstruction: systemPrompt },
            }), //in object literals always in key:value that is why ternary treated as an floating expression(any line of code that evaluates to something)
          });

    // for await (const chunk of response) {
    //   console.log(chunk.text);
    // }
    console.log(response.text);
  }
}

// x--------- text generation with text input ---------x
// await useLLM({
//   model: "gemini-2.0-flash",
//   prompt: "What model is it",
// });

// await useLLM({
//   model: "gpt-4.1-mini",
//   prompt: "What model is it",
//   systemPrompt: "hi",
// });
// console.log(
//   "-----------------------------------------------------------------"
// );
// x--------- text generation with [image input + text] or just an [image input]---------x
// x--------- image file, url, base64 encoded strings ---------x
// await useLLM({
//   model: "gpt-4.1-mini",
//   prompt: "what image is it?",
//   image: "image.png",
// });
// console.log(
//   "-----------------------------------------------------------------"
// );
// await useLLM({
//   model: "gemini-2.0-flash",
//   prompt: "what image is it?",
//   systemPrompt: "You are an image describer",
//   image: "image.png",
// });
// console.log(
//   "-----------------------------------------------------------------"
// );
// await useLLM({
// model: "gpt-4.1-mini",
// prompt: "what image is it?",
//   image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTm29icQ1wHIEPDBWlUyT3F7X6jiwXgfHsq8Q&s",
//   detail: "low"
// });
// console.log(
//   "-----------------------------------------------------------------"
// );
// await useLLM({
// model: "gemini-2.0-flash",
// prompt: "what image is it?",
//   systemPrompt: "You are an image describer",
//   image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTm29icQ1wHIEPDBWlUyT3F7X6jiwXgfHsq8Q&s"
// });
// console.log(
//   "-----------------------------------------------------------------"
// );
// await useLLM({
//   model: "gpt-4.1-mini",
//   prompt: "what image is it?",
//   image: fs.readFileSync("Screenshot 2025-07-17 at 5.35.40 PM.png", {
//     encoding: "base64",
//   }),
// });
// console.log(
//   "-----------------------------------------------------------------"
// );
// await useLLM({
//   model: "gemini-2.0-flash",
//   prompt: "what image is it?",
//   systemPrompt: "You are an image describer",
//   image: fs.readFileSync("Screenshot 2025-07-17 at 5.35.40 PM.png", {
//     encoding: "base64",
//   }),
// });
// console.log(
//   "-----------------------------------------------------------------"
// );
// x---------text generation with [video input + text] or just a [video input]---------x
// await useLLM({
//   model: "gemini-2.0-flash",
//   prompt: "what video is it?",
//   systemPrompt: "You are a video describer",
//   video: "My Movie.mp4",
// });
// console.log(
//   "-----------------------------------------------------------------"
// );
// await useLLM({
//   model: "gemini-2.0-flash",
//   systemPrompt: "You are a video describer",
//   video: "My Movie.mp4",
// });
// console.log(
//   "-----------------------------------------------------------------"
// );
// x---------text generation with [audio input + text] or just a [audio input]---------x
// await useLLM({
//   model: "gemini-2.0-flash",
//   prompt: "what audio is it?",
//   systemPrompt: "You are an audio describer",
//   audio: "audio.mp3",
// });
// console.log(
//   "-----------------------------------------------------------------"
// );
// await useLLM({
//   model: "gemini-2.0-flash",
//   systemPrompt: "You are an audio describer",
//   audio: "audio.mp3",
// });
// console.log(
//   "-----------------------------------------------------------------"
// );
// x---------text generation with [document[url or local file] input + text] or just a [document input]---------x
// await useLLM({
//   model: "gemini-2.0-flash",
//   prompt: "what document is it?",
//   systemPrompt: "You are a doc describer",
//   // document: "a-practical-guide-to-building-agents.pdf",
//   // document:
//   //   "https://cdn.openai.com/business-guides-and-resources/a-practical-guide-to-building-agents.pdf",
//   document: "https://www.w3.org/TR/PNG/iso_8859-1.txt",
// });
// console.log(
//   "-----------------------------------------------------------------"
// );
// x--------- text generation with streaming response ---------x
// await useLLM({
//   model: "gemini-2.0-flash",
//   prompt: "What model is it",
//   streamingResponse: true,
// });
// console.log(
// "-----------------------------------------------------------------"
// );
// x--------- Image generation and editing ---------x
// await generateImage("A cow eating grass", "test.png")
// await editImage("make cow fight with donkey", "gemini-native-image.png", "editedImagewe.png");//extension is a must
// "-----------------------------------------------------------------"

// history/ messages - all messages with roles
// contents/ parts - a message input

// generateContent - no auto history track, gemini chat - auto track[no need to explicitly add, but yeah preservation is on our end],
// open ai chat completions - no auto history track

// gpt must need history/messages and role for images where as gemini does not - here tracking like syntax is must for an image
// we can pass content directly to the gemini - coz we are not focused on tracking now

// systemPrompt is part of function in the Gemini, but in GPT it is part of the messages
