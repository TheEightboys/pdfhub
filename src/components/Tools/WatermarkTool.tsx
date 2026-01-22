/**
 * Watermark Tool
 * Add text or image watermarks to PDF
 */

import { useState, useEffect } from 'react';
import { useApp, useToast } from '../../store/appStore';
import { addWatermark, downloadPDF, loadPDF } from '../../utils/pdfHelpers';
import { WatermarkOptions } from '../../types';
import {
    Loader2,
    Droplets,
    Type,
    Image,
    Download,
    RefreshCw,
    FileText,
    Check,
    Eye,
} from 'lucide-react';
import './Tools.css';

type WatermarkType = 'text' | 'image';
type Position = 'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'diagonal';

export function WatermarkTool() {
    const { state, setLoading, setPreviewState, loadDocument } = useApp();
    const { addToast } = useToast();
    const { activeDocument } = state;

    const [watermarkType, setWatermarkType] = useState<WatermarkType>('text');
    const [text, setText] = useState('CONFIDENTIAL');
    const [fontSize, setFontSize] = useState(48);
    const [color, setColor] = useState('#6366f1');
    const [opacity, setOpacity] = useState(30);
    const [rotation, setRotation] = useState(45);
    const [position, setPosition] = useState<Position>('diagonal');
    const [applyTo, setApplyTo] = useState<'all' | 'custom'>('all');
    const [customPages, setCustomPages] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    // Result state - PREVIEW_READY
    const [resultData, setResultData] = useState<Uint8Array | null>(null);
    const [resultFileName, setResultFileName] = useState('');
    const [isPreviewReady, setIsPreviewReady] = useState(false);

    // Update preview whenever settings change
    useEffect(() => {
        if (!activeDocument || isPreviewReady) return;

        let pages: number[] | undefined;
        if (applyTo === 'custom' && customPages.trim()) {
            pages = customPages.split(',').map(p => parseInt(p.trim())).filter(p => !isNaN(p));
        }

        const options: WatermarkOptions = {
            type: watermarkType,
            text: watermarkType === 'text' ? text : undefined,
            fontSize,
            color,
            opacity: opacity / 100,
            rotation: position === 'diagonal' ? rotation : 0,
            position: position === 'diagonal' ? 'center' : position,
            pages,
        };

        setPreviewState({
            type: 'watermark',
            data: options,
            timestamp: Date.now()
        });

        return () => setPreviewState(null);
    }, [activeDocument, watermarkType, text, fontSize, color, opacity, rotation, position, applyTo, customPages, setPreviewState, isPreviewReady]);

    const handleApplyWatermark = async () => {
        if (!activeDocument) return;

        if (watermarkType === 'text' && !text.trim()) {
            addToast({
                type: 'warning',
                title: 'Enter watermark text',
                message: 'Please enter the text for the watermark.',
            });
            return;
        }

        setIsProcessing(true);
        setLoading(true, 'Adding watermark...');

        try {
            let pages: number[] | undefined;
            if (applyTo === 'custom' && customPages.trim()) {
                pages = customPages.split(',').map(p => parseInt(p.trim())).filter(p => !isNaN(p));
            }

            const options: WatermarkOptions = {
                type: watermarkType,
                text: watermarkType === 'text' ? text : undefined,
                fontSize,
                color,
                opacity: opacity / 100,
                rotation: position === 'diagonal' ? rotation : 0,
                position: position === 'diagonal' ? 'center' : position,
                pages,
            };

            const watermarkedBytes = await addWatermark(activeDocument.arrayBuffer.slice(0), options);
            const fileName = activeDocument.name.replace('.pdf', '_watermarked.pdf');

            setResultData(watermarkedBytes);
            setResultFileName(fileName);

            // Load watermarked PDF into viewer for preview
            const blob = new Blob([new Uint8Array(watermarkedBytes).buffer], { type: 'application/pdf' });
            const watermarkedFile = new File([blob], fileName, { type: 'application/pdf' });
            const doc = await loadPDF(watermarkedFile);
            loadDocument(doc);

            setPreviewState(null); // Clear live preview overlay
            setIsPreviewReady(true);

            addToast({
                type: 'success',
                title: 'Watermark applied!',
                message: 'Preview is now showing in the viewer.',
            });
        } catch (error) {
            console.error('Watermark failed:', error);
            addToast({
                type: 'error',
                title: 'Watermark failed',
                message: 'An error occurred while adding the watermark.',
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
                    <Droplets size={48} />
                    <h3>Open a PDF first</h3>
                    <p>Upload a PDF file to add a watermark.</p>
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
                    <span>Preview: Watermarked PDF</span>
                </div>

                <div className="tool-header">
                    <h2 className="tool-title">Watermark Applied</h2>
                    <p className="tool-description">
                        Review the watermarked PDF in the viewer, then download when ready.
                    </p>
                </div>

                <div className="tool-content">
                    <div className="preview-info">
                        <div className="preview-info-icon">
                            <Check size={32} strokeWidth={2.5} />
                        </div>
                        <div className="preview-info-text">
                            <h3>Ready for Download</h3>
                            <p>The watermarked PDF is now showing in the viewer. Watermark: "{text}"</p>
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
                        <div className="preview-stat">
                            <span className="stat-value">{text.substring(0, 8)}{text.length > 8 ? '...' : ''}</span>
                            <span className="stat-label">Watermark</span>
                        </div>
                    </div>
                </div>

                <div className="tool-footer">
                    <button className="btn btn-secondary" onClick={handleReset}>
                        <RefreshCw size={16} />
                        Add Another
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
                <h2 className="tool-title">Add Watermark</h2>
                <p className="tool-description">
                    Add a text or image watermark to your PDF pages.
                </p>
            </div>

            <div className="tool-content">
                <div className="tool-section">
                    <h4 className="section-title">Watermark Type</h4>
                    <div className="mode-tabs">
                        <button
                            className={`mode-tab ${watermarkType === 'text' ? 'active' : ''}`}
                            onClick={() => setWatermarkType('text')}
                        >
                            <Type size={16} />
                            Text
                        </button>
                        <button
                            className={`mode-tab ${watermarkType === 'image' ? 'active' : ''}`}
                            onClick={() => setWatermarkType('image')}
                            disabled
                            title="Coming soon"
                        >
                            <Image size={16} />
                            Image
                        </button>
                    </div>
                </div>

                {watermarkType === 'text' && (
                    <>
                        <div className="tool-section">
                            <h4 className="section-title">Watermark Text</h4>
                            <input
                                type="text"
                                value={text}
                                onChange={(e) => setText(e.target.value)}
                                placeholder="Enter watermark text..."
                                className="text-input"
                            />
                        </div>

                        <div className="tool-section">
                            <h4 className="section-title">Font Size: {fontSize}px</h4>
                            <input
                                type="range"
                                min={12}
                                max={120}
                                value={fontSize}
                                onChange={(e) => setFontSize(parseInt(e.target.value))}
                                className="slider"
                            />
                        </div>

                        <div className="tool-section">
                            <h4 className="section-title">Color</h4>
                            <div className="color-picker-row">
                                <input
                                    type="color"
                                    value={color}
                                    onChange={(e) => setColor(e.target.value)}
                                    className="color-picker"
                                />
                                <span className="color-value">{color}</span>
                            </div>
                        </div>
                    </>
                )}

                <div className="tool-section">
                    <h4 className="section-title">Opacity: {opacity}%</h4>
                    <input
                        type="range"
                        min={5}
                        max={100}
                        value={opacity}
                        onChange={(e) => setOpacity(parseInt(e.target.value))}
                        className="slider"
                    />
                </div>

                <div className="tool-section">
                    <h4 className="section-title">Position</h4>
                    <div className="position-grid">
                        {[
                            { id: 'top-left', label: '↖' },
                            { id: 'center', label: '•' },
                            { id: 'top-right', label: '↗' },
                            { id: 'bottom-left', label: '↙' },
                            { id: 'diagonal', label: '↘', fullLabel: 'Diagonal' },
                            { id: 'bottom-right', label: '↘' },
                        ].map(pos => (
                            <button
                                key={pos.id}
                                className={`position-btn ${position === pos.id ? 'active' : ''}`}
                                onClick={() => setPosition(pos.id as Position)}
                                title={pos.fullLabel || pos.id}
                            >
                                {pos.id === 'diagonal' ? 'Diagonal' : pos.label}
                            </button>
                        ))}
                    </div>
                </div>

                {position === 'diagonal' && (
                    <div className="tool-section">
                        <h4 className="section-title">Rotation: {rotation}°</h4>
                        <input
                            type="range"
                            min={-90}
                            max={90}
                            value={rotation}
                            onChange={(e) => setRotation(parseInt(e.target.value))}
                            className="slider"
                        />
                    </div>
                )}

                <div className="tool-section">
                    <h4 className="section-title">Apply To</h4>
                    <div className="mode-tabs">
                        <button
                            className={`mode-tab ${applyTo === 'all' ? 'active' : ''}`}
                            onClick={() => setApplyTo('all')}
                        >
                            All Pages
                        </button>
                        <button
                            className={`mode-tab ${applyTo === 'custom' ? 'active' : ''}`}
                            onClick={() => setApplyTo('custom')}
                        >
                            Custom Range
                        </button>
                    </div>

                    {applyTo === 'custom' && (
                        <input
                            type="text"
                            value={customPages}
                            onChange={(e) => setCustomPages(e.target.value)}
                            placeholder="e.g., 1, 3, 5-10"
                            className="text-input"
                            style={{ marginTop: 'var(--space-3)' }}
                        />
                    )}
                </div>
            </div>

            <div className="tool-footer">
                <div className="tool-summary">
                    <span className="summary-stat">
                        <strong>{activeDocument.pageCount}</strong> pages
                    </span>
                </div>

                <button
                    className="btn btn-primary btn-lg"
                    onClick={handleApplyWatermark}
                    disabled={isProcessing || (watermarkType === 'text' && !text.trim())}
                >
                    {isProcessing ? (
                        <>
                            <Loader2 size={18} className="animate-spin" />
                            Applying...
                        </>
                    ) : (
                        <>
                            <Droplets size={18} />
                            Apply Watermark
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}
