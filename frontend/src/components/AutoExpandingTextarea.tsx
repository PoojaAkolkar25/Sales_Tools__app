import React, { useRef, useEffect } from 'react';

interface AutoExpandingTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
    value?: string;
    maxRows?: number;
}

const AutoExpandingTextarea: React.FC<AutoExpandingTextareaProps> = ({ value, onChange, className, style, maxRows, ...props }) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const adjustHeight = () => {
        const textarea = textareaRef.current;
        if (textarea) {
            textarea.style.height = 'auto'; // Reset height to recalculate scrollHeight correctly
            const scrollHeight = textarea.scrollHeight;

            // Calculate max height based on line height if maxRows is provided
            if (maxRows) {
                const computedStyle = window.getComputedStyle(textarea);
                const lineHeight = parseFloat(computedStyle.lineHeight) || 20; // Default to 20 if not readable
                const maxHeight = lineHeight * maxRows;

                if (scrollHeight > maxHeight) {
                    textarea.style.height = `${maxHeight}px`;
                    textarea.style.overflowY = 'auto';
                } else {
                    textarea.style.height = `${scrollHeight}px`;
                    textarea.style.overflowY = 'hidden';
                }
            } else {
                textarea.style.height = `${scrollHeight}px`;
                textarea.style.overflowY = 'hidden';
            }
        }
    };

    useEffect(() => {
        adjustHeight();
    }, [value]);

    // Adjust height on window resize to handle layout shifts
    useEffect(() => {
        window.addEventListener('resize', adjustHeight);
        return () => window.removeEventListener('resize', adjustHeight);
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        if (onChange) {
            onChange(e);
        }
        adjustHeight();
    };

    return (
        <textarea
            {...props}
            ref={textareaRef}
            value={value}
            onChange={handleChange}
            className={`ae-textarea-auto ${className || ''}`}
            style={{
                ...style,
                overflow: 'hidden',
                resize: 'none',
                display: 'block',
                width: '100%',
                wordBreak: 'break-word',
                overflowWrap: 'break-word'
            }}
        />
    );
};

export default AutoExpandingTextarea;
