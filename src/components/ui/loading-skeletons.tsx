import { Skeleton } from './skeleton'
import { Card } from './card'

// Event Card Skeleton
export function EventCardSkeleton() {
    return (
        <Card className="h-full p-8 border border-zinc-200">
            <div className="flex flex-col items-center text-center">
                <Skeleton className="h-6 w-16 mb-4" /> {/* Badge */}
                <Skeleton className="h-8 w-3/4 mb-2" /> {/* Title */}
                <Skeleton className="h-4 w-full mb-1" /> {/* Date */}
                <Skeleton className="h-4 w-2/3 mb-6" /> {/* Location */}
                <div className="flex gap-4 mb-6 justify-center w-full">
                    <Skeleton className="h-4 w-20" /> {/* Budget */}
                    <Skeleton className="h-4 w-20" /> {/* Leads */}
                </div>
                <Skeleton className="h-10 w-full" /> {/* Button */}
            </div>
        </Card>
    )
}

// Stat Card Skeleton (for Analytics page)
export function StatCardSkeleton() {
    return (
        <Card className="p-6">
            <Skeleton className="h-4 w-24 mb-2" /> {/* Label */}
            <Skeleton className="h-10 w-32" /> {/* Value */}
        </Card>
    )
}

// Table Row Skeleton (for Leads page)
export function TableRowSkeleton() {
    return (
        <tr className="border-b border-zinc-200">
            <td className="py-4 px-4">
                <Skeleton className="h-4 w-32" />
            </td>
            <td className="py-4 px-4">
                <Skeleton className="h-4 w-24" />
            </td>
            <td className="py-4 px-4">
                <Skeleton className="h-4 w-20" />
            </td>
            <td className="py-4 px-4">
                <Skeleton className="h-4 w-16" />
            </td>
            <td className="py-4 px-4">
                <Skeleton className="h-4 w-24" />
            </td>
            <td className="py-4 px-4">
                <Skeleton className="h-8 w-20" />
            </td>
        </tr>
    )
}

// Loading Grid (for Events page)
export function EventsLoadingGrid() {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
                <EventCardSkeleton key={i} />
            ))}
        </div>
    )
}

// Loading Stats (for Analytics page)
export function StatsLoadingGrid() {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
                <StatCardSkeleton key={i} />
            ))}
        </div>
    )
}

// Loading Table (for Leads page)
export function TableLoadingSkeleton({ rows = 5 }: { rows?: number }) {
    return (
        <table className="w-full">
            <thead>
                <tr className="border-b border-zinc-300">
                    <th className="text-left py-4 px-4 font-medium text-zinc-900">
                        <Skeleton className="h-4 w-16" />
                    </th>
                    <th className="text-left py-4 px-4 font-medium text-zinc-900">
                        <Skeleton className="h-4 w-20" />
                    </th>
                    <th className="text-left py-4 px-4 font-medium text-zinc-900">
                        <Skeleton className="h-4 w-16" />
                    </th>
                    <th className="text-left py-4 px-4 font-medium text-zinc-900">
                        <Skeleton className="h-4 w-12" />
                    </th>
                    <th className="text-left py-4 px-4 font-medium text-zinc-900">
                        <Skeleton className="h-4 w-20" />
                    </th>
                    <th className="text-left py-4 px-4 font-medium text-zinc-900">
                        <Skeleton className="h-4 w-16" />
                    </th>
                </tr>
            </thead>
            <tbody>
                {[...Array(rows)].map((_, i) => (
                    <TableRowSkeleton key={i} />
                ))}
            </tbody>
        </table>
    )
}
