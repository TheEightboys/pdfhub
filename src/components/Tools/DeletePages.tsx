/**
 * Delete Pages Tool - Optimized for large PDFs
 * Remove unwanted pages from a PDF
 */

import { useState, useEffect, useCallback } from 'react';
import { useApp, useToast } from '../../store/appStore';
import { deletePages, downloadPDF, loadPDF } from '../../utils/pdfHelpers';
import {
    Trash2,
    AlertTriangle,
    Loader2,
    Download,
    RefreshCw,
    FileText,
    Check,
    Eye,
} from 'lucide-react';
import './Tools.css';

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

export function DeletePagesTool() {
    const { state, setLoading, loadDocument } = useApp();
    const { addToast } = useToast();
    const { activeDocument } = state;

    const [isProcessing, setIsProcessing] = useState(false);
    const [pagesToDelete, setPagesToDelete] = useState<number[]>([]);

    // Result state - PREVIEW_READY
    const [resultData, setResultData] = useState<Uint8Array | null>(null);
    const [resultFileName, setResultFileName] = useState('');
    const [deletedCount, setDeletedCount] = useState(0);
    const [remainingCount, setRemainingCount] = useState(0);
    const [isPreviewReady, setIsPreviewReady] = useState(false);

    // Reset when document changes
    useEffect(() => {
        if (!isPreviewReady) {
            setPagesToDelete([]);
        }
    }, [activeDocument?.id, isPreviewReady]);

    const togglePageForDeletion = useCallback((pageNum: number) => {
        setPagesToDelete(prev =>
            prev.includes(pageNum)
                ? prev.filter(p => p !== pageNum)
                : [...prev, pageNum].sort((a, b) => a - b)
        );
    }, []);

    const selectAll = useCallback(() => {
        if (activeDocument && activeDocument.pageCount > 1) {
            setPagesToDelete(Array.from({ length: activeDocument.pageCount - 1 }, (_, i) => i + 2));
        }
    }, [activeDocument]);

    const deselectAll = useCallback(() => {
        setPagesToDelete([]);
    }, []);

    const handleDelete = async () => {
        if (!activeDocument || pagesToDelete.length === 0) return;

        if (pagesToDelete.length >= activeDocument.pageCount) {
            addToast({
                type: 'error',
                title: 'Cannot delete all pages',
                message: 'The PDF must have at least one page.',
            });
            return;
        }

        setIsProcessing(true);
        setLoading(true, 'Deleting pages...');

        try {
            const result = await deletePages(activeDocument.arrayBuffer.slice(0), pagesToDelete);
            const fileName = activeDocument.name.replace('.pdf', '_modified.pdf');

            setResultData(result);
            setResultFileName(fileName);
            setDeletedCount(pagesToDelete.length);
            setRemainingCount(activeDocument.pageCount - pagesToDelete.length);

            // Load modified PDF into viewer for preview
            const blob = new Blob([new Uint8Array(result).buffer], { type: 'application/pdf' });
            const modifiedFile = new File([blob], fileName, { type: 'application/pdf' });
            const doc = await loadPDF(modifiedFile);
            loadDocument(doc);

            setIsPreviewReady(true);

            addToast({
                type: 'success',
                title: 'Deletion complete!',
                message: 'Preview is now showing in the viewer.',
            });
        } catch (error) {
            console.error('Delete failed:', error);
            addToast({
                type: 'error',
                title: 'Delete failed',
                message: 'An error occurred while deleting pages.',
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
        setPagesToDelete([]);
        setDeletedCount(0);
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
                    <Trash2 size={48} />
                    <h3>Open a PDF first</h3>
                    <p>Upload a PDF file to delete pages.</p>
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
                    <span>Preview: Modified PDF</span>
                </div>

                <div className="tool-header">
                    <h2 className="tool-title">Deletion Complete</h2>
                    <p className="tool-description">
                        Review the modified PDF in the viewer, then download when ready.
                    </p>
                </div>

                <div className="tool-content">
                    <div className="preview-info">
                        <div className="preview-info-icon">
                            <Check size={32} strokeWidth={2.5} />
                        </div>
                        <div className="preview-info-text">
                            <h3>Ready for Download</h3>
                            <p>The modified PDF is now showing in the viewer.</p>
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
                            <span className="stat-value">{deletedCount}</span>
                            <span className="stat-label">Deleted</span>
                        </div>
                        <div className="preview-stat">
                            <span className="stat-value">{remainingCount}</span>
                            <span className="stat-label">Remaining</span>
                        </div>
                    </div>
                </div>

                <div className="tool-footer">
                    <button className="btn btn-secondary" onClick={handleReset}>
                        <RefreshCw size={16} />
                        Delete More
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
    const pagesRemaining = activeDocument.pageCount - pagesToDelete.length;

    return (
        <div className="tool-panel">
            <div className="tool-header">
                <h2 className="tool-title">Delete Pages</h2>
                <p className="tool-description">
                    Select pages to remove from your PDF.
                </p>
            </div>

            <div className="tool-content">
                {pagesToDelete.length > 0 && (
                    <div className="tool-section">
                        <div className="warning-box">
                            <AlertTriangle size={18} />
                            <span>
                                {pagesToDelete.length} page{pagesToDelete.length > 1 ? 's' : ''} selected for deletion.
                                {pagesRemaining} page{pagesRemaining !== 1 ? 's' : ''} will remain.
                            </span>
                        </div>
                    </div>
                )}

                <div className="tool-section">
                    <div className="quick-actions">
                        <button className="btn btn-ghost btn-sm" onClick={selectAll}>
                            Select All (except first)
                        </button>
                        <button className="btn btn-ghost btn-sm" onClick={deselectAll}>
                            Deselect All
                        </button>
                    </div>
                </div>

                <div className="tool-section">
                    <h3 className="section-title">Click pages to select for deletion</h3>

                    <div className="page-grid page-grid-compact">
                        {Array.from({ length: activeDocument.pageCount }, (_, i) => {
                            const pageNum = i + 1;
                            const isMarkedForDeletion = pagesToDelete.includes(pageNum);

                            return (
                                <div
                                    key={pageNum}
                                    className={`page-grid-item compact selectable ${isMarkedForDeletion ? 'selected delete-marked' : ''}`}
                                    onClick={() => togglePageForDeletion(pageNum)}
                                >
                                    {isMarkedForDeletion && (
                                        <div className="page-grid-check delete">
                                            <Trash2 size={12} />
                                        </div>
                                    )}
                                    <div className={`page-grid-thumb compact ${isMarkedForDeletion ? 'faded' : ''}`}>
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
                        <strong>{pagesToDelete.length}</strong> to delete
                    </span>
                    <span className="summary-divider">•</span>
                    <span className="summary-stat">
                        <strong>{pagesRemaining}</strong> will remain
                    </span>
                </div>

                <button
                    className="btn btn-primary btn-danger"
                    onClick={handleDelete}
                    disabled={isProcessing || pagesToDelete.length === 0 || pagesRemaining < 1}
                >
                    {isProcessing ? (
                        <>
                            <Loader2 size={18} className="animate-spin" />
                            Deleting...
                        </>
                    ) : (
                        <>
                            <Trash2 size={18} />
                            Delete Pages
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}
