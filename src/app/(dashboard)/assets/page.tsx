'use client'

import { useState, useMemo, useCallback } from 'react'
import { useAssets, useUploadAsset, useDeleteAsset } from '@/hooks/useAssets'
import { useUser } from '@/hooks/useUser'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { TableLoadingSkeleton } from '@/components/ui/loading-skeletons'
import { useDebounce } from '@/hooks/useDebounce'
import { Search, Upload, File, Image as ImageIcon, Video, Trash2, ExternalLink, MoreHorizontal, LayoutGrid, List as ListIcon, ArrowUpDown, Filter } from 'lucide-react'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import { PageTransition } from '@/components/animations/page-transition'
import type { Asset } from '@/lib/api/assets'
import { format } from 'date-fns'

export default function AssetsPage() {
    const [searchQuery, setSearchQuery] = useState('')
    const [activeFilter, setActiveFilter] = useState<string>('all')
    const [selectedEventId, setSelectedEventId] = useState<string>('all')
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('list')
    const [isUploadOpen, setIsUploadOpen] = useState(false)
    const [isDragging, setIsDragging] = useState(false)
    const debouncedSearch = useDebounce(searchQuery, 300)

    // Fetch data
    const { data: assets, isLoading, error } = useAssets()
    const { data: user } = useUser()

    // Mutations
    const { mutate: uploadAsset, isPending: isUploading } = useUploadAsset()
    const { mutate: deleteAsset } = useDeleteAsset()

    // Filter categories
    const filters = [
        { id: 'all', label: 'All Types' },
        { id: 'image', label: 'Images' },
        { id: 'video', label: 'Videos' },
        { id: 'document', label: 'Documents' },
        { id: 'other', label: 'Other' },
    ]

    // Extract unique events for filter
    const uniqueEvents = useMemo(() => {
        if (!assets) return []
        const eventsMap = new Map()
        assets.forEach(asset => {
            if (asset.events) {
                eventsMap.set(asset.events.id, asset.events.name)
            }
        })
        return Array.from(eventsMap.entries()).map(([id, name]) => ({ id, name }))
    }, [assets])

    // Filter assets
    const filteredAssets = useMemo(() => {
        if (!assets) return []

        const filtered = assets.filter(asset => {
            // Search filter
            const matchesSearch = asset.filename.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
                asset.title?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
                asset.events?.name.toLowerCase().includes(debouncedSearch.toLowerCase())

            // Type filter
            let matchesType = true
            if (activeFilter === 'image') {
                matchesType = asset.file_type === 'image'
            } else if (activeFilter === 'video') {
                matchesType = asset.file_type === 'video'
            } else if (activeFilter === 'document') {
                matchesType = asset.file_type === 'document'
            } else if (activeFilter === 'other') {
                matchesType = !['image', 'video', 'document'].includes(asset.file_type)
            }

            // Event filter
            const matchesEvent = selectedEventId === 'all' || asset.events?.id === selectedEventId

            return matchesSearch && matchesType && matchesEvent
        })

        // Sort by date
        return filtered.sort((a, b) => {
            const dateA = new Date(a.created_at || 0).getTime()
            const dateB = new Date(b.created_at || 0).getTime()
            return sortOrder === 'desc' ? dateB - dateA : dateA - dateB
        })
    }, [assets, debouncedSearch, activeFilter, selectedEventId, sortOrder])

    // File upload handlers
    const handleFileSelect = useCallback((files: FileList | null) => {
        if (!files) return

        const effectiveUserId = user?.id || '00000000-0000-0000-0000-000000000000'

        Array.from(files).forEach(file => {
            uploadAsset({
                file,
                userId: effectiveUserId
            })
        })

        setIsUploadOpen(false)
    }, [user, uploadAsset])

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(false)
        handleFileSelect(e.dataTransfer.files)
    }, [handleFileSelect])

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(true)
    }, [])

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(false)
    }, [])

    // Get file type details for better styling
    const getFileTypeDetails = (asset: Asset) => {
        const mimeType = asset.file_type?.toLowerCase() || ''
        const filename = asset.filename.toLowerCase()

        if (mimeType.includes('pdf') || filename.endsWith('.pdf')) return { label: 'PDF', color: 'red', icon: File }
        if (mimeType.includes('word') || mimeType.includes('msword') || filename.endsWith('.doc') || filename.endsWith('.docx')) return { label: 'DOC', color: 'blue', icon: File }
        if (mimeType.includes('image') || mimeType.includes('jpg') || mimeType.includes('png')) return { label: 'IMG', color: 'lime', icon: ImageIcon }
        if (mimeType.includes('video') || mimeType.includes('mp4')) return { label: 'VID', color: 'purple', icon: Video }
        if (filename.endsWith('.zip')) return { label: 'ZIP', color: 'amber', icon: File }

        return { label: 'FILE', color: 'zinc', icon: File }
    }

    // Get color classes based on color name
    const getColorClasses = (color: string) => {
        const colors: Record<string, string> = {
            red: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
            blue: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
            orange: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
            green: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
            purple: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
            lime: 'bg-lime-100 text-lime-600 dark:bg-lime-900/30 dark:text-lime-400',
            amber: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
            zinc: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
        }
        return colors[color] || colors.zinc
    }

    // Handle delete
    const handleDelete = (assetId: string) => {
        if (confirm('Are you sure you want to delete this asset?')) {
            deleteAsset(assetId)
        }
    }

    if (error) {
        return (
            <div className="flex items-center justify-center p-12">
                <p className="text-red-500">Error loading assets: {error.message}</p>
            </div>
        )
    }

    return (
        <PageTransition>
            <div className="container mx-auto p-8 space-y-8 bg-zinc-50/50 dark:bg-black/5 min-h-screen">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-zinc-900 dark:text-white tracking-tight">Asset Library</h1>
                        <p className="text-zinc-500 dark:text-zinc-400 mt-1">
                            Centralized repository for all event materials and documentation.
                        </p>
                    </div>
                    <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
                        <DialogTrigger asChild>
                            <Button className="gap-2">
                                <Upload className="w-4 h-4" />
                                Upload Asset
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md bg-white dark:bg-slate-900">
                            <DialogHeader>
                                <DialogTitle className="text-zinc-900 dark:text-white">Upload Files</DialogTitle>
                                <DialogDescription className="text-zinc-600 dark:text-zinc-400">
                                    Upload images, videos, or documents to your asset library
                                </DialogDescription>
                            </DialogHeader>
                            <div
                                onDrop={handleDrop}
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${isDragging
                                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
                                    : 'border-zinc-300 dark:border-zinc-700'
                                    }`}
                            >
                                <Upload className="w-16 h-16 mx-auto mb-4 text-zinc-400" />
                                <p className="text-zinc-900 dark:text-white font-medium mb-1">
                                    Drop files here
                                </p>
                                <input
                                    type="file"
                                    multiple
                                    className="hidden"
                                    id="file-upload"
                                    onChange={(e) => handleFileSelect(e.target.files)}
                                />
                                <label htmlFor="file-upload">
                                    <Button type="button" variant="outline" onClick={() => document.getElementById('file-upload')?.click()}>
                                        Browse Files
                                    </Button>
                                </label>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>

                {/* Toolbar */}
                <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4">
                    <div className="flex flex-col md:flex-row gap-4 w-full xl:w-auto">
                        <div className="relative w-full md:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                            <Input
                                placeholder="Search files..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10 bg-white dark:bg-zinc-900 border-none shadow-sm h-10"
                            />
                        </div>

                        <Select value={selectedEventId} onValueChange={setSelectedEventId}>
                            <SelectTrigger className="w-full md:w-48 bg-white dark:bg-zinc-900 border-none shadow-sm h-10">
                                <SelectValue placeholder="Filter by Event" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Events</SelectItem>
                                {uniqueEvents.map(event => (
                                    <SelectItem key={event.id} value={event.id}>
                                        {event.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex items-center gap-4 w-full xl:w-auto overflow-x-auto pb-2 xl:pb-0 justify-between xl:justify-end">
                        <div className="flex items-center gap-2">
                            <div className="flex bg-zinc-200 dark:bg-zinc-800 p-1 rounded-full mr-2">
                                {filters.map(filter => (
                                    <button
                                        key={filter.id}
                                        onClick={() => setActiveFilter(filter.id)}
                                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${activeFilter === filter.id
                                            ? 'bg-black text-white dark:bg-white dark:text-black shadow-sm'
                                            : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                                            }`}
                                    >
                                        {filter.label}
                                    </button>
                                ))}
                            </div>

                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                                className="h-9 gap-2 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800"
                            >
                                <ArrowUpDown className="w-4 h-4" />
                                <span className="hidden sm:inline">Date</span>
                                {sortOrder === 'desc' ? '↓' : '↑'}
                            </Button>
                        </div>

                        <div className="flex items-center gap-1 bg-white dark:bg-zinc-900 p-1 rounded-lg border border-zinc-200 dark:border-zinc-800 ml-2">
                            <Button
                                variant="ghost"
                                size="icon"
                                className={`h-8 w-8 ${viewMode === 'list' ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900' : 'text-zinc-400'}`}
                                onClick={() => setViewMode('list')}
                            >
                                <ListIcon className="w-4 h-4" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                className={`h-8 w-8 ${viewMode === 'grid' ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900' : 'text-zinc-400'}`}
                                onClick={() => setViewMode('grid')}
                            >
                                <LayoutGrid className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                </div>

                {isLoading ? (
                    <TableLoadingSkeleton rows={6} />
                ) : filteredAssets.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-24 text-center border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl bg-white/50 dark:bg-zinc-900/50">
                        <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mb-4">
                            <File className="w-8 h-8 text-zinc-300" />
                        </div>
                        <h3 className="text-lg font-medium text-zinc-900 dark:text-white">No assets found</h3>
                        <p className="text-zinc-500 dark:text-zinc-400 mt-2 max-w-sm">
                            No files match your search criteria. Try adjusting your filters or upload a new asset.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-12">
                        {/* Recently Added Section */}
                        <section>
                            <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-6">Recently Added</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                {filteredAssets.slice(0, 4).map((asset) => {
                                    const { label, color, icon: Icon } = getFileTypeDetails(asset)
                                    const colorClass = getColorClasses(color)
                                    const isNew = asset.created_at && (new Date().getTime() - new Date(asset.created_at).getTime()) < 3 * 24 * 60 * 60 * 1000 // 3 days new

                                    return (
                                        <Card key={asset.id} className="group overflow-hidden border-zinc-200 dark:border-zinc-800 hover:shadow-md transition-all cursor-pointer bg-white dark:bg-zinc-900">
                                            <div className="aspect-[4/3] bg-zinc-50 dark:bg-zinc-800/50 relative flex items-center justify-center group-hover:bg-zinc-100 dark:group-hover:bg-zinc-800 transition-colors">
                                                {asset.file_type === 'image' && asset.file_url ? (
                                                    <img src={asset.file_url} alt={asset.filename} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className={`w-16 h-16 rounded-xl flex items-center justify-center ${colorClass}`}>
                                                        <Icon className="w-8 h-8" />
                                                    </div>
                                                )}
                                                {isNew && (
                                                    <span className="absolute top-3 right-3 bg-[#CBFB45] text-black text-[10px] font-bold px-2 py-0.5 rounded shadow-sm">
                                                        NEW
                                                    </span>
                                                )}

                                                {/* Hover Overlay Action */}
                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                    <a href={asset.file_url} target="_blank" rel="noopener noreferrer">
                                                        <Button variant="secondary" size="sm" className="bg-white/90 hover:bg-white text-zinc-900 border-none">
                                                            <ExternalLink className="w-4 h-4 mr-2" />
                                                            Open
                                                        </Button>
                                                    </a>
                                                </div>
                                            </div>
                                            <div className="p-4">
                                                <h3 className="font-semibold text-zinc-900 dark:text-white truncate" title={asset.title || asset.filename}>
                                                    {asset.title || asset.filename}
                                                </h3>
                                                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 truncate">
                                                    {asset.events?.name || 'Global Asset'}
                                                </p>
                                            </div>
                                        </Card>
                                    )
                                })}
                            </div>
                        </section>

                        {/* All Materials Section */}
                        <section>
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">All Materials</h2>
                                <Button variant="link" className="text-[#8B5CF6] hover:text-[#7C3AED] p-0 h-auto font-medium text-xs uppercase" onClick={() => setViewMode('list')}>
                                    View All
                                </Button>
                            </div>

                            <Card className="border-zinc-200 dark:border-zinc-800 overflow-hidden bg-white dark:bg-zinc-900 shadow-sm">
                                <Table>
                                    <TableHeader className="bg-zinc-50 dark:bg-zinc-900">
                                        <TableRow className="border-b border-zinc-100 dark:border-zinc-800 hover:bg-transparent">
                                            <TableHead className="w-[40%] pl-6 py-4 text-xs font-bold uppercase tracking-wider text-zinc-500">File Name</TableHead>
                                            <TableHead className="w-[15%] text-xs font-bold uppercase tracking-wider text-zinc-500">Type</TableHead>
                                            <TableHead className="w-[20%] text-xs font-bold uppercase tracking-wider text-zinc-500">Related Event</TableHead>
                                            <TableHead className="w-[15%] text-xs font-bold uppercase tracking-wider text-zinc-500">Date Added</TableHead>
                                            <TableHead className="w-[10%] text-right pr-6 text-xs font-bold uppercase tracking-wider text-zinc-500">Action</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredAssets.map((asset) => {
                                            const { label, color, icon: Icon } = getFileTypeDetails(asset)
                                            const colorClass = getColorClasses(color)

                                            return (
                                                <TableRow key={asset.id} className="group hover:bg-zinc-50 dark:hover:bg-zinc-800/50 border-b border-zinc-50 dark:border-zinc-800/50 transition-colors">
                                                    <TableCell className="pl-6 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${colorClass}`}>
                                                                <Icon className="w-4 h-4" />
                                                            </div>
                                                            <span className="font-medium text-zinc-900 dark:text-white truncate max-w-[200px] md:max-w-md" title={asset.filename}>
                                                                {asset.filename}
                                                            </span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="py-4">
                                                        <span className="text-sm text-zinc-500 dark:text-zinc-400 capitalize">
                                                            {asset.file_type === 'document' ? 'Document' :
                                                                asset.file_type === 'image' ? 'Image' :
                                                                    label}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className="py-4">
                                                        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                                            {asset.events?.name || 'Global'}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className="py-4">
                                                        <span className="text-sm text-zinc-500 dark:text-zinc-400">
                                                            {asset.created_at ? format(new Date(asset.created_at), 'MMM d, yyyy') : '-'}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className="pr-6 py-4 text-right">
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300">
                                                                    <MoreHorizontal className="w-4 h-4" />
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end">
                                                                <DropdownMenuItem asChild>
                                                                    <a href={asset.file_url} target="_blank" rel="noopener noreferrer">
                                                                        <ExternalLink className="w-4 h-4 mr-2" />
                                                                        View File
                                                                    </a>
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem
                                                                    onClick={() => handleDelete(asset.id)}
                                                                    className="text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400"
                                                                >
                                                                    <Trash2 className="w-4 h-4 mr-2" />
                                                                    Delete
                                                                </DropdownMenuItem>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    </TableCell>
                                                </TableRow>
                                            )
                                        })}
                                    </TableBody>
                                </Table>

                                {/* Pagination Footer Stub - purely visual for now based on design */}
                                <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
                                    <span className="text-xs text-zinc-500 font-medium">
                                        Showing {filteredAssets.length} assets
                                    </span>
                                    {/* Pagination controls would go here */}
                                </div>
                            </Card>
                        </section>
                    </div>
                )}
            </div>
        </PageTransition>
    )
}
