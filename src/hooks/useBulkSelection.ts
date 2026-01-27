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
        if (selectedIds.size === items.length) {
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

    // Check if all items are selected
    const isAllSelected = items.length > 0 && selectedIds.size === items.length

    // Check if some (but not all) items are selected
    const isIndeterminate = selectedIds.size > 0 && selectedIds.size < items.length

    return {
        selectedIds,
        selectedItems,
        selectedCount: selectedIds.size,
        isAllSelected,
        isIndeterminate,
        toggleItem,
        toggleAll,
        clearSelection,
    }
}
