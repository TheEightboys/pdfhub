/**
 * Duplicate Pages Tool - Optimized for large PDFs
 * Create copies of specific pages in a PDF
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useApp, useToast } from '../../store/appStore';
import { Copy, Check, Download, Plus, Minus, Loader2 } from 'lucide-react';
import { PDFDocument } from 'pdf-lib';
import { downloadPDF } from '../../utils/pdfHelpers';
import './Tools.css';

// Simple page number based placeholder - no image generation
const getPlaceholder = (pageNum: number) =>
    `data:image/svg+xml,${encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" width="80" height="110" viewBox="0 0 80 110">
            <rect fill="#f1f5f9" width="80" height="110" rx="4"/>
            <rect fill="#e2e8f0" x="8" y="8" width="64" height="3" rx="1"/>
            <rect fill="#e2e8f0" x="8" y="15" width="48" height="3" rx="1"/>
            <rect fill="#e2e8f0" x="8" y="22" width="56" height="3" rx="1"/>
            <text x="40" y="65" text-anchor="middle" fill="#64748b" font-size="16" font-weight="bold" font-family="Arial">${pageNum}</text>
        </svg>
    `)}`;

export function DuplicatePagesTool() {
    const { state, setLoading } = useApp();
    const { addToast } = useToast();
    const { activeDocument } = state;

    const [selectedPages, setSelectedPages] = useState<Map<number, number>>(new Map());
    const [isProcessing, setIsProcessing] = useState(false);
    const [isComplete, setIsComplete] = useState(false);
    const gridRef = useRef<HTMLDivElement>(null);

    // Reset when document changes
    useEffect(() => {
        setSelectedPages(new Map());
        setIsComplete(false);
    }, [activeDocument?.id]);

    const setCopies = useCallback((pageNum: number, copies: number) => {
        setSelectedPages(prev => {
            const newSelected = new Map(prev);
            if (copies <= 0) {
                newSelected.delete(pageNum);
            } else {
                newSelected.set(pageNum, Math.min(copies, 10));
            }
            return newSelected;
        });
    }, []);

    const getCopies = useCallback((pageNum: number) => selectedPages.get(pageNum) || 0, [selectedPages]);

    const getTotalNewPages = useCallback(() => {
        let total = 0;
        selectedPages.forEach(copies => total += copies);
        return total;
    }, [selectedPages]);

    const selectAll = useCallback(() => {
        if (!activeDocument) return;
        const newMap = new Map<number, number>();
        for (let i = 1; i <= activeDocument.pageCount; i++) {
            newMap.set(i, 1);
        }
        setSelectedPages(newMap);
    }, [activeDocument]);

    const clearAll = useCallback(() => {
        setSelectedPages(new Map());
    }, []);

    const handleDuplicate = async () => {
        if (!activeDocument || selectedPages.size === 0) return;

        setIsProcessing(true);
        setLoading(true, 'Duplicating pages...');

        try {
            const pdfDoc = await PDFDocument.load(activeDocument.arrayBuffer.slice(0));
            const newPdf = await PDFDocument.create();

            // Copy all pages, duplicating selected ones
            for (let i = 0; i < activeDocument.pageCount; i++) {
                const [copiedPage] = await newPdf.copyPages(pdfDoc, [i]);
                newPdf.addPage(copiedPage);

                // Add duplicates
                const copies = selectedPages.get(i + 1) || 0;
                for (let j = 0; j < copies; j++) {
                    const [dupPage] = await newPdf.copyPages(pdfDoc, [i]);
                    newPdf.addPage(dupPage);
                }
            }

            const pdfBytes = await newPdf.save();
            const fileName = activeDocument.name.replace('.pdf', '_duplicated.pdf');
            downloadPDF(pdfBytes, fileName);

            setIsComplete(true);
            addToast({
                type: 'success',
                title: 'Pages duplicated!',
                message: `Created ${getTotalNewPages()} copies. Total pages: ${activeDocument.pageCount + getTotalNewPages()}`,
            });
        } catch (error) {
            console.error('Error duplicating pages:', error);
            addToast({
                type: 'error',
                title: 'Duplication failed',
                message: 'An error occurred while duplicating pages.',
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
                    <div className="tool-empty-icon">
                        <Copy size={36} />
                    </div>
                    <h3>No PDF Loaded</h3>
                    <p>Open a PDF file to duplicate pages</p>
                </div>
            </div>
        );
    }

    if (isComplete) {
        return (
            <div className="tool-panel">
                <div className="tool-header">
                    <h2 className="tool-title">Duplicate Pages</h2>
                    <p className="tool-description">Pages duplicated successfully</p>
                </div>
                <div className="tool-content">
                    <div className="success-result">
                        <div className="success-icon">
                            <Check size={48} />
                        </div>
                        <h3>Duplication Complete!</h3>
                        <p>{getTotalNewPages()} new pages have been added and downloaded.</p>
                        <div className="success-details">
                            <div className="detail-item">
                                <span className="detail-label">Original Pages</span>
                                <span className="detail-value">{activeDocument.pageCount}</span>
                            </div>
                            <div className="detail-item">
                                <span className="detail-label">New Total</span>
                                <span className="detail-value">{activeDocument.pageCount + getTotalNewPages()}</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="tool-footer">
                    <button
                        className="btn btn-secondary"
                        onClick={() => {
                            setIsComplete(false);
                            setSelectedPages(new Map());
                        }}
                    >
                        Duplicate More
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="tool-panel">
            <div className="tool-header">
                <h2 className="tool-title">Duplicate Pages</h2>
                <p className="tool-description">
                    Select pages and specify how many copies to create
                </p>
            </div>

            <div className="tool-content">
                {/* Quick Actions */}
                <div className="tool-section">
                    <div className="quick-actions">
                        <button className="btn btn-ghost btn-sm" onClick={selectAll}>
                            Select All (×1)
                        </button>
                        <button className="btn btn-ghost btn-sm" onClick={clearAll}>
                            Clear All
                        </button>
                    </div>
                </div>

                <div className="tool-section">
                    <h3 className="section-title">Select Pages to Duplicate</h3>

                    <div className="page-grid page-grid-compact" ref={gridRef}>
                        {Array.from({ length: activeDocument.pageCount }, (_, index) => {
                            const pageNum = index + 1;
                            const copies = getCopies(pageNum);
                            const isSelected = copies > 0;

                            return (
                                <div
                                    key={pageNum}
                                    className={`page-grid-item compact ${isSelected ? 'selected' : ''}`}
                                >
                                    {isSelected && (
                                        <div className="page-grid-check">
                                            <span style={{ fontSize: '11px', fontWeight: 700 }}>×{copies}</span>
                                        </div>
                                    )}
                                    <div className="page-grid-thumb compact">
                                        <img
                                            src={getPlaceholder(pageNum)}
                                            alt={`Page ${pageNum}`}
                                            loading="lazy"
                                        />
                                    </div>
                                    <div className="duplicate-controls compact">
                                        <button
                                            className="dup-btn"
                                            onClick={() => setCopies(pageNum, copies - 1)}
                                            disabled={copies === 0}
                                        >
                                            <Minus size={12} />
                                        </button>
                                        <span className="dup-count">{copies}</span>
                                        <button
                                            className="dup-btn"
                                            onClick={() => setCopies(pageNum, copies + 1)}
                                        >
                                            <Plus size={12} />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            <div className="tool-footer">
                <div className="tool-summary">
                    <span className="summary-stat">
                        <strong>{getTotalNewPages()}</strong> copies to create
                    </span>
                    <span className="summary-divider">•</span>
                    <span className="summary-stat">
                        New total: <strong>{activeDocument.pageCount + getTotalNewPages()}</strong> pages
                    </span>
                </div>
                <button
                    className="btn btn-primary"
                    onClick={handleDuplicate}
                    disabled={isProcessing || selectedPages.size === 0}
                >
                    {isProcessing ? (
                        <>
                            <Loader2 size={18} className="animate-spin" />
                            <span>Processing...</span>
                        </>
                    ) : (
                        <>
                            <Copy size={18} />
                            <span>Duplicate Pages</span>
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}
