import OpenAI from 'openai'

export function createPerplexityClient() {
    const apiKey = process.env.PERPLEXITY_API_KEY?.trim()

    if (!apiKey) {
        throw new Error('Missing PERPLEXITY_API_KEY. Add a valid Perplexity API key to .env.local and restart the dev server.')
    }

    const client = new OpenAI({
        apiKey,
        timeout: 45000,
        maxRetries: 1,
        baseURL: 'https://api.perplexity.ai',
    })
    const originalCreate = client.chat.completions.create.bind(client.chat.completions)
    client.chat.completions.create = ((...args: any[]) => (originalCreate as any)(...args).catch((error: unknown) => { throw new Error(getAIProviderErrorMessage(error)) })) as typeof client.chat.completions.create
    return client
}

export function getAIProviderErrorMessage(error: unknown) {
    if (error instanceof Error) {
        const status = 'status' in error ? error.status : undefined
        const message = error.message

        if (status === 401 || message.includes('Invalid API key')) {
            return 'Invalid Perplexity API key. Update PERPLEXITY_API_KEY in .env.local and restart the dev server.'
        }

        return 'AI provider request failed. Please try again later.'
    }

    return 'AI provider request failed'
}
