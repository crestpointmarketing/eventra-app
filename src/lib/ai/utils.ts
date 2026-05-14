// Strips markdown code fences that some models wrap JSON output in, then parses.
export function parseAIJSON(content: string): unknown {
    let text = content.trim()
    if (text.startsWith('```')) {
        text = text.replace(/```json?\n?/g, '').replace(/```\n?$/g, '')
    }
    return JSON.parse(text)
}
