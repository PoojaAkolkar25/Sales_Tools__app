import React, { createContext, useContext, useEffect, useState } from 'react';

export type Theme =
    | 'light-1' | 'light-2' | 'light-3' | 'light-4' | 'light-5'
    | 'dark-1' | 'dark-2' | 'dark-3' | 'dark-4' | 'dark-5'
    | 'birla' | 'autumn' | 'default' | 'rustic' | 'warm-earth' | 'rustic-charm' | 'ocean-delight' | 'electric-city';

interface ThemeContextType {
    theme: Theme;
    setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [theme, setTheme] = useState<Theme>(() => {
        const savedTheme = localStorage.getItem('app-theme');
        // Validate saved theme or default to light-1
        if (savedTheme && [
            'light-1', 'light-2', 'light-3', 'light-4', 'light-5',
            'dark-1', 'dark-2', 'dark-3', 'dark-4', 'dark-5',
            'birla', 'autumn', 'default', 'rustic', 'warm-earth', 'rustic-charm', 'ocean-delight', 'electric-city'
        ].includes(savedTheme)) {
            return savedTheme as Theme;
        }
        return 'light-1';
    });

    useEffect(() => {
        localStorage.setItem('app-theme', theme);
        document.documentElement.setAttribute('data-theme', theme);
    }, [theme]);

    return (
        <ThemeContext.Provider value={{ theme, setTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};
