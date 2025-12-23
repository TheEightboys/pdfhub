/**
 * Signature Tool - Enhanced Control Panel
 * Premium settings panel for signing directly on PDF
 * Fixed: Type/Upload tabs no longer close the panel
 */

import { useState, useEffect } from 'react';
import { useApp, useToast } from '../../store/appStore';
import {
    FileSignature,
    FileText,
    Type,
    Pen,
    Upload,
    Palette,
    CheckCircle2
} from 'lucide-react';
import './Tools.css';

type SignatureMode = 'draw' | 'type' | 'upload';

const SIGNATURE_COLORS = [
    { name: 'Black', value: '#000000' },
    { name: 'Blue', value: '#1e40af' },
    { name: 'Navy', value: '#0f172a' },
    { name: 'Red', value: '#dc2626' },
];

const SIGNATURE_WIDTHS = [
    { label: 'Fine', value: 1 },
    { label: 'Medium', value: 2 },
    { label: 'Bold', value: 3 },
    { label: 'Thick', value: 4 },
];

const SIGNATURE_FONTS = [
    { name: 'Elegant', value: 'cursive' },
    { name: 'Classic', value: 'Georgia, serif' },
    { name: 'Modern', value: 'Arial, sans-serif' },
];

export function SignatureTool() {
    const { state, setActiveTool, setToolOptions } = useApp();
    const { addToast } = useToast();
    const { activeDocument, selectedPages } = state;

    const [mode, setMode] = useState<SignatureMode>('draw');
    const [typedSignature, setTypedSignature] = useState('');
    const [signatureFont, setSignatureFont] = useState(SIGNATURE_FONTS[0].value);
    const [signatureColor, setSignatureColor] = useState(SIGNATURE_COLORS[0]);
    const [signatureWidth, setSignatureWidth] = useState(2);
    const [uploadedImage, setUploadedImage] = useState<string | null>(null);

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                setUploadedImage(event.target?.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleDone = () => {
        setActiveTool(null);
    };

    // Mode change handler - keep tool active, just change UI mode
    const handleModeChange = (newMode: SignatureMode) => {
        setMode(newMode);
        // Keep signature tool active for draw mode
        if (newMode === 'draw') {
            setActiveTool('signature');
        }
        // For type/upload, we keep the panel open but user will place via click
    };

    // Place typed signature on PDF
    const handlePlaceTypedSignature = () => {
        if (!typedSignature || !activeDocument) return;
        addToast({
            type: 'info',
            title: 'Click on PDF',
            message: 'Click where you want to place the typed signature.',
        });
        // Store the typed signature in toolOptions for PDFViewer to use
        setToolOptions({
            selectedStamp: {
                text: typedSignature,
                color: signatureColor.value,
                type: 'custom'
            }
        });
        setActiveTool('add-text'); // Use add-text mode to place
    };

    // Initialize draw mode
    useEffect(() => {
        if (mode === 'draw') {
            setActiveTool('signature');
        }
    }, []);

    if (!activeDocument) {
        return (
            <div className="tool-panel">
                <div className="tool-empty">
                    <div className="tool-empty-icon">
                        <FileSignature size={36} />
                    </div>
                    <h3>No PDF Loaded</h3>
                    <p>Open a PDF file to add your signature</p>
                </div>
            </div>
        );
    }

    return (
        <div className="tool-panel">
            <div className="tool-header">
                <h2 className="tool-title">
                    <FileSignature size={22} />
                    Add Signature
                </h2>
                <p className="tool-description">
                    Sign your PDF document directly
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
                            <span className="compress-file-size">
                                {selectedPages.length > 0
                                    ? `${selectedPages.length} page(s) selected`
                                    : `${activeDocument.pageCount} pages`}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Mode Selection */}
                <div className="tool-section">
                    <h3 className="section-title">Signature Method</h3>
                    <div className="mode-tabs">
                        <button
                            className={`mode-tab ${mode === 'draw' ? 'active' : ''}`}
                            onClick={() => handleModeChange('draw')}
                        >
                            <Pen size={16} />
                            <span>Draw</span>
                        </button>
                        <button
                            className={`mode-tab ${mode === 'type' ? 'active' : ''}`}
                            onClick={() => handleModeChange('type')}
                        >
                            <Type size={16} />
                            <span>Type</span>
                        </button>
                        <button
                            className={`mode-tab ${mode === 'upload' ? 'active' : ''}`}
                            onClick={() => handleModeChange('upload')}
                        >
                            <Upload size={16} />
                            <span>Upload</span>
                        </button>
                    </div>
                </div>

                {/* Draw Mode */}
                {mode === 'draw' && (
                    <>
                        <div className="tool-section">
                            <div className="info-banner">
                                <Pen size={18} />
                                <div>
                                    <strong>Draw Mode Active</strong>
                                    <p style={{ margin: '4px 0 0', opacity: 0.9 }}>
                                        Click and drag on the PDF to draw your signature
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="tool-section">
                            <h3 className="section-title">
                                <Palette size={14} />
                                Ink Color
                            </h3>
                            <div className="color-grid">
                                {SIGNATURE_COLORS.map(color => (
                                    <button
                                        key={color.value}
                                        className={`color-btn ${signatureColor.value === color.value ? 'active' : ''}`}
                                        style={{ backgroundColor: color.value }}
                                        onClick={() => setSignatureColor(color)}
                                        title={color.name}
                                    />
                                ))}
                            </div>
                        </div>

                        <div className="tool-section">
                            <h3 className="section-title">Pen Thickness</h3>
                            <div className="brush-sizes">
                                {SIGNATURE_WIDTHS.map(width => (
                                    <button
                                        key={width.value}
                                        className={`brush-btn ${signatureWidth === width.value ? 'active' : ''}`}
                                        onClick={() => setSignatureWidth(width.value)}
                                    >
                                        <span
                                            className="brush-preview"
                                            style={{
                                                width: width.value * 3 + 6,
                                                height: width.value * 3 + 6,
                                                backgroundColor: signatureColor.value,
                                            }}
                                        />
                                        <span className="brush-label">{width.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </>
                )}

                {/* Type Mode */}
                {mode === 'type' && (
                    <>
                        <div className="tool-section">
                            <h3 className="section-title">Type Your Signature</h3>
                            <input
                                type="text"
                                className="text-input"
                                placeholder="Type your name..."
                                value={typedSignature}
                                onChange={(e) => setTypedSignature(e.target.value)}
                            />
                        </div>

                        <div className="tool-section">
                            <h3 className="section-title">Font Style</h3>
                            <div className="font-options">
                                {SIGNATURE_FONTS.map(font => (
                                    <button
                                        key={font.value}
                                        className={`font-btn ${signatureFont === font.value ? 'active' : ''}`}
                                        onClick={() => setSignatureFont(font.value)}
                                        style={{ fontFamily: font.value }}
                                    >
                                        {font.name}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="tool-section">
                            <h3 className="section-title">Color</h3>
                            <div className="color-grid">
                                {SIGNATURE_COLORS.map(color => (
                                    <button
                                        key={color.value}
                                        className={`color-btn ${signatureColor.value === color.value ? 'active' : ''}`}
                                        style={{ backgroundColor: color.value }}
                                        onClick={() => setSignatureColor(color)}
                                        title={color.name}
                                    />
                                ))}
                            </div>
                        </div>

                        {typedSignature && (
                            <div className="tool-section">
                                <h3 className="section-title">Preview</h3>
                                <div
                                    className="signature-preview"
                                    style={{
                                        fontFamily: signatureFont,
                                        color: signatureColor.value,
                                        fontSize: '28px'
                                    }}
                                >
                                    {typedSignature}
                                </div>
                                <button
                                    className="btn btn-secondary"
                                    style={{ width: '100%', marginTop: '12px' }}
                                    onClick={handlePlaceTypedSignature}
                                >
                                    Place on PDF
                                </button>
                            </div>
                        )}
                    </>
                )}

                {/* Upload Mode */}
                {mode === 'upload' && (
                    <div className="tool-section">
                        <h3 className="section-title">Upload Signature Image</h3>
                        <label className="upload-zone">
                            <input
                                type="file"
                                accept="image/*"
                                style={{ display: 'none' }}
                                onChange={handleImageUpload}
                            />
                            {uploadedImage ? (
                                <div style={{ textAlign: 'center' }}>
                                    <img
                                        src={uploadedImage}
                                        alt="Signature"
                                        style={{ maxWidth: '100%', maxHeight: '120px', marginBottom: '12px' }}
                                    />
                                    <p style={{ color: '#16a34a' }}>
                                        <CheckCircle2 size={16} style={{ verticalAlign: 'middle', marginRight: '6px' }} />
                                        Image uploaded - click PDF to place
                                    </p>
                                </div>
                            ) : (
                                <>
                                    <Upload size={32} />
                                    <p>Click or drag to upload signature image</p>
                                    <span className="input-hint">PNG with transparent background works best</span>
                                </>
                            )}
                        </label>
                    </div>
                )}
            </div>

            <div className="tool-footer">
                <div className="tool-summary">
                    <FileSignature size={16} />
                    <span>
                        {mode === 'draw' ? 'Draw signature on PDF' :
                            mode === 'type' ? 'Type & place signature' :
                                'Upload signature image'}
                    </span>
                </div>
                <button
                    className="btn btn-primary"
                    onClick={handleDone}
                >
                    <CheckCircle2 size={18} />
                    <span>Done</span>
                </button>
            </div>
        </div>
    );
}
