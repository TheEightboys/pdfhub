/**
 * Split PDF Tool - Optimized for large PDFs
 * Extract specific pages from a PDF
 */

import { useState, useCallback, useEffect } from 'react';
import { useApp, useToast } from '../../store/appStore';
import { splitPDF, downloadPDF } from '../../utils/pdfHelpers';
import {
    Download,
    Loader2,
    Check,
    Scissors,
} from 'lucide-react';
import './Tools.css';

type SplitMode = 'select' | 'range' | 'every';

// Lightweight placeholder
const getPlaceholder = (pageNum: number) =>
    `data:image/svg+xml,${encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" width="70" height="100" viewBox="0 0 70 100">
            <rect fill="#f1f5f9" width="70" height="100" rx="4"/>
            <rect fill="#e2e8f0" x="8" y="8" width="54" height="3" rx="1"/>
            <rect fill="#e2e8f0" x="8" y="14" width="40" height="3" rx="1"/>
            <rect fill="#e2e8f0" x="8" y="20" width="48" height="3" rx="1"/>
            <text x="35" y="60" text-anchor="middle" fill="#64748b" font-size="16" font-weight="bold" font-family="Arial">${pageNum}</text>
        </svg>
    `)}`;

export function SplitPDFTool() {
    const { state, setLoading } = useApp();
    const { addToast } = useToast();
    const { activeDocument } = state;

    const [mode, setMode] = useState<SplitMode>('select');
    const [rangeStart, setRangeStart] = useState(1);
    const [rangeEnd, setRangeEnd] = useState(1);
    const [everyN, setEveryN] = useState(1);
    const [isProcessing, setIsProcessing] = useState(false);
    const [localSelectedPages, setLocalSelectedPages] = useState<number[]>([]);

    // Update range end when document changes
    useEffect(() => {
        if (activeDocument) {
            setRangeEnd(activeDocument.pageCount);
            setLocalSelectedPages([]);
        }
    }, [activeDocument?.id]);

    const togglePageSelection = useCallback((pageNumber: number) => {
        setLocalSelectedPages(prev =>
            prev.includes(pageNumber)
                ? prev.filter(p => p !== pageNumber)
                : [...prev, pageNumber].sort((a, b) => a - b)
        );
    }, []);

    const selectAllPages = useCallback(() => {
        if (activeDocument) {
            setLocalSelectedPages(Array.from({ length: activeDocument.pageCount }, (_, i) => i + 1));
        }
    }, [activeDocument]);

    const deselectAllPages = useCallback(() => {
        setLocalSelectedPages([]);
    }, []);

    const selectOddPages = useCallback(() => {
        if (activeDocument) {
            setLocalSelectedPages(Array.from({ length: activeDocument.pageCount }, (_, i) => i + 1).filter(p => p % 2 === 1));
        }
    }, [activeDocument]);

    const selectEvenPages = useCallback(() => {
        if (activeDocument) {
            setLocalSelectedPages(Array.from({ length: activeDocument.pageCount }, (_, i) => i + 1).filter(p => p % 2 === 0));
        }
    }, [activeDocument]);

    const getPagesToPrint = useCallback((): number[] => {
        if (!activeDocument) return [];

        switch (mode) {
            case 'select':
                return localSelectedPages;
            case 'range':
                return Array.from({ length: rangeEnd - rangeStart + 1 }, (_, i) => rangeStart + i);
            case 'every':
                return Array.from({ length: Math.ceil(activeDocument.pageCount / everyN) }, (_, i) => i * everyN + 1);
            default:
                return [];
        }
    }, [activeDocument, mode, localSelectedPages, rangeStart, rangeEnd, everyN]);

    const handleSplit = async () => {
        if (!activeDocument) return;

        const pagesToSplit = getPagesToPrint();
        if (pagesToSplit.length === 0) {
            addToast({
                type: 'warning',
                title: 'No pages selected',
                message: 'Please select at least one page to split.',
            });
            return;
        }

        setIsProcessing(true);
        setLoading(true, 'Splitting PDF...');

        try {
            const splitBytes = await splitPDF(activeDocument.arrayBuffer.slice(0), pagesToSplit);
            const fileName = activeDocument.name.replace('.pdf', '_split.pdf');
            downloadPDF(splitBytes, fileName);

            addToast({
                type: 'success',
                title: 'PDF split successfully!',
                message: `Created new PDF with ${pagesToSplit.length} pages`,
            });
        } catch (error) {
            console.error('Split failed:', error);
            addToast({
                type: 'error',
                title: 'Split failed',
                message: 'An error occurred while splitting the PDF.',
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
                    <p>Upload a PDF file to split it.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="tool-panel">
            <div className="tool-header">
                <h2 className="tool-title">Split PDF</h2>
                <p className="tool-description">
                    Extract specific pages from your PDF into a new file.
                </p>
            </div>

            <div className="tool-content">
                {/* Split Mode */}
                <div className="tool-section">
                    <h3 className="section-title">Split Method</h3>
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

                {/* Mode-specific UI */}
                {mode === 'select' && (
                    <div className="tool-section">
                        <div className="quick-actions">
                            <button className="btn btn-ghost btn-sm" onClick={selectAllPages}>
                                Select All
                            </button>
                            <button className="btn btn-ghost btn-sm" onClick={deselectAllPages}>
                                Deselect All
                            </button>
                            <button className="btn btn-ghost btn-sm" onClick={selectOddPages}>
                                Odd Pages
                            </button>
                            <button className="btn btn-ghost btn-sm" onClick={selectEvenPages}>
                                Even Pages
                            </button>
                        </div>

                        <div className="page-grid page-grid-compact">
                            {Array.from({ length: activeDocument.pageCount }, (_, i) => i + 1).map(pageNum => {
                                const isSelected = localSelectedPages.includes(pageNum);
                                return (
                                    <div
                                        key={pageNum}
                                        className={`page-grid-item compact selectable ${isSelected ? 'selected' : ''}`}
                                        onClick={() => togglePageSelection(pageNum)}
                                    >
                                        {isSelected && (
                                            <div className="page-grid-check">
                                                <Check size={12} />
                                            </div>
                                        )}
                                        <div className="page-grid-thumb compact">
                                            <img
                                                src={getPlaceholder(pageNum)}
                                                alt={`Page ${pageNum}`}
                                                loading="lazy"
                                            />
                                        </div>
                                        <span className="page-grid-number">Page {pageNum}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {mode === 'range' && (
                    <div className="tool-section">
                        <div className="range-inputs">
                            <div className="input-group">
                                <label>From Page</label>
                                <input
                                    type="number"
                                    min={1}
                                    max={activeDocument.pageCount}
                                    value={rangeStart}
                                    onChange={(e) => setRangeStart(Math.max(1, Math.min(parseInt(e.target.value) || 1, activeDocument.pageCount)))}
                                />
                            </div>
                            <span className="range-divider">to</span>
                            <div className="input-group">
                                <label>To Page</label>
                                <input
                                    type="number"
                                    min={1}
                                    max={activeDocument.pageCount}
                                    value={rangeEnd}
                                    onChange={(e) => setRangeEnd(Math.max(rangeStart, Math.min(parseInt(e.target.value) || 1, activeDocument.pageCount)))}
                                />
                            </div>
                        </div>
                        <p className="input-hint">
                            Will extract pages {rangeStart} to {rangeEnd} ({rangeEnd - rangeStart + 1} pages)
                        </p>
                    </div>
                )}

                {mode === 'every' && (
                    <div className="tool-section">
                        <div className="input-group">
                            <label>Extract every</label>
                            <input
                                type="number"
                                min={1}
                                max={activeDocument.pageCount}
                                value={everyN}
                                onChange={(e) => setEveryN(Math.max(1, parseInt(e.target.value) || 1))}
                            />
                            <span>page(s)</span>
                        </div>
                        <p className="input-hint">
                            Will extract pages: {getPagesToPrint().slice(0, 10).join(', ')}{getPagesToPrint().length > 10 ? '...' : ''} ({getPagesToPrint().length} pages)
                        </p>
                    </div>
                )}
            </div>

            <div className="tool-footer">
                <div className="tool-summary">
                    <span className="summary-stat">
                        <strong>{getPagesToPrint().length}</strong> of {activeDocument.pageCount} pages selected
                    </span>
                </div>

                <button
                    className="btn btn-primary"
                    onClick={handleSplit}
                    disabled={isProcessing || getPagesToPrint().length === 0}
                >
                    {isProcessing ? (
                        <>
                            <Loader2 size={18} className="animate-spin" />
                            Splitting...
                        </>
                    ) : (
                        <>
                            <Download size={18} />
                            Split & Download
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}
