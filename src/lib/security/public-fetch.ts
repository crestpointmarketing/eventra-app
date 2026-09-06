import { lookup } from 'node:dns/promises'
import https from 'node:https'
import http from 'node:http'
import ipaddr from 'ipaddr.js'

export function isPublicAddress(address: string): boolean {
    try { return ipaddr.process(address).range() === 'unicast' } catch { return false }
}

export function validatePublicUrl(input: string): URL {
    const url = new URL(input)
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password ||
        (url.port && !['80', '443'].includes(url.port)) || url.hostname.toLowerCase() === 'localhost') {
        throw new Error('Only public HTTP(S) URLs are supported')
    }
    return url
}

/** DNS pinned per hop, bounded body, redirects and total deadline. */
export async function fetchPublicText(input: string, deadline = Date.now() + 8000, hops = 0): Promise<{ url: string; text: string; status: number }> {
    if (hops > 3 || Date.now() >= deadline) throw new Error('URL fetch limit reached')
    const url = validatePublicUrl(input)
    const hostname = url.hostname.replace(/^\[|\]$/g, '')
    const addresses = await Promise.race([
        lookup(hostname, { all: true }),
        new Promise<never>((_, reject) => { const timer = setTimeout(() => reject(new Error('DNS timeout')), Math.max(1, deadline - Date.now())); timer.unref() }),
    ])
    if (!addresses.length || addresses.some(a => !isPublicAddress(a.address))) throw new Error('Non-public address rejected')
    const pinned = addresses[0]
    const result = await new Promise<{ status: number; location?: string; text: string }>((resolve, reject) => {
        const transport = url.protocol === 'https:' ? https : http
        const req = transport.get(url, {
            headers: { 'User-Agent': 'Eventra/1.0', 'Accept-Encoding': 'identity', Accept: 'text/html,text/plain' },
            lookup: (_host, _options, cb) => cb(null, pinned.address, pinned.family),
        }, res => {
            if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400) {
                res.resume(); resolve({ status: res.statusCode, location: res.headers.location, text: '' }); return
            }
            const chunks: Buffer[] = []; let size = 0
            res.on('data', (chunk: Buffer) => {
                size += chunk.length
                if (size > 512 * 1024) { req.destroy(new Error('Response too large')); return }
                chunks.push(chunk)
            })
            res.on('error', reject)
            res.on('end', () => resolve({ status: res.statusCode ?? 502, text: Buffer.concat(chunks).toString('utf8') }))
        })
        const timer = setTimeout(() => req.destroy(new Error('URL fetch timeout')), Math.max(1, deadline - Date.now()))
        req.on('error', reject)
        req.on('close', () => clearTimeout(timer))
    })
    if (result.location) return fetchPublicText(new URL(result.location, url).href, deadline, hops + 1)
    return { url: url.href, text: result.text, status: result.status }
}
