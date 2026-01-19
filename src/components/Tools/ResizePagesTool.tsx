/**
 * Resize Pages Tool
 * Resize PDF pages to different paper sizes
 */

import { useState, useCallback, useEffect } from 'react';
import { useApp, useToast } from '../../store/appStore';
import { PDFDocument } from 'pdf-lib';
import { downloadPDF } from '../../utils/pdfHelpers';
import { Maximize2, Download, Loader2 } from 'lucide-react';
import './Tools.css';

interface PageSize {
    name: string;
    width: number;
    height: number;
}

const PAPER_SIZES: PageSize[] = [
    { name: 'Letter', width: 612, height: 792 },
    { name: 'Legal', width: 612, height: 1008 },
    { name: 'A4', width: 595.28, height: 841.89 },
    { name: 'A3', width: 841.89, height: 1190.55 },
    { name: 'A5', width: 419.53, height: 595.28 },
    { name: 'B5', width: 498.90, height: 708.66 },
    { name: 'Executive', width: 522, height: 756 },
    { name: 'Tabloid', width: 792, height: 1224 },
    { name: 'Custom', width: 612, height: 792 },
];

export function ResizePagesTool() {
    const { state, setLoading } = useApp();
    const { addToast } = useToast();
    const { activeDocument } = state;

    const [isProcessing, setIsProcessing] = useState(false);
    const [selectedSize, setSelectedSize] = useState<string>('A4');
    const [customWidth, setCustomWidth] = useState(612);
    const [customHeight, setCustomHeight] = useState(792);
    const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
    const [fitContent, setFitContent] = useState<'fit' | 'fill' | 'stretch'>('fit');
    const [applyTo, setApplyTo] = useState<'all' | 'custom'>('all');
    const [customPages, setCustomPages] = useState('');
    const [currentPageSize, setCurrentPageSize] = useState({ width: 0, height: 0 });
    const [isApplied, setIsApplied] = useState(false);
    const [processedPDF, setProcessedPDF] = useState<{ bytes: Uint8Array; fileName: string } | null>(null);

    // Get current page size
    useEffect(() => {
        if (activeDocument?.arrayBuffer) {
            // Clone buffer to prevent detachment issues
            const bufferClone = activeDocument.arrayBuffer.slice(0);
            PDFDocument.load(bufferClone, { ignoreEncryption: true })
                .then(pdf => {
                    const page = pdf.getPage(0);
                    setCurrentPageSize(page.getSize());
                })
                .catch(() => { });
        }
    }, [activeDocument]);

    const getTargetSize = (): { width: number; height: number } => {
        let width: number, height: number;

        if (selectedSize === 'Custom') {
            width = customWidth;
            height = customHeight;
        } else {
            const size = PAPER_SIZES.find(s => s.name === selectedSize) || PAPER_SIZES[2];
            width = size.width;
            height = size.height;
        }

        // Swap for landscape orientation
        if (orientation === 'landscape') {
            [width, height] = [height, width];
        }

        return { width, height };
    };

    const handleResize = useCallback(async () => {
        if (!activeDocument) return;

        setIsProcessing(true);
        setLoading(true, 'Resizing pages...');

        try {
            // Clone buffer to prevent detachment issues
            const bufferClone = activeDocument.arrayBuffer.slice(0);
            const sourcePdf = await PDFDocument.load(bufferClone, { ignoreEncryption: true });
            const newPdf = await PDFDocument.create();

            const sourcePages = sourcePdf.getPages();
            const targetSize = getTargetSize();

            // Determine which pages to resize
            let pagesToResize: number[] = [];

            if (applyTo === 'all') {
                pagesToResize = Array.from({ length: sourcePages.length }, (_, i) => i);
            } else {
                pagesToResize = parsePageRange(customPages, sourcePages.length);
            }

            // Process each page
            for (let i = 0; i < sourcePages.length; i++) {
                const [copiedPage] = await newPdf.copyPages(sourcePdf, [i]);

                if (pagesToResize.includes(i)) {
                    const originalSize = sourcePages[i].getSize();

                    // Calculate scaling based on fit mode
                    let scale = 1;
                    let xOffset = 0;
                    let yOffset = 0;

                    if (fitContent === 'fit') {
                        // Scale to fit within bounds, maintaining aspect ratio
                        const scaleX = targetSize.width / originalSize.width;
                        const scaleY = targetSize.height / originalSize.height;
                        scale = Math.min(scaleX, scaleY);
                        xOffset = (targetSize.width - originalSize.width * scale) / 2;
                        yOffset = (targetSize.height - originalSize.height * scale) / 2;
                    } else if (fitContent === 'fill') {
                        // Scale to fill bounds, may crop
                        const scaleX = targetSize.width / originalSize.width;
                        const scaleY = targetSize.height / originalSize.height;
                        scale = Math.max(scaleX, scaleY);
                        xOffset = (targetSize.width - originalSize.width * scale) / 2;
                        yOffset = (targetSize.height - originalSize.height * scale) / 2;
                    } else {
                        // Stretch to fill
                        // Just resize the page without maintaining aspect ratio
                    }

                    // Apply resize
                    copiedPage.setSize(targetSize.width, targetSize.height);
                    copiedPage.scale(scale, scale);
                    copiedPage.translateContent(xOffset, yOffset);
                }

                newPdf.addPage(copiedPage);
            }

            const pdfBytes = await newPdf.save();
            const fileName = activeDocument.name.replace('.pdf', '_resized.pdf');
            
            // Store processed PDF for download
            setProcessedPDF({ bytes: pdfBytes, fileName });
            setIsApplied(true);

            addToast({
                type: 'success',
                title: 'Pages resized!',
                message: 'Click Download to save the file.',
            });
        } catch (error) {
            console.error('Resize failed:', error);
            addToast({
                type: 'error',
                title: 'Resize failed',
                message: 'An error occurred while resizing the PDF.',
            });
        } finally {
            setIsProcessing(false);
            setLoading(false);
        }
    }, [activeDocument, selectedSize, customWidth, customHeight, orientation, fitContent, applyTo, customPages, setLoading, addToast]);

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
                    <Maximize2 size={48} />
                    <h3>Open a PDF first</h3>
                    <p>Upload a PDF file to resize its pages.</p>
                </div>
            </div>
        );
    }

    const targetSize = getTargetSize();

    return (
        <div className="tool-panel">
            <div className="tool-header">
                <h2 className="tool-title">Resize Pages</h2>
                <p className="tool-description">
                    Change PDF page dimensions to different paper sizes
                </p>
            </div>

            <div className="tool-content">
                {/* Current Size Info */}
                <div className="tool-section">
                    <h4 className="section-title">Current Page Size</h4>
                    <div className="size-info">
                        <span>{Math.round(currentPageSize.width)} × {Math.round(currentPageSize.height)} pts</span>
                        <span className="size-inches">
                            ({(currentPageSize.width / 72).toFixed(2)}" × {(currentPageSize.height / 72).toFixed(2)}")
                        </span>
                    </div>
                </div>

                {/* Paper Size Selection */}
                <div className="tool-section">
                    <h4 className="section-title">Target Size</h4>
                    <div className="size-grid">
                        {PAPER_SIZES.map(size => (
                            <button
                                key={size.name}
                                className={`size-option ${selectedSize === size.name ? 'active' : ''}`}
                                onClick={() => setSelectedSize(size.name)}
                            >
                                <span className="size-name">{size.name}</span>
                                {size.name !== 'Custom' && (
                                    <span className="size-dimensions">
                                        {Math.round(size.width)} × {Math.round(size.height)}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>

                    {/* Custom Size Inputs */}
                    {selectedSize === 'Custom' && (
                        <div className="custom-size-inputs">
                            <div className="size-input">
                                <label>Width (pts)</label>
                                <input
                                    type="number"
                                    value={customWidth}
                                    onChange={(e) => setCustomWidth(Math.max(72, parseInt(e.target.value) || 0))}
                                    min={72}
                                    max={3000}
                                />
                            </div>
                            <div className="size-input">
                                <label>Height (pts)</label>
                                <input
                                    type="number"
                                    value={customHeight}
                                    onChange={(e) => setCustomHeight(Math.max(72, parseInt(e.target.value) || 0))}
                                    min={72}
                                    max={3000}
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Orientation */}
                <div className="tool-section">
                    <h4 className="section-title">Orientation</h4>
                    <div className="btn-group">
                        <button
                            className={`btn ${orientation === 'portrait' ? 'btn-primary' : 'btn-ghost'}`}
                            onClick={() => setOrientation('portrait')}
                        >
                            <div className="orientation-icon portrait"></div>
                            Portrait
                        </button>
                        <button
                            className={`btn ${orientation === 'landscape' ? 'btn-primary' : 'btn-ghost'}`}
                            onClick={() => setOrientation('landscape')}
                        >
                            <div className="orientation-icon landscape"></div>
                            Landscape
                        </button>
                    </div>
                </div>

                {/* Content Fit Mode */}
                <div className="tool-section">
                    <h4 className="section-title">Content Fit</h4>
                    <div className="radio-options">
                        <label className="radio-option">
                            <input
                                type="radio"
                                name="fitContent"
                                checked={fitContent === 'fit'}
                                onChange={() => setFitContent('fit')}
                            />
                            <span>Fit (maintain aspect ratio, add margins)</span>
                        </label>
                        <label className="radio-option">
                            <input
                                type="radio"
                                name="fitContent"
                                checked={fitContent === 'fill'}
                                onChange={() => setFitContent('fill')}
                            />
                            <span>Fill (maintain aspect ratio, may crop)</span>
                        </label>
                        <label className="radio-option">
                            <input
                                type="radio"
                                name="fitContent"
                                checked={fitContent === 'stretch'}
                                onChange={() => setFitContent('stretch')}
                            />
                            <span>Stretch (change aspect ratio)</span>
                        </label>
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

                {/* Target Size Preview */}
                <div className="tool-section">
                    <div className="target-size-preview">
                        <span className="label">New size:</span>
                        <span className="value">
                            {Math.round(targetSize.width)} × {Math.round(targetSize.height)} pts
                            ({(targetSize.width / 72).toFixed(2)}" × {(targetSize.height / 72).toFixed(2)}")
                        </span>
                    </div>
                </div>

                <div className="tool-actions">
                    {!isApplied ? (
                        <button
                            className="btn btn-primary btn-lg"
                            onClick={handleResize}
                            disabled={isProcessing}
                        >
                            {isProcessing ? (
                                <>
                                    <Loader2 size={20} className="animate-spin" />
                                    Resizing...
                                </>
                            ) : (
                                <span>Apply Resize</span>
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
