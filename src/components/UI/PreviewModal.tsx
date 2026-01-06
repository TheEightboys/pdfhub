/**
 * Preview Modal Component
 * Shows PDF preview before download for all PDF tools
 */

import { useState, useEffect, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import {
    X,
    ChevronLeft,
    ChevronRight,
    Download,
    ZoomIn,
    ZoomOut,
    Loader2,
    FileText,
} from 'lucide-react';
import './PreviewModal.css';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

interface PreviewModalProps {
    isOpen: boolean;
    pdfData: Uint8Array | null;
    fileName: string;
    onDownload: () => void;
    onCancel: () => void;
    title?: string;
}

export function PreviewModal({
    isOpen,
    pdfData,
    fileName,
    onDownload,
    onCancel,
    title = 'Preview'
}: PreviewModalProps) {
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [zoom, setZoom] = useState(100);
    const [isLoading, setIsLoading] = useState(true);
    const [pageImage, setPageImage] = useState<string | null>(null);
    const [fileSize, setFileSize] = useState<string>('');
    
    const pdfDocRef = useRef<pdfjsLib.PDFDocumentProxy | null>(null);

    // Load PDF when data changes
    useEffect(() => {
        if (!isOpen || !pdfData) {
            setPageImage(null);
            setCurrentPage(1);
            setTotalPages(0);
            return;
        }

        const loadPdf = async () => {
            setIsLoading(true);
            try {
                // Calculate file size
                const sizeInMB = (pdfData.length / (1024 * 1024)).toFixed(2);
                setFileSize(`${sizeInMB} MB`);

                // Load PDF document
                const loadingTask = pdfjsLib.getDocument({ data: pdfData.slice(0) });
                const pdf = await loadingTask.promise;
                pdfDocRef.current = pdf;
                setTotalPages(pdf.numPages);
                setCurrentPage(1);
                
                // Render first page
                await renderPage(1, pdf);
            } catch (error) {
                console.error('Error loading PDF preview:', error);
            } finally {
                setIsLoading(false);
            }
        };

        loadPdf();

        return () => {
            if (pdfDocRef.current) {
                pdfDocRef.current.destroy();
                pdfDocRef.current = null;
            }
        };
    }, [isOpen, pdfData]);

    // Re-render when zoom or page changes
    useEffect(() => {
        if (pdfDocRef.current && currentPage > 0) {
            renderPage(currentPage, pdfDocRef.current);
        }
    }, [currentPage, zoom]);

    const renderPage = async (pageNum: number, pdf: pdfjsLib.PDFDocumentProxy) => {
        try {
            const page = await pdf.getPage(pageNum);
            const scale = (zoom / 100) * 1.5;
            const viewport = page.getViewport({ scale });

            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            canvas.width = viewport.width;
            canvas.height = viewport.height;
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            await page.render({ canvasContext: ctx, viewport }).promise;
            setPageImage(canvas.toDataURL('image/jpeg', 0.9));
            page.cleanup();
        } catch (error) {
            console.error('Error rendering page:', error);
        }
    };

    const handlePrevPage = () => {
        if (currentPage > 1) {
            setCurrentPage(prev => prev - 1);
        }
    };

    const handleNextPage = () => {
        if (currentPage < totalPages) {
            setCurrentPage(prev => prev + 1);
        }
    };

    const handleZoomIn = () => {
        if (zoom < 200) {
            setZoom(prev => prev + 25);
        }
    };

    const handleZoomOut = () => {
        if (zoom > 50) {
            setZoom(prev => prev - 25);
        }
    };

    // Handle keyboard navigation
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onCancel();
            } else if (e.key === 'ArrowLeft') {
                handlePrevPage();
            } else if (e.key === 'ArrowRight') {
                handleNextPage();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, currentPage, totalPages]);

    if (!isOpen) return null;

    return (
        <div className="preview-modal-overlay" onClick={onCancel}>
            <div className="preview-modal" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="preview-modal-header">
                    <div className="preview-modal-title">
                        <FileText size={20} />
                        <span>{title}</span>
                    </div>
                    <button className="preview-modal-close" onClick={onCancel}>
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="preview-modal-content">
                    {isLoading ? (
                        <div className="preview-loading">
                            <Loader2 size={48} className="animate-spin" />
                            <span>Loading preview...</span>
                        </div>
                    ) : (
                        <div className="preview-canvas-container">
                            {pageImage && (
                                <img
                                    src={pageImage}
                                    alt={`Page ${currentPage}`}
                                    className="preview-page-image"
                                    style={{ transform: `scale(${zoom / 100})` }}
                                />
                            )}
                        </div>
                    )}
                </div>

                {/* Toolbar */}
                <div className="preview-modal-toolbar">
                    <div className="preview-toolbar-left">
                        <div className="preview-file-info">
                            <span className="preview-file-name">{fileName}</span>
                            <span className="preview-file-meta">{totalPages} pages • {fileSize}</span>
                        </div>
                    </div>

                    <div className="preview-toolbar-center">
                        <button
                            className="preview-nav-btn"
                            onClick={handlePrevPage}
                            disabled={currentPage <= 1}
                        >
                            <ChevronLeft size={18} />
                        </button>
                        <span className="preview-page-indicator">
                            {currentPage} / {totalPages}
                        </span>
                        <button
                            className="preview-nav-btn"
                            onClick={handleNextPage}
                            disabled={currentPage >= totalPages}
                        >
                            <ChevronRight size={18} />
                        </button>

                        <div className="preview-toolbar-divider" />

                        <button className="preview-zoom-btn" onClick={handleZoomOut} disabled={zoom <= 50}>
                            <ZoomOut size={16} />
                        </button>
                        <span className="preview-zoom-level">{zoom}%</span>
                        <button className="preview-zoom-btn" onClick={handleZoomIn} disabled={zoom >= 200}>
                            <ZoomIn size={16} />
                        </button>
                    </div>

                    <div className="preview-toolbar-right">
                        <button className="btn btn-secondary" onClick={onCancel}>
                            Cancel
                        </button>
                        <button className="btn btn-primary" onClick={onDownload}>
                            <Download size={18} />
                            Download
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
