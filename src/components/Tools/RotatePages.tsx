/**
 * Rotate Pages Tool
 * Rotate PDF pages individually or all at once
 */

import React, { useState, useCallback, useEffect } from 'react';
import { useApp, useToast } from '../../store/appStore';
import { rotatePages, downloadPDF, getPDFBytes } from '../../utils/pdfHelpers';
import { generateThumbnail } from '../../utils/imageHelpers';
import {
    Download,
    Loader2,
    RotateCcw,
    RotateCw,
    Check,
} from 'lucide-react';
import './Tools.css';

export function RotatePagesTool() {
    const { state, setLoading, updateDocument } = useApp();
    const { addToast } = useToast();
    const { activeDocument } = state;

    const [isProcessing, setIsProcessing] = useState(false);
    const [thumbnails, setThumbnails] = useState<string[]>([]);
    const [localRotations, setLocalRotations] = useState<Record<number, number>>({});
    const [selectedPages, setSelectedPages] = useState<number[]>([]);

    // Initialize rotations from document
    useEffect(() => {
        if (activeDocument) {
            const rotations: Record<number, number> = {};
            activeDocument.pages.forEach(page => {
                rotations[page.pageNumber] = page.rotation;
            });
            setLocalRotations(rotations);
        }
    }, [activeDocument?.id]);

    // Generate thumbnails using optimized batch function
    useEffect(() => {
        const generateThumbs = async () => {
            if (!activeDocument) return;

            // Pre-fill with empty placeholders for immediate UI
            setThumbnails(Array(activeDocument.pageCount).fill(''));

            try {
                // Use batch generation with smaller thumbnails (80px)
                const { generateAllThumbnails } = await import('../../utils/imageHelpers');
                const thumbs = await generateAllThumbnails(activeDocument.arrayBuffer.slice(0), 80);
                setThumbnails(thumbs);
            } catch (error) {
                console.error('Failed to generate thumbnails:', error);
            }
        };

        generateThumbs();
    }, [activeDocument?.id]);

    const togglePageSelection = (pageNumber: number) => {
        setSelectedPages(prev =>
            prev.includes(pageNumber)
                ? prev.filter(p => p !== pageNumber)
                : [...prev, pageNumber].sort((a, b) => a - b)
        );
    };

    const rotateSelected = (direction: 'cw' | 'ccw') => {
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
    };

    const rotatePage = (pageNumber: number, direction: 'cw' | 'ccw') => {
        setLocalRotations(prev => {
            const current = prev[pageNumber] || 0;
            const delta = direction === 'cw' ? 90 : -90;
            return {
                ...prev,
                [pageNumber]: ((current + delta) % 360 + 360) % 360,
            };
        });
    };

    const hasChanges = () => {
        if (!activeDocument) return false;
        return activeDocument.pages.some(
            page => (localRotations[page.pageNumber] || 0) !== page.rotation
        );
    };

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
            downloadPDF(rotatedBytes, fileName);

            addToast({
                type: 'success',
                title: 'Pages rotated!',
                message: `Saved to ${fileName}`,
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

    return (
        <div className="tool-panel">
            <div className="tool-header">
                <h2 className="tool-title">Rotate Pages</h2>
                <p className="tool-description">
                    Rotate pages individually or select multiple pages to rotate together.
                </p>
            </div>

            <div className="tool-content">
                {/* Bulk Actions */}
                <div className="tool-section">
                    <div className="section-header">
                        <h4 className="section-title">
                            {selectedPages.length > 0
                                ? `${selectedPages.length} pages selected`
                                : 'All pages'}
                        </h4>
                        <div className="section-actions">
                            <button
                                className="btn btn-sm btn-secondary"
                                onClick={() => rotateSelected('ccw')}
                            >
                                <RotateCcw size={16} />
                                Rotate Left
                            </button>
                            <button
                                className="btn btn-sm btn-secondary"
                                onClick={() => rotateSelected('cw')}
                            >
                                <RotateCw size={16} />
                                Rotate Right
                            </button>
                        </div>
                    </div>
                </div>

                {/* Page Grid */}
                <div className="tool-section">
                    <div className="page-grid">
                        {Array.from({ length: activeDocument.pageCount }, (_, i) => i + 1).map(pageNum => {
                            const isSelected = selectedPages.includes(pageNum);
                            const rotation = localRotations[pageNum] || 0;

                            return (
                                <div
                                    key={pageNum}
                                    className={`page-grid-item ${isSelected ? 'selected' : ''}`}
                                    onClick={() => togglePageSelection(pageNum)}
                                >
                                    {isSelected && (
                                        <div className="page-grid-check">
                                            <Check size={12} />
                                        </div>
                                    )}

                                    <div className="page-grid-thumb" style={{ transform: `rotate(${rotation}deg)` }}>
                                        {thumbnails[pageNum - 1] ? (
                                            <img src={thumbnails[pageNum - 1]} alt={`Page ${pageNum}`} />
                                        ) : (
                                            <div className="page-grid-skeleton" />
                                        )}
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
                                            <RotateCcw size={14} />
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
                                            <RotateCw size={14} />
                                        </button>
                                    </div>

                                    {rotation !== 0 && (
                                        <div className="rotation-badge">{rotation}°</div>
                                    )}
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
                    className="btn btn-primary btn-lg"
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
                            <Download size={18} />
                            Apply & Download
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}
