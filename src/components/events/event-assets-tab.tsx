'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAssets, useUploadAsset, useDeleteAsset } from '@/hooks/useAssets'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Upload, File as FileIcon, Trash2, ExternalLink, Image as ImageIcon, Loader2 } from 'lucide-react'
import { format } from 'date-fns'
import Link from 'next/link'

export function EventAssetsTab({ eventId }: { eventId: string }) {
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [isDragging, setIsDragging] = useState(false)
    const supabase = createClient()

    // Get current user
    const [userId, setUserId] = useState<string | null>(null)
    useState(() => {
        supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id || null))
    })

    const { data: assets, isLoading } = useAssets({ eventId })
    const { mutate: uploadAsset, isPending: isUploading } = useUploadAsset()
    const { mutate: deleteAsset, isPending: isDeleting } = useDeleteAsset()

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0] && userId) {
            handleUpload(e.target.files[0])
        }
    }

    const handleUpload = (file: File) => {
        if (!userId) return

        uploadAsset({
            file,
            userId,
            eventId
        })
    }

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(true)
    }

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(false)
    }

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(false)
        if (e.dataTransfer.files && e.dataTransfer.files[0] && userId) {
            handleUpload(e.dataTransfer.files[0])
        }
    }

    const handleDelete = (assetId: string) => {
        if (confirm('Are you sure you want to delete this file? This action cannot be undone.')) {
            deleteAsset(assetId)
        }
    }

    const formatFileSize = (bytes: number | null) => {
        if (!bytes) return '0 B'
        const k = 1024
        const sizes = ['B', 'KB', 'MB', 'GB']
        const i = Math.floor(Math.log(bytes) / Math.log(k))
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
    }

    return (
        <div className="space-y-6">
            {/* Upload Area */}
            <div
                className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${isDragging
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600'
                    }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
            >
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                        {isUploading ? (
                            <Loader2 className="w-6 h-6 text-zinc-400 animate-spin" />
                        ) : (
                            <Upload className="w-6 h-6 text-zinc-400" />
                        )}
                    </div>
                    <div>
                        <h3 className="text-lg font-medium text-zinc-900 dark:text-white mb-1">
                            {isUploading ? 'Uploading...' : 'Upload Event Assets'}
                        </h3>
                        <p className="text-zinc-500 dark:text-zinc-400 text-sm max-w-sm mx-auto mb-4">
                            Drag and drop files here, or click to browse. Supports documents, images, and brand assets.
                        </p>
                        <Button
                            variant="outline"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isUploading}
                        >
                            Select File
                        </Button>
                        <Input
                            type="file"
                            className="hidden"
                            ref={fileInputRef}
                            onChange={handleFileSelect}
                            disabled={isUploading}
                        />
                    </div>
                </div>
            </div>

            {/* Assets Grid */}
            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="h-24 bg-zinc-100 dark:bg-zinc-800 rounded-lg animate-pulse" />
                    ))}
                </div>
            ) : assets && assets.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {assets.map((asset) => (
                        <div
                            key={asset.id}
                            className="group relative flex items-center gap-4 p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:shadow-md transition-shadow"
                        >
                            <div className="w-10 h-10 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center flex-shrink-0 text-2xl">
                                {asset.file_type === 'image' ? (
                                    <ImageIcon className="w-5 h-5 text-purple-600" />
                                ) : (
                                    <FileIcon className="w-5 h-5 text-blue-600" />
                                )}
                            </div>

                            <div className="flex-1 min-w-0">
                                <h4 className="font-medium text-zinc-900 dark:text-white truncate" title={asset.title || asset.filename}>
                                    {asset.title || asset.filename}
                                </h4>
                                <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                                    <span>{formatFileSize(asset.file_size)}</span>
                                    <span>•</span>
                                    <span>{format(new Date(asset.created_at), 'MMM d, yyyy')}</span>
                                </div>
                            </div>

                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Link
                                    href={asset.file_url}
                                    target="_blank"
                                    className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                                >
                                    <ExternalLink className="w-4 h-4" />
                                </Link>
                                <button
                                    onClick={() => handleDelete(asset.id)}
                                    className="p-2 text-red-500 hover:text-red-600 transition-colors"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-12">
                    <p className="text-zinc-500 dark:text-zinc-400">No assets uploaded yet.</p>
                </div>
            )}
        </div>
    )
}
