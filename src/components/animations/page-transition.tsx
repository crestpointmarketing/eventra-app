'use client'

import { motion } from 'framer-motion'
import { ReactNode } from 'react'
import { pageVariants, pageTransition } from '@/lib/motion-config'

interface PageTransitionProps {
    children: ReactNode
}

export function PageTransition({ children }: PageTransitionProps) {
    return (
        <motion.div
            initial="initial"
            animate="animate"
            exit="exit"
            variants={pageVariants}
            transition={pageTransition}
        >
            {children}
        </motion.div>
    )
}
