/**
 * Extract Pages Tool - Optimized for large PDFs
 * Extract specific pages from a PDF
 */

import { useState, useEffect, useCallback } from 'react';
import { useApp, useToast } from '../../store/appStore';
import { FileOutput, Check, Loader2, Download, RefreshCw, FileText, Eye } from 'lucide-react';
import { PDFDocument } from 'pdf-lib';
import { downloadPDF, loadPDF } from '../../utils/pdfHelpers';
import './Tools.css';

// Lightweight placeholder - no PDF rendering
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

export function ExtractPagesTool() {
    const { state, setLoading, loadDocument } = useApp();
    const { addToast } = useToast();
    const { activeDocument } = state;

    const [selectedPages, setSelectedPages] = useState<number[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);

    // Result state - PREVIEW_READY
    const [resultData, setResultData] = useState<Uint8Array | null>(null);
    const [resultFileName, setResultFileName] = useState('');
    const [extractedPageCount, setExtractedPageCount] = useState(0);
    const [originalPageCount, setOriginalPageCount] = useState(0);
    const [isPreviewReady, setIsPreviewReady] = useState(false);

    // Reset when document changes
    useEffect(() => {
        if (!isPreviewReady) {
            setSelectedPages([]);
        }
    }, [activeDocument?.id, isPreviewReady]);

    const togglePage = useCallback((pageNum: number) => {
        setSelectedPages(prev =>
            prev.includes(pageNum)
                ? prev.filter(p => p !== pageNum)
                : [...prev, pageNum].sort((a, b) => a - b)
        );
    }, []);

    const selectAll = useCallback(() => {
        if (!activeDocument) return;
        setSelectedPages(Array.from({ length: activeDocument.pageCount }, (_, i) => i + 1));
    }, [activeDocument]);

    const deselectAll = useCallback(() => {
        setSelectedPages([]);
    }, []);

    const selectRange = useCallback((start: number, end: number) => {
        const pages = Array.from({ length: end - start + 1 }, (_, i) => start + i);
        setSelectedPages(prev => [...new Set([...prev, ...pages])].sort((a, b) => a - b));
    }, []);

    const handleExtract = async () => {
        if (!activeDocument || selectedPages.length === 0) return;

        setIsProcessing(true);
        setLoading(true, 'Extracting pages...');

        try {
            const pdfDoc = await PDFDocument.load(activeDocument.arrayBuffer.slice(0));
            const newPdf = await PDFDocument.create();

            for (const pageNum of selectedPages) {
                const [copiedPage] = await newPdf.copyPages(pdfDoc, [pageNum - 1]);
                newPdf.addPage(copiedPage);
            }

            const pdfBytes = await newPdf.save();
            const fileName = activeDocument.name.replace('.pdf', '_extracted.pdf');

            setResultData(pdfBytes);
            setResultFileName(fileName);
            setExtractedPageCount(selectedPages.length);
            setOriginalPageCount(activeDocument.pageCount);

            // Load extracted PDF into viewer for preview
            const blob = new Blob([new Uint8Array(pdfBytes).buffer], { type: 'application/pdf' });
            const extractedFile = new File([blob], fileName, { type: 'application/pdf' });
            const doc = await loadPDF(extractedFile);
            loadDocument(doc);

            setIsPreviewReady(true);

            addToast({
                type: 'success',
                title: 'Extraction complete!',
                message: 'Preview is now showing in the viewer.',
            });
        } catch (error) {
            console.error('Extraction failed:', error);
            addToast({
                type: 'error',
                title: 'Extraction failed',
                message: 'An error occurred while extracting pages.',
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
        setSelectedPages([]);
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
                        <FileOutput size={36} />
                    </div>
                    <h3>No PDF Loaded</h3>
                    <p>Open a PDF file to extract pages</p>
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
                    <span>Preview: Extracted Pages</span>
                </div>

                <div className="tool-header">
                    <h2 className="tool-title">Extraction Complete</h2>
                    <p className="tool-description">
                        Review the extracted pages in the viewer, then download when ready.
                    </p>
                </div>

                <div className="tool-content">
                    <div className="preview-info">
                        <div className="preview-info-icon">
                            <Check size={32} strokeWidth={2.5} />
                        </div>
                        <div className="preview-info-text">
                            <h3>Ready for Download</h3>
                            <p>The extracted PDF is now showing in the viewer.</p>
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
                            <span className="stat-value">{extractedPageCount}</span>
                            <span className="stat-label">Pages Extracted</span>
                        </div>
                        <div className="preview-stat">
                            <span className="stat-value">{originalPageCount}</span>
                            <span className="stat-label">Original Pages</span>
                        </div>
                    </div>
                </div>

                <div className="tool-footer">
                    <button className="btn btn-secondary" onClick={handleReset}>
                        <RefreshCw size={16} />
                        Extract More
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
                <h2 className="tool-title">Extract Pages</h2>
                <p className="tool-description">
                    Select pages to save as a new PDF file
                </p>
            </div>

            <div className="tool-content">
                <div className="tool-section">
                    <div className="quick-actions">
                        <button className="btn btn-ghost btn-sm" onClick={selectAll}>
                            Select All
                        </button>
                        <button className="btn btn-ghost btn-sm" onClick={deselectAll}>
                            Deselect All
                        </button>
                        <button className="btn btn-ghost btn-sm" onClick={() => selectRange(1, 5)}>
                            First 5
                        </button>
                        <button className="btn btn-ghost btn-sm" onClick={() => selectRange(activeDocument.pageCount - 4, activeDocument.pageCount)}>
                            Last 5
                        </button>
                    </div>
                </div>

                <div className="tool-section">
                    <h3 className="section-title">
                        Select Pages ({selectedPages.length} selected)
                    </h3>

                    <div className="page-grid page-grid-compact">
                        {Array.from({ length: activeDocument.pageCount }, (_, index) => {
                            const pageNum = index + 1;
                            const isSelected = selectedPages.includes(pageNum);

                            return (
                                <div
                                    key={pageNum}
                                    className={`page-grid-item compact selectable ${isSelected ? 'selected' : ''}`}
                                    onClick={() => togglePage(pageNum)}
                                >
                                    {isSelected && (
                                        <div className="page-grid-check">
                                            <Check size={14} />
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
            </div>

            <div className="tool-footer">
                <div className="tool-summary">
                    <span className="summary-stat">
                        <strong>{selectedPages.length}</strong> of {activeDocument.pageCount} pages selected
                    </span>
                </div>
                <button
                    className="btn btn-primary"
                    onClick={handleExtract}
                    disabled={isProcessing || selectedPages.length === 0}
                >
                    {isProcessing ? (
                        <>
                            <Loader2 size={18} className="animate-spin" />
                            <span>Extracting...</span>
                        </>
                    ) : (
                        <>
                            <FileOutput size={18} />
                            <span>Extract Pages</span>
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}
