'use client'

import { useState, useMemo } from 'react'
import { useLeads } from '@/hooks/useLeads'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import Link from 'next/link'
import { exportLeadsToCSV } from '@/lib/export'
import { TableLoadingSkeleton } from '@/components/ui/loading-skeletons'
import { useDebounce } from '@/hooks/useDebounce'
import { Search } from 'lucide-react'

export default function LeadsPage() {
    const { data: leads, isLoading, error } = useLeads()
    const [filter, setFilter] = useState<string>('all')
    const [searchQuery, setSearchQuery] = useState('')
    const debouncedSearch = useDebounce(searchQuery, 300)

    // Filter and search leads
    const filteredLeads = useMemo(() => {
        if (!leads) return []

        let result = leads

        // Apply filter
        result = result.filter((lead: any) => {
            if (filter === 'all') return true
            if (filter === 'hot') return lead.lead_score >= 80
            if (filter === 'warm') return lead.lead_score >= 50 && lead.lead_score < 80
            if (filter === 'cold') return lead.lead_score < 50
            return true
        })

        // Apply search
        if (debouncedSearch) {
            const query = debouncedSearch.toLowerCase()
            result = result.filter((lead: any) =>
                lead.first_name?.toLowerCase().includes(query) ||
                lead.last_name?.toLowerCase().includes(query) ||
                lead.email?.toLowerCase().includes(query) ||
                lead.company?.toLowerCase().includes(query)
            )
        }

        return result
    }, [leads, filter, debouncedSearch])

    if (isLoading) {
        return (
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
                <div className="flex items-center justify-between mb-8">
                    <h1 className="text-5xl font-medium text-zinc-900">Leads</h1>
                    <Button variant="outline" disabled>
                        Export to CSV
                    </Button>
                </div>

                <div className="flex gap-4 mb-8">
                    <button className="text-base font-medium text-zinc-900 border-b-2 border-zinc-900 pb-2">
                        All Leads
                    </button>
                    <button className="text-base text-zinc-600 hover:text-zinc-900 pb-2">
                        Hot
                    </button>
                    <button className="text-base text-zinc-600 hover:text-zinc-900 pb-2">
                        Warm
                    </button>
                    <button className="text-base text-zinc-600 hover:text-zinc-900 pb-2">
                        Cold
                    </button>
                </div>

                <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden">
                    <TableLoadingSkeleton rows={8} />
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
                <p className="text-red-500">Error loading leads: {error.message}</p>
            </div>
        )
    }

    return (
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
            <div className="flex items-center justify-between mb-8">
                <h1 className="text-5xl font-medium text-zinc-900">Leads</h1>
                <Button
                    variant="outline"
                    onClick={() => exportLeadsToCSV(filteredLeads || [])}
                    disabled={!filteredLeads || filteredLeads.length === 0}
                >
                    Export to CSV
                </Button>
            </div>

            {/* Search Bar */}
            <div className="mb-6">
                <div className="relative max-w-md">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400 h-4 w-4" />
                    <Input
                        type="text"
                        placeholder="Search leads by name, email, or company..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                    />
                </div>
                {debouncedSearch && (
                    <p className="text-sm text-zinc-600 mt-2">
                        Found {filteredLeads.length} lead{filteredLeads.length !== 1 ? 's' : ''}
                    </p>
                )}
            </div>

            <div className="flex gap-4 mb-8">
                <button
                    className={`text-base pb-2 ${filter === 'all' ? 'font-medium text-zinc-900 border-b-2 border-zinc-900' : 'text-zinc-600 hover:text-zinc-900'}`}
                    onClick={() => setFilter('all')}
                >
                    All Leads ({leads?.length || 0})
                </button>
                <button
                    className={`text-base pb-2 ${filter === 'hot' ? 'font-medium text-zinc-900 border-b-2 border-zinc-900' : 'text-zinc-600 hover:text-zinc-900'}`}
                    onClick={() => setFilter('hot')}
                >
                    Hot
                </button>
                <button
                    className={`text-base pb-2 ${filter === 'warm' ? 'font-medium text-zinc-900 border-b-2 border-zinc-900' : 'text-zinc-600 hover:text-zinc-900'}`}
                    onClick={() => setFilter('warm')}
                >
                    Warm
                </button>
                <button
                    className={`text-base pb-2 ${filter === 'cold' ? 'font-medium text-zinc-900 border-b-2 border-zinc-900' : 'text-zinc-600 hover:text-zinc-900'}`}
                    onClick={() => setFilter('cold')}
                >
                    Cold
                </button>
            </div>

            <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="font-medium">Name</TableHead>
                            <TableHead className="font-medium">Email</TableHead>
                            <TableHead className="font-medium">Company</TableHead>
                            <TableHead className="font-medium">Event</TableHead>
                            <TableHead className="font-medium">Score</TableHead>
                            <TableHead className="font-medium">Status</TableHead>
                            <TableHead className="font-medium">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredLeads?.map((lead: any) => (
                            <TableRow key={lead.id}>
                                <TableCell className="font-medium">
                                    {lead.first_name} {lead.last_name}
                                </TableCell>
                                <TableCell className="text-zinc-600">{lead.email}</TableCell>
                                <TableCell className="text-zinc-600">{lead.company || '-'}</TableCell>
                                <TableCell className="text-zinc-600">
                                    {lead.events?.name || 'N/A'}
                                </TableCell>
                                <TableCell>
                                    <Badge variant={lead.lead_score >= 80 ? 'lime' : 'secondary'}>
                                        {lead.lead_score || 0}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    <Badge variant="outline">
                                        {lead.lead_status || 'new'}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    <Link href={`/leads/${lead.id}`}>
                                        <Button variant="ghost" size="sm">View</Button>
                                    </Link>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            {filteredLeads && filteredLeads.length === 0 && (
                <div className="text-center py-12">
                    {debouncedSearch || filter !== 'all' ? (
                        <>
                            <p className="text-zinc-600 mb-4">No leads found matching your criteria</p>
                            <Button onClick={() => {
                                setSearchQuery('')
                                setFilter('all')
                            }} variant="outline">Clear Filters</Button>
                        </>
                    ) : (
                        <>
                            <p className="text-zinc-600 mb-4">No leads yet</p>
                            <Button>Import Leads</Button>
                        </>
                    )}
                </div>
            )}
        </div>
    )
}
