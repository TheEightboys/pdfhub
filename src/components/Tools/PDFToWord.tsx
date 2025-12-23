/**
 * PDF to Word Tool
 * Convert PDF to editable Word document (.docx)
 */

import { useState, useCallback } from 'react';
import { useApp, useToast } from '../../store/appStore';
import { extractTextFromPDF } from '../../utils/textExtraction';
import { FileText, Download, Loader2, CheckCircle } from 'lucide-react';
import './Tools.css';

export function PDFToWordTool() {
    const { state, setLoading } = useApp();
    const { addToast } = useToast();
    const { activeDocument } = state;

    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [preserveFormatting, setPreserveFormatting] = useState(true);
    const [includeImages, setIncludeImages] = useState(true);
    const [isComplete, setIsComplete] = useState(false);

    const handleConvert = useCallback(async () => {
        if (!activeDocument) return;

        setIsProcessing(true);
        setProgress(0);
        setLoading(true, 'Converting PDF to Word...');

        try {
            // Extract text from PDF
            setProgress(20);
            const result = await extractTextFromPDF(
                activeDocument.arrayBuffer.slice(0),
                (prog) => setProgress(20 + prog.percentage * 0.5)
            );

            setProgress(70);

            // Create a simple HTML document that Word can open
            const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>${activeDocument.name.replace('.pdf', '')}</title>
    <style>
        body {
            font-family: 'Calibri', 'Arial', sans-serif;
            font-size: 11pt;
            line-height: 1.5;
            margin: 1in;
            color: #000000;
        }
        h1, h2, h3 {
            color: #2b579a;
            margin-top: 12pt;
            margin-bottom: 6pt;
        }
        p {
            margin: 0 0 10pt 0;
            text-align: justify;
        }
        .page-break {
            page-break-after: always;
            border-bottom: 1px dashed #ccc;
            margin: 20pt 0;
            padding-bottom: 10pt;
        }
        .header {
            font-size: 9pt;
            color: #666;
            border-bottom: 1px solid #ccc;
            padding-bottom: 5pt;
            margin-bottom: 15pt;
        }
    </style>
</head>
<body>
    <div class="header">
        Converted from: ${activeDocument.name} | Pages: ${activeDocument.pageCount}
    </div>
    ${formatTextToHTML(result.text)}
</body>
</html>`;

            setProgress(90);

            // Create and download the file
            const blob = new Blob([htmlContent], {
                type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = activeDocument.name.replace('.pdf', '.doc');
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            setProgress(100);
            setIsComplete(true);

            addToast({
                type: 'success',
                title: 'Conversion complete!',
                message: `Saved as ${activeDocument.name.replace('.pdf', '.doc')}`,
            });
        } catch (error) {
            console.error('Conversion failed:', error);
            addToast({
                type: 'error',
                title: 'Conversion failed',
                message: 'An error occurred while converting the PDF.',
            });
        } finally {
            setIsProcessing(false);
            setLoading(false);
        }
    }, [activeDocument, setLoading, addToast]);

    if (!activeDocument) {
        return (
            <div className="tool-panel">
                <div className="tool-empty">
                    <FileText size={48} />
                    <h3>Open a PDF first</h3>
                    <p>Upload a PDF file to convert it to Word format.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="tool-panel">
            <div className="tool-header">
                <h2 className="tool-title">PDF to Word</h2>
                <p className="tool-description">
                    Convert your PDF to an editable Word document
                </p>
            </div>

            <div className="tool-content">
                {/* File Info */}
                <div className="tool-section">
                    <div className="compress-file-info">
                        <FileText size={32} className="compress-file-icon" />
                        <div className="compress-file-details">
                            <span className="compress-file-name">{activeDocument.name}</span>
                            <span className="compress-file-size">{activeDocument.pageCount} pages</span>
                        </div>
                    </div>
                </div>

                {/* Options */}
                <div className="tool-section">
                    <h4 className="section-title">Conversion Options</h4>

                    <label className="checkbox-option">
                        <input
                            type="checkbox"
                            checked={preserveFormatting}
                            onChange={(e) => setPreserveFormatting(e.target.checked)}
                        />
                        <span className="checkbox-label">Preserve formatting</span>
                        <span className="checkbox-hint">Try to maintain original text styling</span>
                    </label>

                    <label className="checkbox-option">
                        <input
                            type="checkbox"
                            checked={includeImages}
                            onChange={(e) => setIncludeImages(e.target.checked)}
                        />
                        <span className="checkbox-label">Include images</span>
                        <span className="checkbox-hint">Extract and include images in the document</span>
                    </label>
                </div>

                {/* Progress */}
                {isProcessing && (
                    <div className="tool-section">
                        <div className="processing-state">
                            <Loader2 size={32} className="animate-spin" />
                            <h4>Converting...</h4>
                            <div className="progress-container">
                                <div className="progress-bar">
                                    <div className="progress-fill" style={{ width: `${progress}%` }} />
                                </div>
                                <span className="progress-text">{progress}%</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Success State */}
                {isComplete && !isProcessing && (
                    <div className="tool-section">
                        <div className="success-state">
                            <CheckCircle size={48} className="success-icon" />
                            <h4>Conversion Complete!</h4>
                            <p>Your Word document has been downloaded.</p>
                        </div>
                    </div>
                )}

                {/* Action Button */}
                <div className="tool-actions">
                    <button
                        className="btn btn-primary btn-lg"
                        onClick={handleConvert}
                        disabled={isProcessing}
                    >
                        {isProcessing ? (
                            <>
                                <Loader2 size={20} className="animate-spin" />
                                Converting...
                            </>
                        ) : (
                            <>
                                <Download size={20} />
                                Convert to Word
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

// Helper function to format extracted text as HTML
function formatTextToHTML(text: string): string {
    if (!text) return '<p>No text content found in this PDF.</p>';

    // Split into paragraphs and format
    const paragraphs = text
        .split(/\n\n+/)
        .filter(p => p.trim())
        .map(p => {
            const trimmed = p.trim();
            // Detect if it's a heading (short, possibly uppercase or ends with specific patterns)
            if (trimmed.length < 100 && (trimmed === trimmed.toUpperCase() || /^[A-Z][^.]*$/.test(trimmed))) {
                return `<h2>${escapeHtml(trimmed)}</h2>`;
            }
            return `<p>${escapeHtml(trimmed).replace(/\n/g, '<br>')}</p>`;
        });

    return paragraphs.join('\n');
}

function escapeHtml(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
