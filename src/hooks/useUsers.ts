import { useQuery } from '@tanstack/react-query'
import { fetchUsers, fetchUser, type User } from '@/lib/api/users'

// ============================================
// Fetch All Users
// ============================================
export function useUsers() {
    return useQuery({
        queryKey: ['users'],
        queryFn: fetchUsers,
        staleTime: 1000 * 60 * 10, // 10 minutes (users don't change often)
    })
}

// ============================================
// Fetch Single User
// ============================================
export function useUser(userId: string | undefined) {
    return useQuery({
        queryKey: ['users', userId],
        queryFn: () => fetchUser(userId!),
        enabled: !!userId,
        staleTime: 1000 * 60 * 10,
    })
}
