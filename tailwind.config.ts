import type { Config } from "tailwindcss";

const config: Config = {
    darkMode: 'class',
    content: [
        "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                background: 'hsl(var(--background))',
                foreground: 'hsl(var(--foreground))',
                card: { DEFAULT: 'hsl(var(--card))', foreground: 'hsl(var(--card-foreground))' },
                popover: { DEFAULT: 'hsl(var(--popover))', foreground: 'hsl(var(--popover-foreground))' },
                primary: { DEFAULT: 'hsl(var(--primary))', foreground: 'hsl(var(--primary-foreground))' },
                secondary: { DEFAULT: 'hsl(var(--secondary))', foreground: 'hsl(var(--secondary-foreground))' },
                muted: { DEFAULT: 'hsl(var(--muted))', foreground: 'hsl(var(--muted-foreground))' },
                accent: { DEFAULT: 'hsl(var(--accent))', foreground: 'hsl(var(--accent-foreground))' },
                destructive: { DEFAULT: 'hsl(var(--destructive))', foreground: 'hsl(var(--destructive-foreground))' },
                border: 'hsl(var(--border))', input: 'hsl(var(--input))', ring: 'hsl(var(--ring))',
                // Eventra v2 color system
                lime: {
                    DEFAULT: '#a3e635',
                    50: '#f7fee7',
                    100: '#ecfccb',
                    400: '#BEF264',
                    500: '#a3e635',
                },
                purple: {
                    DEFAULT: '#8b5cf6',
                },
                zinc: {
                    900: '#18181b',
                }
            },
            fontFamily: {
                sans: ['var(--font-inter)', 'system-ui', '-apple-system', 'sans-serif'],
            },
            fontSize: {
                'hero': ['64px', { lineHeight: '1.2', fontWeight: '500' }],
                'h1': ['48px', { lineHeight: '1.2', fontWeight: '500' }],
                'h2': ['32px', { lineHeight: '1.3', fontWeight: '500' }],
                'h3': [' 24px', { lineHeight: '1.4', fontWeight: '500' }],
                'body': ['16px', { lineHeight: '1.6', fontWeight: '400' }],
                'caption': ['14px', { lineHeight: '1.6', fontWeight: '400' }],
            }
        },
    },
    plugins: [],
};
export default config;
