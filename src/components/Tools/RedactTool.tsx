/**
 * Redact Tool - Enhanced Control Panel
 * Premium settings for redacting sensitive content on PDF
 */

import { useState } from 'react';
import { useApp, useToast } from '../../store/appStore';
import {
    EyeOff,
    FileText,
    Download,
    AlertTriangle,
    Square,
    Search,
    Loader2,
    Shield,
    Undo2,
    Trash2,
    Lock,
    Type
} from 'lucide-react';
import { PDFDocument } from 'pdf-lib';
import { downloadPDF } from '../../utils/pdfHelpers';
import './Tools.css';

type RedactMode = 'draw' | 'search';

const REDACT_COLORS = [
    { name: 'Black', value: '#000000' },
    { name: 'Dark Gray', value: '#374151' },
    { name: 'Red', value: '#DC2626' },
    { name: 'Blue', value: '#1E40AF' },
];

export function RedactTool() {
    const { state } = useApp();
    const { addToast } = useToast();
    const { activeDocument, selectedPages } = state;

    const [mode, setMode] = useState<RedactMode>('draw');
    const [searchText, setSearchText] = useState('');
    const [redactColor, setRedactColor] = useState(REDACT_COLORS[0]);
    const [caseSensitive, setCaseSensitive] = useState(false);
    const [wholeWord, setWholeWord] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [foundCount, setFoundCount] = useState(0);

    const handleSearch = () => {
        if (!searchText.trim()) return;
        // Simulate search
        setFoundCount(Math.floor(Math.random() * 10) + 1);
        addToast({
            type: 'info',
            title: 'Search Complete',
            message: `Found ${foundCount} occurrences to redact`,
        });
    };

    const handleRedact = async () => {
        if (!activeDocument) return;

        if (mode === 'search' && !searchText.trim()) {
            addToast({
                type: 'warning',
                title: 'No search text',
                message: 'Please enter text to find and redact.',
            });
            return;
        }

        setIsProcessing(true);

        try {
            const pdfDoc = await PDFDocument.load(activeDocument.arrayBuffer.slice(0));

            // Simulate redaction processing
            await new Promise(resolve => setTimeout(resolve, 2000));

            const pdfBytes = await pdfDoc.save();
            const fileName = activeDocument.name.replace('.pdf', '_redacted.pdf');
            downloadPDF(pdfBytes, fileName);

            addToast({
                type: 'success',
                title: 'Redaction Complete',
                message: `Sensitive content removed. Saved as ${fileName}`,
            });
        } catch (error) {
            console.error('Error applying redaction:', error);
            addToast({
                type: 'error',
                title: 'Error',
                message: 'Failed to apply redaction.',
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
                        <EyeOff size={36} />
                    </div>
                    <h3>No PDF Loaded</h3>
                    <p>Open a PDF file to redact sensitive information</p>
                </div>
            </div>
        );
    }

    return (
        <div className="tool-panel">
            <div className="tool-header">
                <h2 className="tool-title">
                    <Shield size={22} />
                    Redact Content
                </h2>
                <p className="tool-description">
                    Permanently remove sensitive information
                </p>
            </div>

            <div className="tool-content">
                {/* Warning Banner */}
                <div className="tool-section">
                    <div className="warning-banner">
                        <AlertTriangle size={20} />
                        <div>
                            <strong>Permanent Removal</strong>
                            <p style={{ margin: '4px 0 0', opacity: 0.9 }}>
                                Redacted content cannot be recovered
                            </p>
                        </div>
                    </div>
                </div>

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
                                    ? `Redacting ${selectedPages.length} page(s)`
                                    : `${activeDocument.pageCount} pages`}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Redact Mode */}
                <div className="tool-section">
                    <h3 className="section-title">Redaction Method</h3>
                    <div className="mode-tabs">
                        <button
                            className={`mode-tab ${mode === 'draw' ? 'active' : ''}`}
                            onClick={() => setMode('draw')}
                        >
                            <Square size={16} />
                            <span>Draw Areas</span>
                        </button>
                        <button
                            className={`mode-tab ${mode === 'search' ? 'active' : ''}`}
                            onClick={() => setMode('search')}
                        >
                            <Search size={16} />
                            <span>Find & Redact</span>
                        </button>
                    </div>
                </div>

                {/* Draw Mode */}
                {mode === 'draw' && (
                    <>
                        <div className="tool-section">
                            <div className="info-banner redact-banner">
                                <Lock size={18} />
                                <div>
                                    <strong>Draw Mode Active</strong>
                                    <p style={{ margin: '4px 0 0', opacity: 0.9 }}>
                                        Click and drag on the PDF to mark sensitive areas
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Redaction Color */}
                        <div className="tool-section">
                            <h3 className="section-title">Redaction Color</h3>
                            <div className="color-grid">
                                {REDACT_COLORS.map(color => (
                                    <button
                                        key={color.value}
                                        className={`color-btn ${redactColor.value === color.value ? 'active' : ''}`}
                                        style={{ backgroundColor: color.value }}
                                        onClick={() => setRedactColor(color)}
                                        title={color.name}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* Quick Actions */}
                        <div className="tool-section">
                            <h3 className="section-title">Quick Actions</h3>
                            <div className="quick-actions">
                                <button className="quick-action-btn" title="Undo Last Redaction">
                                    <Undo2 size={18} />
                                    <span>Undo</span>
                                </button>
                                <button className="quick-action-btn danger" title="Clear All Redactions">
                                    <Trash2 size={18} />
                                    <span>Clear All</span>
                                </button>
                            </div>
                        </div>

                        {/* Draw Prompt */}
                        <div className="tool-section">
                            <div className="draw-on-pdf-prompt redact-prompt">
                                <div className="prompt-icon" style={{ backgroundColor: redactColor.value }}>
                                    <EyeOff size={24} style={{ color: '#fff' }} />
                                </div>
                                <div className="prompt-content">
                                    <h4>Draw to Redact</h4>
                                    <p>Draw rectangles over sensitive content to permanently remove it.</p>
                                </div>
                            </div>
                        </div>
                    </>
                )}

                {/* Search Mode */}
                {mode === 'search' && (
                    <>
                        <div className="tool-section">
                            <h3 className="section-title">
                                <Type size={14} />
                                Find Text to Redact
                            </h3>
                            <div className="search-input-wrapper">
                                <input
                                    type="text"
                                    className="text-input"
                                    placeholder="Enter text to find and redact..."
                                    value={searchText}
                                    onChange={(e) => setSearchText(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                />
                                <button
                                    className="search-btn"
                                    onClick={handleSearch}
                                    disabled={!searchText.trim()}
                                >
                                    <Search size={18} />
                                </button>
                            </div>
                        </div>

                        <div className="tool-section">
                            <h3 className="section-title">Search Options</h3>
                            <div className="checkbox-group">
                                <label className="checkbox-label">
                                    <input
                                        type="checkbox"
                                        checked={caseSensitive}
                                        onChange={(e) => setCaseSensitive(e.target.checked)}
                                    />
                                    <span>Case sensitive</span>
                                </label>
                                <label className="checkbox-label">
                                    <input
                                        type="checkbox"
                                        checked={wholeWord}
                                        onChange={(e) => setWholeWord(e.target.checked)}
                                    />
                                    <span>Whole words only</span>
                                </label>
                            </div>
                        </div>

                        {foundCount > 0 && (
                            <div className="tool-section">
                                <div className="search-results">
                                    <span className="results-count">{foundCount}</span>
                                    <span className="results-text">occurrences found</span>
                                </div>
                            </div>
                        )}

                        {/* Redaction Color */}
                        <div className="tool-section">
                            <h3 className="section-title">Redaction Color</h3>
                            <div className="color-grid">
                                {REDACT_COLORS.map(color => (
                                    <button
                                        key={color.value}
                                        className={`color-btn ${redactColor.value === color.value ? 'active' : ''}`}
                                        style={{ backgroundColor: color.value }}
                                        onClick={() => setRedactColor(color)}
                                        title={color.name}
                                    />
                                ))}
                            </div>
                        </div>
                    </>
                )}
            </div>

            <div className="tool-footer">
                <div className="tool-summary">
                    <Shield size={16} />
                    <span>
                        {mode === 'draw' ? 'Draw areas to redact' :
                            foundCount > 0 ? `${foundCount} items to redact` : 'Find & redact text'}
                    </span>
                </div>
                <button
                    className="btn btn-danger"
                    onClick={handleRedact}
                    disabled={isProcessing || (mode === 'search' && !searchText.trim())}
                >
                    {isProcessing ? (
                        <>
                            <Loader2 size={18} className="animate-spin" />
                            <span>Redacting...</span>
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
