import Anthropic from '@anthropic-ai/sdk'

function getClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set')
  return new Anthropic({ apiKey })
}

export async function generateBookOpening(params: {
  title: string
  genre: string
  premise?: string | null
  protagonist_name?: string | null
  protagonist_description?: string | null
}): Promise<{ logline: string; welcome: string }> {
  const client = getClient()

  const details = [
    `Title: ${params.title}`,
    `Genre: ${params.genre}`,
    params.premise ? `Premise: ${params.premise}` : null,
    params.protagonist_name
      ? `Protagonist: ${params.protagonist_name}${params.protagonist_description ? ` — ${params.protagonist_description}` : ''}`
      : null,
  ]
    .filter(Boolean)
    .join('\n')

  const message = await client.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 512,
    messages: [
      {
        role: 'user',
        content: `You are Tomos, an AI writing companion for novelists. A writer is starting a new book project. Generate two things:

1. A logline: 1–2 sentences that capture what this book is about. Evocative and specific, not generic.
2. A welcome message: 2–3 sentences setting the creative tone for this project. Address the writer directly. Match the genre's register — poetic for literary fiction, tense for thriller, atmospheric for horror, etc.

Book details:
${details}

Respond with valid JSON only:
{"logline": "...", "welcome": "..."}`,
      },
    ],
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : ''

  try {
    const json = JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] ?? '{}')
    return {
      logline: json.logline ?? '',
      welcome: json.welcome ?? `Welcome to ${params.title}. Let's build something extraordinary.`,
    }
  } catch {
    return {
      logline: params.premise ?? '',
      welcome: `Welcome to ${params.title}. Let's build something extraordinary.`,
    }
  }
}
