/**
 * Reorder Pages Tool
 * Drag and drop to reorder pages in a PDF
 */

import { useState, useEffect } from 'react';
import { useApp } from '../../store/appStore';
import { ArrowRightLeft, Check, Download, GripVertical, ArrowUp, ArrowDown, Loader2 } from 'lucide-react';
import { PDFDocument } from 'pdf-lib';
import { generateThumbnail } from '../../utils/imageHelpers';
import './Tools.css';

export function ReorderPagesTool() {
    const { state } = useApp();
    const { activeDocument } = state;

    const [pageOrder, setPageOrder] = useState<number[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [thumbnails, setThumbnails] = useState<string[]>([]);
    const [isComplete, setIsComplete] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);
    const [isLoadingThumbnails, setIsLoadingThumbnails] = useState(false);

    // Initialize page order and generate real thumbnails
    useEffect(() => {
        if (activeDocument) {
            const initialOrder = Array.from({ length: activeDocument.pageCount }, (_, i) => i + 1);
            setPageOrder(initialOrder);

            setIsLoadingThumbnails(true);
            const generateThumbs = async () => {
                const thumbs: string[] = [];
                const bufferClone = activeDocument.arrayBuffer.slice(0);
                const pagesToRender = Math.min(activeDocument.pageCount, 20);

                for (let i = 1; i <= pagesToRender; i++) {
                    try {
                        const thumb = await generateThumbnail(bufferClone, i, 100);
                        thumbs.push(thumb);
                    } catch (err) {
                        thumbs.push(`data:image/svg+xml,${encodeURIComponent(`
                            <svg xmlns="http://www.w3.org/2000/svg" width="80" height="110" viewBox="0 0 80 110">
                                <rect fill="#f8fafc" width="80" height="110" rx="4"/>
                                <text x="40" y="60" text-anchor="middle" fill="#94a3b8" font-size="11" font-family="Arial">${i}</text>
                            </svg>
                        `)}`);
                    }
                }

                // Placeholders for remaining pages
                for (let i = pagesToRender + 1; i <= activeDocument.pageCount; i++) {
                    thumbs.push(`data:image/svg+xml,${encodeURIComponent(`
                        <svg xmlns="http://www.w3.org/2000/svg" width="80" height="110" viewBox="0 0 80 110">
                            <rect fill="#f8fafc" width="80" height="110" rx="4"/>
                            <text x="40" y="60" text-anchor="middle" fill="#94a3b8" font-size="11" font-family="Arial">${i}</text>
                        </svg>
                    `)}`);
                }

                setThumbnails(thumbs);
                setIsLoadingThumbnails(false);
            };

            generateThumbs();
        }
    }, [activeDocument]);

    const movePage = (index: number, direction: 'up' | 'down') => {
        const newOrder = [...pageOrder];
        const newIndex = direction === 'up' ? index - 1 : index + 1;

        if (newIndex < 0 || newIndex >= pageOrder.length) return;

        [newOrder[index], newOrder[newIndex]] = [newOrder[newIndex], newOrder[index]];
        setPageOrder(newOrder);
        setHasChanges(true);
    };

    const resetOrder = () => {
        if (activeDocument) {
            const initialOrder = Array.from({ length: activeDocument.pageCount }, (_, i) => i + 1);
            setPageOrder(initialOrder);
            setHasChanges(false);
        }
    };

    const handleReorder = async () => {
        if (!activeDocument || !hasChanges) return;

        setIsProcessing(true);

        try {
            const pdfDoc = await PDFDocument.load(activeDocument.arrayBuffer.slice(0));
            const newPdf = await PDFDocument.create();

            // Copy pages in new order
            for (const pageNum of pageOrder) {
                const [copiedPage] = await newPdf.copyPages(pdfDoc, [pageNum - 1]);
                newPdf.addPage(copiedPage);
            }

            const pdfBytes = await newPdf.save();
            const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.href = url;
            a.download = `reordered-${activeDocument.name}`;
            a.click();
            URL.revokeObjectURL(url);

            setIsComplete(true);
        } catch (error) {
            console.error('Error reordering pages:', error);
        }

        setIsProcessing(false);
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
                        <p>Your PDF has been reordered and downloaded.</p>
                    </div>
                </div>
                <div className="tool-footer">
                    <button
                        className="btn btn-secondary"
                        onClick={() => {
                            setIsComplete(false);
                            resetOrder();
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
                    Use the arrows to move pages up or down
                </p>
            </div>

            <div className="tool-content">
                <div className="tool-section">
                    <div className="section-header">
                        <h3 className="section-title">Page Order</h3>
                        {hasChanges && (
                            <button className="btn btn-sm btn-ghost" onClick={resetOrder}>
                                Reset
                            </button>
                        )}
                    </div>

                    <div className="reorder-list">
                        {pageOrder.map((pageNum, index) => (
                            <div key={`${pageNum}-${index}`} className="reorder-item">
                                <div className="reorder-grip">
                                    <GripVertical size={16} />
                                </div>
                                <div className="reorder-position">{index + 1}</div>
                                <div className="reorder-thumb">
                                    <img src={thumbnails[pageNum - 1]} alt={`Page ${pageNum}`} />
                                </div>
                                <div className="reorder-info">
                                    <span className="reorder-label">Page {pageNum}</span>
                                    {pageNum !== index + 1 && (
                                        <span className="reorder-moved">
                                            was #{pageNum}
                                        </span>
                                    )}
                                </div>
                                <div className="reorder-actions">
                                    <button
                                        className="reorder-btn"
                                        onClick={() => movePage(index, 'up')}
                                        disabled={index === 0}
                                    >
                                        <ArrowUp size={16} />
                                    </button>
                                    <button
                                        className="reorder-btn"
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
                        {hasChanges ? (
                            <span className="summary-stat changed">Order changed</span>
                        ) : (
                            <span>{activeDocument.pageCount} pages</span>
                        )}
                    </span>
                </div>
                <button
                    className="btn btn-primary"
                    onClick={handleReorder}
                    disabled={isProcessing || !hasChanges}
                >
                    {isProcessing ? (
                        <>
                            <Download size={18} className="animate-spin" />
                            <span>Processing...</span>
                        </>
                    ) : (
                        <>
                            <ArrowRightLeft size={18} />
                            <span>Apply New Order</span>
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}
