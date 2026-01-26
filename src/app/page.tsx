'use client'

import { TopNav } from '@/components/layout/top-nav'
import { useEvents } from '@/hooks/useEvents'
import { Card } from '@/components/ui/card'

export default function HomePage() {
  const { data: events, isLoading, error } = useEvents()

  return (
    <div className="min-h-screen bg-white">
      <TopNav />

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-5xl font-medium text-zinc-900 mb-8">
          Welcome to Eventra
        </h1>

        <div className="mb-12">
          <h2 className="text-2xl font-medium text-zinc-900 mb-4">
            Testing Supabase Connection
          </h2>

          {isLoading && (
            <p className="text-zinc-600">Loading events...</p>
          )}

          {error && (
            <p className="text-red-500">Error: {error.message}</p>
          )}

          {events && events.length > 0 && (
            <div className="space-y-4">
              <p className="text-lime-600 font-medium">
                ✅ Successfully connected to Supabase!
              </p>
              <p className="text-zinc-600">
                Found {events.length} events in database
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
                {events.slice(0, 3).map((event: any) => (
                  <Card key={event.id} className="p-6 border border-zinc-200">
                    <h3 className="text-xl font-medium text-zinc-900 mb-2">
                      {event.name}
                    </h3>
                    <p className="text-zinc-600 text-sm">
                      {event.location || 'No location'}
                    </p>
                    <p className="text-zinc-500 text-sm mt-2">
                      {event.start_date ? new Date(event.start_date).toLocaleDateString() : 'No date'}
                    </p>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {events && events.length === 0 && (
            <p className="text-zinc-600">No events found in database</p>
          )}
        </div>

        <div className="prose prose-zinc max-w-none">
          <h2 className="text-2xl font-medium text-zinc-900 mb-4">
            Day 4 Progress
          </h2>
          <ul className="space-y-2 text-zinc-600">
            <li>✅ Top navigation component created</li>
            <li>✅ TanStack Query provider configured</li>
            <li>✅ Supabase connection working</li>
            <li>✅ Event data fetching from database</li>
          </ul>
        </div>
      </main>
    </div>
  )
}
