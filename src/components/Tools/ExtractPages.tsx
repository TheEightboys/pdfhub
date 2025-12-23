/**
 * Extract Pages Tool
 * Extract specific pages from a PDF
 */

import { useState, useEffect } from 'react';
import { useApp } from '../../store/appStore';
import { FileOutput, Check, Download } from 'lucide-react';
import { PDFDocument } from 'pdf-lib';
import './Tools.css';

export function ExtractPagesTool() {
    const { state } = useApp();
    const { activeDocument } = state;

    const [selectedPages, setSelectedPages] = useState<number[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [thumbnails, setThumbnails] = useState<string[]>([]);
    const [isComplete, setIsComplete] = useState(false);

    // Generate thumbnails
    useEffect(() => {
        if (activeDocument) {
            // Generate placeholder thumbnails
            const thumbs = Array.from({ length: activeDocument.pageCount }, (_, i) =>
                `data:image/svg+xml,${encodeURIComponent(`
                    <svg xmlns="http://www.w3.org/2000/svg" width="100" height="140" viewBox="0 0 100 140">
                        <rect fill="#f8fafc" width="100" height="140"/>
                        <rect fill="#e2e8f0" x="10" y="10" width="80" height="4" rx="2"/>
                        <rect fill="#e2e8f0" x="10" y="20" width="60" height="4" rx="2"/>
                        <rect fill="#e2e8f0" x="10" y="30" width="70" height="4" rx="2"/>
                        <rect fill="#e2e8f0" x="10" y="45" width="80" height="4" rx="2"/>
                        <rect fill="#e2e8f0" x="10" y="55" width="50" height="4" rx="2"/>
                        <rect fill="#e2e8f0" x="10" y="65" width="75" height="4" rx="2"/>
                        <text x="50" y="120" text-anchor="middle" fill="#94a3b8" font-size="14" font-family="Arial">Page ${i + 1}</text>
                    </svg>
                `)}`
            );
            setThumbnails(thumbs);
        }
    }, [activeDocument]);

    const togglePage = (pageNum: number) => {
        setSelectedPages(prev =>
            prev.includes(pageNum)
                ? prev.filter(p => p !== pageNum)
                : [...prev, pageNum].sort((a, b) => a - b)
        );
    };

    const selectAll = () => {
        if (activeDocument) {
            setSelectedPages(Array.from({ length: activeDocument.pageCount }, (_, i) => i + 1));
        }
    };

    const selectNone = () => {
        setSelectedPages([]);
    };

    const handleExtract = async () => {
        if (!activeDocument || selectedPages.length === 0) return;

        setIsProcessing(true);

        try {
            // Load the PDF
            const pdfDoc = await PDFDocument.load(activeDocument.arrayBuffer.slice(0));
            const newPdf = await PDFDocument.create();

            // Copy selected pages
            for (const pageNum of selectedPages) {
                const [copiedPage] = await newPdf.copyPages(pdfDoc, [pageNum - 1]);
                newPdf.addPage(copiedPage);
            }

            // Save the new PDF
            const pdfBytes = await newPdf.save();
            const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);

            // Download
            const a = document.createElement('a');
            a.href = url;
            a.download = `extracted-pages-${activeDocument.name}`;
            a.click();
            URL.revokeObjectURL(url);

            setIsComplete(true);
        } catch (error) {
            console.error('Error extracting pages:', error);
        }

        setIsProcessing(false);
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

    if (isComplete) {
        return (
            <div className="tool-panel">
                <div className="tool-header">
                    <h2 className="tool-title">Extract Pages</h2>
                    <p className="tool-description">Pages extracted successfully</p>
                </div>
                <div className="tool-content">
                    <div className="success-result">
                        <div className="success-icon">
                            <Check size={48} />
                        </div>
                        <h3>Extraction Complete!</h3>
                        <p>{selectedPages.length} pages have been extracted and downloaded.</p>
                        <div className="success-details">
                            <div className="detail-item">
                                <span className="detail-label">Pages Extracted</span>
                                <span className="detail-value">{selectedPages.length}</span>
                            </div>
                            <div className="detail-item">
                                <span className="detail-label">Source</span>
                                <span className="detail-value">{activeDocument.name}</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="tool-footer">
                    <button
                        className="btn btn-secondary"
                        onClick={() => {
                            setIsComplete(false);
                            setSelectedPages([]);
                        }}
                    >
                        Extract More Pages
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="tool-panel">
            <div className="tool-header">
                <h2 className="tool-title">Extract Pages</h2>
                <p className="tool-description">
                    Select pages to extract into a new PDF
                </p>
            </div>

            <div className="tool-content">
                {/* Quick Actions */}
                <div className="tool-section">
                    <div className="section-header">
                        <h3 className="section-title">Select Pages</h3>
                        <div className="section-actions">
                            <button className="btn btn-sm btn-ghost" onClick={selectAll}>
                                Select All
                            </button>
                            <button className="btn btn-sm btn-ghost" onClick={selectNone}>
                                Clear
                            </button>
                        </div>
                    </div>

                    {/* Page Grid */}
                    <div className="page-grid">
                        {thumbnails.map((thumb, index) => {
                            const pageNum = index + 1;
                            const isSelected = selectedPages.includes(pageNum);

                            return (
                                <div
                                    key={pageNum}
                                    className={`page-grid-item ${isSelected ? 'selected' : ''}`}
                                    onClick={() => togglePage(pageNum)}
                                >
                                    {isSelected && (
                                        <div className="page-grid-check">
                                            <Check size={14} />
                                        </div>
                                    )}
                                    <div className="page-grid-thumb">
                                        <img src={thumb} alt={`Page ${pageNum}`} />
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
                        <strong>{selectedPages.length}</strong> of {activeDocument.pageCount} selected
                    </span>
                </div>
                <button
                    className="btn btn-primary"
                    onClick={handleExtract}
                    disabled={isProcessing || selectedPages.length === 0}
                >
                    {isProcessing ? (
                        <>
                            <Download size={18} className="animate-spin" />
                            <span>Extracting...</span>
                        </>
                    ) : (
                        <>
                            <FileOutput size={18} />
                            <span>Extract {selectedPages.length} Pages</span>
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}
