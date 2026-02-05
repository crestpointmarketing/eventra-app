'use client'

import { use } from 'react'
import { EventAssetsTab } from '@/components/events/event-assets-tab'

export default function EventAssetsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)

    return <EventAssetsTab eventId={id} />
}
