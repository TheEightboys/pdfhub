/**
 * Split PDF Tool
 * Extract specific pages from a PDF
 */

import React, { useState, useCallback, useEffect } from 'react';
import { useApp, useToast } from '../../store/appStore';
import { splitPDF, downloadPDF } from '../../utils/pdfHelpers';
import { generateThumbnail } from '../../utils/imageHelpers';
import {
    Download,
    Loader2,
    Check,
    Scissors,
} from 'lucide-react';
import './Tools.css';

type SplitMode = 'select' | 'range' | 'every';

export function SplitPDFTool() {
    const { state, setLoading } = useApp();
    const { addToast } = useToast();
    const { activeDocument, selectedPages } = state;

    const [mode, setMode] = useState<SplitMode>('select');
    const [rangeStart, setRangeStart] = useState(1);
    const [rangeEnd, setRangeEnd] = useState(1);
    const [everyN, setEveryN] = useState(1);
    const [isProcessing, setIsProcessing] = useState(false);
    const [thumbnails, setThumbnails] = useState<string[]>([]);
    const [localSelectedPages, setLocalSelectedPages] = useState<number[]>([]);

    // Generate thumbnails using optimized batch function
    useEffect(() => {
        const generateThumbs = async () => {
            if (!activeDocument) return;

            // Pre-fill with empty placeholders for immediate UI
            setThumbnails(Array(activeDocument.pageCount).fill(''));

            try {
                // Use batch generation with smaller thumbnails (80px)
                const { generateAllThumbnails } = await import('../../utils/imageHelpers');
                const thumbs = await generateAllThumbnails(activeDocument.arrayBuffer.slice(0), 80);
                setThumbnails(thumbs);
            } catch (error) {
                console.error('Failed to generate thumbnails:', error);
            }
        };

        generateThumbs();
    }, [activeDocument?.id]);

    // Update range end when document changes
    useEffect(() => {
        if (activeDocument) {
            setRangeEnd(activeDocument.pageCount);
        }
    }, [activeDocument?.id]);

    const togglePageSelection = (pageNumber: number) => {
        setLocalSelectedPages(prev =>
            prev.includes(pageNumber)
                ? prev.filter(p => p !== pageNumber)
                : [...prev, pageNumber].sort((a, b) => a - b)
        );
    };

    const selectAllPages = () => {
        if (activeDocument) {
            setLocalSelectedPages(Array.from({ length: activeDocument.pageCount }, (_, i) => i + 1));
        }
    };

    const deselectAllPages = () => {
        setLocalSelectedPages([]);
    };

    const getPagesToPrint = (): number[] => {
        if (!activeDocument) return [];

        switch (mode) {
            case 'select':
                return localSelectedPages;
            case 'range':
                const pages: number[] = [];
                for (let i = rangeStart; i <= rangeEnd; i++) {
                    pages.push(i);
                }
                return pages;
            case 'every':
                return Array.from(
                    { length: activeDocument.pageCount },
                    (_, i) => i + 1
                ).filter((_, i) => (i + 1) % everyN === 0);
            default:
                return [];
        }
    };

    const handleSplit = async () => {
        if (!activeDocument) return;

        const pagesToExtract = getPagesToPrint();

        if (pagesToExtract.length === 0) {
            addToast({
                type: 'warning',
                title: 'No pages selected',
                message: 'Please select at least one page to extract.',
            });
            return;
        }

        setIsProcessing(true);
        setLoading(true, 'Extracting pages...');

        try {
            const splitBytes = await splitPDF(activeDocument.arrayBuffer.slice(0), pagesToExtract);

            const fileName = activeDocument.name.replace(
                '.pdf',
                `_pages_${pagesToExtract.join('-')}.pdf`
            );

            downloadPDF(splitBytes, fileName);

            addToast({
                type: 'success',
                title: 'Pages extracted!',
                message: `Saved ${pagesToExtract.length} pages to ${fileName}`,
            });
        } catch (error) {
            console.error('Split failed:', error);
            addToast({
                type: 'error',
                title: 'Split failed',
                message: 'An error occurred while extracting pages.',
            });
        } finally {
            setIsProcessing(false);
            setLoading(false);
        }
    };

    if (!activeDocument) {
        return (
            <div className="tool-panel">
                <div className="tool-empty">
                    <Scissors size={48} />
                    <h3>Open a PDF first</h3>
                    <p>Upload a PDF file to extract pages from it.</p>
                </div>
            </div>
        );
    }

    const pagesToExtract = getPagesToPrint();

    return (
        <div className="tool-panel">
            <div className="tool-header">
                <h2 className="tool-title">Split PDF</h2>
                <p className="tool-description">
                    Select pages to extract into a new PDF document.
                </p>
            </div>

            <div className="tool-content">
                {/* Mode Selection */}
                <div className="tool-section">
                    <h4 className="section-title">Extraction Mode</h4>
                    <div className="mode-tabs">
                        <button
                            className={`mode-tab ${mode === 'select' ? 'active' : ''}`}
                            onClick={() => setMode('select')}
                        >
                            Select Pages
                        </button>
                        <button
                            className={`mode-tab ${mode === 'range' ? 'active' : ''}`}
                            onClick={() => setMode('range')}
                        >
                            Page Range
                        </button>
                        <button
                            className={`mode-tab ${mode === 'every' ? 'active' : ''}`}
                            onClick={() => setMode('every')}
                        >
                            Every N Pages
                        </button>
                    </div>
                </div>

                {/* Mode-specific Options */}
                {mode === 'select' && (
                    <div className="tool-section">
                        <div className="section-header">
                            <h4 className="section-title">Click pages to select</h4>
                            <div className="section-actions">
                                <button className="btn btn-sm btn-ghost" onClick={selectAllPages}>
                                    Select All
                                </button>
                                <button className="btn btn-sm btn-ghost" onClick={deselectAllPages}>
                                    Deselect All
                                </button>
                            </div>
                        </div>

                        <div className="page-grid">
                            {Array.from({ length: activeDocument.pageCount }, (_, i) => i + 1).map(pageNum => {
                                const isSelected = localSelectedPages.includes(pageNum);

                                return (
                                    <div
                                        key={pageNum}
                                        className={`page-grid-item ${isSelected ? 'selected' : ''}`}
                                        onClick={() => togglePageSelection(pageNum)}
                                    >
                                        {isSelected && (
                                            <div className="page-grid-check">
                                                <Check size={12} />
                                            </div>
                                        )}
                                        <div className="page-grid-thumb">
                                            {thumbnails[pageNum - 1] ? (
                                                <img src={thumbnails[pageNum - 1]} alt={`Page ${pageNum}`} />
                                            ) : (
                                                <div className="page-grid-skeleton" />
                                            )}
                                        </div>
                                        <span className="page-grid-number">{pageNum}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {mode === 'range' && (
                    <div className="tool-section">
                        <h4 className="section-title">Page Range</h4>
                        <div className="range-inputs">
                            <div className="input-group">
                                <label className="input-label">From</label>
                                <input
                                    type="number"
                                    value={rangeStart}
                                    onChange={(e) => setRangeStart(Math.max(1, parseInt(e.target.value) || 1))}
                                    min={1}
                                    max={activeDocument.pageCount}
                                    className="range-input"
                                />
                            </div>
                            <span className="range-separator">to</span>
                            <div className="input-group">
                                <label className="input-label">To</label>
                                <input
                                    type="number"
                                    value={rangeEnd}
                                    onChange={(e) => setRangeEnd(Math.min(activeDocument.pageCount, parseInt(e.target.value) || 1))}
                                    min={1}
                                    max={activeDocument.pageCount}
                                    className="range-input"
                                />
                            </div>
                        </div>
                    </div>
                )}

                {mode === 'every' && (
                    <div className="tool-section">
                        <h4 className="section-title">Extract Every</h4>
                        <div className="every-input">
                            <input
                                type="number"
                                value={everyN}
                                onChange={(e) => setEveryN(Math.max(1, parseInt(e.target.value) || 1))}
                                min={1}
                                max={activeDocument.pageCount}
                                className="range-input"
                            />
                            <span>pages</span>
                        </div>
                        <p className="input-hint">
                            Will extract pages: {pagesToExtract.join(', ') || 'None'}
                        </p>
                    </div>
                )}
            </div>

            <div className="tool-footer">
                <div className="tool-summary">
                    <span className="summary-stat">
                        <strong>{pagesToExtract.length}</strong> pages selected
                    </span>
                    <span className="summary-divider">•</span>
                    <span className="summary-stat">
                        of <strong>{activeDocument.pageCount}</strong> total
                    </span>
                </div>

                <button
                    className="btn btn-primary btn-lg"
                    onClick={handleSplit}
                    disabled={isProcessing || pagesToExtract.length === 0}
                >
                    {isProcessing ? (
                        <>
                            <Loader2 size={18} className="animate-spin" />
                            Extracting...
                        </>
                    ) : (
                        <>
                            <Download size={18} />
                            Extract & Download
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}
