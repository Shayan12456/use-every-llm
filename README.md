# use-every-llm

**One function to call any LLM.**  
Supports **OpenAI** and **Gemini** models in **Node, Browser, Edge, Bun, and Deno** with the same API.

---

## 🚀 Installation

```bash
npm i use-every-llm
```

---

## ⚙️ Environment Configuration

Create a `.env` file (recommended for server / serverless):

```env
GEMINI_API_KEY=your-gemini-api-key
OPENAI_API_KEY=your-openai-api-key
```

---

## 🛠️ Initialize LLMs

```js
import { useLLM, initLLM } from "use-every-llm";

initLLM({
  openaiApiKey: process.env.OPENAI_API_KEY,
  googleApiKey: process.env.GEMINI_API_KEY,
});
```

---

## 📖 Usage Examples

### Basic Text Generation
```js
const response = await useLLM({
  model: "gemini-2.0-flash",
  prompt: "What model is it?"
});

console.log(response.text);
```

---

### Streaming Response
```js
const response = await useLLM({
  model: "gemini-2.0-flash",
  prompt: "What model is it?",
  streamingResponse: true
});

for await (const chunk of response) {
  console.log(chunk.text);
}
```

---

### Plug System Prompt
```js
const response = await useLLM({
  model: "gemini-2.0-flash",
  prompt: "What model is it?",
  systemPrompt: "Respond like human"
});

console.log(response.text);
```

---

### Image Understanding

**From file:**
```js
const response = await useLLM({
  model: "gemini-2.0-flash",
  prompt: "What image is it?",
  image: "image.png"
});

console.log(response.text);
```

**From URL:**
```js
const response = await useLLM({
  model: "gemini-2.0-flash",
  prompt: "What image is it?",
  image: "https://example.com/image.png"
});

console.log(response.text);
```

**From Base64:**
```js
import * as fs from "node:fs";

const base64Image = fs.readFileSync("image.png", { encoding: "base64" });

const response = await useLLM({
  model: "gemini-2.0-flash",
  prompt: "What image is it?",
  image: base64Image
});

console.log(response.text);
```

---

### Video Understanding
```js
const response = await useLLM({
  model: "gemini-2.0-flash",
  prompt: "What video is it?",
  video: "video.mp4"
});

console.log(response.text);
```

---

### Audio Understanding
```js
const response = await useLLM({
  model: "gemini-2.0-flash",
  prompt: "What audio is it?",
  audio: "audio.mp4",
});

console.log(response.text);
```

---

### Document Understanding

**From file:**
```js
const response = await useLLM({
  model: "gemini-2.0-flash",
  prompt: "What document is it?",
  document: "document.pdf"
});

console.log(response.text);
```

**From URL:**
```js
const response = await useLLM({
  model: "gemini-2.0-flash",
  prompt: "What document is it?",
  document: "https://cdn.openai.com/business-guides-and-resources/a-practical-guide-to-building-agents.pdf"
});

console.log(response.text);
```

---

## ⚠️ Notes

- **Server-only keys:** Always load API keys from environment variables. Don’t hardcode secrets in client-side code.  
- **Node vs Browser:** Local file paths (`.png`, `.mp4`, `.pdf`) work in **Node.js** only. In Browser/Edge, use URLs or Base64.  
- **Models:** Pass any supported OpenAI (`gpt-*`, `gpt-4o-mini`) or Gemini (`gemini-*`) model string.

---

## 📜 License

MIT © 2025 Your Name
