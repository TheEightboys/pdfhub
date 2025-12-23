/**
 * PDF to Images Tool
 */

import React, { useState } from 'react';
import { useApp, useToast } from '../../store/appStore';
import { downloadPDFAsImages } from '../../utils/imageHelpers';
import {
    Download,
    Loader2,
    Image,
} from 'lucide-react';
import './Tools.css';

export function PDFToImagesTool() {
    const { state, setLoading } = useApp();
    const { addToast } = useToast();
    const { activeDocument } = state;

    const [format, setFormat] = useState<'png' | 'jpeg' | 'webp'>('png');
    const [quality, setQuality] = useState(92);
    const [scale, setScale] = useState(2);
    const [isProcessing, setIsProcessing] = useState(false);

    const handleExport = async () => {
        if (!activeDocument) return;

        setIsProcessing(true);
        setLoading(true, 'Converting pages to images...');

        try {
            await downloadPDFAsImages(activeDocument.arrayBuffer.slice(0), {
                format,
                quality: quality / 100,
                scale,
                pageRange: 'all',
                filename: activeDocument.name.replace('.pdf', ''),
            });

            addToast({
                type: 'success',
                title: 'Export complete!',
                message: `Exported ${activeDocument.pageCount} pages as ${format.toUpperCase()} images.`,
            });
        } catch (error) {
            console.error('Export failed:', error);
            addToast({
                type: 'error',
                title: 'Export failed',
                message: 'An error occurred while exporting images.',
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
                    <Image size={48} />
                    <h3>Open a PDF first</h3>
                    <p>Upload a PDF file to convert its pages to images.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="tool-panel">
            <div className="tool-header">
                <h2 className="tool-title">PDF to Images</h2>
                <p className="tool-description">
                    Export PDF pages as high-quality images. Multiple pages will be downloaded as a ZIP file.
                </p>
            </div>

            <div className="tool-content">
                {/* Format Selection */}
                <div className="tool-section">
                    <h4 className="section-title">Image Format</h4>
                    <div className="mode-tabs">
                        <button
                            className={`mode-tab ${format === 'png' ? 'active' : ''}`}
                            onClick={() => setFormat('png')}
                        >
                            PNG
                        </button>
                        <button
                            className={`mode-tab ${format === 'jpeg' ? 'active' : ''}`}
                            onClick={() => setFormat('jpeg')}
                        >
                            JPEG
                        </button>
                        <button
                            className={`mode-tab ${format === 'webp' ? 'active' : ''}`}
                            onClick={() => setFormat('webp')}
                        >
                            WebP
                        </button>
                    </div>
                </div>

                {/* Quality (for JPEG/WebP) */}
                {format !== 'png' && (
                    <div className="tool-section">
                        <h4 className="section-title">Quality: {quality}%</h4>
                        <input
                            type="range"
                            min={10}
                            max={100}
                            value={quality}
                            onChange={(e) => setQuality(parseInt(e.target.value))}
                            className="slider"
                        />
                        <div className="slider-labels">
                            <span>Lower file size</span>
                            <span>Better quality</span>
                        </div>
                    </div>
                )}

                {/* Scale/DPI */}
                <div className="tool-section">
                    <h4 className="section-title">Resolution Scale</h4>
                    <div className="mode-tabs">
                        {[1, 2, 3, 4].map(s => (
                            <button
                                key={s}
                                className={`mode-tab ${scale === s ? 'active' : ''}`}
                                onClick={() => setScale(s)}
                            >
                                {s}x {s === 2 ? '(Recommended)' : ''}
                            </button>
                        ))}
                    </div>
                    <p className="input-hint">
                        Higher scale = larger images, better quality for printing
                    </p>
                </div>
            </div>

            <div className="tool-footer">
                <div className="tool-summary">
                    <span className="summary-stat">
                        <strong>{activeDocument.pageCount}</strong> pages
                    </span>
                    <span className="summary-divider">•</span>
                    <span className="summary-stat">
                        Format: <strong>{format.toUpperCase()}</strong>
                    </span>
                </div>

                <button
                    className="btn btn-primary btn-lg"
                    onClick={handleExport}
                    disabled={isProcessing}
                >
                    {isProcessing ? (
                        <>
                            <Loader2 size={18} className="animate-spin" />
                            Exporting...
                        </>
                    ) : (
                        <>
                            <Download size={18} />
                            Export Images
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}
