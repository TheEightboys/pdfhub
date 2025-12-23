/**
 * Watermark Tool
 * Add text or image watermarks to PDF
 */

import { useState, useEffect } from 'react';
import { useApp, useToast } from '../../store/appStore';
import { addWatermark, downloadPDF } from '../../utils/pdfHelpers';
import { WatermarkOptions } from '../../types';
import {
    Download,
    Loader2,
    Droplets,
    Type,
    Image,
} from 'lucide-react';
import './Tools.css';

type WatermarkType = 'text' | 'image';
type Position = 'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'diagonal';

export function WatermarkTool() {
    const { state, setLoading, setPreviewState } = useApp();
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

    // Update preview whenever settings change
    useEffect(() => {
        if (!activeDocument) return;

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

        // Cleanup preview on unmount
        return () => setPreviewState(null);
    }, [activeDocument, watermarkType, text, fontSize, color, opacity, rotation, position, applyTo, customPages, setPreviewState]);

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
            // Parse custom pages
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
            downloadPDF(watermarkedBytes, fileName);

            addToast({
                type: 'success',
                title: 'Watermark added!',
                message: `Saved to ${fileName}`,
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

    return (
        <div className="tool-panel">
            <div className="tool-header">
                <h2 className="tool-title">Add Watermark</h2>
                <p className="tool-description">
                    Add a text or image watermark to your PDF pages.
                </p>
            </div>

            <div className="tool-content">
                {/* Watermark Type */}
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
                        {/* Text Input */}
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

                        {/* Font Size */}
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

                        {/* Color */}
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

                {/* Opacity */}
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

                {/* Position */}
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

                {/* Apply To */}
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
                            <Download size={18} />
                            Apply & Download
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}
