import React, { useState } from 'react';
import { Check, Sun, Moon, Palette } from 'lucide-react';

interface SettingsProps {
    theme: string;
    setTheme: (theme: string) => void;
}

const Settings: React.FC<SettingsProps> = ({ theme: currentTheme, setTheme }) => {
    const [activeTab, setActiveTab] = useState<'light' | 'dark'>('light');

    const handleThemeChange = (id: string) => {
        setTheme(id);
        localStorage.setItem('app-theme', id);
    };

    const lightThemes = [
        {
            id: 'default',
            name: 'Default Theme',
            description: 'Classic Orange & Azure',
            colors: {
                primary: '#FF6B00',
                secondary: '#F7FAFC',
                accent: '#0066CC'
            }
        },
        {
            id: 'autumn',
            name: 'Autumn Theme',
            description: 'Warm Ember & Cream',
            colors: {
                primary: '#BB4D00',
                secondary: '#FFF9F2',
                accent: '#D97706'
            }
        }
    ];

    return (
        <div style={{ background: 'var(--bg-primary)', minHeight: 'calc(100vh - 64px)', padding: '24px 41px' }}>
            <div className="space-y-8">
                {/* Header */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0 8px',
                    marginBottom: '24px'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '4px', height: '24px', background: 'var(--accent-primary)', borderRadius: '2px' }}></div>
                        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>Themes</h1>
                    </div>
                </div>

                {/* Tab Navigation */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'flex-start',
                    gap: '12px',
                    alignItems: 'center',
                    marginBottom: '24px',
                    padding: '0 8px'
                }}>
                    <div style={{
                        display: 'flex',
                        gap: '4px',
                        alignItems: 'center',
                        background: 'white',
                        padding: '6px',
                        borderRadius: '12px',
                        border: '1px solid var(--border-primary)',
                        boxShadow: 'var(--shadow-sm)'
                    }}>
                        <button
                            onClick={() => setActiveTab('light')}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '6px 16px',
                                borderRadius: '8px',
                                fontSize: '0.85rem',
                                fontWeight: 600,
                                border: 'none',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                background: activeTab === 'light' ? 'var(--theme-primary)' : 'transparent',
                                color: activeTab === 'light' ? 'white' : 'var(--text-secondary)',
                                boxShadow: activeTab === 'light' ? '0 2px 8px rgba(187, 77, 0, 0.3)' : 'none'
                            }}
                        >
                            <Sun size={18} /> Light Theme
                        </button>
                        <button
                            onClick={() => setActiveTab('dark')}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '6px 16px',
                                borderRadius: '8px',
                                fontSize: '0.85rem',
                                fontWeight: 600,
                                border: 'none',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                background: activeTab === 'dark' ? 'var(--theme-primary)' : 'transparent',
                                color: activeTab === 'dark' ? 'white' : 'var(--text-secondary)',
                                boxShadow: activeTab === 'dark' ? '0 2px 8px rgba(187, 77, 0, 0.3)' : 'none'
                            }}
                        >
                            <Moon size={18} /> Dark Theme
                        </button>
                    </div>
                </div>

                {/* Tab Content */}
                <div style={{ marginLeft: '8px' }}>
                    {activeTab === 'light' ? (
                        <>
                            <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '16px' }}>Available Light Themes</h2>
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                                gap: '20px',
                                maxWidth: '900px'
                            }}>
                                {lightThemes.map((themeOption) => {
                                    const isSelected = currentTheme === themeOption.id;
                                    return (
                                        <div
                                            key={themeOption.id}
                                            onClick={() => handleThemeChange(themeOption.id)}
                                            style={{
                                                background: 'white',
                                                border: isSelected ? '2px solid var(--border-accent)' : '2px solid var(--border-primary)',
                                                borderRadius: '16px',
                                                padding: '20px',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s',
                                                position: 'relative',
                                                boxShadow: isSelected ? 'var(--shadow-md)' : 'var(--shadow-sm)'
                                            }}
                                            onMouseEnter={(e) => {
                                                if (!isSelected) {
                                                    e.currentTarget.style.borderColor = 'var(--border-accent)';
                                                    e.currentTarget.style.boxShadow = 'var(--shadow-md)';
                                                }
                                            }}
                                            onMouseLeave={(e) => {
                                                if (!isSelected) {
                                                    e.currentTarget.style.borderColor = 'var(--border-primary)';
                                                    e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
                                                }
                                            }}
                                        >
                                            {/* Selected Indicator */}
                                            {isSelected && (
                                                <div style={{
                                                    position: 'absolute',
                                                    top: '12px',
                                                    right: '12px',
                                                    background: 'var(--theme-primary)',
                                                    borderRadius: '50%',
                                                    width: '24px',
                                                    height: '24px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    color: 'white',
                                                    zIndex: 2
                                                }}>
                                                    <Check size={14} strokeWidth={4} />
                                                </div>
                                            )}

                                            {/* Theme Preview Colors */}
                                            <div style={{
                                                display: 'flex',
                                                gap: '8px',
                                                marginBottom: '16px',
                                                height: '70px',
                                                borderRadius: '10px',
                                                overflow: 'hidden',
                                                border: '1px solid var(--border-primary)'
                                            }}>
                                                <div style={{ flex: 2, background: themeOption.colors.primary }}></div>
                                                <div style={{ flex: 1, background: themeOption.colors.secondary }}></div>
                                                <div style={{ flex: 1, background: themeOption.colors.accent }}></div>
                                            </div>

                                            {/* Theme Info */}
                                            <div>
                                                <h3 style={{
                                                    fontSize: '1rem',
                                                    fontWeight: 800,
                                                    color: 'var(--text-primary)',
                                                    margin: '0 0 4px 0'
                                                }}>
                                                    {themeOption.name}
                                                </h3>
                                                <p style={{
                                                    fontSize: '0.85rem',
                                                    color: 'var(--text-secondary)',
                                                    margin: 0
                                                }}>
                                                    {themeOption.description}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    ) : (
                        <div style={{
                            padding: '48px',
                            textAlign: 'center',
                            background: 'white',
                            borderRadius: '16px',
                            border: '2px dashed var(--border-primary)',
                            maxWidth: '900px'
                        }}>
                            <div style={{
                                width: '64px',
                                height: '64px',
                                background: 'rgba(0, 0, 0, 0.05)',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                margin: '0 auto 16px auto',
                                color: 'var(--text-tertiary)'
                            }}>
                                <Moon size={32} />
                            </div>
                            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px' }}>Dark Mode Coming Soon</h3>
                            <p style={{ color: 'var(--text-secondary)', maxWidth: '400px', margin: '0 auto' }}>
                                We are currently working on a suite of dark themes to enhance your late-night workflow.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Settings;
