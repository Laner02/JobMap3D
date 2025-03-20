module.exports = {
    content: ["jobmapweb/templates/*.html", "jobmapweb/assets/*.js",
     "./node_modules/tw-elements/js/**/*.js"],
    theme: {
      extend: {
        fontFamily: {
          coreMellowLight: ['CoreMellowLight', 'sans-serif'],
          coreMellowMedium: ['CoreMellowMedium', 'sans-serif'],
        },
        transitionProperty: {
          height: 'height',
        },
        animation:{
          'ping-slow': 'ping 3s cubic-bezier(0, 0, 0.2, 1) infinite',
        },
        keyframes: {
          ping: {
            '75%, 100%': {
              transform: 'scale(2)',
              opacity: '0',
            },
          },
        },
        boxShadow: {
          'inner-lg': 'inset 0 0 5px 5px rgba(0, 0, 0, 0.25)',
          'inner-md': 'inset 0 0 2px 2px rgba(0, 0, 0, 0.25)',
        },
      },
    },
    variants: {
      opacity: ({ after }) => after(['disabled']),
      boxShadow: ['responsive', 'hover', 'focus'],
    },
    plugins: [require("tw-elements/plugin.cjs"), require("daisyui")],
    darkMode: "class"
  }