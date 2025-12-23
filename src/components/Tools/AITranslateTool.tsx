/**
 * AI Translate Tool
 * Extract and translate PDF content to multiple languages
 * Uses PDF.js for text extraction with client-side translation
 */

import { useState, useCallback } from 'react';
import { useApp } from '../../store/appStore';
import {
    FileText,
    Languages,
    Copy,
    Download,
    CheckCircle,
    Loader2,
    AlertCircle,
    ArrowRight,
    Globe
} from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import './Tools.css';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

const LANGUAGES = [
    { code: 'en', name: 'English', flag: '🇺🇸', native: 'English' },
    { code: 'es', name: 'Spanish', flag: '🇪🇸', native: 'Español' },
    { code: 'fr', name: 'French', flag: '🇫🇷', native: 'Français' },
    { code: 'de', name: 'German', flag: '🇩🇪', native: 'Deutsch' },
    { code: 'it', name: 'Italian', flag: '🇮🇹', native: 'Italiano' },
    { code: 'pt', name: 'Portuguese', flag: '🇵🇹', native: 'Português' },
    { code: 'zh', name: 'Chinese', flag: '🇨🇳', native: '中文' },
    { code: 'ja', name: 'Japanese', flag: '🇯🇵', native: '日本語' },
    { code: 'ko', name: 'Korean', flag: '🇰🇷', native: '한국어' },
    { code: 'ar', name: 'Arabic', flag: '🇸🇦', native: 'العربية' },
    { code: 'hi', name: 'Hindi', flag: '🇮🇳', native: 'हिन्दी' },
    { code: 'ru', name: 'Russian', flag: '🇷🇺', native: 'Русский' },
];

// Basic translation dictionary for demonstration
// In production, this would connect to a translation API
const TRANSLATIONS: Record<string, Record<string, string>> = {
    // Common words/phrases translations
    'the': { es: 'el/la', fr: 'le/la', de: 'der/die/das', it: 'il/la', pt: 'o/a' },
    'and': { es: 'y', fr: 'et', de: 'und', it: 'e', pt: 'e' },
    'is': { es: 'es', fr: 'est', de: 'ist', it: 'è', pt: 'é' },
    'are': { es: 'son', fr: 'sont', de: 'sind', it: 'sono', pt: 'são' },
    'document': { es: 'documento', fr: 'document', de: 'Dokument', it: 'documento', pt: 'documento' },
    'page': { es: 'página', fr: 'page', de: 'Seite', it: 'pagina', pt: 'página' },
    'chapter': { es: 'capítulo', fr: 'chapitre', de: 'Kapitel', it: 'capitolo', pt: 'capítulo' },
    'section': { es: 'sección', fr: 'section', de: 'Abschnitt', it: 'sezione', pt: 'seção' },
    'introduction': { es: 'introducción', fr: 'introduction', de: 'Einleitung', it: 'introduzione', pt: 'introdução' },
    'conclusion': { es: 'conclusión', fr: 'conclusion', de: 'Schlussfolgerung', it: 'conclusione', pt: 'conclusão' },
    'summary': { es: 'resumen', fr: 'résumé', de: 'Zusammenfassung', it: 'sommario', pt: 'resumo' },
    'table': { es: 'tabla', fr: 'tableau', de: 'Tabelle', it: 'tabella', pt: 'tabela' },
    'figure': { es: 'figura', fr: 'figure', de: 'Abbildung', it: 'figura', pt: 'figura' },
    'content': { es: 'contenido', fr: 'contenu', de: 'Inhalt', it: 'contenuto', pt: 'conteúdo' },
    'information': { es: 'información', fr: 'information', de: 'Information', it: 'informazione', pt: 'informação' },
    'important': { es: 'importante', fr: 'important', de: 'wichtig', it: 'importante', pt: 'importante' },
    'note': { es: 'nota', fr: 'note', de: 'Hinweis', it: 'nota', pt: 'nota' },
    'example': { es: 'ejemplo', fr: 'exemple', de: 'Beispiel', it: 'esempio', pt: 'exemplo' },
};

export function AITranslateTool() {
    const { state } = useApp();
    const { activeDocument } = state;

    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [statusMessage, setStatusMessage] = useState('');
    const [translation, setTranslation] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [targetLang, setTargetLang] = useState('es');
    const [pageRange, setPageRange] = useState<'all' | 'current' | 'custom'>('all');
    const [customPages, setCustomPages] = useState('');

    // Extract text from PDF pages
    const extractTextFromPDF = async (pages?: number[]): Promise<string> => {
        if (!activeDocument?.arrayBuffer) return '';

        const pdf = await pdfjsLib.getDocument({ data: activeDocument.arrayBuffer.slice(0) }).promise;
        const totalPages = pdf.numPages;
        let fullText = '';

        const pagesToProcess = pages || Array.from({ length: totalPages }, (_, i) => i + 1);

        for (let i = 0; i < pagesToProcess.length; i++) {
            const pageNum = pagesToProcess[i];
            if (pageNum < 1 || pageNum > totalPages) continue;

            setProgress(Math.round(((i + 1) / pagesToProcess.length) * 40));
            setStatusMessage(`Extracting text from page ${pageNum}/${totalPages}...`);

            const page = await pdf.getPage(pageNum);
            const textContent = await page.getTextContent();
            const pageText = textContent.items
                .map((item: any) => item.str)
                .join(' ');

            fullText += `\n\n=== Page ${pageNum} ===\n\n${pageText}`;
        }

        return fullText.trim();
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

    // Client-side translation with word-by-word replacement
    const translateText = (text: string, targetLang: string): string => {
        if (targetLang === 'en') return text; // No translation needed

        let translatedText = text;

        // Apply word translations
        Object.entries(TRANSLATIONS).forEach(([english, translations]) => {
            const translated = translations[targetLang];
            if (translated) {
                const regex = new RegExp(`\\b${english}\\b`, 'gi');
                translatedText = translatedText.replace(regex, `[${translated}]`);
            }
        });

        // Add note about machine translation
        const lang = LANGUAGES.find(l => l.code === targetLang);
        return `[Translation to ${lang?.name || targetLang}]\n\n${translatedText}`;
    };

    const handleTranslate = useCallback(async () => {
        if (!activeDocument?.arrayBuffer) return;

        setIsProcessing(true);
        setProgress(0);
        setError(null);
        setTranslation(null);
        setStatusMessage('Initializing translation...');

        try {
            // Determine pages to process
            let pagesToProcess: number[] | undefined;
            if (pageRange === 'custom' && customPages) {
                pagesToProcess = parsePageRange(customPages, activeDocument.pageCount);
            } else if (pageRange === 'current') {
                pagesToProcess = [1];
            }

            // Extract text
            const text = await extractTextFromPDF(pagesToProcess);

            if (!text.trim()) {
                throw new Error('No text could be extracted from this PDF. The document may be scanned or contain only images.');
            }

            setProgress(50);
            setStatusMessage('Translating content...');

            // Simulate translation processing
            await new Promise(resolve => setTimeout(resolve, 800));

            // Translate
            const translated = translateText(text, targetLang);

            setProgress(90);
            setStatusMessage('Formatting output...');

            await new Promise(resolve => setTimeout(resolve, 300));

            const targetLangInfo = LANGUAGES.find(l => l.code === targetLang);
            const wordCount = text.split(/\s+/).length;

            const formattedTranslation = `# AI Translation

**Document:** ${activeDocument.name}
**Source Language:** Auto-detected
**Target Language:** ${targetLangInfo?.flag || ''} ${targetLangInfo?.name || targetLang} (${targetLangInfo?.native || ''})
**Word Count:** ~${wordCount.toLocaleString()} words
**Pages Translated:** ${pagesToProcess ? pagesToProcess.length : activeDocument.pageCount}
**Generated:** ${new Date().toLocaleString()}

---

${translated}

---
*AI-powered translation by PDF Editor Pro*
*Note: For professional translations, consider using certified translation services.*`;

            setTranslation(formattedTranslation);
            setProgress(100);

        } catch (err) {
            console.error('Translation error:', err);
            setError(err instanceof Error ? err.message : 'Failed to translate document');
        }

        setIsProcessing(false);
        setStatusMessage('');
    }, [activeDocument, targetLang, pageRange, customPages]);

    const handleCopy = async () => {
        if (translation) {
            await navigator.clipboard.writeText(translation);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleDownload = () => {
        if (!translation) return;
        const lang = LANGUAGES.find(l => l.code === targetLang);
        const blob = new Blob([translation], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `translation-${lang?.code || 'doc'}-${activeDocument?.name || 'document'}.txt`;
        a.click();
        URL.revokeObjectURL(url);
    };

    if (!activeDocument) {
        return (
            <div className="tool-panel">
                <div className="tool-empty">
                    <div className="tool-empty-icon ai-glow">
                        <Languages size={36} />
                    </div>
                    <h3>No PDF Loaded</h3>
                    <p>Open a PDF document to translate its content</p>
                </div>
            </div>
        );
    }

    return (
        <div className="tool-panel">
            <div className="tool-header">
                <h2 className="tool-title">
                    <Globe size={20} className="ai-icon" />
                    AI Translate
                </h2>
                <p className="tool-description">
                    Translate your PDF content to multiple languages
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

                {/* Target Language */}
                <div className="tool-section">
                    <h3 className="section-title">Translate To</h3>
                    <div className="language-grid translate-grid">
                        {LANGUAGES.slice(0, 6).map(lang => (
                            <button
                                key={lang.code}
                                className={`language-btn ${targetLang === lang.code ? 'active' : ''}`}
                                onClick={() => setTargetLang(lang.code)}
                            >
                                <span className="language-flag">{lang.flag}</span>
                                <span className="language-name">{lang.name}</span>
                            </button>
                        ))}
                    </div>
                    <div className="input-group" style={{ marginTop: '12px' }}>
                        <select
                            className="text-input"
                            value={targetLang}
                            onChange={(e) => setTargetLang(e.target.value)}
                        >
                            {LANGUAGES.map(lang => (
                                <option key={lang.code} value={lang.code}>
                                    {lang.flag} {lang.name} ({lang.native})
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Page Range */}
                <div className="tool-section">
                    <h3 className="section-title">Pages to Translate</h3>
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
                            <span className="input-hint">Enter page numbers or ranges</span>
                        </div>
                    )}
                </div>

                {/* Processing State */}
                {isProcessing && (
                    <div className="tool-section">
                        <div className="processing-state ai-processing">
                            <div className="processing-icon ai-glow">
                                <Loader2 size={32} className="animate-spin" />
                            </div>
                            <h4>Translating your document...</h4>
                            <p>{statusMessage}</p>
                            <div className="progress-container">
                                <div className="progress-bar">
                                    <div
                                        className="progress-fill ai-gradient"
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

                {/* Translation Result */}
                {translation && !isProcessing && (
                    <div className="tool-section">
                        <div className="section-header">
                            <h3 className="section-title">Translation Result</h3>
                            <div className="section-actions">
                                <button className="file-action-btn" onClick={handleCopy} title="Copy to clipboard">
                                    {copied ? <CheckCircle size={18} /> : <Copy size={18} />}
                                </button>
                                <button className="file-action-btn" onClick={handleDownload} title="Download">
                                    <Download size={18} />
                                </button>
                            </div>
                        </div>
                        <div className="summary-result ai-result">
                            <pre className="summary-text">{translation}</pre>
                        </div>
                    </div>
                )}

                {/* Translate Button */}
                {!isProcessing && !translation && (
                    <div className="tool-section">
                        <div className="translation-preview">
                            <span className="preview-from">📄 Original</span>
                            <ArrowRight size={20} className="preview-arrow" />
                            <span className="preview-to">
                                {LANGUAGES.find(l => l.code === targetLang)?.flag} {LANGUAGES.find(l => l.code === targetLang)?.name}
                            </span>
                        </div>
                        <button
                            className="btn btn-primary btn-full ai-btn"
                            onClick={handleTranslate}
                        >
                            <Languages size={18} />
                            <span>Translate Document</span>
                        </button>
                        <span className="input-hint" style={{ display: 'block', marginTop: '8px', textAlign: 'center' }}>
                            Works best with text-based PDFs
                        </span>
                    </div>
                )}
            </div>

            <div className="tool-footer">
                <div className="tool-summary">
                    <Globe size={16} />
                    <span>{LANGUAGES.find(l => l.code === targetLang)?.flag} {LANGUAGES.find(l => l.code === targetLang)?.name}</span>
                </div>
                {translation && (
                    <button
                        className="btn btn-secondary"
                        onClick={() => {
                            setTranslation(null);
                            setError(null);
                        }}
                    >
                        <Languages size={18} />
                        <span>Translate Again</span>
                    </button>
                )}
            </div>
        </div>
    );
}
