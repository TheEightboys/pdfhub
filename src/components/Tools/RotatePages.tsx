/**
 * Rotate Pages Tool - Optimized for large PDFs
 * Rotate PDF pages individually or all at once
 */

import { useState, useCallback, useEffect } from 'react';
import { useApp, useToast } from '../../store/appStore';
import { rotatePages, downloadPDF, loadPDF } from '../../utils/pdfHelpers';
import {
    Loader2,
    RotateCcw,
    RotateCw,
    Check,
    Download,
    RefreshCw,
    FileText,
    Eye,
} from 'lucide-react';
import './Tools.css';

// Lightweight placeholder with rotation indicator
const getPlaceholder = (pageNum: number, rotation: number = 0) =>
    `data:image/svg+xml,${encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" width="70" height="100" viewBox="0 0 70 100">
            <rect fill="#f1f5f9" width="70" height="100" rx="4"/>
            <rect fill="#e2e8f0" x="8" y="8" width="54" height="3" rx="1"/>
            <rect fill="#e2e8f0" x="8" y="14" width="40" height="3" rx="1"/>
            <rect fill="#e2e8f0" x="8" y="20" width="48" height="3" rx="1"/>
            <text x="35" y="55" text-anchor="middle" fill="#64748b" font-size="16" font-weight="bold" font-family="Arial">${pageNum}</text>
            ${rotation !== 0 ? `<text x="35" y="75" text-anchor="middle" fill="#dc2626" font-size="10" font-family="Arial">${rotation}°</text>` : ''}
        </svg>
    `)}`;

export function RotatePagesTool() {
    const { state, setLoading, loadDocument } = useApp();
    const { addToast } = useToast();
    const { activeDocument } = state;

    const [isProcessing, setIsProcessing] = useState(false);
    const [localRotations, setLocalRotations] = useState<Record<number, number>>({});
    const [selectedPages, setSelectedPages] = useState<number[]>([]);

    // Result state - PREVIEW_READY
    const [resultData, setResultData] = useState<Uint8Array | null>(null);
    const [resultFileName, setResultFileName] = useState('');
    const [isPreviewReady, setIsPreviewReady] = useState(false);

    // Initialize rotations from document
    useEffect(() => {
        if (activeDocument && !isPreviewReady) {
            const rotations: Record<number, number> = {};
            activeDocument.pages.forEach(page => {
                rotations[page.pageNumber] = page.rotation;
            });
            setLocalRotations(rotations);
            setSelectedPages([]);
        }
    }, [activeDocument?.id, isPreviewReady]);

    const togglePageSelection = useCallback((pageNumber: number) => {
        setSelectedPages(prev =>
            prev.includes(pageNumber)
                ? prev.filter(p => p !== pageNumber)
                : [...prev, pageNumber].sort((a, b) => a - b)
        );
    }, []);

    const selectAll = useCallback(() => {
        if (activeDocument) {
            setSelectedPages(Array.from({ length: activeDocument.pageCount }, (_, i) => i + 1));
        }
    }, [activeDocument]);

    const deselectAll = useCallback(() => {
        setSelectedPages([]);
    }, []);

    const rotateSelected = useCallback((direction: 'cw' | 'ccw') => {
        const pagesToRotate = selectedPages.length > 0 ? selectedPages :
            Array.from({ length: activeDocument?.pageCount || 0 }, (_, i) => i + 1);

        setLocalRotations(prev => {
            const newRotations = { ...prev };
            pagesToRotate.forEach(pageNum => {
                const current = newRotations[pageNum] || 0;
                const delta = direction === 'cw' ? 90 : -90;
                newRotations[pageNum] = ((current + delta) % 360 + 360) % 360;
            });
            return newRotations;
        });
    }, [selectedPages, activeDocument]);

    const rotatePage = useCallback((pageNumber: number, direction: 'cw' | 'ccw') => {
        setLocalRotations(prev => {
            const current = prev[pageNumber] || 0;
            const delta = direction === 'cw' ? 90 : -90;
            return {
                ...prev,
                [pageNumber]: ((current + delta) % 360 + 360) % 360,
            };
        });
    }, []);

    const hasChanges = useCallback(() => {
        if (!activeDocument) return false;
        return activeDocument.pages.some(
            page => (localRotations[page.pageNumber] || 0) !== page.rotation
        );
    }, [activeDocument, localRotations]);

    const handleApply = async () => {
        if (!activeDocument || !hasChanges()) return;

        setIsProcessing(true);
        setLoading(true, 'Applying rotations...');

        try {
            const pageRotations = Object.entries(localRotations).map(([pageNum, rotation]) => ({
                pageNumber: parseInt(pageNum),
                rotation: rotation as 0 | 90 | 180 | 270,
            }));

            const rotatedBytes = await rotatePages(activeDocument.arrayBuffer.slice(0), pageRotations);
            const fileName = activeDocument.name.replace('.pdf', '_rotated.pdf');

            setResultData(rotatedBytes);
            setResultFileName(fileName);

            // Load rotated PDF into viewer for preview
            const blob = new Blob([new Uint8Array(rotatedBytes).buffer], { type: 'application/pdf' });
            const rotatedFile = new File([blob], fileName, { type: 'application/pdf' });
            const doc = await loadPDF(rotatedFile);
            loadDocument(doc);

            setIsPreviewReady(true);

            addToast({
                type: 'success',
                title: 'Rotation complete!',
                message: 'Preview is now showing in the viewer.',
            });
        } catch (error) {
            console.error('Rotation failed:', error);
            addToast({
                type: 'error',
                title: 'Rotation failed',
                message: 'An error occurred while rotating pages.',
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
            const rotations: Record<number, number> = {};
            activeDocument.pages.forEach(page => {
                rotations[page.pageNumber] = page.rotation;
            });
            setLocalRotations(rotations);
        }
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
                    <RotateCw size={48} />
                    <h3>Open a PDF first</h3>
                    <p>Upload a PDF file to rotate its pages.</p>
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
                    <span>Preview: Rotated PDF</span>
                </div>

                <div className="tool-header">
                    <h2 className="tool-title">Rotation Complete</h2>
                    <p className="tool-description">
                        Review the rotated pages in the viewer, then download when ready.
                    </p>
                </div>

                <div className="tool-content">
                    <div className="preview-info">
                        <div className="preview-info-icon">
                            <Check size={32} strokeWidth={2.5} />
                        </div>
                        <div className="preview-info-text">
                            <h3>Ready for Download</h3>
                            <p>The rotated PDF is now showing in the viewer.</p>
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
                        Rotate More
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
                <h2 className="tool-title">Rotate Pages</h2>
                <p className="tool-description">
                    Rotate pages individually or select multiple pages to rotate together.
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
                        <button className="btn btn-secondary btn-sm" onClick={() => rotateSelected('ccw')}>
                            <RotateCcw size={14} />
                            Rotate Left
                        </button>
                        <button className="btn btn-secondary btn-sm" onClick={() => rotateSelected('cw')}>
                            <RotateCw size={14} />
                            Rotate Right
                        </button>
                    </div>
                </div>

                <div className="tool-section">
                    <h3 className="section-title">
                        {selectedPages.length > 0 ? `${selectedPages.length} pages selected` : 'All pages'}
                    </h3>
                    <div className="page-grid page-grid-compact">
                        {Array.from({ length: activeDocument.pageCount }, (_, i) => i + 1).map(pageNum => {
                            const isSelected = selectedPages.includes(pageNum);
                            const rotation = localRotations[pageNum] || 0;

                            return (
                                <div
                                    key={pageNum}
                                    className={`page-grid-item compact ${isSelected ? 'selected' : ''}`}
                                    onClick={() => togglePageSelection(pageNum)}
                                >
                                    {isSelected && (
                                        <div className="page-grid-check">
                                            <Check size={12} />
                                        </div>
                                    )}

                                    <div className="page-grid-thumb compact" style={{ transform: `rotate(${rotation}deg)` }}>
                                        <img
                                            src={getPlaceholder(pageNum, rotation)}
                                            alt={`Page ${pageNum}`}
                                            loading="lazy"
                                        />
                                    </div>

                                    <div className="page-grid-actions">
                                        <button
                                            className="page-rotate-btn"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                rotatePage(pageNum, 'ccw');
                                            }}
                                            title="Rotate left"
                                        >
                                            <RotateCcw size={12} />
                                        </button>
                                        <span className="page-grid-number">{pageNum}</span>
                                        <button
                                            className="page-rotate-btn"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                rotatePage(pageNum, 'cw');
                                            }}
                                            title="Rotate right"
                                        >
                                            <RotateCw size={12} />
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
                        <strong>{activeDocument.pageCount}</strong> pages
                    </span>
                    {hasChanges() && (
                        <>
                            <span className="summary-divider">•</span>
                            <span className="summary-stat changed">Changes pending</span>
                        </>
                    )}
                </div>

                <button
                    className="btn btn-primary"
                    onClick={handleApply}
                    disabled={isProcessing || !hasChanges()}
                >
                    {isProcessing ? (
                        <>
                            <Loader2 size={18} className="animate-spin" />
                            Applying...
                        </>
                    ) : (
                        <>
                            <RotateCw size={18} />
                            Apply Rotations
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}
