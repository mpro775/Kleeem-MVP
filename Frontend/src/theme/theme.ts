// theme.ts
import { createTheme } from "@mui/material/styles";
import { arSD } from "@mui/material/locale";
import "@fontsource/cairo";

const theme = createTheme(
  {
    direction: "rtl",
    typography: {
      fontFamily: "Cairo, Cairo, sans-serif",
      h5: {
        fontWeight: 800,
        color: "#502e91",
      },
      body2: {
        color: "#8589A0",
      },
    },
    palette: {
      mode: "light",
      primary: {
        main: "#7E66AC",
        dark: "#502e91",
        contrastText: "#fff",
      },
      secondary: {
        main: "#8F00FF",
      },
      background: {
        default: "#ffffff", // قريب للهوية
        paper: "#fff",
      },
      text: {
        primary: "#333",
        secondary: "#8589A0",
      },
    },
    shape: {
      borderRadius: 10, // نعومة البطاقات
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 14,
            textTransform: "none",
            fontWeight: 700,
            background: "linear-gradient(90deg, #6a3f9c 0%, #4b247a 100%)",
            color: "#fff",
            boxShadow: "0 3px 10px 0 rgba(76,60,170,0.10)",
           
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            borderRadius: 24,
            boxShadow:
              "0 15px 35px rgba(50, 50, 93, 0.13), 0 5px 15px rgba(0,0,0,0.09)",
          },
        },
      },
      MuiTextField: {
        styleOverrides: {
          root: {
            background: "#f4f2fa",
            borderRadius: 12,
            "& .MuiOutlinedInput-root": {
              borderRadius: 12,
              "& fieldset": {
                borderColor: "#e0e0e0",
              },
              "&:hover fieldset": {
                borderColor: "#764ba2",
              },
              "&.Mui-focused fieldset": {
                borderColor: "#764ba2",
                boxShadow: "0 0 0 2px rgba(118, 75, 162, 0.1)",
              },
            },
          },
        },
      },
    },
  },
  arSD
);

export default theme;
