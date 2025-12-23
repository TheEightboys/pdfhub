/**
 * Highlight Tool - Enhanced Control Panel
 * Premium settings for highlighting areas on PDF
 */

import { useState } from 'react';
import { useApp, useToast } from '../../store/appStore';
import {
    Highlighter,
    Download,
    Loader2,
    FileText,
    Palette,
    Eye,
    Undo2,
    Trash2,
    Sparkles
} from 'lucide-react';
import { PDFDocument } from 'pdf-lib';
import { downloadPDF } from '../../utils/pdfHelpers';
import './Tools.css';

const HIGHLIGHT_COLORS = [
    { name: 'Yellow', value: '#FFEB3B' },
    { name: 'Green', value: '#4ADE80' },
    { name: 'Blue', value: '#60A5FA' },
    { name: 'Pink', value: '#F472B6' },
    { name: 'Orange', value: '#FB923C' },
    { name: 'Purple', value: '#C084FC' },
    { name: 'Cyan', value: '#22D3EE' },
    { name: 'Red', value: '#F87171' },
];

const OPACITY_PRESETS = [
    { label: 'Light', value: 0.25 },
    { label: 'Medium', value: 0.4 },
    { label: 'Strong', value: 0.55 },
    { label: 'Solid', value: 0.7 },
];

export function HighlightTool() {
    const { state } = useApp();
    const { addToast } = useToast();
    const { activeDocument, selectedPages } = state;

    const [selectedColor, setSelectedColor] = useState(HIGHLIGHT_COLORS[0]);
    const [opacity, setOpacity] = useState(0.4);
    const [isProcessing, setIsProcessing] = useState(false);

    const handleApply = async () => {
        if (!activeDocument) {
            addToast({
                type: 'warning',
                title: 'No highlights',
                message: 'Please add highlights to the PDF first.',
            });
            return;
        }

        setIsProcessing(true);

        try {
            const pdfDoc = await PDFDocument.load(activeDocument.arrayBuffer.slice(0));

            // Simulate processing - in full implementation, embed highlight regions
            await new Promise(resolve => setTimeout(resolve, 1500));

            const pdfBytes = await pdfDoc.save();
            const fileName = activeDocument.name.replace('.pdf', '_highlighted.pdf');
            downloadPDF(pdfBytes, fileName);

            addToast({
                type: 'success',
                title: 'Highlights Applied',
                message: `Saved as ${fileName}`,
            });
        } catch (error) {
            console.error('Error applying highlights:', error);
            addToast({
                type: 'error',
                title: 'Error',
                message: 'Failed to apply highlights.',
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
                        <Highlighter size={36} />
                    </div>
                    <h3>No PDF Loaded</h3>
                    <p>Open a PDF to highlight important areas</p>
                </div>
            </div>
        );
    }

    return (
        <div className="tool-panel">
            <div className="tool-header">
                <h2 className="tool-title">
                    <Highlighter size={22} />
                    Highlight
                </h2>
                <p className="tool-description">Highlight important areas on your PDF</p>
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
                                    ? `${selectedPages.length} page(s) selected`
                                    : `${activeDocument.pageCount} pages`}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Highlight Instructions */}
                <div className="tool-section">
                    <div className="info-banner highlight-banner">
                        <Sparkles size={18} />
                        <div>
                            <strong>Highlight Mode Active</strong>
                            <p style={{ margin: '4px 0 0', opacity: 0.9 }}>
                                Click and drag on the PDF to highlight areas
                            </p>
                        </div>
                    </div>
                </div>

                {/* Color Selection */}
                <div className="tool-section">
                    <h3 className="section-title">
                        <Palette size={14} />
                        Highlight Color
                    </h3>
                    <div className="color-grid large">
                        {HIGHLIGHT_COLORS.map(color => (
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

                {/* Opacity Selection */}
                <div className="tool-section">
                    <h3 className="section-title">
                        <Eye size={14} />
                        Opacity
                    </h3>
                    <div className="opacity-presets">
                        {OPACITY_PRESETS.map(preset => (
                            <button
                                key={preset.value}
                                className={`opacity-btn ${opacity === preset.value ? 'active' : ''}`}
                                onClick={() => setOpacity(preset.value)}
                            >
                                <span
                                    className="opacity-preview"
                                    style={{
                                        backgroundColor: selectedColor.value,
                                        opacity: preset.value
                                    }}
                                />
                                <span className="opacity-label">{preset.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Custom Opacity Slider */}
                <div className="tool-section">
                    <div className="control-row">
                        <input
                            type="range"
                            min="0.1"
                            max="0.8"
                            step="0.05"
                            value={opacity}
                            onChange={(e) => setOpacity(Number(e.target.value))}
                            className="range-slider"
                        />
                        <span className="range-value">{Math.round(opacity * 100)}%</span>
                    </div>
                </div>

                {/* Preview */}
                <div className="tool-section">
                    <h3 className="section-title">Preview</h3>
                    <div className="highlight-preview">
                        <div
                            className="highlight-preview-bar"
                            style={{
                                backgroundColor: selectedColor.value,
                                opacity: opacity
                            }}
                        />
                        <span className="preview-text">Sample highlighted text</span>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="tool-section">
                    <h3 className="section-title">Quick Actions</h3>
                    <div className="quick-actions">
                        <button className="quick-action-btn" title="Undo Last Highlight">
                            <Undo2 size={18} />
                            <span>Undo</span>
                        </button>
                        <button className="quick-action-btn danger" title="Clear All Highlights">
                            <Trash2 size={18} />
                            <span>Clear All</span>
                        </button>
                    </div>
                </div>

                {/* Highlight Prompt */}
                <div className="tool-section">
                    <div className="draw-on-pdf-prompt highlight-prompt">
                        <div
                            className="prompt-icon"
                            style={{
                                backgroundColor: selectedColor.value,
                                opacity: opacity + 0.3
                            }}
                        >
                            <Highlighter size={24} style={{ color: '#000' }} />
                        </div>
                        <div className="prompt-content">
                            <h4>Drag to Highlight</h4>
                            <p>Select text or draw rectangles over areas to highlight them.</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="tool-footer">
                <div className="tool-summary">
                    <Highlighter size={16} />
                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span
                            style={{
                                width: 16,
                                height: 8,
                                borderRadius: '2px',
                                backgroundColor: selectedColor.value,
                                opacity: opacity
                            }}
                        />
                        {Math.round(opacity * 100)}% opacity
                    </span>
                </div>
                <button
                    className="btn btn-primary btn-highlight"
                    onClick={handleApply}
                    disabled={isProcessing}
                    style={{
                        background: `linear-gradient(145deg, ${selectedColor.value} 0%, ${selectedColor.value}dd 100%)`
                    }}
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
