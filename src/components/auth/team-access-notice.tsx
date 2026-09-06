'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'

export function TeamAccessNotice({ email, unavailable }: { email: string; unavailable: boolean }) {
    return (
        <main className="flex min-h-screen items-center justify-center bg-zinc-50 p-6 dark:bg-zinc-950">
            <section className="w-full max-w-lg rounded-xl border bg-white p-8 shadow-sm dark:bg-zinc-900">
                <h1 className="text-2xl font-semibold">
                    {unavailable ? 'Access check temporarily unavailable' : 'Team access required'}
                </h1>
                <p className="mt-4 text-sm text-muted-foreground">Signed in as / 当前账号</p>
                <p className="mt-1 break-all font-medium">{email}</p>
                <p className="mt-4 text-sm text-muted-foreground">
                    {unavailable
                        ? '权限检查暂时失败，请重新检查。'
                        : '当前账号尚未加入团队。如果刚刚开通权限，请重新检查；如果账号不对，请切换账号。'}
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                    <Button onClick={() => window.location.reload()}>重新检查权限</Button>
                    <Button variant="outline" asChild>
                        <Link href="/login" prefetch={false}>切换账号 / Sign in</Link>
                    </Button>
                </div>
            </section>
        </main>
    )
}
