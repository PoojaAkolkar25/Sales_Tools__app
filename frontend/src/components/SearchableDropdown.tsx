import React, { useState, useRef, useEffect, useMemo, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check, Plus } from 'lucide-react';

interface Option {
    value: string | number;
    label: string;
}

interface SearchableDropdownProps {
    options: Option[];
    value: string | number;
    onChange: (value: string | number) => void;
    placeholder?: string;
    label?: string;
    onAddNew?: () => void;
    addNewLabel?: string;
    className?: string;
    disabled?: boolean;
    allowCustom?: boolean;
    required?: boolean;
}

const SearchableDropdown: React.FC<SearchableDropdownProps> = ({
    options,
    value,
    onChange,
    placeholder = 'Select an option',
    label,
    onAddNew,
    addNewLabel = 'Add New',
    className = '',
    disabled = false,
    allowCustom = false,
    required = false
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [inputText, setInputText] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const [menuStyles, setMenuStyles] = useState<React.CSSProperties>({});

    // Resolve the display label for the current value
    const selectedLabel = useMemo(() => {
        const found = options.find(opt => opt.value === value);
        return found ? found.label : (allowCustom && value ? String(value) : '');
    }, [options, value, allowCustom]);

    // When external value changes, sync the input text when closed
    useEffect(() => {
        if (!isOpen) {
            setInputText(selectedLabel);
        }
    }, [selectedLabel, isOpen]);

    const filteredOptions = useMemo(() => {
        if (!inputText.trim() || inputText === selectedLabel) return options;
        return options.filter(opt =>
            opt.label.toLowerCase().includes(inputText.toLowerCase())
        );
    }, [options, inputText, selectedLabel]);

    const showCustomOption = allowCustom
        && inputText.trim() !== ''
        && inputText !== selectedLabel
        && !options.some(opt => opt.label.toLowerCase() === inputText.trim().toLowerCase());

    const updateMenuPosition = () => {
        if (containerRef.current && isOpen) {
            const rect = containerRef.current.getBoundingClientRect();

            setMenuStyles({
                position: 'fixed',
                top: `${rect.bottom + 4}px`,
                bottom: 'auto',
                left: `${rect.left}px`,
                width: `${rect.width}px`,
                zIndex: 9999
            });
        }
    };

    useLayoutEffect(() => {
        if (isOpen) {
            updateMenuPosition();
            window.addEventListener('scroll', updateMenuPosition, true);
            window.addEventListener('resize', updateMenuPosition);
        }
        return () => {
            window.removeEventListener('scroll', updateMenuPosition, true);
            window.removeEventListener('resize', updateMenuPosition);
        };
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return;

        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            const isInsideContainer = containerRef.current?.contains(target);
            const isInsidePortal = menuRef.current?.contains(target);

            if (!isInsideContainer && !isInsidePortal) {
                // On blur: if custom allowed, commit whatever is typed; else revert
                if (allowCustom && inputText.trim() !== '') {
                    onChange(inputText.trim());
                } else if (!allowCustom) {
                    setInputText(selectedLabel); // revert to last known good value
                }
                setIsOpen(false);
            }
        };

        // Use capture: true to ensure we catch the click even if others stop propagation
        document.addEventListener('mousedown', handleClickOutside, { capture: true });
        return () => document.removeEventListener('mousedown', handleClickOutside, { capture: true });
    }, [isOpen, allowCustom, inputText, selectedLabel, onChange]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const text = e.target.value;
        setInputText(text);
        setIsOpen(true);
        // If user cleared the field entirely, also clear the value
        if (text === '') {
            onChange('');
        }
    };

    const handleInputFocus = () => {
        setIsOpen(true);
        // Select all text on focus so user can easily replace
        inputRef.current?.select();
    };

    const handleSelect = (option: Option) => {
        onChange(option.value);
        setInputText(option.label);
        setIsOpen(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Escape') {
            setInputText(selectedLabel);
            setIsOpen(false);
        }
    };

    return (
        <div className={`ae-searchable-dropdown ${className}`} ref={containerRef}>
            {label && (
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginBottom: '4px' }}>
                    {label} {required && <span style={{ color: 'var(--theme-primary)' }}>*</span>}
                </label>
            )}

            {/* Combined trigger + search: single editable input */}
            <div style={{ position: 'relative', width: '100%' }}>
                <input
                    ref={inputRef}
                    type="text"
                    className={`ae-input ae-searchable-combobox-input ${isOpen ? 'active' : ''}`}
                    placeholder={placeholder}
                    value={inputText}
                    onChange={handleInputChange}
                    onFocus={handleInputFocus}
                    onKeyDown={handleKeyDown}
                    disabled={disabled}
                    autoComplete="off"
                    style={{ paddingRight: '32px', cursor: disabled ? 'not-allowed' : 'text' }}
                />
                <ChevronDown
                    size={16}
                    onClick={() => !disabled && (isOpen ? setIsOpen(false) : inputRef.current?.focus())}
                    tabIndex={-1}
                    focusable="false"
                    style={{
                        position: 'absolute',
                        right: '10px',
                        top: '50%',
                        transform: `translateY(-50%) ${isOpen ? 'rotate(180deg)' : ''}`,
                        transition: 'transform 0.2s',
                        color: '#718096',
                        cursor: 'pointer',
                        pointerEvents: disabled ? 'none' : 'auto'
                    }}
                />
            </div>

            {isOpen && createPortal(
                <div className="ae-searchable-dropdown-menu" style={menuStyles} ref={menuRef}>
                    <div className="ae-searchable-dropdown-options">
                        {showCustomOption && (
                            <div
                                className="ae-searchable-dropdown-option"
                                onMouseDown={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    onChange(inputText.trim());
                                    setIsOpen(false);
                                }}
                            >
                                <span style={{ flex: 1, fontStyle: 'italic', color: 'var(--theme-primary)' }}>
                                    Use "{inputText}"
                                </span>
                            </div>
                        )}
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map((option) => (
                                <div
                                    key={option.value}
                                    className={`ae-searchable-dropdown-option ${value === option.value ? 'selected' : ''}`}
                                    onMouseDown={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        handleSelect(option);
                                    }}
                                >
                                    <span style={{ flex: 1 }}>{option.label}</span>
                                    {value === option.value && <Check size={14} focusable="false" />}
                                </div>
                            ))
                        ) : !showCustomOption && (
                            <div className="ae-searchable-dropdown-no-results">
                                {inputText ? `No results for "${inputText}"` : 'Start typing to search...'}
                            </div>
                        )}
                    </div>

                    {onAddNew && (
                        <div className="ae-searchable-dropdown-add-new">
                            <button
                                type="button"
                                className="ae-searchable-dropdown-add-btn"
                                onMouseDown={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setIsOpen(false);
                                    onAddNew();
                                }}
                            >
                                <Plus size={14} focusable="false" style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
                                {addNewLabel}
                            </button>
                        </div>
                    )}
                </div>,
                document.body
            )}
        </div>
    );
};

export default SearchableDropdown;
