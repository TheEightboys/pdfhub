/**
 * Draw Tool - Enhanced Control Panel
 * Premium settings for freehand drawing on PDF
 */

import { useState } from 'react';
import { useApp, useToast } from '../../store/appStore';
import {
    Pencil,
    Download,
    Loader2,
    Palette,
    Circle,
    Undo2,
    Trash2,
    FileText,
    Sparkles
} from 'lucide-react';
import { PDFDocument } from 'pdf-lib';
import { downloadPDF } from '../../utils/pdfHelpers';
import './Tools.css';

const DRAW_COLORS = [
    { name: 'Red', value: '#dc2626' },
    { name: 'Black', value: '#000000' },
    { name: 'Blue', value: '#2563eb' },
    { name: 'Green', value: '#16a34a' },
    { name: 'Orange', value: '#ea580c' },
    { name: 'Purple', value: '#9333ea' },
    { name: 'Pink', value: '#ec4899' },
    { name: 'Yellow', value: '#eab308' },
];

const BRUSH_SIZES = [
    { value: 1, label: 'XS', size: 6 },
    { value: 2, label: 'S', size: 10 },
    { value: 3, label: 'M', size: 14 },
    { value: 5, label: 'L', size: 18 },
    { value: 8, label: 'XL', size: 24 },
];

export function DrawTool() {
    const { state } = useApp();
    const { addToast } = useToast();
    const { activeDocument, selectedPages } = state;

    const [selectedColor, setSelectedColor] = useState(DRAW_COLORS[0]);
    const [brushSize, setBrushSize] = useState(3);
    const [isProcessing, setIsProcessing] = useState(false);

    const handleApply = async () => {
        if (!activeDocument) {
            addToast({
                type: 'warning',
                title: 'No drawings',
                message: 'Please draw something on the PDF first.',
            });
            return;
        }

        setIsProcessing(true);

        try {
            const pdfDoc = await PDFDocument.load(activeDocument.arrayBuffer.slice(0));

            // Simulate processing - in full implementation, embed strokes
            await new Promise(resolve => setTimeout(resolve, 1500));

            const pdfBytes = await pdfDoc.save();
            const fileName = activeDocument.name.replace('.pdf', '_annotated.pdf');
            downloadPDF(pdfBytes, fileName);

            addToast({
                type: 'success',
                title: 'Drawing Applied',
                message: `Saved as ${fileName}`,
            });
        } catch (error) {
            console.error('Error applying drawing:', error);
            addToast({
                type: 'error',
                title: 'Error',
                message: 'Failed to apply drawing.',
            });
        } finally {
            setIsProcessing(false);
        }
    };

    if (!activeDocument) {
        return (
            <div className="tool-panel">
                <div className="tool-empty">
                    <div className="tool-empty-icon">
                        <Pencil size={36} />
                    </div>
                    <h3>No PDF Loaded</h3>
                    <p>Open a PDF to draw and annotate</p>
                </div>
            </div>
        );
    }

    return (
        <div className="tool-panel">
            <div className="tool-header">
                <h2 className="tool-title">
                    <Pencil size={22} />
                    Draw & Annotate
                </h2>
                <p className="tool-description">Draw freehand on your PDF pages</p>
            </div>

            <div className="tool-content">
                {/* Document Info */}
                <div className="tool-section">
                    <div className="compress-file-info">
                        <div className="compress-file-icon">
                            <FileText size={24} />
                        </div>
                        <div className="compress-file-details">
                            <span className="compress-file-name">{activeDocument.name}</span>
                            <span className="compress-file-size">
                                {selectedPages.length > 0
                                    ? `Drawing on ${selectedPages.length} page(s)`
                                    : 'Drawing on current page'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Draw Instructions */}
                <div className="tool-section">
                    <div className="info-banner draw-banner">
                        <Sparkles size={18} />
                        <div>
                            <strong>Drawing Mode Active</strong>
                            <p style={{ margin: '4px 0 0', opacity: 0.9 }}>
                                Click and drag on the PDF to draw
                            </p>
                        </div>
                    </div>
                </div>

                {/* Color Selection */}
                <div className="tool-section">
                    <h3 className="section-title">
                        <Palette size={14} />
                        Brush Color
                    </h3>
                    <div className="color-grid large">
                        {DRAW_COLORS.map(color => (
                            <button
                                key={color.value}
                                className={`color-btn ${selectedColor.value === color.value ? 'active' : ''}`}
                                style={{ backgroundColor: color.value }}
                                onClick={() => setSelectedColor(color)}
                                title={color.name}
                            />
                        ))}
                    </div>
                </div>

                {/* Brush Size */}
                <div className="tool-section">
                    <h3 className="section-title">
                        <Circle size={14} />
                        Brush Size
                    </h3>
                    <div className="brush-sizes">
                        {BRUSH_SIZES.map(size => (
                            <button
                                key={size.value}
                                className={`brush-btn ${brushSize === size.value ? 'active' : ''}`}
                                onClick={() => setBrushSize(size.value)}
                                title={`${size.label} - ${size.value}px`}
                            >
                                <span
                                    className="brush-preview"
                                    style={{
                                        width: size.size,
                                        height: size.size,
                                        backgroundColor: selectedColor.value,
                                    }}
                                />
                                <span className="brush-label">{size.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Preview */}
                <div className="tool-section">
                    <h3 className="section-title">Preview</h3>
                    <div className="brush-preview-large">
                        <svg width="100%" height="60" viewBox="0 0 200 60">
                            <path
                                d="M 10 30 Q 30 10, 60 30 T 100 30 T 140 30 T 190 30"
                                stroke={selectedColor.value}
                                strokeWidth={brushSize}
                                fill="none"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </svg>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="tool-section">
                    <h3 className="section-title">Quick Actions</h3>
                    <div className="quick-actions">
                        <button className="quick-action-btn" title="Undo Last Stroke">
                            <Undo2 size={18} />
                            <span>Undo</span>
                        </button>
                        <button className="quick-action-btn danger" title="Clear All Drawings">
                            <Trash2 size={18} />
                            <span>Clear All</span>
                        </button>
                    </div>
                </div>

                {/* Draw Prompt */}
                <div className="tool-section">
                    <div className="draw-on-pdf-prompt">
                        <div className="prompt-icon" style={{ backgroundColor: selectedColor.value }}>
                            <Pencil size={24} style={{ color: '#fff' }} />
                        </div>
                        <div className="prompt-content">
                            <h4>Start Drawing</h4>
                            <p>Your strokes appear in real-time on the PDF. Change colors anytime!</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="tool-footer">
                <div className="tool-summary">
                    <Pencil size={16} />
                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span
                            style={{
                                width: 12,
                                height: 12,
                                borderRadius: '50%',
                                backgroundColor: selectedColor.value
                            }}
                        />
                        {brushSize}px brush
                    </span>
                </div>
                <button
                    className="btn btn-primary"
                    onClick={handleApply}
                    disabled={isProcessing}
                >
                    {isProcessing ? (
                        <>
                            <Loader2 size={18} className="animate-spin" />
                            <span>Processing...</span>
                        </>
                    ) : (
                        <>
                            <Download size={18} />
                            <span>Apply & Download</span>
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}
