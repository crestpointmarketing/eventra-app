import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                // Eventra v2 color system
                lime: {
                    DEFAULT: '#a3e635',
                    50: '#f7fee7',
                    100: '#ecfccb',
                    400: '#a3e635',
                    500: '#84cc16',
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
