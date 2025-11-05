import { createTheme } from '@mui/material/styles';

export const lightTheme = createTheme({
  direction: 'rtl',
  palette: {
    mode: 'light',
    primary: {
      main: '#7E66AC',
      dark: '#502e91',
      light: '#9B7FD9',
      contrastText: '#fff',
    },
    secondary: {
      main: '#8F00FF',
      light: '#A347FF',
      dark: '#6B00CC',
    },
    background: {
      default: '#ffffff',
      paper: '#fff',
    },
    text: {
      primary: '#333333',
      secondary: '#8589A0',
    },
    error: {
      main: '#f44336',
    },
    warning: {
      main: '#ff9800',
    },
    success: {
      main: '#4caf50',
    },
    info: {
      main: '#2196f3',
    },
  },
  typography: {
    fontFamily: '"Cairo", "Tajawal", -apple-system, BlinkMacSystemFont, sans-serif',
    h1: {
      fontWeight: 800,
      color: '#502e91',
    },
    h2: {
      fontWeight: 700,
      color: '#502e91',
    },
    h3: {
      fontWeight: 700,
      color: '#502e91',
    },
    h4: {
      fontWeight: 700,
      color: '#502e91',
    },
    h5: {
      fontWeight: 800,
      color: '#502e91',
    },
    h6: {
      fontWeight: 700,
      color: '#502e91',
    },
    body1: {
      color: '#333',
    },
    body2: {
      color: '#8589A0',
    },
  },
  shape: {
    borderRadius: 10,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 14,
          textTransform: 'none',
          fontWeight: 700,
          boxShadow: '0 3px 10px 0 rgba(76,60,170,0.10)',
        },
        contained: {
          background: 'linear-gradient(90deg, #6a3f9c 0%, #4b247a 100%)',
          color: '#fff',
          '&:hover': {
            background: 'linear-gradient(90deg, #502e91 0%, #3a1c5e 100%)',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 24,
          boxShadow:
            '0 15px 35px rgba(50, 50, 93, 0.13), 0 5px 15px rgba(0,0,0,0.09)',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 12,
            backgroundColor: '#f4f2fa',
            '& fieldset': {
              borderColor: '#e0e0e0',
            },
            '&:hover fieldset': {
              borderColor: '#764ba2',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#764ba2',
              boxShadow: '0 0 0 2px rgba(118, 75, 162, 0.1)',
            },
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow:
            '0 10px 30px rgba(50, 50, 93, 0.11), 0 4px 10px rgba(0,0,0,0.08)',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 8,
        },
      },
    },
  },
});

