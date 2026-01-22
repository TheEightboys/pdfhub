/**
 * Duplicate Pages Tool - Optimized for large PDFs
 * Create copies of specific pages in a PDF
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useApp, useToast } from '../../store/appStore';
import { Copy, Plus, Minus, Loader2, Download, RefreshCw, FileText, Check, Eye } from 'lucide-react';
import { PDFDocument } from 'pdf-lib';
import { downloadPDF, loadPDF } from '../../utils/pdfHelpers';
import './Tools.css';

// Simple page number based placeholder
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
    const { state, setLoading, loadDocument } = useApp();
    const { addToast } = useToast();
    const { activeDocument } = state;

    const [selectedPages, setSelectedPages] = useState<Map<number, number>>(new Map());
    const [isProcessing, setIsProcessing] = useState(false);
    const gridRef = useRef<HTMLDivElement>(null);

    // Result state - PREVIEW_READY
    const [resultData, setResultData] = useState<Uint8Array | null>(null);
    const [resultFileName, setResultFileName] = useState('');
    const [resultTotalPages, setResultTotalPages] = useState(0);
    const [resultNewPages, setResultNewPages] = useState(0);
    const [isPreviewReady, setIsPreviewReady] = useState(false);

    // Reset when document changes
    useEffect(() => {
        if (!isPreviewReady) {
            setSelectedPages(new Map());
        }
    }, [activeDocument?.id, isPreviewReady]);

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

            for (let i = 0; i < activeDocument.pageCount; i++) {
                const [copiedPage] = await newPdf.copyPages(pdfDoc, [i]);
                newPdf.addPage(copiedPage);

                const copies = selectedPages.get(i + 1) || 0;
                for (let j = 0; j < copies; j++) {
                    const [dupPage] = await newPdf.copyPages(pdfDoc, [i]);
                    newPdf.addPage(dupPage);
                }
            }

            const pdfBytes = await newPdf.save();
            const fileName = activeDocument.name.replace('.pdf', '_duplicated.pdf');
            const newPagesCount = getTotalNewPages();

            setResultData(pdfBytes);
            setResultFileName(fileName);
            setResultTotalPages(activeDocument.pageCount + newPagesCount);
            setResultNewPages(newPagesCount);

            // Load duplicated PDF into viewer for preview
            const blob = new Blob([new Uint8Array(pdfBytes).buffer], { type: 'application/pdf' });
            const duplicatedFile = new File([blob], fileName, { type: 'application/pdf' });
            const doc = await loadPDF(duplicatedFile);
            loadDocument(doc);

            setIsPreviewReady(true);

            addToast({
                type: 'success',
                title: 'Duplication complete!',
                message: 'Preview is now showing in the viewer.',
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
        setSelectedPages(new Map());
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
                        <Copy size={36} />
                    </div>
                    <h3>No PDF Loaded</h3>
                    <p>Open a PDF file to duplicate pages</p>
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
                    <span>Preview: Duplicated PDF</span>
                </div>

                <div className="tool-header">
                    <h2 className="tool-title">Duplication Complete</h2>
                    <p className="tool-description">
                        Review the duplicated pages in the viewer, then download when ready.
                    </p>
                </div>

                <div className="tool-content">
                    <div className="preview-info">
                        <div className="preview-info-icon">
                            <Check size={32} strokeWidth={2.5} />
                        </div>
                        <div className="preview-info-text">
                            <h3>Ready for Download</h3>
                            <p>The duplicated PDF is now showing in the viewer.</p>
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
                            <span className="stat-value">{resultNewPages}</span>
                            <span className="stat-label">Copies Added</span>
                        </div>
                        <div className="preview-stat">
                            <span className="stat-value">{resultTotalPages}</span>
                            <span className="stat-label">Total Pages</span>
                        </div>
                    </div>
                </div>

                <div className="tool-footer">
                    <button className="btn btn-secondary" onClick={handleReset}>
                        <RefreshCw size={16} />
                        Duplicate More
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
                <h2 className="tool-title">Duplicate Pages</h2>
                <p className="tool-description">
                    Select pages and specify how many copies to create
                </p>
            </div>

            <div className="tool-content">
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
