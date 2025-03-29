import "./App.css";
import Home from "./app/page"
import useMediaQuery from '@mui/material/useMediaQuery';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import React from "react";

const CreateReflexTheme = () => {
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');
  // const theme = responsiveFontSizes( React.useMemo() );
  const theme = React.useMemo(
    () =>
      createTheme({
        palette: {
          mode: prefersDarkMode ? 'dark' : 'light',
          primary: {
            main: prefersDarkMode ? '#38A3A5' : '#38A3A5',
          },
          secondary: {
            main: prefersDarkMode ? '#C7F9CC' : '#C7F9CC',
          },
          background: {
            selected: prefersDarkMode ? "#50505050" : "#d9d9d9",
            alternate: "#f7f7f7"
          }
        },
      }),
    [prefersDarkMode]
  );
  return theme;
};

function App() {
  const theme = CreateReflexTheme();
  return <ThemeProvider theme={theme}>
    <Home />
  </ThemeProvider>;
}

export default App;
