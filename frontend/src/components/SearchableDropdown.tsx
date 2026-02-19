import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, ChevronDown, Check, Plus } from 'lucide-react';

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
}

const SearchableDropdown: React.FC<SearchableDropdownProps> = ({
    options,
    value,
    onChange,
    placeholder = 'Select an option',
    label,
    onAddNew,
    addNewLabel = 'Add New',
    className = ''
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    const selectedOption = useMemo(() =>
        options.find(opt => opt.value === value),
        [options, value]);

    const filteredOptions = useMemo(() =>
        options.filter(opt =>
            opt.label.toLowerCase().includes(searchTerm.toLowerCase())
        ),
        [options, searchTerm]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (isOpen && searchInputRef.current) {
            searchInputRef.current.focus();
        }
    }, [isOpen]);

    const handleSelect = (option: Option) => {
        onChange(option.value);
        setIsOpen(false);
        setSearchTerm('');
    };

    return (
        <div className={`ae-searchable-dropdown ${className}`} ref={containerRef}>
            {label && (
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginBottom: '4px' }}>
                    {label}
                </label>
            )}

            <div
                className={`ae-searchable-dropdown-trigger ${isOpen ? 'active' : ''}`}
                onClick={() => setIsOpen(!isOpen)}
            >
                <div className={`ae-searchable-dropdown-label ${!selectedOption ? 'placeholder' : ''}`}>
                    {selectedOption ? selectedOption.label : placeholder}
                </div>
                <ChevronDown size={16} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </div>

            {isOpen && (
                <div className="ae-searchable-dropdown-menu">
                    <div className="ae-searchable-dropdown-search-wrapper">
                        <Search size={14} className="ae-searchable-dropdown-search-icon" />
                        <input
                            ref={searchInputRef}
                            type="text"
                            className="ae-searchable-dropdown-search-input"
                            placeholder="Search..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                        />
                    </div>

                    <div className="ae-searchable-dropdown-options">
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map((option) => (
                                <div
                                    key={option.value}
                                    className={`ae-searchable-dropdown-option ${value === option.value ? 'selected' : ''}`}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleSelect(option);
                                    }}
                                >
                                    <span style={{ flex: 1 }}>{option.label}</span>
                                    {value === option.value && <Check size={14} />}
                                </div>
                            ))
                        ) : (
                            <div className="ae-searchable-dropdown-no-results">
                                No results found for "{searchTerm}"
                            </div>
                        )}
                    </div>

                    {onAddNew && (
                        <div className="ae-searchable-dropdown-add-new">
                            <button
                                type="button"
                                className="ae-searchable-dropdown-add-btn"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIsOpen(false);
                                    onAddNew();
                                }}
                            >
                                <Plus size={14} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
                                {addNewLabel}
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default SearchableDropdown;
