import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";

const config: Config = {
  darkMode: "class",                    // ✅ fix: use string
  content: ["./src/**/*.{ts,tsx}"],
  theme: { extend: {} },
  plugins: [animate],
};

export default config;
