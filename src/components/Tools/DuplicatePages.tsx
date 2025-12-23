/**
 * Duplicate Pages Tool
 * Create copies of specific pages in a PDF
 */

import { useState, useEffect } from 'react';
import { useApp } from '../../store/appStore';
import { Copy, Check, Download, Plus, Minus, Loader2 } from 'lucide-react';
import { PDFDocument } from 'pdf-lib';
import { generateThumbnail } from '../../utils/imageHelpers';
import './Tools.css';

export function DuplicatePagesTool() {
    const { state } = useApp();
    const { activeDocument } = state;

    const [selectedPages, setSelectedPages] = useState<Map<number, number>>(new Map());
    const [isProcessing, setIsProcessing] = useState(false);
    const [thumbnails, setThumbnails] = useState<string[]>([]);
    const [isComplete, setIsComplete] = useState(false);
    const [isLoadingThumbnails, setIsLoadingThumbnails] = useState(false);

    // Generate real thumbnails
    useEffect(() => {
        if (activeDocument) {
            setIsLoadingThumbnails(true);
            const generateThumbs = async () => {
                const thumbs: string[] = [];
                const bufferClone = activeDocument.arrayBuffer.slice(0);
                const pagesToRender = Math.min(activeDocument.pageCount, 20);

                for (let i = 1; i <= pagesToRender; i++) {
                    try {
                        const thumb = await generateThumbnail(bufferClone, i, 120);
                        thumbs.push(thumb);
                    } catch (err) {
                        thumbs.push(`data:image/svg+xml,${encodeURIComponent(`
                            <svg xmlns="http://www.w3.org/2000/svg" width="100" height="140" viewBox="0 0 100 140">
                                <rect fill="#f8fafc" width="100" height="140"/>
                                <text x="50" y="75" text-anchor="middle" fill="#94a3b8" font-size="14" font-family="Arial">Page ${i}</text>
                            </svg>
                        `)}`);
                    }
                }

                // Placeholders for remaining pages
                for (let i = pagesToRender + 1; i <= activeDocument.pageCount; i++) {
                    thumbs.push(`data:image/svg+xml,${encodeURIComponent(`
                        <svg xmlns="http://www.w3.org/2000/svg" width="100" height="140" viewBox="0 0 100 140">
                            <rect fill="#f8fafc" width="100" height="140"/>
                            <text x="50" y="75" text-anchor="middle" fill="#94a3b8" font-size="14" font-family="Arial">Page ${i}</text>
                        </svg>
                    `)}`);
                }

                setThumbnails(thumbs);
                setIsLoadingThumbnails(false);
            };

            generateThumbs();
        }
    }, [activeDocument]);

    const setCopies = (pageNum: number, copies: number) => {
        const newSelected = new Map(selectedPages);
        if (copies <= 0) {
            newSelected.delete(pageNum);
        } else {
            newSelected.set(pageNum, Math.min(copies, 10));
        }
        setSelectedPages(newSelected);
    };

    const getCopies = (pageNum: number) => selectedPages.get(pageNum) || 0;

    const getTotalNewPages = () => {
        let total = 0;
        selectedPages.forEach(copies => total += copies);
        return total;
    };

    const handleDuplicate = async () => {
        if (!activeDocument || selectedPages.size === 0) return;

        setIsProcessing(true);

        try {
            const pdfDoc = await PDFDocument.load(activeDocument.arrayBuffer.slice(0));
            const newPdf = await PDFDocument.create();

            // Copy all pages, duplicating selected ones
            for (let i = 0; i < activeDocument.pageCount; i++) {
                const [copiedPage] = await newPdf.copyPages(pdfDoc, [i]);
                newPdf.addPage(copiedPage);

                // Add duplicates
                const copies = selectedPages.get(i + 1) || 0;
                for (let j = 0; j < copies; j++) {
                    const [dupPage] = await newPdf.copyPages(pdfDoc, [i]);
                    newPdf.addPage(dupPage);
                }
            }

            const pdfBytes = await newPdf.save();
            const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.href = url;
            a.download = `duplicated-${activeDocument.name}`;
            a.click();
            URL.revokeObjectURL(url);

            setIsComplete(true);
        } catch (error) {
            console.error('Error duplicating pages:', error);
        }

        setIsProcessing(false);
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

    if (isComplete) {
        return (
            <div className="tool-panel">
                <div className="tool-header">
                    <h2 className="tool-title">Duplicate Pages</h2>
                    <p className="tool-description">Pages duplicated successfully</p>
                </div>
                <div className="tool-content">
                    <div className="success-result">
                        <div className="success-icon">
                            <Check size={48} />
                        </div>
                        <h3>Duplication Complete!</h3>
                        <p>{getTotalNewPages()} new pages have been added and downloaded.</p>
                        <div className="success-details">
                            <div className="detail-item">
                                <span className="detail-label">Original Pages</span>
                                <span className="detail-value">{activeDocument.pageCount}</span>
                            </div>
                            <div className="detail-item">
                                <span className="detail-label">New Total</span>
                                <span className="detail-value">{activeDocument.pageCount + getTotalNewPages()}</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="tool-footer">
                    <button
                        className="btn btn-secondary"
                        onClick={() => {
                            setIsComplete(false);
                            setSelectedPages(new Map());
                        }}
                    >
                        Duplicate More
                    </button>
                </div>
            </div>
        );
    }

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
                    <h3 className="section-title">Select Pages to Duplicate</h3>

                    <div className="page-grid">
                        {thumbnails.map((thumb, index) => {
                            const pageNum = index + 1;
                            const copies = getCopies(pageNum);
                            const isSelected = copies > 0;

                            return (
                                <div
                                    key={pageNum}
                                    className={`page-grid-item ${isSelected ? 'selected' : ''}`}
                                >
                                    {isSelected && (
                                        <div className="page-grid-check">
                                            <span style={{ fontSize: '12px', fontWeight: 700 }}>×{copies}</span>
                                        </div>
                                    )}
                                    <div className="page-grid-thumb">
                                        <img src={thumb} alt={`Page ${pageNum}`} />
                                    </div>
                                    <span className="page-grid-number">Page {pageNum}</span>
                                    <div className="duplicate-controls">
                                        <button
                                            className="dup-btn"
                                            onClick={() => setCopies(pageNum, copies - 1)}
                                            disabled={copies === 0}
                                        >
                                            <Minus size={14} />
                                        </button>
                                        <span className="dup-count">{copies}</span>
                                        <button
                                            className="dup-btn"
                                            onClick={() => setCopies(pageNum, copies + 1)}
                                        >
                                            <Plus size={14} />
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
                            <Download size={18} className="animate-spin" />
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
