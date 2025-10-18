import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        semantics: {
          who: "#F28C28",
          doing: "#3AA655",
          what: "#F7C948",
          where: "#3D9BE9",
          when: "#A060FF",
        },
      },
    },
  },
  plugins: [],
};

export default config;
