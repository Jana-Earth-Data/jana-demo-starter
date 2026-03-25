import { NextRequest } from "next/server";
import OpenAI from "openai";

let _openai: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!_openai) {
    _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return _openai;
}

const SYSTEM_PROMPT = `You are Jana, an AI climate data assistant built into the Jana Earth Data demo.
You help non-technical stakeholders understand Nepal's climate and emissions data.

Context about the data sources available:
- **Climate TRACE**: Facility-level and sector emissions data for Nepal. Covers sectors like agriculture, buildings, manufacturing, transportation, and waste. Data is recent (primarily 2025).
- **OpenAQ**: Air quality monitoring network in Nepal — locations and sensors tracking PM2.5, temperature, humidity, and more.
- **EDGAR**: European Commission's national inventory database. Long-run greenhouse gas totals for Nepal spanning 1970–2024, broken down by gas type (CO2, CH4, N2O) and sector.

When the user provides their current dashboard data as context, use those specific numbers in your answers.

Guidelines:
- Be concise and accessible — the audience is non-technical.
- Use specific numbers from the data when available.
- Frame insights around what the data means for Nepal, not raw schema details.
- If asked about something outside the demo's scope, say so honestly.
- Keep responses to 2-3 short paragraphs unless the user asks for more detail.`;

type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

export async function POST(req: NextRequest) {
  if (!process.env.OPENAI_API_KEY) {
    return new Response(
      JSON.stringify({ error: "OPENAI_API_KEY not configured" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  const { messages, dataContext } = (await req.json()) as {
    messages: ChatMessage[];
    dataContext?: string;
  };

  const systemMessages: ChatMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
  ];

  if (dataContext) {
    systemMessages.push({
      role: "system",
      content: `Current dashboard data:\n${dataContext}`,
    });
  }

  const stream = await getOpenAI().chat.completions.create({
    model: "gpt-4o-mini",
    messages: [...systemMessages, ...messages],
    stream: true,
    max_tokens: 1024,
  });

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content;
        if (text) {
          controller.enqueue(encoder.encode(text));
        }
      }
      controller.close();
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
    },
  });
}
