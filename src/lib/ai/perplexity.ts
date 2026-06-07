import OpenAI from 'openai'

export function createPerplexityClient() {
    const apiKey = process.env.PERPLEXITY_API_KEY?.trim()

    if (!apiKey) {
        throw new Error('Missing PERPLEXITY_API_KEY. Add a valid Perplexity API key to .env.local and restart the dev server.')
    }

    return new OpenAI({
        apiKey,
        baseURL: 'https://api.perplexity.ai',
    })
}

export function getAIProviderErrorMessage(error: unknown) {
    if (error instanceof Error) {
        const status = 'status' in error ? error.status : undefined
        const message = error.message

        if (status === 401 || message.includes('Invalid API key')) {
            return 'Invalid Perplexity API key. Update PERPLEXITY_API_KEY in .env.local and restart the dev server.'
        }

        return message
    }

    return 'AI provider request failed'
}
