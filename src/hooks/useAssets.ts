import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
    fetchAssets,
    fetchAsset,
    createAsset,
    updateAsset,
    deleteAsset,
    uploadFile,
    markAssetAsViewed,
    type Asset,
    type AssetFilters,
    type CreateAssetData
} from '@/lib/api/assets'
import { toast } from 'sonner'

// ============================================
// Fetch Assets (with filters)
// ============================================
export function useAssets(filters?: AssetFilters) {
    return useQuery({
        queryKey: ['assets', filters],
        queryFn: () => fetchAssets(filters),
        staleTime: 1000 * 60 * 5,
    })
}

// ============================================
// Fetch Single Asset
// ============================================
export function useAsset(assetId: string | undefined) {
    return useQuery({
        queryKey: ['assets', assetId],
        queryFn: () => fetchAsset(assetId!),
        enabled: !!assetId,
        staleTime: 1000 * 60 * 5,
    })
}

// ============================================
// Upload File and Create Asset Mutation
// ============================================
export function useUploadAsset() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({
            file,
            userId,
            metadata
        }: {
            file: File
            userId: string
            metadata: Omit<CreateAssetData, 'filename' | 'file_url' | 'file_size' | 'mime_type'>
        }) => {
            // First upload the file
            const uploadResult = await uploadFile(file, userId)

            // Then create asset record
            const assetData: CreateAssetData = {
                filename: uploadResult.fileName,
                file_url: uploadResult.fileUrl,
                file_size: uploadResult.fileSize,
                mime_type: uploadResult.mimeType,
                ...metadata
            }

            return createAsset(assetData)
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['assets'] })
            toast.success('File uploaded successfully')
        },
        onError: (error: any) => {
            console.error('Error uploading file:', error)
            console.error('Error details:', {
                message: error?.message,
                code: error?.code,
                details: error?.details,
                hint: error?.hint,
                statusCode: error?.statusCode
            })
            const errorMessage = error?.message || 'Failed to upload file'
            toast.error(`Upload failed: ${errorMessage}`)
        },
    })
}

// ============================================
// Create Asset Mutation (without file upload)
// ============================================
export function useCreateAsset() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (data: CreateAssetData) => createAsset(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['assets'] })
            toast.success('Asset created successfully')
        },
        onError: (error) => {
            console.error('Error creating asset:', error)
            toast.error('Failed to create asset')
        },
    })
}

// ============================================
// Update Asset Mutation
// ============================================
export function useUpdateAsset() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: ({ assetId, updates }: { assetId: string; updates: Partial<CreateAssetData> }) =>
            updateAsset(assetId, updates),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['assets'] })
            toast.success('Asset updated successfully')
        },
        onError: (error) => {
            console.error('Error updating asset:', error)
            toast.error('Failed to update asset')
        },
    })
}

// ============================================
// Delete Asset Mutation
// ============================================
export function useDeleteAsset() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (assetId: string) => deleteAsset(assetId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['assets'] })
            toast.success('Asset deleted successfully')
        },
        onError: (error) => {
            console.error('Error deleting asset:', error)
            toast.error('Failed to delete asset')
        },
    })
}

// ============================================
// Mark Asset as Viewed Mutation
// ============================================
export function useMarkAssetAsViewed() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (assetId: string) => markAssetAsViewed(assetId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['assets'] })
        },
        onError: (error) => {
            console.error('Error marking asset as viewed:', error)
        },
    })
}
