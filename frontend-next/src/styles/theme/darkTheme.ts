import { createTheme } from '@mui/material/styles';

export const darkTheme = createTheme({
  direction: 'rtl',
  palette: {
    mode: 'dark',
    primary: {
      main: '#9B7FD9',
      dark: '#7E66AC',
      light: '#B39EE6',
      contrastText: '#fff',
    },
    secondary: {
      main: '#A347FF',
      light: '#B56FFF',
      dark: '#8F00FF',
    },
    background: {
      default: '#0a0a0a',
      paper: '#1a1a1a',
    },
    text: {
      primary: '#ffffff',
      secondary: '#b0b0b0',
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
      color: '#9B7FD9',
    },
    h2: {
      fontWeight: 700,
      color: '#9B7FD9',
    },
    h3: {
      fontWeight: 700,
      color: '#9B7FD9',
    },
    h4: {
      fontWeight: 700,
      color: '#9B7FD9',
    },
    h5: {
      fontWeight: 800,
      color: '#9B7FD9',
    },
    h6: {
      fontWeight: 700,
      color: '#9B7FD9',
    },
    body1: {
      color: '#ffffff',
    },
    body2: {
      color: '#b0b0b0',
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
          boxShadow: '0 3px 10px 0 rgba(155,127,217,0.15)',
        },
        contained: {
          background: 'linear-gradient(90deg, #9B7FD9 0%, #7E66AC 100%)',
          color: '#fff',
          '&:hover': {
            background: 'linear-gradient(90deg, #B39EE6 0%, #9B7FD9 100%)',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 24,
          backgroundColor: '#1a1a1a',
          backgroundImage: 'none',
          boxShadow:
            '0 15px 35px rgba(0, 0, 0, 0.3), 0 5px 15px rgba(0,0,0,0.2)',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 12,
            backgroundColor: '#242424',
            '& fieldset': {
              borderColor: '#333333',
            },
            '&:hover fieldset': {
              borderColor: '#9B7FD9',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#9B7FD9',
              boxShadow: '0 0 0 2px rgba(155, 127, 217, 0.15)',
            },
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          backgroundColor: '#1a1a1a',
          backgroundImage: 'none',
          boxShadow:
            '0 10px 30px rgba(0, 0, 0, 0.4), 0 4px 10px rgba(0,0,0,0.3)',
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

