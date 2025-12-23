/**
 * Page Background Tool
 * Add background color or image to PDF pages
 */

import { useState, useCallback, useRef } from 'react';
import { useApp, useToast } from '../../store/appStore';
import { PDFDocument, rgb } from 'pdf-lib';
import { downloadPDF } from '../../utils/pdfHelpers';
import { PaintBucket, Download, Loader2, Image as ImageIcon, Trash2 } from 'lucide-react';
import './Tools.css';

const PRESET_COLORS = [
    { name: 'White', value: '#ffffff' },
    { name: 'Cream', value: '#fffdd0' },
    { name: 'Light Gray', value: '#f0f0f0' },
    { name: 'Light Blue', value: '#e3f2fd' },
    { name: 'Light Green', value: '#e8f5e9' },
    { name: 'Light Yellow', value: '#fffde7' },
    { name: 'Light Pink', value: '#fce4ec' },
    { name: 'Light Purple', value: '#f3e5f5' },
];

export function PageBackgroundTool() {
    const { state, setLoading } = useApp();
    const { addToast } = useToast();
    const { activeDocument } = state;

    const [isProcessing, setIsProcessing] = useState(false);
    const [backgroundType, setBackgroundType] = useState<'color' | 'image'>('color');
    const [selectedColor, setSelectedColor] = useState('#ffffff');
    const [customColor, setCustomColor] = useState('#ffffff');
    const [backgroundImage, setBackgroundImage] = useState<ArrayBuffer | null>(null);
    const [imagePreview, setImagePreview] = useState<string>('');
    const [opacity, setOpacity] = useState(100);
    const [applyTo, setApplyTo] = useState<'all' | 'odd' | 'even' | 'custom'>('all');
    const [customPages, setCustomPages] = useState('');
    const [imageFit, setImageFit] = useState<'fit' | 'fill' | 'tile'>('fit');

    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const arrayBuffer = event.target?.result as ArrayBuffer;
                setBackgroundImage(arrayBuffer);
                setImagePreview(URL.createObjectURL(file));
            };
            reader.readAsArrayBuffer(file);
        }
    };

    const removeImage = () => {
        setBackgroundImage(null);
        setImagePreview('');
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16) / 255,
            g: parseInt(result[2], 16) / 255,
            b: parseInt(result[3], 16) / 255,
        } : { r: 1, g: 1, b: 1 };
    };

    const handleApplyBackground = useCallback(async () => {
        if (!activeDocument) return;

        if (backgroundType === 'image' && !backgroundImage) {
            addToast({
                type: 'error',
                title: 'No image selected',
                message: 'Please upload a background image first.',
            });
            return;
        }

        setIsProcessing(true);
        setLoading(true, 'Applying background...');

        try {
            // Clone buffer to prevent detachment issues
            const bufferClone = activeDocument.arrayBuffer.slice(0);
            const pdfDoc = await PDFDocument.load(bufferClone, { ignoreEncryption: true });
            const pages = pdfDoc.getPages();

            // Determine which pages to apply background to
            let pagesToApply: number[] = [];

            if (applyTo === 'all') {
                pagesToApply = Array.from({ length: pages.length }, (_, i) => i);
            } else if (applyTo === 'odd') {
                pagesToApply = Array.from({ length: pages.length }, (_, i) => i).filter(i => i % 2 === 0);
            } else if (applyTo === 'even') {
                pagesToApply = Array.from({ length: pages.length }, (_, i) => i).filter(i => i % 2 === 1);
            } else {
                pagesToApply = parsePageRange(customPages, pages.length);
            }

            // Apply background to selected pages
            for (const pageIndex of pagesToApply) {
                if (pageIndex >= 0 && pageIndex < pages.length) {
                    const page = pages[pageIndex];
                    const { width, height } = page.getSize();

                    if (backgroundType === 'color') {
                        const color = hexToRgb(selectedColor === 'custom' ? customColor : selectedColor);

                        // Draw a rectangle as overlay with opacity
                        // Note: This appears on top of content, so use appropriate opacity
                        page.drawRectangle({
                            x: 0,
                            y: 0,
                            width: width,
                            height: height,
                            color: rgb(color.r, color.g, color.b),
                            opacity: opacity / 100,
                        });

                    } else if (backgroundType === 'image' && backgroundImage) {
                        // Embed the image
                        let image;
                        const imageBytes = new Uint8Array(backgroundImage);

                        // Detect image type
                        const isPng = imageBytes[0] === 0x89 && imageBytes[1] === 0x50;

                        if (isPng) {
                            image = await pdfDoc.embedPng(backgroundImage);
                        } else {
                            image = await pdfDoc.embedJpg(backgroundImage);
                        }

                        let drawWidth = width;
                        let drawHeight = height;
                        let x = 0;
                        let y = 0;

                        if (imageFit === 'fit') {
                            // Scale to fit within page
                            const scaleX = width / image.width;
                            const scaleY = height / image.height;
                            const scale = Math.min(scaleX, scaleY);
                            drawWidth = image.width * scale;
                            drawHeight = image.height * scale;
                            x = (width - drawWidth) / 2;
                            y = (height - drawHeight) / 2;
                        } else if (imageFit === 'fill') {
                            // Scale to fill page (may crop)
                            const scaleX = width / image.width;
                            const scaleY = height / image.height;
                            const scale = Math.max(scaleX, scaleY);
                            drawWidth = image.width * scale;
                            drawHeight = image.height * scale;
                            x = (width - drawWidth) / 2;
                            y = (height - drawHeight) / 2;
                        } else if (imageFit === 'tile') {
                            // Tile the image
                            const tileWidth = image.width;
                            const tileHeight = image.height;

                            for (let tx = 0; tx < width; tx += tileWidth) {
                                for (let ty = 0; ty < height; ty += tileHeight) {
                                    page.drawImage(image, {
                                        x: tx,
                                        y: ty,
                                        width: tileWidth,
                                        height: tileHeight,
                                        opacity: opacity / 100,
                                    });
                                }
                            }
                            continue; // Skip the single draw below
                        }

                        page.drawImage(image, {
                            x,
                            y,
                            width: drawWidth,
                            height: drawHeight,
                            opacity: opacity / 100,
                        });
                    }
                }
            }

            const pdfBytes = await pdfDoc.save();
            const fileName = activeDocument.name.replace('.pdf', '_background.pdf');
            downloadPDF(pdfBytes, fileName);

            addToast({
                type: 'success',
                title: 'Background applied!',
                message: `Applied background to ${pagesToApply.length} page(s)`,
            });
        } catch (error) {
            console.error('Background apply failed:', error);
            addToast({
                type: 'error',
                title: 'Apply failed',
                message: 'An error occurred while applying the background.',
            });
        } finally {
            setIsProcessing(false);
            setLoading(false);
        }
    }, [activeDocument, backgroundType, selectedColor, customColor, backgroundImage, opacity, applyTo, customPages, imageFit, setLoading, addToast]);

    if (!activeDocument) {
        return (
            <div className="tool-panel">
                <div className="tool-empty">
                    <PaintBucket size={48} />
                    <h3>Open a PDF first</h3>
                    <p>Upload a PDF file to add a background.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="tool-panel">
            <div className="tool-header">
                <h2 className="tool-title">Page Background</h2>
                <p className="tool-description">
                    Add a background color or image to your PDF pages
                </p>
            </div>

            <div className="tool-content">
                {/* Background Type */}
                <div className="tool-section">
                    <h4 className="section-title">Background Type</h4>
                    <div className="btn-group">
                        <button
                            className={`btn ${backgroundType === 'color' ? 'btn-primary' : 'btn-ghost'}`}
                            onClick={() => setBackgroundType('color')}
                        >
                            <PaintBucket size={16} />
                            Color
                        </button>
                        <button
                            className={`btn ${backgroundType === 'image' ? 'btn-primary' : 'btn-ghost'}`}
                            onClick={() => setBackgroundType('image')}
                        >
                            <ImageIcon size={16} />
                            Image
                        </button>
                    </div>
                </div>

                {/* Color Selection */}
                {backgroundType === 'color' && (
                    <div className="tool-section">
                        <h4 className="section-title">Select Color</h4>
                        <div className="color-grid">
                            {PRESET_COLORS.map(color => (
                                <button
                                    key={color.name}
                                    className={`color-swatch ${selectedColor === color.value ? 'active' : ''}`}
                                    style={{ backgroundColor: color.value }}
                                    onClick={() => setSelectedColor(color.value)}
                                    title={color.name}
                                />
                            ))}
                            <button
                                className={`color-swatch custom ${selectedColor === 'custom' ? 'active' : ''}`}
                                onClick={() => setSelectedColor('custom')}
                                title="Custom color"
                            >
                                <span>+</span>
                            </button>
                        </div>

                        {selectedColor === 'custom' && (
                            <div className="custom-color-picker">
                                <label>Custom Color</label>
                                <input
                                    type="color"
                                    value={customColor}
                                    onChange={(e) => setCustomColor(e.target.value)}
                                />
                                <span>{customColor}</span>
                            </div>
                        )}
                    </div>
                )}

                {/* Image Upload */}
                {backgroundType === 'image' && (
                    <div className="tool-section">
                        <h4 className="section-title">Background Image</h4>

                        {imagePreview ? (
                            <div className="image-preview-container">
                                <img src={imagePreview} alt="Background preview" className="image-preview" />
                                <button className="btn btn-ghost btn-sm" onClick={removeImage}>
                                    <Trash2 size={14} />
                                    Remove
                                </button>
                            </div>
                        ) : (
                            <div className="upload-area" onClick={() => fileInputRef.current?.click()}>
                                <ImageIcon size={32} />
                                <p>Click to upload an image</p>
                                <span>PNG or JPG</span>
                            </div>
                        )}

                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/png,image/jpeg"
                            onChange={handleImageUpload}
                            style={{ display: 'none' }}
                        />

                        {imagePreview && (
                            <div className="image-fit-options">
                                <label>Image Fit</label>
                                <div className="radio-options">
                                    <label className="radio-option">
                                        <input
                                            type="radio"
                                            name="imageFit"
                                            checked={imageFit === 'fit'}
                                            onChange={() => setImageFit('fit')}
                                        />
                                        <span>Fit (maintain aspect)</span>
                                    </label>
                                    <label className="radio-option">
                                        <input
                                            type="radio"
                                            name="imageFit"
                                            checked={imageFit === 'fill'}
                                            onChange={() => setImageFit('fill')}
                                        />
                                        <span>Fill (may crop)</span>
                                    </label>
                                    <label className="radio-option">
                                        <input
                                            type="radio"
                                            name="imageFit"
                                            checked={imageFit === 'tile'}
                                            onChange={() => setImageFit('tile')}
                                        />
                                        <span>Tile (repeat)</span>
                                    </label>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Opacity */}
                <div className="tool-section">
                    <h4 className="section-title">Opacity: {opacity}%</h4>
                    <input
                        type="range"
                        min={10}
                        max={100}
                        value={opacity}
                        onChange={(e) => setOpacity(parseInt(e.target.value))}
                        className="range-slider"
                    />
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
                                checked={applyTo === 'odd'}
                                onChange={() => setApplyTo('odd')}
                            />
                            <span>Odd pages only</span>
                        </label>
                        <label className="radio-option">
                            <input
                                type="radio"
                                name="applyTo"
                                checked={applyTo === 'even'}
                                onChange={() => setApplyTo('even')}
                            />
                            <span>Even pages only</span>
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

                {/* Action Button */}
                <div className="tool-actions">
                    <button
                        className="btn btn-primary btn-lg"
                        onClick={handleApplyBackground}
                        disabled={isProcessing || (backgroundType === 'image' && !backgroundImage)}
                    >
                        {isProcessing ? (
                            <>
                                <Loader2 size={20} className="animate-spin" />
                                Applying...
                            </>
                        ) : (
                            <>
                                <Download size={20} />
                                Apply & Download
                            </>
                        )}
                    </button>
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
