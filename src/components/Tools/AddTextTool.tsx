/**
 * Add Text Tool - Compact Improved UI
 * Add text annotations to PDF pages
 */

import { useState } from 'react';
import { useApp } from '../../store/appStore';
import { Type, FileText, AlignLeft, AlignCenter, AlignRight, Bold, Italic } from 'lucide-react';
import './Tools.css';

const FONT_SIZES = [8, 10, 12, 14, 16, 18, 20, 24, 28, 32];
const FONTS = [
    { value: 'Helvetica', label: 'Helvetica' },
    { value: 'Times-Roman', label: 'Times Roman' },
    { value: 'Courier', label: 'Courier' },
    { value: 'Arial', label: 'Arial' },
];

const TEXT_COLORS = [
    { name: 'Black', value: '#000000' },
    { name: 'Red', value: '#dc2626' },
    { name: 'Blue', value: '#1e40af' },
    { name: 'Green', value: '#16a34a' },
    { name: 'Orange', value: '#ea580c' },
    { name: 'Purple', value: '#7c3aed' },
];

export function AddTextTool() {
    const { state, setActiveTool, setToolOptions } = useApp();
    const { activeDocument } = state;

    const [fontSize, setFontSize] = useState(12);
    const [fontFamily, setFontFamily] = useState('Arial');
    const [textColor, setTextColor] = useState('#000000');
    const [alignment, setAlignment] = useState<'left' | 'center' | 'right'>('left');
    const [isBold, setIsBold] = useState(false);
    const [isItalic, setIsItalic] = useState(false);

    const handleActivateAddText = () => {
        // Set tool options and activate add-text mode
        setToolOptions({
            drawColor: textColor,
        });
        setActiveTool('add-text');
    };

    if (!activeDocument) {
        return (
            <div className="tool-panel">
                <div className="tool-empty">
                    <div className="tool-empty-icon">
                        <Type size={36} />
                    </div>
                    <h3>No PDF Loaded</h3>
                    <p>Open a PDF file to add text</p>
                </div>
            </div>
        );
    }

    return (
        <div className="tool-panel">
            <div className="tool-header">
                <h2 className="tool-title">Add Text</h2>
                <p className="tool-description">Click on PDF to place text</p>
            </div>

            <div className="tool-content">
                {/* Document Info - Compact */}
                <div className="tool-section">
                    <div className="compress-file-info compact">
                        <div className="compress-file-icon">
                            <FileText size={20} />
                        </div>
                        <div className="compress-file-details">
                            <span className="compress-file-name">{activeDocument.name}</span>
                            <span className="compress-file-size">{activeDocument.pageCount} pages</span>
                        </div>
                    </div>
                </div>

                {/* Formatting Row - Compact Horizontal */}
                <div className="tool-section">
                    <div className="compact-format-row">
                        <div className="compact-format-group">
                            <label className="compact-label">Font</label>
                            <select
                                className="compact-select"
                                value={fontFamily}
                                onChange={(e) => setFontFamily(e.target.value)}
                            >
                                {FONTS.map(f => (
                                    <option key={f.value} value={f.value}>{f.label}</option>
                                ))}
                            </select>
                        </div>

                        <div className="compact-format-group">
                            <label className="compact-label">Size</label>
                            <select
                                className="compact-select compact-select-sm"
                                value={fontSize}
                                onChange={(e) => setFontSize(Number(e.target.value))}
                            >
                                {FONT_SIZES.map(s => (
                                    <option key={s} value={s}>{s}px</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Color Selection - Compact */}
                <div className="tool-section">
                    <h4 className="section-title-inline">Color</h4>
                    <div className="color-row">
                        {TEXT_COLORS.map(color => (
                            <button
                                key={color.value}
                                className={`color-btn-sm ${textColor === color.value ? 'active' : ''}`}
                                style={{ backgroundColor: color.value }}
                                onClick={() => setTextColor(color.value)}
                                title={color.name}
                            />
                        ))}
                        <input
                            type="color"
                            value={textColor}
                            onChange={(e) => setTextColor(e.target.value)}
                            className="color-picker-mini"
                            title="Custom color"
                        />
                    </div>
                </div>

                {/* Style Buttons - Compact Row */}
                <div className="tool-section">
                    <div className="compact-style-row">
                        <div className="style-btn-group">
                            <button
                                className={`style-btn ${isBold ? 'active' : ''}`}
                                onClick={() => setIsBold(!isBold)}
                                title="Bold"
                            >
                                <Bold size={14} />
                            </button>
                            <button
                                className={`style-btn ${isItalic ? 'active' : ''}`}
                                onClick={() => setIsItalic(!isItalic)}
                                title="Italic"
                            >
                                <Italic size={14} />
                            </button>
                        </div>
                        <div className="style-divider" />
                        <div className="style-btn-group">
                            <button
                                className={`style-btn ${alignment === 'left' ? 'active' : ''}`}
                                onClick={() => setAlignment('left')}
                                title="Left"
                            >
                                <AlignLeft size={14} />
                            </button>
                            <button
                                className={`style-btn ${alignment === 'center' ? 'active' : ''}`}
                                onClick={() => setAlignment('center')}
                                title="Center"
                            >
                                <AlignCenter size={14} />
                            </button>
                            <button
                                className={`style-btn ${alignment === 'right' ? 'active' : ''}`}
                                onClick={() => setAlignment('right')}
                                title="Right"
                            >
                                <AlignRight size={14} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Preview / Instruction */}
                <div className="tool-section">
                    <div className="text-preview-box">
                        <span
                            className="text-preview-sample"
                            style={{
                                color: textColor,
                                fontFamily: fontFamily,
                                fontSize: `${Math.min(fontSize, 18)}px`,
                                fontWeight: isBold ? 'bold' : 'normal',
                                fontStyle: isItalic ? 'italic' : 'normal'
                            }}
                        >
                            Sample Text
                        </span>
                    </div>
                </div>

                {/* Instructions */}
                <div className="tool-section">
                    <div className="info-banner-compact" style={{ background: '#eff6ff', borderLeft: '3px solid #3b82f6' }}>
                        <Type size={16} color="#3b82f6" />
                        <span style={{ color: '#1e40af', fontSize: '12px' }}>Click anywhere on the PDF to add text</span>
                    </div>
                </div>
            </div>

            <div className="tool-footer">
                <div className="tool-summary">
                    <Type size={14} />
                    <span>{fontFamily}, {fontSize}px</span>
                </div>
                <button
                    className="btn btn-primary btn-sm"
                    onClick={handleActivateAddText}
                >
                    <Type size={16} />
                    <span>Add Text</span>
                </button>
            </div>
        </div>
    );
}
