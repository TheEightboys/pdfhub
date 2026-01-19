/**
 * Crop Pages Tool
 * Crop PDF pages to remove margins or unwanted areas
 */

import { useState, useCallback, useEffect } from 'react';
import { useApp, useToast } from '../../store/appStore';
import { PDFDocument } from 'pdf-lib';
import { downloadPDF } from '../../utils/pdfHelpers';
import { generateThumbnail } from '../../utils/imageHelpers';
import { Crop, Download, Loader2, RotateCcw } from 'lucide-react';
import './Tools.css';

interface CropMargins {
    top: number;
    right: number;
    bottom: number;
    left: number;
}

export function CropPagesTool() {
    const { state, setLoading } = useApp();
    const { addToast } = useToast();
    const { activeDocument } = state;

    const [isProcessing, setIsProcessing] = useState(false);
    const [thumbnail, setThumbnail] = useState<string>('');
    const [margins, setMargins] = useState<CropMargins>({ top: 0, right: 0, bottom: 0, left: 0 });
    const [applyTo, setApplyTo] = useState<'all' | 'current' | 'custom'>('all');
    const [customPages, setCustomPages] = useState('');
    const [previewPage, setPreviewPage] = useState(1);
    const [isLoadingPreview, setIsLoadingPreview] = useState(false);
    const [isApplied, setIsApplied] = useState(false);
    const [processedPDF, setProcessedPDF] = useState<{ bytes: Uint8Array; fileName: string } | null>(null);

    // Generate thumbnail for preview
    useEffect(() => {
        if (activeDocument?.arrayBuffer) {
            setIsLoadingPreview(true);
            // Clone buffer to prevent detachment issues
            const bufferClone = activeDocument.arrayBuffer.slice(0);
            generateThumbnail(bufferClone, previewPage, 300)
                .then(thumb => {
                    setThumbnail(thumb);
                    setIsLoadingPreview(false);
                })
                .catch(err => {
                    console.error('Thumbnail generation failed:', err);
                    setThumbnail('');
                    setIsLoadingPreview(false);
                });
        }
    }, [activeDocument, previewPage]);

    const handleCrop = useCallback(async () => {
        if (!activeDocument) return;

        setIsProcessing(true);
        setLoading(true, 'Cropping pages...');

        try {
            const pdfDoc = await PDFDocument.load(activeDocument.arrayBuffer.slice(0), { ignoreEncryption: true });
            const pages = pdfDoc.getPages();

            // Determine which pages to crop
            let pagesToCrop: number[] = [];

            if (applyTo === 'all') {
                pagesToCrop = Array.from({ length: pages.length }, (_, i) => i);
            } else if (applyTo === 'current') {
                pagesToCrop = [previewPage - 1];
            } else if (applyTo === 'custom') {
                pagesToCrop = parsePageRange(customPages, pages.length);
            }

            // Apply crop to selected pages
            for (const pageIndex of pagesToCrop) {
                if (pageIndex >= 0 && pageIndex < pages.length) {
                    const page = pages[pageIndex];
                    const { width, height } = page.getSize();

                    // Calculate new crop box
                    const newCropBox = {
                        x: margins.left,
                        y: margins.bottom,
                        width: width - margins.left - margins.right,
                        height: height - margins.top - margins.bottom,
                    };

                    // Apply crop by setting the crop box
                    page.setCropBox(
                        newCropBox.x,
                        newCropBox.y,
                        newCropBox.width,
                        newCropBox.height
                    );
                }
            }

            const pdfBytes = await pdfDoc.save();
            const fileName = activeDocument.name.replace('.pdf', '_cropped.pdf');
            
            // Store processed PDF for download
            setProcessedPDF({ bytes: pdfBytes, fileName });
            setIsApplied(true);

            addToast({
                type: 'success',
                title: 'Pages cropped!',
                message: 'Click Download to save the file.',
            });
        } catch (error) {
            console.error('Crop failed:', error);
            addToast({
                type: 'error',
                title: 'Crop failed',
                message: 'An error occurred while cropping the PDF.',
            });
        } finally {
            setIsProcessing(false);
            setLoading(false);
        }
    }, [activeDocument, margins, applyTo, customPages, previewPage, setLoading, addToast]);

    const resetMargins = () => {
        setMargins({ top: 0, right: 0, bottom: 0, left: 0 });
    };

    const handleDownload = () => {
        if (processedPDF) {
            downloadPDF(processedPDF.bytes, processedPDF.fileName);
            addToast({
                type: 'success',
                title: 'Downloaded',
                message: `Saved as ${processedPDF.fileName}`,
            });
        }
    };

    if (!activeDocument) {
        return (
            <div className="tool-panel">
                <div className="tool-empty">
                    <Crop size={48} />
                    <h3>Open a PDF first</h3>
                    <p>Upload a PDF file to crop its pages.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="tool-panel">
            <div className="tool-header">
                <h2 className="tool-title">Crop Pages</h2>
                <p className="tool-description">
                    Remove margins and unwanted areas from your PDF pages
                </p>
            </div>

            <div className="tool-content">
                {/* Preview */}
                <div className="tool-section">
                    <h4 className="section-title">Preview</h4>
                    <div className="crop-preview">
                        {isLoadingPreview ? (
                            <div className="crop-preview-placeholder">
                                <Loader2 size={24} className="animate-spin" />
                                <span>Loading preview...</span>
                            </div>
                        ) : thumbnail ? (
                            <div className="crop-preview-container">
                                <img src={thumbnail} alt="Page preview" className="crop-preview-img" />
                                <div
                                    className="crop-overlay"
                                    style={{
                                        top: `${margins.top / 3}px`,
                                        right: `${margins.right / 3}px`,
                                        bottom: `${margins.bottom / 3}px`,
                                        left: `${margins.left / 3}px`,
                                    }}
                                />
                            </div>
                        ) : (
                            <div className="crop-preview-placeholder">
                                <Crop size={32} />
                                <span>No preview available</span>
                            </div>
                        )}
                    </div>

                    {/* Page Navigation */}
                    <div className="page-nav">
                        <button
                            className="btn btn-sm btn-ghost"
                            onClick={() => setPreviewPage(p => Math.max(1, p - 1))}
                            disabled={previewPage <= 1}
                        >
                            Previous
                        </button>
                        <span className="page-indicator">
                            Page {previewPage} of {activeDocument.pageCount}
                        </span>
                        <button
                            className="btn btn-sm btn-ghost"
                            onClick={() => setPreviewPage(p => Math.min(activeDocument.pageCount, p + 1))}
                            disabled={previewPage >= activeDocument.pageCount}
                        >
                            Next
                        </button>
                    </div>
                </div>

                {/* Margin Controls */}
                <div className="tool-section">
                    <div className="section-header">
                        <h4 className="section-title">Crop Margins (points)</h4>
                        <button className="btn btn-sm btn-ghost" onClick={resetMargins}>
                            <RotateCcw size={14} />
                            Reset
                        </button>
                    </div>

                    <div className="margin-controls">
                        <div className="margin-input">
                            <label>Top</label>
                            <input
                                type="number"
                                value={margins.top}
                                onChange={(e) => setMargins(m => ({ ...m, top: Math.max(0, parseInt(e.target.value) || 0) }))}
                                min={0}
                                max={200}
                            />
                        </div>
                        <div className="margin-input">
                            <label>Right</label>
                            <input
                                type="number"
                                value={margins.right}
                                onChange={(e) => setMargins(m => ({ ...m, right: Math.max(0, parseInt(e.target.value) || 0) }))}
                                min={0}
                                max={200}
                            />
                        </div>
                        <div className="margin-input">
                            <label>Bottom</label>
                            <input
                                type="number"
                                value={margins.bottom}
                                onChange={(e) => setMargins(m => ({ ...m, bottom: Math.max(0, parseInt(e.target.value) || 0) }))}
                                min={0}
                                max={200}
                            />
                        </div>
                        <div className="margin-input">
                            <label>Left</label>
                            <input
                                type="number"
                                value={margins.left}
                                onChange={(e) => setMargins(m => ({ ...m, left: Math.max(0, parseInt(e.target.value) || 0) }))}
                                min={0}
                                max={200}
                            />
                        </div>
                    </div>
                </div>

                {/* Apply To */}
                <div className="tool-section">
                    <h4 className="section-title">Apply To</h4>
                    <div className="radio-options">
                        <label className="radio-option">
                            <input
                                type="radio"
                                name="applyTo"
                                checked={applyTo === 'all'}
                                onChange={() => setApplyTo('all')}
                            />
                            <span>All pages</span>
                        </label>
                        <label className="radio-option">
                            <input
                                type="radio"
                                name="applyTo"
                                checked={applyTo === 'current'}
                                onChange={() => setApplyTo('current')}
                            />
                            <span>Current page only</span>
                        </label>
                        <label className="radio-option">
                            <input
                                type="radio"
                                name="applyTo"
                                checked={applyTo === 'custom'}
                                onChange={() => setApplyTo('custom')}
                            />
                            <span>Custom range</span>
                        </label>
                    </div>

                    {applyTo === 'custom' && (
                        <input
                            type="text"
                            className="custom-pages-input"
                            placeholder="e.g., 1-3, 5, 7-10"
                            value={customPages}
                            onChange={(e) => setCustomPages(e.target.value)}
                        />
                    )}
                </div>

                <div className="tool-actions">
                    {!isApplied ? (
                        <button
                            className="btn btn-primary btn-lg"
                            onClick={handleCrop}
                            disabled={isProcessing}
                        >
                            {isProcessing ? (
                                <>
                                    <Loader2 size={20} className="animate-spin" />
                                    Cropping...
                                </>
                            ) : (
                                <span>Apply Crop</span>
                            )}
                        </button>
                    ) : (
                        <button
                            className="btn btn-primary btn-lg"
                            onClick={handleDownload}
                        >
                            <Download size={20} />
                            Download
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

// Helper function to parse page range string
function parsePageRange(input: string, maxPages: number): number[] {
    const pages: Set<number> = new Set();
    const parts = input.split(',').map(p => p.trim());

    for (const part of parts) {
        if (part.includes('-')) {
            const [start, end] = part.split('-').map(n => parseInt(n.trim()));
            if (!isNaN(start) && !isNaN(end)) {
                for (let i = Math.max(1, start); i <= Math.min(maxPages, end); i++) {
                    pages.add(i - 1);
                }
            }
        } else {
            const num = parseInt(part);
            if (!isNaN(num) && num >= 1 && num <= maxPages) {
                pages.add(num - 1);
            }
        }
    }

    return Array.from(pages).sort((a, b) => a - b);
}
