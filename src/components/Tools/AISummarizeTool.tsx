import { useState } from 'react';
import { useApp } from '../../store/appStore';
import { Sparkles, Copy } from 'lucide-react';

export function AISummarizeTool() {
    const { state } = useApp();
    const { activeDocument } = state;
    const [summary, setSummary] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);

    const handleGenerate = () => {
        setIsGenerating(true);
        // Simulate API delay
        setTimeout(() => {
            setSummary(`# Summary of ${activeDocument?.name || 'Document'}

## Key Points
- This document contains ${activeDocument?.pageCount || 0} pages.
- It covers various topics related to the main subject.
- Important definitions and concepts are highlighted.

## Analysis
The document appears to be a structured report or textbook chapter. The content is organized into clear sections.

## Conclusion
A comprehensive overview of the subject matter.`);
            setIsGenerating(false);
        }, 2000);
    };

    if (!activeDocument) return null;

    return (
        <div className="tool-panel">
            <div className="tool-header">
                <h2 className="tool-title">AI Summarize</h2>
                <p className="tool-description">Generate a smart summary of your document.</p>
            </div>

            <div className="tool-content">
                <div className="ai-summary-area">
                    {summary ? (
                        <div className="summary-result">
                            <div className="summary-markdown">
                                <pre>{summary}</pre>
                            </div>
                            <button className="btn btn-secondary btn-sm" onClick={() => navigator.clipboard.writeText(summary)}>
                                <Copy size={14} /> Copy to Clipboard
                            </button>
                        </div>
                    ) : (
                        <div className="ai-placeholder">
                            <Sparkles size={48} className="ai-icon-pulse" />
                            <p>Ready to analyze content</p>
                        </div>
                    )}
                </div>
            </div>

            <div className="tool-footer">
                <button
                    className="btn btn-primary btn-lg"
                    onClick={handleGenerate}
                    disabled={isGenerating}
                >
                    {isGenerating ? (
                        <>Processing...</>
                    ) : (
                        <>
                            <Sparkles size={18} />
                            Generate Summary
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}
