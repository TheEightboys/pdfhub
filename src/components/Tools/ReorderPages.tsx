/**
 * Reorder Pages Tool - Optimized for large PDFs
 * Drag and drop to reorder pages in a PDF
 */

import { useState, useEffect, useCallback } from 'react';
import { useApp, useToast } from '../../store/appStore';
import { ArrowRightLeft, Check, Download, ArrowUp, ArrowDown, Loader2, RotateCcw } from 'lucide-react';
import { PDFDocument } from 'pdf-lib';
import { downloadPDF } from '../../utils/pdfHelpers';
import './Tools.css';

// Lightweight placeholder - no PDF rendering
const getPlaceholder = (pageNum: number) =>
    `data:image/svg+xml,${encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" width="60" height="85" viewBox="0 0 60 85">
            <rect fill="#f1f5f9" width="60" height="85" rx="3"/>
            <rect fill="#e2e8f0" x="6" y="6" width="48" height="2" rx="1"/>
            <rect fill="#e2e8f0" x="6" y="11" width="36" height="2" rx="1"/>
            <rect fill="#e2e8f0" x="6" y="16" width="42" height="2" rx="1"/>
            <text x="30" y="52" text-anchor="middle" fill="#64748b" font-size="14" font-weight="bold" font-family="Arial">${pageNum}</text>
        </svg>
    `)}`;

export function ReorderPagesTool() {
    const { state, setLoading } = useApp();
    const { addToast } = useToast();
    const { activeDocument } = state;

    const [pageOrder, setPageOrder] = useState<number[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isComplete, setIsComplete] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);

    // Initialize page order when document changes
    useEffect(() => {
        if (activeDocument) {
            const initialOrder = Array.from({ length: activeDocument.pageCount }, (_, i) => i + 1);
            setPageOrder(initialOrder);
            setHasChanges(false);
            setIsComplete(false);
        }
    }, [activeDocument?.id]);

    const movePage = useCallback((index: number, direction: 'up' | 'down') => {
        const newOrder = [...pageOrder];
        const newIndex = direction === 'up' ? index - 1 : index + 1;

        if (newIndex < 0 || newIndex >= pageOrder.length) return;

        [newOrder[index], newOrder[newIndex]] = [newOrder[newIndex], newOrder[index]];
        setPageOrder(newOrder);
        setHasChanges(true);
    }, [pageOrder]);

    const moveToPosition = useCallback((fromIndex: number, toIndex: number) => {
        if (fromIndex === toIndex) return;

        const newOrder = [...pageOrder];
        const [moved] = newOrder.splice(fromIndex, 1);
        newOrder.splice(toIndex, 0, moved);
        setPageOrder(newOrder);
        setHasChanges(true);
    }, [pageOrder]);

    const resetOrder = useCallback(() => {
        if (!activeDocument) return;
        const initialOrder = Array.from({ length: activeDocument.pageCount }, (_, i) => i + 1);
        setPageOrder(initialOrder);
        setHasChanges(false);
    }, [activeDocument]);

    const reverseOrder = useCallback(() => {
        setPageOrder(prev => [...prev].reverse());
        setHasChanges(true);
    }, []);

    const handleReorder = async () => {
        if (!activeDocument || !hasChanges) return;

        setIsProcessing(true);
        setLoading(true, 'Reordering pages...');

        try {
            const pdfDoc = await PDFDocument.load(activeDocument.arrayBuffer.slice(0));
            const newPdf = await PDFDocument.create();

            // Copy pages in new order
            for (const pageNum of pageOrder) {
                const [copiedPage] = await newPdf.copyPages(pdfDoc, [pageNum - 1]);
                newPdf.addPage(copiedPage);
            }

            const pdfBytes = await newPdf.save();
            const fileName = activeDocument.name.replace('.pdf', '_reordered.pdf');
            downloadPDF(pdfBytes, fileName);

            setIsComplete(true);
            addToast({
                type: 'success',
                title: 'Pages reordered!',
                message: `Saved as ${fileName}`,
            });
        } catch (error) {
            console.error('Reorder failed:', error);
            addToast({
                type: 'error',
                title: 'Reorder failed',
                message: 'An error occurred while reordering pages.',
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
                        <ArrowRightLeft size={36} />
                    </div>
                    <h3>No PDF Loaded</h3>
                    <p>Open a PDF file to reorder pages</p>
                </div>
            </div>
        );
    }

    if (isComplete) {
        return (
            <div className="tool-panel">
                <div className="tool-header">
                    <h2 className="tool-title">Reorder Pages</h2>
                    <p className="tool-description">Pages reordered successfully</p>
                </div>
                <div className="tool-content">
                    <div className="success-result">
                        <div className="success-icon">
                            <Check size={48} />
                        </div>
                        <h3>Reorder Complete!</h3>
                        <p>Your PDF has been saved with the new page order.</p>
                    </div>
                </div>
                <div className="tool-footer">
                    <button
                        className="btn btn-secondary"
                        onClick={() => {
                            setIsComplete(false);
                            setHasChanges(false);
                        }}
                    >
                        Reorder Again
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="tool-panel">
            <div className="tool-header">
                <h2 className="tool-title">Reorder Pages</h2>
                <p className="tool-description">
                    Use arrows to move pages up or down
                </p>
            </div>

            <div className="tool-content">
                {/* Quick Actions */}
                <div className="tool-section">
                    <div className="quick-actions">
                        <button className="btn btn-ghost btn-sm" onClick={reverseOrder}>
                            <RotateCcw size={14} />
                            Reverse Order
                        </button>
                        <button className="btn btn-ghost btn-sm" onClick={resetOrder} disabled={!hasChanges}>
                            Reset
                        </button>
                    </div>
                </div>

                <div className="tool-section">
                    <h3 className="section-title">Page Order</h3>

                    <div className="reorder-list">
                        {pageOrder.map((originalPageNum, index) => (
                            <div key={`${originalPageNum}-${index}`} className="reorder-item">
                                <span className="reorder-position">{index + 1}</span>
                                <div className="reorder-thumb">
                                    <img
                                        src={getPlaceholder(originalPageNum)}
                                        alt={`Page ${originalPageNum}`}
                                        loading="lazy"
                                    />
                                </div>
                                <div className="reorder-info">
                                    <span className="reorder-page">Page {originalPageNum}</span>
                                    {originalPageNum !== index + 1 && (
                                        <span className="reorder-moved">
                                            (was {originalPageNum})
                                        </span>
                                    )}
                                </div>
                                <div className="reorder-actions">
                                    <button
                                        className="btn btn-ghost btn-sm btn-icon"
                                        onClick={() => movePage(index, 'up')}
                                        disabled={index === 0}
                                    >
                                        <ArrowUp size={16} />
                                    </button>
                                    <button
                                        className="btn btn-ghost btn-sm btn-icon"
                                        onClick={() => movePage(index, 'down')}
                                        disabled={index === pageOrder.length - 1}
                                    >
                                        <ArrowDown size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="tool-footer">
                <div className="tool-summary">
                    <span className="summary-stat">
                        <strong>{activeDocument.pageCount}</strong> pages
                    </span>
                    {hasChanges && (
                        <>
                            <span className="summary-divider">•</span>
                            <span className="summary-stat changed">
                                Order changed
                            </span>
                        </>
                    )}
                </div>
                <button
                    className="btn btn-primary"
                    onClick={handleReorder}
                    disabled={isProcessing || !hasChanges}
                >
                    {isProcessing ? (
                        <>
                            <Loader2 size={18} className="animate-spin" />
                            <span>Saving...</span>
                        </>
                    ) : (
                        <>
                            <Download size={18} />
                            <span>Save Reordered PDF</span>
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}
