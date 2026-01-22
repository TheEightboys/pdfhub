/**
 * Reorder Pages Tool - Optimized for large PDFs
 * Drag and drop to reorder pages in a PDF
 */

import { useState, useEffect, useCallback } from 'react';
import { useApp, useToast } from '../../store/appStore';
import { ArrowRightLeft, ArrowUp, ArrowDown, Loader2, RotateCcw, Download, RefreshCw, FileText, Check, Eye } from 'lucide-react';
import { PDFDocument } from 'pdf-lib';
import { downloadPDF, loadPDF } from '../../utils/pdfHelpers';
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
    const { state, setLoading, loadDocument } = useApp();
    const { addToast } = useToast();
    const { activeDocument } = state;

    const [pageOrder, setPageOrder] = useState<number[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);

    // Result state - PREVIEW_READY
    const [resultData, setResultData] = useState<Uint8Array | null>(null);
    const [resultFileName, setResultFileName] = useState('');
    const [isPreviewReady, setIsPreviewReady] = useState(false);

    // Initialize page order when document changes
    useEffect(() => {
        if (activeDocument && !isPreviewReady) {
            const initialOrder = Array.from({ length: activeDocument.pageCount }, (_, i) => i + 1);
            setPageOrder(initialOrder);
            setHasChanges(false);
        }
    }, [activeDocument?.id, isPreviewReady]);

    const movePage = useCallback((index: number, direction: 'up' | 'down') => {
        const newOrder = [...pageOrder];
        const newIndex = direction === 'up' ? index - 1 : index + 1;

        if (newIndex < 0 || newIndex >= pageOrder.length) return;

        [newOrder[index], newOrder[newIndex]] = [newOrder[newIndex], newOrder[index]];
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

            for (const pageNum of pageOrder) {
                const [copiedPage] = await newPdf.copyPages(pdfDoc, [pageNum - 1]);
                newPdf.addPage(copiedPage);
            }

            const pdfBytes = await newPdf.save();
            const fileName = activeDocument.name.replace('.pdf', '_reordered.pdf');

            setResultData(pdfBytes);
            setResultFileName(fileName);

            // Load reordered PDF into viewer for preview
            const blob = new Blob([new Uint8Array(pdfBytes).buffer], { type: 'application/pdf' });
            const reorderedFile = new File([blob], fileName, { type: 'application/pdf' });
            const doc = await loadPDF(reorderedFile);
            loadDocument(doc);

            setIsPreviewReady(true);

            addToast({
                type: 'success',
                title: 'Reorder complete!',
                message: 'Preview is now showing in the viewer.',
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

    const handleDownload = () => {
        if (resultData && resultFileName) {
            downloadPDF(resultData, resultFileName);
            addToast({
                type: 'success',
                title: 'Downloaded!',
                message: `Saved as ${resultFileName}`,
            });
        }
    };

    const handleReset = () => {
        setResultData(null);
        setResultFileName('');
        setIsPreviewReady(false);
        if (activeDocument) {
            const initialOrder = Array.from({ length: activeDocument.pageCount }, (_, i) => i + 1);
            setPageOrder(initialOrder);
        }
        setHasChanges(false);
    };

    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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

    // ========== PREVIEW_READY STATE ==========
    if (isPreviewReady && resultData) {
        return (
            <div className="tool-panel">
                <div className="preview-banner">
                    <Eye size={18} />
                    <span>Preview: Reordered PDF</span>
                </div>

                <div className="tool-header">
                    <h2 className="tool-title">Reorder Complete</h2>
                    <p className="tool-description">
                        Review the new page order in the viewer, then download when ready.
                    </p>
                </div>

                <div className="tool-content">
                    <div className="preview-info">
                        <div className="preview-info-icon">
                            <Check size={32} strokeWidth={2.5} />
                        </div>
                        <div className="preview-info-text">
                            <h3>Ready for Download</h3>
                            <p>The reordered PDF is now showing in the viewer.</p>
                        </div>
                    </div>

                    <div className="download-result-file">
                        <FileText size={24} />
                        <div className="download-result-file-info">
                            <span className="download-result-filename">{resultFileName}</span>
                            <span className="download-result-filesize">{formatFileSize(resultData.length)}</span>
                        </div>
                    </div>

                    <div className="preview-stats">
                        <div className="preview-stat">
                            <span className="stat-value">{activeDocument.pageCount}</span>
                            <span className="stat-label">Total Pages</span>
                        </div>
                    </div>
                </div>

                <div className="tool-footer">
                    <button className="btn btn-secondary" onClick={handleReset}>
                        <RefreshCw size={16} />
                        Reorder Again
                    </button>
                    <button className="btn btn-primary btn-lg" onClick={handleDownload}>
                        <Download size={18} />
                        Download PDF
                    </button>
                </div>
            </div>
        );
    }

    // ========== NORMAL STATE ==========
    return (
        <div className="tool-panel">
            <div className="tool-header">
                <h2 className="tool-title">Reorder Pages</h2>
                <p className="tool-description">
                    Use arrows to move pages up or down
                </p>
            </div>

            <div className="tool-content">
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
                            <ArrowRightLeft size={18} />
                            <span>Save Reordered PDF</span>
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}
