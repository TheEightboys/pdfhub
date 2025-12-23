/**
 * OCR Tool - Enhanced Version
 * Extract text from scanned PDFs using Tesseract.js
 */

import { useState, useCallback } from 'react';
import { useApp } from '../../store/appStore';
import { ScanText, FileText, Copy, Download, CheckCircle, Languages, Loader2, AlertCircle } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import Tesseract from 'tesseract.js';
import './Tools.css';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

const LANGUAGES = [
    { code: 'eng', name: 'English', flag: '🇺🇸' },
    { code: 'spa', name: 'Spanish', flag: '🇪🇸' },
    { code: 'fra', name: 'French', flag: '🇫🇷' },
    { code: 'deu', name: 'German', flag: '🇩🇪' },
    { code: 'ita', name: 'Italian', flag: '🇮🇹' },
    { code: 'por', name: 'Portuguese', flag: '🇵🇹' },
    { code: 'chi_sim', name: 'Chinese (Simplified)', flag: '🇨🇳' },
    { code: 'jpn', name: 'Japanese', flag: '🇯🇵' },
    { code: 'kor', name: 'Korean', flag: '🇰🇷' },
    { code: 'ara', name: 'Arabic', flag: '🇸🇦' },
    { code: 'hin', name: 'Hindi', flag: '🇮🇳' },
    { code: 'rus', name: 'Russian', flag: '🇷🇺' },
];

export function OCRTool() {
    const { state } = useApp();
    const { activeDocument } = state;

    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [currentPage, setCurrentPage] = useState(0);
    const [statusMessage, setStatusMessage] = useState('');
    const [extractedText, setExtractedText] = useState<string | null>(null);
    const [language, setLanguage] = useState('eng');
    const [pageRange, setPageRange] = useState<'all' | 'current' | 'custom'>('all');
    const [customPages, setCustomPages] = useState('');
    const [copied, setCopied] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [wordCount, setWordCount] = useState(0);

    // Convert PDF page to image for OCR
    const renderPageToImage = async (pdf: pdfjsLib.PDFDocumentProxy, pageNum: number): Promise<string> => {
        const page = await pdf.getPage(pageNum);
        const scale = 2.0; // Higher scale for better OCR accuracy
        const viewport = page.getViewport({ scale });

        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d')!;
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        await page.render({
            canvasContext: context,
            viewport: viewport
        }).promise;

        return canvas.toDataURL('image/png');
    };

    // Parse custom page range
    const parsePageRange = (input: string, maxPages: number): number[] => {
        const pages: Set<number> = new Set();
        const parts = input.split(',').map(p => p.trim());

        for (const part of parts) {
            if (part.includes('-')) {
                const [start, end] = part.split('-').map(n => parseInt(n.trim()));
                if (!isNaN(start) && !isNaN(end)) {
                    for (let i = Math.max(1, start); i <= Math.min(maxPages, end); i++) {
                        pages.add(i);
                    }
                }
            } else {
                const num = parseInt(part);
                if (!isNaN(num) && num >= 1 && num <= maxPages) {
                    pages.add(num);
                }
            }
        }

        return Array.from(pages).sort((a, b) => a - b);
    };

    const handleExtract = useCallback(async () => {
        if (!activeDocument?.arrayBuffer) return;

        setIsProcessing(true);
        setProgress(0);
        setError(null);
        setExtractedText(null);
        setStatusMessage('Loading PDF...');

        try {
            // Load PDF
            const pdf = await pdfjsLib.getDocument({ data: activeDocument.arrayBuffer.slice(0) }).promise;
            const totalPages = pdf.numPages;

            // Determine which pages to process
            let pagesToProcess: number[];
            if (pageRange === 'all') {
                pagesToProcess = Array.from({ length: totalPages }, (_, i) => i + 1);
            } else if (pageRange === 'current') {
                pagesToProcess = [1]; // Default to first page
            } else {
                pagesToProcess = parsePageRange(customPages, totalPages);
                if (pagesToProcess.length === 0) {
                    pagesToProcess = Array.from({ length: totalPages }, (_, i) => i + 1);
                }
            }

            let allText = '';
            const selectedLang = LANGUAGES.find(l => l.code === language);

            for (let i = 0; i < pagesToProcess.length; i++) {
                const pageNum = pagesToProcess[i];
                setCurrentPage(pageNum);
                setStatusMessage(`Processing page ${pageNum} of ${totalPages}...`);

                // Render page to image
                const imageData = await renderPageToImage(pdf, pageNum);

                // Run OCR on the image
                const result = await Tesseract.recognize(
                    imageData,
                    language,
                    {
                        logger: (m) => {
                            if (m.status === 'recognizing text') {
                                const pageProgress = (i / pagesToProcess.length) * 100;
                                const ocrProgress = (m.progress || 0) * (100 / pagesToProcess.length);
                                setProgress(Math.round(pageProgress + ocrProgress));
                            }
                        }
                    }
                );

                const pageText = result.data.text.trim();
                if (pageText) {
                    allText += `\n\n=== Page ${pageNum} ===\n\n${pageText}`;
                }
            }

            if (allText.trim()) {
                const finalText = `# OCR Extracted Text
                
**Document:** ${activeDocument.name}
**Language:** ${selectedLang?.flag || ''} ${selectedLang?.name || 'English'}
**Pages Processed:** ${pagesToProcess.length} of ${totalPages}
**Extracted:** ${new Date().toLocaleString()}

---
${allText.trim()}

---
*OCR processing complete*`;

                setExtractedText(finalText);
                setWordCount(allText.split(/\s+/).filter(w => w.length > 0).length);
            } else {
                setError('No text could be extracted. The document may not contain recognizable text.');
            }

        } catch (err) {
            console.error('OCR Error:', err);
            setError(`OCR failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }

        setIsProcessing(false);
        setStatusMessage('');
    }, [activeDocument, language, pageRange, customPages]);

    const handleCopy = async () => {
        if (extractedText) {
            await navigator.clipboard.writeText(extractedText);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleDownload = () => {
        if (!extractedText) return;

        const blob = new Blob([extractedText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ocr-${activeDocument?.name || 'document'}.txt`;
        a.click();
        URL.revokeObjectURL(url);
    };

    if (!activeDocument) {
        return (
            <div className="tool-panel">
                <div className="tool-empty">
                    <div className="tool-empty-icon">
                        <ScanText size={36} />
                    </div>
                    <h3>No PDF Loaded</h3>
                    <p>Open a scanned PDF to extract text using OCR</p>
                </div>
            </div>
        );
    }

    return (
        <div className="tool-panel">
            <div className="tool-header">
                <h2 className="tool-title">OCR - Extract Text</h2>
                <p className="tool-description">
                    Extract text from scanned documents using optical character recognition
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

                {/* Language Selection */}
                <div className="tool-section">
                    <h3 className="section-title">Recognition Language</h3>
                    <div className="language-grid">
                        {LANGUAGES.slice(0, 6).map(lang => (
                            <button
                                key={lang.code}
                                className={`language-btn ${language === lang.code ? 'active' : ''}`}
                                onClick={() => setLanguage(lang.code)}
                            >
                                <span className="language-flag">{lang.flag}</span>
                                <span className="language-name">{lang.name}</span>
                            </button>
                        ))}
                    </div>
                    <div className="input-group" style={{ marginTop: '12px' }}>
                        <select
                            className="text-input"
                            value={language}
                            onChange={(e) => setLanguage(e.target.value)}
                        >
                            {LANGUAGES.map(lang => (
                                <option key={lang.code} value={lang.code}>
                                    {lang.flag} {lang.name}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Page Range */}
                <div className="tool-section">
                    <h3 className="section-title">Pages to Process</h3>
                    <div className="mode-tabs">
                        <button
                            className={`mode-tab ${pageRange === 'all' ? 'active' : ''}`}
                            onClick={() => setPageRange('all')}
                        >
                            All Pages
                        </button>
                        <button
                            className={`mode-tab ${pageRange === 'current' ? 'active' : ''}`}
                            onClick={() => setPageRange('current')}
                        >
                            First Page
                        </button>
                        <button
                            className={`mode-tab ${pageRange === 'custom' ? 'active' : ''}`}
                            onClick={() => setPageRange('custom')}
                        >
                            Custom
                        </button>
                    </div>

                    {pageRange === 'custom' && (
                        <div className="input-group" style={{ marginTop: '12px' }}>
                            <input
                                type="text"
                                className="text-input"
                                placeholder="e.g., 1-3, 5, 7-10"
                                value={customPages}
                                onChange={(e) => setCustomPages(e.target.value)}
                            />
                            <span className="input-hint">Enter page numbers or ranges separated by commas</span>
                        </div>
                    )}
                </div>

                {/* Processing Progress */}
                {isProcessing && (
                    <div className="tool-section">
                        <div className="processing-state">
                            <div className="processing-icon">
                                <Loader2 size={32} className="animate-spin" />
                            </div>
                            <h4>Running OCR...</h4>
                            <p>{statusMessage || `Processing page ${currentPage}...`}</p>
                            <div className="progress-container">
                                <div className="progress-bar">
                                    <div
                                        className="progress-fill"
                                        style={{ width: `${progress}%` }}
                                    />
                                </div>
                                <span className="progress-text">{progress}% complete</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Error */}
                {error && !isProcessing && (
                    <div className="tool-section">
                        <div className="warning-banner">
                            <AlertCircle size={18} />
                            <span>{error}</span>
                        </div>
                    </div>
                )}

                {/* Extracted Text */}
                {extractedText && !isProcessing && (
                    <div className="tool-section">
                        <div className="section-header">
                            <h3 className="section-title">Extracted Text ({wordCount.toLocaleString()} words)</h3>
                            <div className="section-actions">
                                <button className="file-action-btn" onClick={handleCopy} title="Copy to clipboard">
                                    {copied ? <CheckCircle size={18} /> : <Copy size={18} />}
                                </button>
                                <button className="file-action-btn" onClick={handleDownload} title="Download as text">
                                    <Download size={18} />
                                </button>
                            </div>
                        </div>
                        <div className="summary-result">
                            <pre className="summary-text">{extractedText}</pre>
                        </div>
                    </div>
                )}

                {/* Extract Button */}
                {!isProcessing && !extractedText && (
                    <div className="tool-section">
                        <button
                            className="btn btn-primary btn-full"
                            onClick={handleExtract}
                        >
                            <ScanText size={18} />
                            <span>Start OCR Extraction</span>
                        </button>
                        <span className="input-hint" style={{ display: 'block', marginTop: '8px', textAlign: 'center' }}>
                            OCR works best on scanned documents with clear text
                        </span>
                    </div>
                )}
            </div>

            <div className="tool-footer">
                <div className="tool-summary">
                    <Languages size={16} />
                    <span>{LANGUAGES.find(l => l.code === language)?.flag} {LANGUAGES.find(l => l.code === language)?.name}</span>
                </div>
                {extractedText && (
                    <button
                        className="btn btn-secondary"
                        onClick={() => {
                            setExtractedText(null);
                            setError(null);
                        }}
                    >
                        <ScanText size={18} />
                        <span>Run Again</span>
                    </button>
                )}
            </div>
        </div>
    );
}
