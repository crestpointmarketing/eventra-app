'use client'

import Link from 'next/link'
import { TopNav } from '@/components/layout/top-nav'
import { Button } from '@/components/ui/button'
import { Play } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-zinc-900">
      {/* Top Navigation */}
      <TopNav />

      {/* Announcement Bar */}
      <div className="flex justify-center px-6 pt-16 pb-0">
        <div className="inline-flex items-center gap-4 rounded-full bg-violet-50 dark:bg-violet-950 px-6 py-3 border border-violet-100 dark:border-violet-800">
          <span className="text-sm text-zinc-700 dark:text-zinc-300">New: AI Lead Scoring is live! 💡</span>
          <Link
            href="/leads"
            className="text-sm font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 whitespace-nowrap"
          >
            Try it now
          </Link>
        </div>
      </div>

      {/* Hero Section */}
      <section className="mx-auto max-w-5xl px-6 pt-2 pb-16 text-center">
        <h1 className="text-5xl font-bold text-zinc-900 dark:text-white mb-6 leading-tight">
          Turn Events Into Revenue
        </h1>
        <p className="text-xl text-zinc-600 dark:text-zinc-400 mb-10 max-w-2xl mx-auto">
          Plan events, capture leads, and automate follow-ups — all in one workspace.
        </p>

        <div className="flex items-center justify-center gap-4">
          <Link href="/login">
            <Button size="lg" className="px-8">
              Get Started
            </Button>
          </Link>
          <Button size="lg" variant="outline" className="px-8">
            <Play className="mr-2 h-4 w-4" />
            Watch Demo
          </Button>
        </div>
      </section>

      {/* Product Demo Video Section */}
      <section className="mx-auto max-w-5xl px-6 py-16">
        <div className="relative aspect-video rounded-xl bg-zinc-100 dark:bg-zinc-800 shadow-lg overflow-hidden border border-zinc-200 dark:border-zinc-700">
          {/* Video Placeholder */}
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-800 dark:to-zinc-900">
            <div className="h-20 w-20 rounded-full bg-white dark:bg-zinc-700 shadow-md flex items-center justify-center mb-4 hover:scale-110 transition-transform cursor-pointer">
              <Play className="h-8 w-8 text-indigo-600" />
            </div>
            <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Watch how Eventra works</p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2">See event creation, task management, lead capture & analytics</p>
          </div>
        </div>
      </section>

      {/* Metrics Section */}
      <section className="mx-auto max-w-5xl px-6 py-16">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-12 text-center">
          <div>
            <p className="text-4xl font-bold text-zinc-900 dark:text-white mb-2">100+</p>
            <p className="text-sm text-zinc-600 dark:text-white">Events Managed</p>
          </div>
          <div>
            <p className="text-4xl font-bold text-zinc-900 dark:text-white mb-2">10,000+</p>
            <p className="text-sm text-zinc-600 dark:text-white">Leads Captured</p>
          </div>
          <div>
            <p className="text-4xl font-bold text-zinc-900 dark:text-white mb-2">1,500+</p>
            <p className="text-sm text-zinc-600 dark:text-white">Hours Saved</p>
          </div>
          <div>
            <p className="text-4xl font-bold text-zinc-900 dark:text-white mb-2">50+</p>
            <p className="text-sm text-zinc-600 dark:text-white">Teams Using Eventra</p>
          </div>
        </div>
      </section>

      {/* Transition Line */}
      <section className="mx-auto max-w-3xl px-6 py-12 text-center">
        <p className="text-lg text-zinc-600 dark:text-white">
          Everything you need to run high-impact events — in one place.
        </p>
      </section>

      {/* Footer */}
      <footer className="bg-zinc-50 dark:bg-zinc-800 border-t border-zinc-200 dark:border-zinc-700 mt-20">
        <div className="mx-auto max-w-7xl px-6 py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-8">
            {/* Left: Branding */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <img
                  src="/eventra-logo-light.png"
                  alt="Eventra"
                  className="h-8 w-auto dark:hidden"
                />
                <img
                  src="/eventra-logo-dark.png"
                  alt="Eventra"
                  className="h-8 w-auto hidden dark:block"
                />
              </div>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">Turn Events Into Revenue</p>
            </div>

            {/* Middle: Link Groups */}
            <div className="grid grid-cols-2 gap-8">
              <div>
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-white mb-3">Product</h3>
                <ul className="space-y-2">
                  <li>
                    <Link href="/events" className="text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white">
                      Events
                    </Link>
                  </li>
                  <li>
                    <Link href="/leads" className="text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white">
                      Leads
                    </Link>
                  </li>
                  <li>
                    <Link href="/analytics" className="text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white">
                      Analytics
                    </Link>
                  </li>
                </ul>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-white mb-3">Company</h3>
                <ul className="space-y-2">
                  <li>
                    <Link href="#" className="text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white">
                      About
                    </Link>
                  </li>
                  <li>
                    <Link href="/contact" className="text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white">
                      Contact
                    </Link>
                  </li>
                  <li>
                    <Link href="#" className="text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white">
                      Privacy Policy
                    </Link>
                  </li>
                  <li>
                    <Link href="#" className="text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white">
                      Terms
                    </Link>
                  </li>
                </ul>
              </div>
            </div>

            {/* Right: CTA */}
            <div className="flex md:justify-end">
              <Link href="/login">
                <Button className="px-6">
                  Get Started →
                </Button>
              </Link>
            </div>
          </div>

          {/* Copyright */}
          <div className="pt-8 border-t border-zinc-200 dark:border-zinc-700">
            <p className="text-xs text-zinc-500 dark:text-zinc-400 text-center">
              © 2026 Eventra. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
