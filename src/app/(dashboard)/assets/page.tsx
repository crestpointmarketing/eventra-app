'use client'

import { useState, useMemo, useCallback } from 'react'
import { useAssets, useUploadAsset, useDeleteAsset } from '@/hooks/useAssets'
import { useUser } from '@/hooks/useUser'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
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
import { TableLoadingSkeleton } from '@/components/ui/loading-skeletons'
import { useDebounce } from '@/hooks/useDebounce'
import { Search, Upload, File, Image as ImageIcon, Video, Trash2, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import { PageTransition } from '@/components/animations/page-transition'
import type { Asset } from '@/lib/api/assets'
import { format } from 'date-fns'

export default function AssetsPage() {
    const [searchQuery, setSearchQuery] = useState('')
    const [typeFilter, setTypeFilter] = useState<string>('all')
    const [isUploadOpen, setIsUploadOpen] = useState(false)
    const [isDragging, setIsDragging] = useState(false)
    const debouncedSearch = useDebounce(searchQuery, 300)

    // Fetch data
    const { data: assets, isLoading, error } = useAssets()
    const { data: user } = useUser()

    // Mutations
    const { mutate: uploadAsset, isPending: isUploading } = useUploadAsset()
    const { mutate: deleteAsset } = useDeleteAsset()

    // Filter assets
    const filteredAssets = useMemo(() => {
        if (!assets) return []

        return assets.filter(asset => {
            // Search filter
            const matchesSearch = asset.filename.toLowerCase().includes(debouncedSearch.toLowerCase())

            // Type filter
            const matchesType = typeFilter === 'all' || asset.file_type === typeFilter

            return matchesSearch && matchesType
        })
    }, [assets, debouncedSearch, typeFilter])

    // File upload handlers
    const handleFileSelect = useCallback((files: FileList | null) => {
        console.log('🟡 handleFileSelect called', { files, filesCount: files?.length, user })

        if (!files) {
            console.log('🔴 No files provided')
            return
        }

        const effectiveUserId = user?.id || '00000000-0000-0000-0000-000000000000'

        if (!user) {
            console.log('⚠️ No authenticated user - using temporary test user ID for upload')
        }

        console.log('🟢 Starting upload for', files.length, 'files with userId:', effectiveUserId)

        Array.from(files).forEach(file => {
            const fileType = file.type.startsWith('image/') ? 'image' :
                file.type.startsWith('video/') ? 'video' : 'document'

            console.log('🟡 Uploading file:', { name: file.name, type: fileType, size: file.size })

            uploadAsset({
                file,
                userId: effectiveUserId,
                metadata: {
                    file_type: fileType,
                    uploaded_by: user?.id || undefined
                }
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

        if (mimeType.includes('pdf')) return { label: 'PDF', color: 'red' }
        if (mimeType.includes('word') || mimeType.includes('msword')) return { label: 'DOC', color: 'blue' }
        if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return { label: 'PPT', color: 'orange' }
        if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return { label: 'XLS', color: 'green' }
        if (mimeType.includes('image')) return { label: 'IMG', color: 'sky' }
        if (mimeType.includes('video')) return { label: 'VID', color: 'purple' }
        if (mimeType.includes('text')) return { label: 'TXT', color: 'gray' }

        return { label: 'FILE', color: 'zinc' }
    }

    // Get color classes based on color name
    const getColorClasses = (color: string) => {
        const colors: Record<string, { icon: string; badge: string }> = {
            red: { icon: 'text-red-500', badge: 'bg-red-500' },
            blue: { icon: 'text-blue-500', badge: 'bg-blue-500' },
            orange: { icon: 'text-orange-500', badge: 'bg-orange-500' },
            green: { icon: 'text-green-500', badge: 'bg-green-500' },
            purple: { icon: 'text-purple-500', badge: 'bg-purple-500' },
            sky: { icon: 'text-sky-500', badge: 'bg-sky-500' },
            indigo: { icon: 'text-indigo-500', badge: 'bg-indigo-500' },
            pink: { icon: 'text-pink-500', badge: 'bg-pink-500' },
            yellow: { icon: 'text-yellow-500', badge: 'bg-yellow-500' },
            gray: { icon: 'text-gray-500', badge: 'bg-gray-500' },
            zinc: { icon: 'text-zinc-400', badge: 'bg-zinc-400' },
        }
        return colors[color] || colors.zinc
    }

    // Get file icon with better styling based on actual file type
    const getFileIcon = (asset: Asset, size: 'sm' | 'lg' = 'sm') => {
        const baseClass = size === 'lg' ? 'w-16 h-16' : 'w-5 h-5'
        const { label, color } = getFileTypeDetails(asset)
        const colorClasses = getColorClasses(color)

        return (
            <div className="relative">
                <File className={`${baseClass} ${colorClasses.icon}`} />
                <div className={`absolute -bottom-1 -right-1 ${colorClasses.badge} text-white text-[10px] px-1 rounded font-semibold`}>
                    {label}
                </div>
            </div>
        )
    }

    // Handle delete
    const handleDelete = (assetId: string) => {
        if (confirm('Are you sure you want to delete this asset?')) {
            deleteAsset(assetId)
        }
    }

    if (error) {
        return (
            <div className="flex items-center justify-center h-[50vh]">
                <div className="text-center">
                    <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-2">
                        Error loading assets
                    </h3>
                    <p className="text-zinc-500 dark:text-zinc-400">{error.message}</p>
                </div>
            </div>
        )
    }

    return (
        <PageTransition>
            <div className="container mx-auto p-6 space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-5xl font-medium text-zinc-900 dark:text-white">Asset Library</h1>
                        <p className="text-zinc-500 dark:text-zinc-400 mt-2">
                            Centralized repository for all event materials and documentation.
                        </p>
                    </div>
                    <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
                        <DialogTrigger asChild>
                            <Button size="lg" className="gap-2">
                                <Upload className="w-4 h-4" />
                                Upload Files
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
                                    Drop files here or click to browse
                                </p>
                                <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
                                    Supports images, videos, and documents
                                </p>
                                <input
                                    type="file"
                                    multiple
                                    className="hidden"
                                    id="file-upload"
                                    onChange={(e) => handleFileSelect(e.target.files)}
                                    accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                                />
                                <label htmlFor="file-upload">
                                    <Button type="button" variant="outline" onClick={() => document.getElementById('file-upload')?.click()}>
                                        Choose Files
                                    </Button>
                                </label>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>

                {/* Filters */}
                <Card className="p-4">
                    <div className="flex items-center gap-4">
                        {/* Search */}
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                            <Input
                                placeholder="Search files by name, type, or tag..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10"
                            />
                        </div>

                        {/* Type Filter */}
                        <div className="flex items-center gap-2">
                            <Select value={typeFilter} onValueChange={setTypeFilter}>
                                <SelectTrigger className="w-[180px]">
                                    <SelectValue placeholder="Filter by type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All</SelectItem>
                                    <SelectItem value="image">Images</SelectItem>
                                    <SelectItem value="document">Documents</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </Card>

                {/* Assets Display */}
                {isLoading ? (
                    <TableLoadingSkeleton rows={6} />
                ) : filteredAssets.length === 0 ? (
                    <Card className="p-12 text-center">
                        <Upload className="w-16 h-16 mx-auto mb-4 text-zinc-400" />
                        <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-2">
                            No assets found
                        </h3>
                        <p className="text-zinc-500 dark:text-zinc-400 mb-4">
                            {assets?.length === 0 ? 'Upload your first file to get started' : 'Try adjusting your filters'}
                        </p>
                        {assets?.length === 0 && (
                            <Button onClick={() => setIsUploadOpen(true)}>
                                <Upload className="w-4 h-4 mr-2" />
                                Upload Files
                            </Button>
                        )}
                    </Card>
                ) : (
                    <div className="space-y-8">
                        {/* RECENTLY ADDED SECTION */}
                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-sm font-semibold text-zinc-900 dark:text-white uppercase tracking-wide">Recently Added</h2>
                            </div>
                            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
                                {filteredAssets.slice(0, 6).map((asset) => {
                                    const isNew = asset.created_at &&
                                        (new Date().getTime() - new Date(asset.created_at).getTime()) < 7 * 24 * 60 * 60 * 1000

                                    return (
                                        <motion.div
                                            key={asset.id}
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            className="flex-shrink-0 w-56"
                                        >
                                            <Card className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer">
                                                {/* Preview */}
                                                <div className="relative aspect-video bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-zinc-800 dark:to-zinc-900 flex items-center justify-center">
                                                    {asset.file_type === 'image' && asset.file_url ? (
                                                        <img
                                                            src={asset.file_url}
                                                            alt={asset.filename}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    ) : (
                                                        getFileIcon(asset, 'lg')
                                                    )}
                                                    {isNew && (
                                                        <div className="absolute top-2 right-2 bg-lime-400 text-zinc-900 text-[10px] font-bold px-2 py-0.5 rounded">
                                                            NEW
                                                        </div>
                                                    )}
                                                </div>
                                                {/* Info */}
                                                <div className="p-3">
                                                    <h3 className="text-sm font-semibold text-zinc-900 dark:text-white truncate mb-1">
                                                        {asset.filename}
                                                    </h3>
                                                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                                        {asset.created_at ? format(new Date(asset.created_at), 'MMM d, yyyy') : 'Unknown date'}
                                                    </p>
                                                </div>
                                            </Card>
                                        </motion.div>
                                    )
                                })}
                            </div>
                        </div>

                        {/* ALL MATERIALS SECTION */}
                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-sm font-semibold text-zinc-900 dark:text-white uppercase tracking-wide">All Materials</h2>
                            </div>
                            <Card>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>File Name</TableHead>
                                            <TableHead>Type</TableHead>
                                            <TableHead>Related Event</TableHead>
                                            <TableHead>Date Added</TableHead>
                                            <TableHead className="text-right">Action</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredAssets.map((asset) => (
                                            <TableRow key={asset.id}>
                                                <TableCell>
                                                    <div className="flex items-center gap-3">
                                                        {getFileIcon(asset, 'sm')}
                                                        <span className="font-medium text-zinc-900 dark:text-white text-sm">
                                                            {asset.filename}
                                                        </span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <span className="text-sm capitalize text-zinc-600 dark:text-zinc-400">
                                                        {asset.file_type}
                                                    </span>
                                                </TableCell>
                                                <TableCell>
                                                    <span className="text-sm text-zinc-600 dark:text-zinc-400">
                                                        {asset.task_id ? 'Task Linked' : asset.event_id ? 'Event Linked' : '—'}
                                                    </span>
                                                </TableCell>
                                                <TableCell>
                                                    <span className="text-sm text-zinc-600 dark:text-zinc-400">
                                                        {asset.created_at ? format(new Date(asset.created_at), 'MMM d, yyyy') : '—'}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-8"
                                                            asChild
                                                        >
                                                            <a href={asset.file_url} target="_blank" rel="noopener noreferrer">
                                                                <ExternalLink className="w-3.5 h-3.5" />
                                                            </a>
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-8"
                                                            onClick={() => handleDelete(asset.id)}
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5 text-red-600" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </Card>
                        </div>
                    </div>
                )}

                {/* Stats Footer */}
                {filteredAssets.length > 0 && (
                    <div className="text-sm text-zinc-500 dark:text-zinc-400 text-center">
                        Showing {filteredAssets.length} of {assets?.length || 0} assets
                    </div>
                )}
            </div>
        </PageTransition>
    )
}
