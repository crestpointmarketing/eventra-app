import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchAssets, createAsset, deleteAsset, uploadFile } from '@/lib/api/assets'
import type { AssetFilters, CreateAssetData } from '@/lib/api/assets'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'

export function useAssets(filters?: AssetFilters) {
    return useQuery({
        queryKey: ['assets', filters],
        refetchOnWindowFocus: true,
        refetchInterval: 30 * 60 * 1000,
        queryFn: () => fetchAssets(filters),
    })
}

export function useUploadAsset() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({ file, userId, eventId, taskId }: { file: File, userId: string, eventId?: string, taskId?: string }) => {
            // 1. Upload file to storage
            const uploadResult = await uploadFile(file, userId)

            // 2. Create asset record in database
            const assetData: CreateAssetData = {
                filename: uploadResult.fileName,
                file_type: (() => {
                    const mime = uploadResult.mimeType?.toLowerCase() || ''
                    if (mime.startsWith('image/')) return 'image'
                    if (mime.startsWith('video/')) return 'video'
                    if (mime.includes('pdf') ||
                        mime.includes('word') ||
                        mime.includes('document') ||
                        mime.includes('text') ||
                        mime.includes('sheet') ||
                        mime.includes('presentation')) return 'document'
                    return 'other'
                })(),
                file_url: uploadResult.fileUrl,
                file_size: uploadResult.fileSize,
                mime_type: uploadResult.mimeType,
                event_id: eventId,
                task_id: taskId,
                uploaded_by: userId,
                title: file.name, // Default title to filename
            }

            try { return await createAsset(assetData) }
            catch (error) {
                const { error: cleanupError } = await createClient().storage.from('event-assets').remove([uploadResult.filePath])
                if (cleanupError) console.error('Upload cleanup pending', { path: uploadResult.filePath })
                throw error
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['assets'] })
            toast.success('Asset uploaded successfully')
        },
        onError: (error: Error) => {
            toast.error('Failed to upload asset: ' + error.message)
        }
    })
}

export function useDeleteAsset() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: deleteAsset,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['assets'] })
            toast.success('Asset deleted successfully')
        },
        onError: (error: Error) => {
            toast.error('Failed to delete asset: ' + error.message)
        }
    })
}
