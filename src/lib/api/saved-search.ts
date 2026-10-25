import { createClient } from '@/lib/supabase/client'
import type { SearchResult } from '@/lib/events/search-contract'

export interface SavedSearchResult {
    id: string
    job_id: string
    result_id: string
    result: SearchResult
    created_at: string
}

export async function fetchSavedResults(): Promise<SavedSearchResult[]> {
    const { data, error } = await createClient()
        .from('saved_search_results')
        .select('id,job_id,result_id,result,created_at')
        .order('created_at', { ascending: false })
    if (error) throw new Error('Saved events could not be loaded')
    return (data ?? []) as SavedSearchResult[]
}

export async function saveResult(jobId: string, result: SearchResult) {
    const { error } = await createClient()
        .from('saved_search_results')
        .insert({ job_id: jobId, result_id: result.id, result })
    // A second save of the same result is already saved, not a failure.
    if (error && error.code !== '23505') throw new Error('Event could not be saved')
}

export async function removeSavedResult(jobId: string, resultId: string) {
    const { error } = await createClient()
        .from('saved_search_results')
        .delete()
        .eq('job_id', jobId)
        .eq('result_id', resultId)
    if (error) throw new Error('Saved event could not be removed')
}
