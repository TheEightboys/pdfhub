/**
 * Page Numbers Tool
 * Add page numbers to PDF pages
 */

import { useState } from 'react';
import { useApp, useToast } from '../../store/appStore';
import { addPageNumbers, downloadPDF } from '../../utils/pdfHelpers';
import { PageNumberOptions } from '../../types';
import {
    Download,
    Loader2,
    Hash,
} from 'lucide-react';
import './Tools.css';

type NumberFormat = 'numeric' | 'roman' | 'alphabetic';
type NumberPosition = 'bottom-center' | 'bottom-left' | 'bottom-right' | 'top-center' | 'top-left' | 'top-right';

export function PageNumbersTool() {
    const { state, setLoading } = useApp();
    const { addToast } = useToast();
    const { activeDocument } = state;

    const [format, setFormat] = useState<NumberFormat>('numeric');
    const [position, setPosition] = useState<NumberPosition>('bottom-center');
    const [fontSize, setFontSize] = useState(12);
    const [color, setColor] = useState('#000000');
    const [startNumber, setStartNumber] = useState(1);
    const [prefix, setPrefix] = useState('');
    const [suffix, setSuffix] = useState('');
    const [skipFirst, setSkipFirst] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    const handleApply = async () => {
        if (!activeDocument) return;

        setIsProcessing(true);
        setLoading(true, 'Adding page numbers...');

        try {
            const options: PageNumberOptions = {
                format,
                position,
                fontSize,
                color,
                startNumber,
                prefix,
                suffix,
                margin: 30,
            };

            // If skipping first page, create custom page range
            if (skipFirst && activeDocument.pageCount > 1) {
                options.pages = Array.from(
                    { length: activeDocument.pageCount - 1 },
                    (_, i) => i + 2
                );
            }

            const numberedBytes = await addPageNumbers(activeDocument.arrayBuffer.slice(0), options);

            const fileName = activeDocument.name.replace('.pdf', '_numbered.pdf');
            downloadPDF(numberedBytes, fileName);

            addToast({
                type: 'success',
                title: 'Page numbers added!',
                message: `Saved to ${fileName}`,
            });
        } catch (error) {
            console.error('Page numbering failed:', error);
            addToast({
                type: 'error',
                title: 'Failed',
                message: 'An error occurred while adding page numbers.',
            });
        } finally {
            setIsProcessing(false);
            setLoading(false);
        }
    };

    // Preview helper
    const getPreviewNumber = (pageNum: number): string => {
        const adjustedNum = pageNum + startNumber - 1;
        let numStr: string;

        switch (format) {
            case 'roman':
                numStr = toRoman(adjustedNum);
                break;
            case 'alphabetic':
                numStr = toAlphabetic(adjustedNum);
                break;
            default:
                numStr = adjustedNum.toString();
        }

        return `${prefix}${numStr}${suffix}`;
    };

    if (!activeDocument) {
        return (
            <div className="tool-panel">
                <div className="tool-empty">
                    <Hash size={48} />
                    <h3>Open a PDF first</h3>
                    <p>Upload a PDF file to add page numbers.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="tool-panel">
            <div className="tool-header">
                <h2 className="tool-title">Add Page Numbers</h2>
                <p className="tool-description">
                    Add customizable page numbers to your PDF.
                </p>
            </div>

            <div className="tool-content">
                {/* Format */}
                <div className="tool-section">
                    <h4 className="section-title">Number Format</h4>
                    <div className="mode-tabs">
                        <button
                            className={`mode-tab ${format === 'numeric' ? 'active' : ''}`}
                            onClick={() => setFormat('numeric')}
                        >
                            1, 2, 3
                        </button>
                        <button
                            className={`mode-tab ${format === 'roman' ? 'active' : ''}`}
                            onClick={() => setFormat('roman')}
                        >
                            I, II, III
                        </button>
                        <button
                            className={`mode-tab ${format === 'alphabetic' ? 'active' : ''}`}
                            onClick={() => setFormat('alphabetic')}
                        >
                            A, B, C
                        </button>
                    </div>
                </div>

                {/* Position */}
                <div className="tool-section">
                    <h4 className="section-title">Position</h4>
                    <div className="position-grid-6">
                        {[
                            { id: 'top-left', label: 'Top Left' },
                            { id: 'top-center', label: 'Top Center' },
                            { id: 'top-right', label: 'Top Right' },
                            { id: 'bottom-left', label: 'Bottom Left' },
                            { id: 'bottom-center', label: 'Bottom Center' },
                            { id: 'bottom-right', label: 'Bottom Right' },
                        ].map(pos => (
                            <button
                                key={pos.id}
                                className={`position-btn-sm ${position === pos.id ? 'active' : ''}`}
                                onClick={() => setPosition(pos.id as NumberPosition)}
                            >
                                {pos.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Font Size & Color */}
                <div className="tool-section">
                    <div className="inline-controls">
                        <div className="inline-control">
                            <label className="input-label">Font Size</label>
                            <input
                                type="number"
                                value={fontSize}
                                onChange={(e) => setFontSize(Math.max(6, parseInt(e.target.value) || 12))}
                                min={6}
                                max={72}
                                className="number-input"
                            />
                        </div>
                        <div className="inline-control">
                            <label className="input-label">Color</label>
                            <input
                                type="color"
                                value={color}
                                onChange={(e) => setColor(e.target.value)}
                                className="color-picker-sm"
                            />
                        </div>
                        <div className="inline-control">
                            <label className="input-label">Start At</label>
                            <input
                                type="number"
                                value={startNumber}
                                onChange={(e) => setStartNumber(Math.max(1, parseInt(e.target.value) || 1))}
                                min={1}
                                className="number-input"
                            />
                        </div>
                    </div>
                </div>

                {/* Prefix & Suffix */}
                <div className="tool-section">
                    <div className="inline-controls">
                        <div className="inline-control flex-1">
                            <label className="input-label">Prefix</label>
                            <input
                                type="text"
                                value={prefix}
                                onChange={(e) => setPrefix(e.target.value)}
                                placeholder="Page "
                                className="text-input-sm"
                            />
                        </div>
                        <div className="inline-control flex-1">
                            <label className="input-label">Suffix</label>
                            <input
                                type="text"
                                value={suffix}
                                onChange={(e) => setSuffix(e.target.value)}
                                placeholder=" of X"
                                className="text-input-sm"
                            />
                        </div>
                    </div>
                </div>

                {/* Skip First Page */}
                <div className="tool-section">
                    <label className="checkbox-option-inline">
                        <input
                            type="checkbox"
                            checked={skipFirst}
                            onChange={(e) => setSkipFirst(e.target.checked)}
                        />
                        <span>Skip first page (cover page)</span>
                    </label>
                </div>

                {/* Preview */}
                <div className="tool-section">
                    <h4 className="section-title">Preview</h4>
                    <div className="page-number-preview">
                        <div className={`preview-page ${position}`}>
                            <div className="preview-number" style={{ fontSize: `${Math.min(fontSize, 16)}px`, color }}>
                                {getPreviewNumber(1)}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="tool-footer">
                <div className="tool-summary">
                    <span className="summary-stat">
                        <strong>{skipFirst ? activeDocument.pageCount - 1 : activeDocument.pageCount}</strong> pages
                    </span>
                </div>

                <button
                    className="btn btn-primary btn-lg"
                    onClick={handleApply}
                    disabled={isProcessing}
                >
                    {isProcessing ? (
                        <>
                            <Loader2 size={18} className="animate-spin" />
                            Adding...
                        </>
                    ) : (
                        <>
                            <Download size={18} />
                            Apply & Download
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}

// Helper functions
function toRoman(num: number): string {
    const romanNumerals: [number, string][] = [
        [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'],
        [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'],
        [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']
    ];

    let result = '';
    for (const [value, symbol] of romanNumerals) {
        while (num >= value) {
            result += symbol;
            num -= value;
        }
    }
    return result;
}

function toAlphabetic(num: number): string {
    let result = '';
    while (num > 0) {
        num--;
        result = String.fromCharCode(65 + (num % 26)) + result;
        num = Math.floor(num / 26);
    }
    return result;
}
