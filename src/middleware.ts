import { type NextRequest, NextResponse } from 'next/server'

export async function middleware(request: NextRequest) {
    // Middleware temporarily disabled for development
    return NextResponse.next()
}

export const config = {
    matcher: [],
}
