/**
 * Add Text Tool
 * Add text annotations to PDF pages
 */

import { useState } from 'react';
import { useApp } from '../../store/appStore';
import { Type, FileText, Download, Check, AlignLeft, AlignCenter, AlignRight, Bold, Italic } from 'lucide-react';
import './Tools.css';

const FONT_SIZES = [8, 10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48];
const FONTS = [
    { value: 'Helvetica', label: 'Helvetica' },
    { value: 'Times-Roman', label: 'Times Roman' },
    { value: 'Courier', label: 'Courier' },
];

export function AddTextTool() {
    const { state } = useApp();
    const { activeDocument } = state;

    const [text, setText] = useState('');
    const [fontSize, setFontSize] = useState(14);
    const [fontFamily, setFontFamily] = useState('Helvetica');
    const [textColor, setTextColor] = useState('#000000');
    const [alignment, setAlignment] = useState<'left' | 'center' | 'right'>('left');
    const [isBold, setIsBold] = useState(false);
    const [isItalic, setIsItalic] = useState(false);
    const [position, setPosition] = useState({ x: 50, y: 50 });
    const [targetPage, setTargetPage] = useState(1);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isComplete, setIsComplete] = useState(false);

    const handleAddText = async () => {
        if (!activeDocument || !text.trim()) return;

        setIsProcessing(true);

        // Simulate processing
        await new Promise(resolve => setTimeout(resolve, 2000));

        setIsComplete(true);
        setIsProcessing(false);
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

    if (isComplete) {
        return (
            <div className="tool-panel">
                <div className="tool-header">
                    <h2 className="tool-title">Add Text</h2>
                    <p className="tool-description">Text added successfully</p>
                </div>
                <div className="tool-content">
                    <div className="success-result">
                        <div className="success-icon">
                            <Check size={48} />
                        </div>
                        <h3>Text Added!</h3>
                        <p>Your text has been added to page {targetPage}.</p>
                    </div>
                </div>
                <div className="tool-footer">
                    <button
                        className="btn btn-secondary"
                        onClick={() => {
                            setIsComplete(false);
                            setText('');
                        }}
                    >
                        Add More Text
                    </button>
                    <button className="btn btn-primary">
                        <Download size={18} />
                        <span>Download PDF</span>
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="tool-panel">
            <div className="tool-header">
                <h2 className="tool-title">Add Text</h2>
                <p className="tool-description">
                    Add text anywhere on your PDF pages
                </p>
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
                            <span className="compress-file-size">{activeDocument.pageCount} pages</span>
                        </div>
                    </div>
                </div>

                {/* Text Input */}
                <div className="tool-section">
                    <h3 className="section-title">Text Content</h3>
                    <textarea
                        className="text-input text-area"
                        placeholder="Enter your text here..."
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        rows={4}
                    />
                </div>

                {/* Text Formatting */}
                <div className="tool-section">
                    <h3 className="section-title">Formatting</h3>

                    <div className="format-row">
                        <div className="format-group">
                            <span className="input-label">Font</span>
                            <select
                                className="text-input-sm"
                                value={fontFamily}
                                onChange={(e) => setFontFamily(e.target.value)}
                            >
                                {FONTS.map(f => (
                                    <option key={f.value} value={f.value}>{f.label}</option>
                                ))}
                            </select>
                        </div>

                        <div className="format-group">
                            <span className="input-label">Size</span>
                            <select
                                className="text-input-sm"
                                value={fontSize}
                                onChange={(e) => setFontSize(Number(e.target.value))}
                            >
                                {FONT_SIZES.map(s => (
                                    <option key={s} value={s}>{s}px</option>
                                ))}
                            </select>
                        </div>

                        <div className="format-group">
                            <span className="input-label">Color</span>
                            <input
                                type="color"
                                className="color-picker-sm"
                                value={textColor}
                                onChange={(e) => setTextColor(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="format-buttons">
                        <button
                            className={`format-btn ${isBold ? 'active' : ''}`}
                            onClick={() => setIsBold(!isBold)}
                            title="Bold"
                        >
                            <Bold size={16} />
                        </button>
                        <button
                            className={`format-btn ${isItalic ? 'active' : ''}`}
                            onClick={() => setIsItalic(!isItalic)}
                            title="Italic"
                        >
                            <Italic size={16} />
                        </button>
                        <div className="format-divider" />
                        <button
                            className={`format-btn ${alignment === 'left' ? 'active' : ''}`}
                            onClick={() => setAlignment('left')}
                            title="Align Left"
                        >
                            <AlignLeft size={16} />
                        </button>
                        <button
                            className={`format-btn ${alignment === 'center' ? 'active' : ''}`}
                            onClick={() => setAlignment('center')}
                            title="Align Center"
                        >
                            <AlignCenter size={16} />
                        </button>
                        <button
                            className={`format-btn ${alignment === 'right' ? 'active' : ''}`}
                            onClick={() => setAlignment('right')}
                            title="Align Right"
                        >
                            <AlignRight size={16} />
                        </button>
                    </div>
                </div>

                {/* Position */}
                <div className="tool-section">
                    <h3 className="section-title">Position</h3>

                    {/* Custom Position Inputs */}
                    <div className="custom-position">
                        <div className="position-input-group">
                            <span className="input-label">X Position (%)</span>
                            <input
                                type="number"
                                className="number-input"
                                min={0}
                                max={100}
                                value={position.x}
                                onChange={(e) => setPosition(prev => ({ ...prev, x: Math.max(0, Math.min(100, Number(e.target.value))) }))}
                            />
                        </div>
                        <div className="position-input-group">
                            <span className="input-label">Y Position (%)</span>
                            <input
                                type="number"
                                className="number-input"
                                min={0}
                                max={100}
                                value={position.y}
                                onChange={(e) => setPosition(prev => ({ ...prev, y: Math.max(0, Math.min(100, Number(e.target.value))) }))}
                            />
                        </div>
                    </div>

                    <p className="position-hint">Or choose a preset:</p>

                    <div className="position-grid">
                        <button
                            className={`position-btn ${position.x === 10 && position.y === 10 ? 'active' : ''}`}
                            onClick={() => setPosition({ x: 10, y: 10 })}
                        >
                            Top Left
                        </button>
                        <button
                            className={`position-btn ${position.x === 50 && position.y === 10 ? 'active' : ''}`}
                            onClick={() => setPosition({ x: 50, y: 10 })}
                        >
                            Top Center
                        </button>
                        <button
                            className={`position-btn ${position.x === 90 && position.y === 10 ? 'active' : ''}`}
                            onClick={() => setPosition({ x: 90, y: 10 })}
                        >
                            Top Right
                        </button>
                        <button
                            className={`position-btn ${position.x === 10 && position.y === 50 ? 'active' : ''}`}
                            onClick={() => setPosition({ x: 10, y: 50 })}
                        >
                            Middle Left
                        </button>
                        <button
                            className={`position-btn ${position.x === 50 && position.y === 50 ? 'active' : ''}`}
                            onClick={() => setPosition({ x: 50, y: 50 })}
                        >
                            Center
                        </button>
                        <button
                            className={`position-btn ${position.x === 90 && position.y === 50 ? 'active' : ''}`}
                            onClick={() => setPosition({ x: 90, y: 50 })}
                        >
                            Middle Right
                        </button>
                        <button
                            className={`position-btn ${position.x === 10 && position.y === 90 ? 'active' : ''}`}
                            onClick={() => setPosition({ x: 10, y: 90 })}
                        >
                            Bottom Left
                        </button>
                        <button
                            className={`position-btn ${position.x === 50 && position.y === 90 ? 'active' : ''}`}
                            onClick={() => setPosition({ x: 50, y: 90 })}
                        >
                            Bottom Center
                        </button>
                        <button
                            className={`position-btn ${position.x === 90 && position.y === 90 ? 'active' : ''}`}
                            onClick={() => setPosition({ x: 90, y: 90 })}
                        >
                            Bottom Right
                        </button>
                    </div>
                </div>

                {/* Target Page */}
                <div className="tool-section">
                    <h3 className="section-title">Apply To</h3>
                    <div className="inline-controls">
                        <div className="inline-control">
                            <span className="input-label">Page</span>
                            <input
                                type="number"
                                className="number-input"
                                min={1}
                                max={activeDocument.pageCount}
                                value={targetPage}
                                onChange={(e) => setTargetPage(Math.max(1, Math.min(activeDocument.pageCount, Number(e.target.value))))}
                            />
                        </div>
                        <span style={{ alignSelf: 'flex-end', paddingBottom: '10px', color: '#64748b' }}>
                            of {activeDocument.pageCount}
                        </span>
                    </div>
                </div>
            </div>

            <div className="tool-footer">
                <div className="tool-summary">
                    <Type size={16} />
                    <span>{fontFamily}, {fontSize}px</span>
                </div>
                <button
                    className="btn btn-primary"
                    onClick={handleAddText}
                    disabled={isProcessing || !text.trim()}
                >
                    {isProcessing ? (
                        <>
                            <Type size={18} className="animate-spin" />
                            <span>Adding...</span>
                        </>
                    ) : (
                        <>
                            <Type size={18} />
                            <span>Add Text</span>
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}
