/**
 * TextInputModal Component
 * In-app modal to replace browser prompt() dialogs
 */

import React, { useState, useEffect, useRef } from 'react';
import { X, Type } from 'lucide-react';
import './TextInputModal.css';

interface TextInputModalProps {
    isOpen: boolean;
    title: string;
    placeholder?: string;
    defaultValue?: string;
    onConfirm: (value: string, fontSize?: number) => void;
    onCancel: () => void;
    showFontSizeOption?: boolean;
    initialFontSize?: number;
}

export function TextInputModal({
    isOpen,
    title,
    placeholder = 'Enter text...',
    defaultValue = '',
    onConfirm,
    onCancel,
    showFontSizeOption = false,
    initialFontSize = 12,
}: TextInputModalProps) {
    const [value, setValue] = useState(defaultValue);
    const [fontSize, setFontSize] = useState(initialFontSize);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) {
            setValue(defaultValue);
            setFontSize(initialFontSize);
            // Focus the input after a short delay to ensure modal is rendered
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [isOpen, defaultValue, initialFontSize]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (value.trim()) {
            onConfirm(value.trim(), fontSize);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            onCancel();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="text-input-overlay" onClick={onCancel}>
            <div 
                className="text-input-modal" 
                onClick={(e) => e.stopPropagation()}
                onKeyDown={handleKeyDown}
            >
                <div className="text-input-header">
                    <div className="text-input-title">
                        <Type size={18} />
                        <span>{title}</span>
                    </div>
                    <button className="text-input-close" onClick={onCancel}>
                        <X size={18} />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="text-input-body">
                    <input
                        ref={inputRef}
                        type="text"
                        className="text-input-field"
                        placeholder={placeholder}
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        autoFocus
                    />
                    
                    {showFontSizeOption && (
                        <div className="text-input-options">
                            <label className="text-sm text-gray-600 flex justify-between">
                                <span>Font Size</span>
                                <span>{fontSize}px</span>
                            </label>
                            <input 
                                type="range" 
                                min="8" 
                                max="72" 
                                value={fontSize} 
                                onChange={(e) => setFontSize(Number(e.target.value))}
                                className="w-full mt-1"
                            />
                        </div>
                    )}

                    <div className="text-input-actions">
                        <button type="button" className="text-input-btn cancel" onClick={onCancel}>
                            Cancel
                        </button>
                        <button 
                            type="submit" 
                            className="text-input-btn confirm" 
                            disabled={!value.trim()}
                            style={{ backgroundColor: '#dc2626', color: 'white' }} 
                        >
                            Add
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
