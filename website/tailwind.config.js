/** @type {import('tailwindcss').Config} */
export default {
    plugins: [],
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            animation: {
                ["hearted"]: "heartedKF 1s ease-in-out 1",
                ["loadingSlider"]: "loadingSliderKF 3s ease-in-out infinite",
            },
            keyframes: {
                ["heartedKF"]: {
                    "0%": { transform: "scale(1)" },
                    "25%": { transform: "scale(1.25)" },
                    "50%": { transform: "scale(1)" },
                    "75%": { transform: "scale(1.25)" },
                    "100%": { transform: "scale(1)" },
                },
                ["loadingSliderKF"]: {
                    "0%": { left: "0%" },
                    "50%": { left: "calc(100% - 16px)" },
                    "100%": { left: "0%" }
                }
            },
            aspectRatio: {
                "retro": "4 / 3"
            },
            colors: {
                "accent": "#5865f2",
                "ring": "#4b5563",              // gray-600
                "background": "#1f2937",        // gray-800
                "background-alt": "#0f172a",    // gray-900
                "button": "#374151",            // gray-700
                "button-alt": "#1f2937",        // gray-800
                "book": "#e5e7eb",              // gray-200
                "book-alt": "#9ca3af"           // gray-400
            }
        }
    }
}

