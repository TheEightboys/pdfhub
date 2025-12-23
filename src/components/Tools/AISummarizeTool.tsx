/**
 * AI Summarize Tool
 * Extract and summarize content from PDF documents
 * Uses PDF.js for text extraction and client-side AI processing
 */

import { useState, useCallback } from 'react';
import { useApp } from '../../store/appStore';
import {
    FileText,
    Sparkles,
    Copy,
    Download,
    CheckCircle,
    Loader2,
    AlertCircle,
    ListChecks,
    AlignLeft,
    BookOpen
} from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import './Tools.css';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

type SummaryLength = 'short' | 'medium' | 'detailed';
type SummaryMode = 'summary' | 'keypoints' | 'outline';

interface SummaryOptions {
    length: SummaryLength;
    mode: SummaryMode;
}

export function AISummarizeTool() {
    const { state } = useApp();
    const { activeDocument } = state;

    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [statusMessage, setStatusMessage] = useState('');
    const [summary, setSummary] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [options, setOptions] = useState<SummaryOptions>({
        length: 'medium',
        mode: 'summary'
    });

    // Extract text from all PDF pages
    const extractTextFromPDF = async (): Promise<string> => {
        if (!activeDocument?.arrayBuffer) return '';

        const pdf = await pdfjsLib.getDocument({ data: activeDocument.arrayBuffer.slice(0) }).promise;
        const totalPages = pdf.numPages;
        let fullText = '';

        for (let i = 1; i <= totalPages; i++) {
            setProgress(Math.round((i / totalPages) * 50));
            setStatusMessage(`Extracting text from page ${i}/${totalPages}...`);

            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items
                .map((item: any) => item.str)
                .join(' ');

            fullText += pageText + '\n\n';
        }

        return fullText.trim();
    };

    // Client-side summarization algorithm
    const generateSummary = (text: string, options: SummaryOptions): string => {
        if (!text.trim()) return '';

        // Split into sentences
        const sentences = text
            .replace(/\s+/g, ' ')
            .split(/(?<=[.!?])\s+/)
            .filter(s => s.trim().length > 20);

        if (sentences.length === 0) return 'No extractable content found in this document.';

        // Calculate sentence importance scores
        const wordFreq: Record<string, number> = {};
        const words = text.toLowerCase().match(/\b[a-z]{4,}\b/g) || [];

        // Common stop words to ignore
        const stopWords = new Set([
            'this', 'that', 'these', 'those', 'with', 'from', 'have', 'been',
            'were', 'would', 'could', 'should', 'their', 'them', 'they',
            'what', 'which', 'where', 'when', 'about', 'into', 'through',
            'during', 'before', 'after', 'above', 'below', 'between'
        ]);

        words.forEach(word => {
            if (!stopWords.has(word)) {
                wordFreq[word] = (wordFreq[word] || 0) + 1;
            }
        });

        // Score sentences
        const scoredSentences = sentences.map((sentence, index) => {
            const sentenceWords = sentence.toLowerCase().match(/\b[a-z]{4,}\b/g) || [];
            let score = sentenceWords.reduce((sum, word) => sum + (wordFreq[word] || 0), 0);

            // Boost score for sentences at beginning
            if (index < 3) score *= 1.5;
            // Boost sentences with key indicator words
            if (/\b(important|key|main|significant|essential|critical|primary)\b/i.test(sentence)) {
                score *= 1.3;
            }

            return { sentence, score, index };
        });

        // Sort by score
        scoredSentences.sort((a, b) => b.score - a.score);

        // Determine how many sentences to include based on length
        const lengthMap = { short: 3, medium: 6, detailed: 12 };
        const numSentences = Math.min(lengthMap[options.length], sentences.length);

        // Get top sentences and restore original order
        const topSentences = scoredSentences
            .slice(0, numSentences)
            .sort((a, b) => a.index - b.index);

        // Format output based on mode
        if (options.mode === 'keypoints') {
            return topSentences
                .map((s, i) => `${i + 1}. ${s.sentence.trim()}`)
                .join('\n\n');
        } else if (options.mode === 'outline') {
            const sections = ['Overview', 'Key Details', 'Additional Information'];
            const perSection = Math.ceil(topSentences.length / 3);
            let outline = '';

            for (let i = 0; i < 3 && i * perSection < topSentences.length; i++) {
                outline += `## ${sections[i]}\n\n`;
                const sectionSentences = topSentences.slice(i * perSection, (i + 1) * perSection);
                sectionSentences.forEach(s => {
                    outline += `• ${s.sentence.trim()}\n`;
                });
                outline += '\n';
            }
            return outline.trim();
        } else {
            return topSentences.map(s => s.sentence.trim()).join(' ');
        }
    };

    const handleSummarize = useCallback(async () => {
        if (!activeDocument?.arrayBuffer) return;

        setIsProcessing(true);
        setProgress(0);
        setError(null);
        setSummary(null);
        setStatusMessage('Starting analysis...');

        try {
            // Extract text
            const text = await extractTextFromPDF();

            if (!text.trim()) {
                throw new Error('No text could be extracted from this PDF. The document may be scanned or contain only images.');
            }

            setProgress(60);
            setStatusMessage('Generating summary...');

            // Simulate processing time for better UX
            await new Promise(resolve => setTimeout(resolve, 500));

            // Generate summary
            const result = generateSummary(text, options);

            setProgress(100);
            setStatusMessage('Complete!');

            // Format final output
            const modeLabels = {
                summary: 'Summary',
                keypoints: 'Key Points',
                outline: 'Outline'
            };
            const lengthLabels = {
                short: 'Brief',
                medium: 'Standard',
                detailed: 'Comprehensive'
            };

            const wordCount = text.split(/\s+/).length;
            const summaryWordCount = result.split(/\s+/).length;

            const formattedSummary = `# AI ${modeLabels[options.mode]}

**Document:** ${activeDocument.name}
**Original:** ~${wordCount.toLocaleString()} words
**Summary:** ~${summaryWordCount.toLocaleString()} words (${Math.round((summaryWordCount / wordCount) * 100)}% of original)
**Type:** ${lengthLabels[options.length]} ${modeLabels[options.mode]}
**Generated:** ${new Date().toLocaleString()}

---

${result}

---
*AI-powered summarization by PDF Editor Pro*`;

            setSummary(formattedSummary);

        } catch (err) {
            console.error('Summarization error:', err);
            setError(err instanceof Error ? err.message : 'Failed to summarize document');
        }

        setIsProcessing(false);
        setStatusMessage('');
    }, [activeDocument, options]);

    const handleCopy = async () => {
        if (summary) {
            await navigator.clipboard.writeText(summary);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleDownload = () => {
        if (!summary) return;
        const blob = new Blob([summary], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `summary-${activeDocument?.name || 'document'}.txt`;
        a.click();
        URL.revokeObjectURL(url);
    };

    if (!activeDocument) {
        return (
            <div className="tool-panel">
                <div className="tool-empty">
                    <div className="tool-empty-icon ai-glow">
                        <Sparkles size={36} />
                    </div>
                    <h3>No PDF Loaded</h3>
                    <p>Open a PDF document to generate an AI summary</p>
                </div>
            </div>
        );
    }

    return (
        <div className="tool-panel">
            <div className="tool-header">
                <h2 className="tool-title">
                    <Sparkles size={20} className="ai-icon" />
                    AI Summarize
                </h2>
                <p className="tool-description">
                    Generate intelligent summaries of your PDF content
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

                {/* Summary Mode */}
                <div className="tool-section">
                    <h3 className="section-title">Summary Mode</h3>
                    <div className="mode-tabs">
                        <button
                            className={`mode-tab ${options.mode === 'summary' ? 'active' : ''}`}
                            onClick={() => setOptions(o => ({ ...o, mode: 'summary' }))}
                        >
                            <AlignLeft size={16} />
                            Summary
                        </button>
                        <button
                            className={`mode-tab ${options.mode === 'keypoints' ? 'active' : ''}`}
                            onClick={() => setOptions(o => ({ ...o, mode: 'keypoints' }))}
                        >
                            <ListChecks size={16} />
                            Key Points
                        </button>
                        <button
                            className={`mode-tab ${options.mode === 'outline' ? 'active' : ''}`}
                            onClick={() => setOptions(o => ({ ...o, mode: 'outline' }))}
                        >
                            <BookOpen size={16} />
                            Outline
                        </button>
                    </div>
                </div>

                {/* Summary Length */}
                <div className="tool-section">
                    <h3 className="section-title">Summary Length</h3>
                    <div className="length-options">
                        <button
                            className={`length-btn ${options.length === 'short' ? 'active' : ''}`}
                            onClick={() => setOptions(o => ({ ...o, length: 'short' }))}
                        >
                            <span className="length-icon">📝</span>
                            <span className="length-label">Brief</span>
                            <span className="length-desc">~3 key sentences</span>
                        </button>
                        <button
                            className={`length-btn ${options.length === 'medium' ? 'active' : ''}`}
                            onClick={() => setOptions(o => ({ ...o, length: 'medium' }))}
                        >
                            <span className="length-icon">📄</span>
                            <span className="length-label">Standard</span>
                            <span className="length-desc">~6 sentences</span>
                        </button>
                        <button
                            className={`length-btn ${options.length === 'detailed' ? 'active' : ''}`}
                            onClick={() => setOptions(o => ({ ...o, length: 'detailed' }))}
                        >
                            <span className="length-icon">📚</span>
                            <span className="length-label">Detailed</span>
                            <span className="length-desc">~12 sentences</span>
                        </button>
                    </div>
                </div>

                {/* Processing State */}
                {isProcessing && (
                    <div className="tool-section">
                        <div className="processing-state ai-processing">
                            <div className="processing-icon ai-glow">
                                <Loader2 size={32} className="animate-spin" />
                            </div>
                            <h4>AI is analyzing your document...</h4>
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

                {/* Summary Result */}
                {summary && !isProcessing && (
                    <div className="tool-section">
                        <div className="section-header">
                            <h3 className="section-title">Generated Summary</h3>
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
                            <pre className="summary-text">{summary}</pre>
                        </div>
                    </div>
                )}

                {/* Summarize Button */}
                {!isProcessing && !summary && (
                    <div className="tool-section">
                        <button
                            className="btn btn-primary btn-full ai-btn"
                            onClick={handleSummarize}
                        >
                            <Sparkles size={18} />
                            <span>Generate AI Summary</span>
                        </button>
                        <span className="input-hint" style={{ display: 'block', marginTop: '8px', textAlign: 'center' }}>
                            Works best with text-based PDFs
                        </span>
                    </div>
                )}
            </div>

            <div className="tool-footer">
                <div className="tool-summary">
                    <Sparkles size={16} />
                    <span>AI-Powered Analysis</span>
                </div>
                {summary && (
                    <button
                        className="btn btn-secondary"
                        onClick={() => {
                            setSummary(null);
                            setError(null);
                        }}
                    >
                        <Sparkles size={18} />
                        <span>Regenerate</span>
                    </button>
                )}
            </div>
        </div>
    );
}
