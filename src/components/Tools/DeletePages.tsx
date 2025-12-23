/**
 * Delete Pages Tool
 * Remove unwanted pages from a PDF
 */

import React, { useState, useEffect } from 'react';
import { useApp, useToast } from '../../store/appStore';
import { deletePages, downloadPDF } from '../../utils/pdfHelpers';
import { generateAllThumbnails } from '../../utils/imageHelpers';
import {
    Download,
    Loader2,
    Trash2,
    Check,
    AlertTriangle,
} from 'lucide-react';
import './Tools.css';

export function DeletePagesTool() {
    const { state, setLoading } = useApp();
    const { addToast } = useToast();
    const { activeDocument } = state;

    const [isProcessing, setIsProcessing] = useState(false);
    const [thumbnails, setThumbnails] = useState<string[]>([]);
    const [pagesToDelete, setPagesToDelete] = useState<number[]>([]);
    const [isLoadingThumbs, setIsLoadingThumbs] = useState(false);

    // Generate thumbnails using optimized progressive batch function
    useEffect(() => {
        const generateThumbs = async () => {
            if (!activeDocument) return;

            setIsLoadingThumbs(true);

            // Pre-fill with empty placeholders for immediate UI
            setThumbnails(Array(activeDocument.pageCount).fill(''));

            try {
                // Use smaller thumbnails (80px) for faster loading
                const thumbs = await generateAllThumbnails(
                    activeDocument.arrayBuffer.slice(0),
                    80, // Smaller size for faster loading
                    (progress) => {
                        // Progress callback (optional UI update)
                    }
                );
                setThumbnails(thumbs);
            } catch (error) {
                console.error('Failed to generate thumbnails:', error);
            }
            setIsLoadingThumbs(false);
        };

        generateThumbs();
        setPagesToDelete([]);
    }, [activeDocument?.id]);

    const togglePageSelection = (pageNumber: number) => {
        setPagesToDelete(prev =>
            prev.includes(pageNumber)
                ? prev.filter(p => p !== pageNumber)
                : [...prev, pageNumber].sort((a, b) => a - b)
        );
    };

    const selectAllPages = () => {
        if (activeDocument) {
            // Can't delete all pages
            const allButOne = Array.from({ length: activeDocument.pageCount - 1 }, (_, i) => i + 1);
            setPagesToDelete(allButOne);
        }
    };

    const deselectAllPages = () => {
        setPagesToDelete([]);
    };

    const handleDelete = async () => {
        if (!activeDocument || pagesToDelete.length === 0) return;

        // Ensure at least one page remains
        if (pagesToDelete.length >= activeDocument.pageCount) {
            addToast({
                type: 'error',
                title: 'Cannot delete all pages',
                message: 'At least one page must remain in the document.',
            });
            return;
        }

        setIsProcessing(true);
        setLoading(true, 'Deleting pages...');

        try {
            const deletedBytes = await deletePages(activeDocument.arrayBuffer.slice(0), pagesToDelete);

            const remainingPages = activeDocument.pageCount - pagesToDelete.length;
            const fileName = activeDocument.name.replace(
                '.pdf',
                `_${remainingPages}_pages.pdf`
            );

            downloadPDF(deletedBytes, fileName);

            addToast({
                type: 'success',
                title: 'Pages deleted!',
                message: `Removed ${pagesToDelete.length} pages. Saved to ${fileName}`,
            });

            setPagesToDelete([]);
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

    if (!activeDocument) {
        return (
            <div className="tool-panel">
                <div className="tool-empty">
                    <Trash2 size={48} />
                    <h3>Open a PDF first</h3>
                    <p>Upload a PDF file to delete pages from it.</p>
                </div>
            </div>
        );
    }

    const remainingPages = activeDocument.pageCount - pagesToDelete.length;

    return (
        <div className="tool-panel">
            <div className="tool-header">
                <h2 className="tool-title">Delete Pages</h2>
                <p className="tool-description">
                    Select pages to permanently remove from the PDF.
                </p>
            </div>

            <div className="tool-content">
                <div className="tool-section">
                    <div className="section-header">
                        <h4 className="section-title">Click pages to mark for deletion</h4>
                        <div className="section-actions">
                            <button className="btn btn-sm btn-ghost" onClick={selectAllPages}>
                                Select All
                            </button>
                            <button className="btn btn-sm btn-ghost" onClick={deselectAllPages}>
                                Deselect All
                            </button>
                        </div>
                    </div>

                    {pagesToDelete.length >= activeDocument.pageCount - 1 && (
                        <div className="warning-banner">
                            <AlertTriangle size={16} />
                            <span>At least one page must remain in the document.</span>
                        </div>
                    )}

                    <div className="page-grid">
                        {Array.from({ length: activeDocument.pageCount }, (_, i) => i + 1).map(pageNum => {
                            const isMarkedForDeletion = pagesToDelete.includes(pageNum);

                            return (
                                <div
                                    key={pageNum}
                                    className={`page-grid-item ${isMarkedForDeletion ? 'marked-delete' : ''}`}
                                    onClick={() => togglePageSelection(pageNum)}
                                >
                                    {isMarkedForDeletion && (
                                        <div className="page-grid-check delete">
                                            <Trash2 size={12} />
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
            </div>

            <div className="tool-footer">
                <div className="tool-summary">
                    <span className="summary-stat delete-stat">
                        <strong>{pagesToDelete.length}</strong> to delete
                    </span>
                    <span className="summary-divider">•</span>
                    <span className="summary-stat">
                        <strong>{remainingPages}</strong> remaining
                    </span>
                </div>

                <button
                    className="btn btn-danger btn-lg"
                    onClick={handleDelete}
                    disabled={isProcessing || pagesToDelete.length === 0 || remainingPages < 1}
                >
                    {isProcessing ? (
                        <>
                            <Loader2 size={18} className="animate-spin" />
                            Deleting...
                        </>
                    ) : (
                        <>
                            <Download size={18} />
                            Delete & Download
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}
