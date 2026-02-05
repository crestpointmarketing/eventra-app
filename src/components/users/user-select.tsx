'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'

interface User {
    id: string
    name: string
    email: string
    avatar_url?: string
}

interface UserSelectProps {
    value?: string
    onValueChange: (value: string) => void
    disabled?: boolean
    placeholder?: string
}

export function UserSelect({
    value,
    onValueChange,
    disabled = false,
    placeholder = "Select owner"
}: UserSelectProps) {
    const [users, setUsers] = useState<User[]>([])
    const [loading, setLoading] = useState(true)
    const supabase = createClient()

    useEffect(() => {
        async function fetchUsers() {
            try {
                const { data, error } = await supabase
                    .from('users')
                    .select('id, name, email')
                    .order('name')

                if (data) {
                    setUsers(data)
                }
            } catch (error) {
                console.error('Failed to fetch users:', error)
            } finally {
                setLoading(false)
            }
        }

        fetchUsers()
    }, [supabase])

    if (loading) {
        return <Skeleton className="h-10 w-full" />
    }

    return (
        <Select
            value={value}
            onValueChange={onValueChange}
            disabled={disabled}
        >
            <SelectTrigger>
                <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
                {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                        <div className="flex items-center gap-2">
                            <div className="w-5 h-5 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center text-[10px] font-bold">
                                {user.name?.[0] || user.email[0]}
                            </div>
                            <span>{user.name || user.email}</span>
                        </div>
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    )
}
