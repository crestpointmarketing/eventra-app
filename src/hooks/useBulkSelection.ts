import { useState, useMemo } from 'react'

/**
 * Reusable hook for managing bulk selection state
 * @template T - Item type with required 'id' property
 */
export function useBulkSelection<T extends { id: string }>(items: T[]) {
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

    // Toggle individual item selection
    const toggleItem = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev)
            if (next.has(id)) {
                next.delete(id)
            } else {
                next.add(id)
            }
            return next
        })
    }

    // Toggle all items (select all or deselect all)
    const toggleAll = () => {
        if (items.length > 0 && items.every(item => selectedIds.has(item.id))) {
            // All selected, clear selection
            setSelectedIds(new Set())
        } else {
            // Some or none selected, select all
            setSelectedIds(new Set(items.map(item => item.id)))
        }
    }

    // Clear all selections
    const clearSelection = () => {
        setSelectedIds(new Set())
    }

    // Get selected items
    const selectedItems = useMemo(
        () => items.filter(item => selectedIds.has(item.id)),
        [items, selectedIds]
    )

    // Counts only cover the current items, so hidden (filtered-out) selections are never acted on.
    const isAllSelected = items.length > 0 && selectedItems.length === items.length
    const isIndeterminate = selectedItems.length > 0 && selectedItems.length < items.length

    return {
        selectedIds,
        selectedItems,
        selectedCount: selectedItems.length,
        isAllSelected,
        isIndeterminate,
        toggleItem,
        toggleAll,
        clearSelection,
    }
}
