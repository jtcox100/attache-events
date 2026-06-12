import { createContext, useContext, useState } from 'react';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [dark, setDark] = useState(false);
  const toggle = () => setDark(d => !d);
  return (
    <ThemeContext.Provider value={{ dark, toggle }}>
      <div style={{
        minHeight: '100vh',
        backgroundColor: dark ? '#0f172a' : '#f8f8f8',
        color: dark ? '#f1f5f9' : '#1a1a1a',
        transition: 'background-color 0.2s, color 0.2s'
      }}>
        {children}
      </div>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
