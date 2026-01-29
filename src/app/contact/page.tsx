'use client'

import Link from 'next/link'
import { TopNav } from '@/components/layout/top-nav'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import { Mail, MessageSquare, Send } from 'lucide-react'

export default function ContactPage() {
    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900">
            <TopNav />

            <main className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-16">
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-semibold text-zinc-900 dark:text-white mb-4">
                        Get in Touch
                    </h1>
                    <p className="text-lg text-zinc-600 dark:text-zinc-400">
                        Have questions about Eventra? We're here to help.
                    </p>
                </div>

                <div className="grid md:grid-cols-2 gap-8">
                    {/* Contact Form */}
                    <Card className="p-8 bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700">
                        <form className="space-y-6">
                            <div>
                                <label htmlFor="name" className="block text-sm font-medium text-zinc-900 dark:text-white mb-2">
                                    Name
                                </label>
                                <Input
                                    id="name"
                                    type="text"
                                    placeholder="Your name"
                                    className="w-full"
                                    required
                                />
                            </div>

                            <div>
                                <label htmlFor="email" className="block text-sm font-medium text-zinc-900 dark:text-white mb-2">
                                    Email
                                </label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="you@company.com"
                                    className="w-full"
                                    required
                                />
                            </div>

                            <div>
                                <label htmlFor="message" className="block text-sm font-medium text-zinc-900 dark:text-white mb-2">
                                    Message
                                </label>
                                <Textarea
                                    id="message"
                                    placeholder="Tell us how we can help..."
                                    rows={5}
                                    className="w-full resize-none"
                                    required
                                />
                            </div>

                            <Button type="submit" className="w-full">
                                <Send className="h-4 w-4 mr-2" />
                                Send Message
                            </Button>
                        </form>
                    </Card>

                    {/* Contact Info */}
                    <div className="space-y-6">
                        <Card className="p-6 bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700">
                            <div className="flex items-start gap-4">
                                <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
                                    <Mail className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                                </div>
                                <div>
                                    <h3 className="font-medium text-zinc-900 dark:text-white mb-1">
                                        Email
                                    </h3>
                                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                                        support@eventra.com
                                    </p>
                                    <p className="text-xs text-zinc-500 dark:text-zinc-500 mt-1">
                                        We'll respond within 24 hours
                                    </p>
                                </div>
                            </div>
                        </Card>

                        <Card className="p-6 bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700">
                            <div className="flex items-start gap-4">
                                <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
                                    <MessageSquare className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                                </div>
                                <div>
                                    <h3 className="font-medium text-zinc-900 dark:text-white mb-1">
                                        Live Chat
                                    </h3>
                                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                                        Available Monday-Friday
                                    </p>
                                    <p className="text-xs text-zinc-500 dark:text-zinc-500 mt-1">
                                        9am - 5pm EST
                                    </p>
                                </div>
                            </div>
                        </Card>

                        <Card className="p-6 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 border-indigo-200 dark:border-indigo-800">
                            <h3 className="font-medium text-zinc-900 dark:text-white mb-2">
                                Looking for Sales?
                            </h3>
                            <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
                                Interested in Eventra for your team? Let's talk about how we can help.
                            </p>
                            <Button variant="outline" className="w-full">
                                Schedule a Demo
                            </Button>
                        </Card>
                    </div>
                </div>
            </main>
        </div>
    )
}
