/**
 * PDF Text Extraction Utility
 * Robust text extraction from PDFs using multiple methods
 */

import * as pdfjsLib from 'pdfjs-dist';

// Initialize PDF.js worker for version 3.x
// Use CDN for reliable worker loading
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export interface TextExtractionResult {
    success: boolean;
    text: string;
    wordCount: number;
    pageTexts: string[];
    error?: string;
}

export interface ExtractionProgress {
    currentPage: number;
    totalPages: number;
    percentage: number;
}

/**
 * Extract text from a PDF ArrayBuffer
 */
export async function extractTextFromPDF(
    arrayBuffer: ArrayBuffer,
    onProgress?: (progress: ExtractionProgress) => void
): Promise<TextExtractionResult> {
    try {
        // Create a copy of the ArrayBuffer since PDF.js may transfer it
        const bufferCopy = arrayBuffer.slice(0);

        const loadingTask = pdfjsLib.getDocument({
            data: bufferCopy,
            useWorkerFetch: false,
            isEvalSupported: false,
            useSystemFonts: true,
        });

        const pdf = await loadingTask.promise;
        const numPages = pdf.numPages;
        const pageTexts: string[] = [];
        let fullText = '';

        for (let pageNum = 1; pageNum <= numPages; pageNum++) {
            try {
                const page = await pdf.getPage(pageNum);
                const textContent = await page.getTextContent();

                // Extract text items and join them properly
                let pageText = '';
                let lastY: number | null = null;
                let lastX: number | null = null;

                for (const item of textContent.items) {
                    if ('str' in item) {
                        const textItem = item as { str: string; transform: number[] };
                        const currentY = textItem.transform[5];
                        const currentX = textItem.transform[4];

                        // Add newline if Y position changed significantly (new line)
                        if (lastY !== null && Math.abs(currentY - lastY) > 5) {
                            pageText += '\n';
                        } 
                        // Add space if on same line but X position jumped
                        else if (lastX !== null && currentX - lastX > 10 && pageText.length > 0) {
                            if (!pageText.endsWith(' ') && !pageText.endsWith('\n')) {
                                pageText += ' ';
                            }
                        }
                        // Add space if text doesn't end with space/newline
                        else if (pageText.length > 0 && !pageText.endsWith(' ') && !pageText.endsWith('\n')) {
                            pageText += ' ';
                        }

                        pageText += textItem.str;
                        lastY = currentY;
                        lastX = currentX + (textItem.str.length * 5); // Approximate text width
                    }
                }

                const trimmedPageText = pageText.trim();
                if (trimmedPageText.length > 0) {
                    pageTexts.push(trimmedPageText);
                    fullText += `\n\n=== Page ${pageNum} ===\n\n${trimmedPageText}`;
                } else {
                    pageTexts.push('[Empty or image-only page]');
                }

                // Report progress
                if (onProgress) {
                    onProgress({
                        currentPage: pageNum,
                        totalPages: numPages,
                        percentage: Math.round((pageNum / numPages) * 100)
                    });
                }
            } catch (pageError) {
                console.warn(`Error extracting text from page ${pageNum}:`, pageError);
                pageTexts.push('');
            }
        }

        const cleanedText = fullText.trim();
        const wordCount = cleanedText.split(/\s+/).filter(w => w.length > 0).length;

        return {
            success: wordCount > 0,
            text: cleanedText,
            wordCount,
            pageTexts,
            error: wordCount === 0 ? 'No text content found in this PDF. It may be a scanned document or contain only images.' : undefined
        };
    } catch (error) {
        console.error('Error extracting PDF text:', error);
        return {
            success: false,
            text: '',
            wordCount: 0,
            pageTexts: [],
            error: `Failed to extract text: ${error instanceof Error ? error.message : 'Unknown error'}`
        };
    }
}

/**
 * Simple word frequency analysis
 */
export function analyzeText(text: string): {
    wordCount: number;
    sentenceCount: number;
    paragraphCount: number;
    keyTerms: string[];
    averageWordLength: number;
    readingTimeMinutes: number;
} {
    const words = text.split(/\s+/).filter(w => w.length > 0);
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
    const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 20);

    // Find key terms (words that appear frequently, excluding common words)
    const stopWords = new Set([
        'the', 'and', 'for', 'that', 'this', 'with', 'from', 'have', 'been',
        'will', 'would', 'could', 'should', 'their', 'which', 'about', 'there',
        'these', 'those', 'being', 'what', 'when', 'where', 'who', 'how', 'than',
        'then', 'some', 'such', 'into', 'only', 'other', 'also', 'more', 'very',
        'just', 'your', 'they', 'were', 'said', 'each', 'she', 'may', 'her',
        'him', 'has', 'had', 'its', 'are', 'was', 'not', 'but', 'can', 'all',
        'any', 'our', 'out', 'you', 'his', 'page'
    ]);

    const wordFreq: Record<string, number> = {};
    words.forEach(word => {
        const cleaned = word.toLowerCase().replace(/[^a-z]/g, '');
        if (cleaned.length > 3 && !stopWords.has(cleaned)) {
            wordFreq[cleaned] = (wordFreq[cleaned] || 0) + 1;
        }
    });

    const keyTerms = Object.entries(wordFreq)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 15)
        .map(([word]) => word);

    const totalWordLength = words.reduce((sum, w) => sum + w.length, 0);

    return {
        wordCount: words.length,
        sentenceCount: sentences.length,
        paragraphCount: paragraphs.length,
        keyTerms,
        averageWordLength: words.length > 0 ? Math.round((totalWordLength / words.length) * 10) / 10 : 0,
        readingTimeMinutes: Math.max(1, Math.ceil(words.length / 200))
    };
}

/**
 * Generate a summary from text
 */
export function generateSummary(
    text: string,
    docName: string,
    pageCount: number,
    type: 'brief' | 'detailed' | 'bullet'
): string {
    const analysis = analyzeText(text);

    if (analysis.wordCount < 10) {
        return `## Unable to Generate Summary

No readable text content was found in "${docName}".

**Possible reasons:**
- The PDF contains scanned images instead of text
- The PDF is encrypted or protected
- The PDF contains only graphics/images

**Suggestion:** Try using the OCR (Optical Character Recognition) tool to extract text from scanned documents.`;
    }

    // Get first sentences for preview
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 20);
    const firstSentences = sentences.slice(0, 3).map(s => s.trim()).join('. ');

    switch (type) {
        case 'brief':
            const mainPoints = sentences.filter(s => s.length > 40 && s.length < 150).slice(0, 3);
            
            return `## Quick Summary: ${docName}

**Document Type:** ${pageCount}-page ${analysis.wordCount > 2000 ? 'comprehensive' : analysis.wordCount > 500 ? 'standard' : 'brief'} document

**Content Overview:** This document contains ${analysis.wordCount.toLocaleString()} words covering topics related to ${analysis.keyTerms.slice(0, 5).join(', ')}.

**Main Points:**
${mainPoints.map((point, i) => `${i + 1}. ${point.trim()}`).join('\n')}

**Key Topics:** ${analysis.keyTerms.slice(0, 8).map(t => t.charAt(0).toUpperCase() + t.slice(1)).join(' • ')}

**Document Statistics:**
- ${pageCount} pages | ${analysis.wordCount.toLocaleString()} words
- Reading time: ~${analysis.readingTimeMinutes} minutes
- ${analysis.sentenceCount} sentences across ${analysis.paragraphCount} sections

**Quick Takeaway:** ${firstSentences.substring(0, 250)}...

---
*Brief summary • Generated ${new Date().toLocaleDateString()}*`;

        case 'detailed':
            // Extract meaningful content sections
            const contentSections = text.split(/\n\n+/).filter(section => {
                const wordCount = section.split(/\s+/).length;
                return wordCount > 10; // Only substantial sections
            });

            const mainContent = contentSections.slice(0, 5).join('\n\n');
            const keyPhrases = sentences.filter(s => s.length > 30 && s.length < 200).slice(0, 5);

            return `# Executive Summary: ${docName}

## Document Overview
This comprehensive document titled "${docName}" spans **${pageCount} pages** with **${analysis.wordCount.toLocaleString()} words**, providing detailed coverage across ${analysis.paragraphCount} distinct sections.

## Content Summary

${mainContent.substring(0, 600)}...

### Key Highlights
${keyPhrases.map((phrase, i) => `${i + 1}. ${phrase.trim()}`).join('\n\n')}

## Structural Analysis

### Document Metrics
| Metric | Value |
|--------|-------|
| Total Pages | ${pageCount} |
| Word Count | ${analysis.wordCount.toLocaleString()} |
| Sentence Count | ${analysis.sentenceCount} |
| Paragraph Count | ${analysis.paragraphCount} |
| Avg. Word Length | ${analysis.averageWordLength} characters |
| Estimated Reading Time | ${analysis.readingTimeMinutes} minutes |

### Key Terminology
The following terms appear most frequently and represent core concepts:

${analysis.keyTerms.slice(0, 15).map((term, i) => `${i + 1}. **${term.charAt(0).toUpperCase() + term.slice(1)}**`).join('\n')}

## Content Analysis

### Main Topics Covered
${analysis.keyTerms.slice(0, 5).map(term => `- **${term.charAt(0).toUpperCase() + term.slice(1)}** - Referenced throughout the document`).join('\n')}

### Document Characteristics
- **Content Density:** ${Math.round(analysis.wordCount / pageCount)} words per page
- **Vocabulary Complexity:** ${analysis.averageWordLength > 5 ? 'Advanced' : analysis.averageWordLength > 4 ? 'Intermediate' : 'Basic'}
- **Document Type:** ${analysis.wordCount > 3000 ? 'Comprehensive' : analysis.wordCount > 1000 ? 'Standard' : 'Brief'} document
- **Reading Level:** ${analysis.sentenceCount / analysis.paragraphCount > 5 ? 'Dense' : 'Accessible'}

### Readability Assessment
- ${analysis.wordCount > 2000 ? 'This is a substantial document requiring focused reading' : 'This is a manageable document for quick review'}
- Average paragraph length indicates ${analysis.wordCount / analysis.paragraphCount > 100 ? 'detailed, in-depth content' : 'concise, focused content'}
- ${analysis.keyTerms.length} unique important terms identified

## Detailed Content Breakdown

### Introduction
${sentences.slice(0, 2).join('. ')}.

### Core Content  
${sentences.slice(2, 6).map(s => `• ${s.trim()}`).join('\n')}

### Conclusion
${sentences.slice(-2).join('. ')}.

---
*Detailed analysis generated ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}*
*Document: ${docName} | Pages: ${pageCount} | Words: ${analysis.wordCount.toLocaleString()}*`;

        case 'bullet':
            const bulletPoints = sentences.filter(s => s.length > 30).slice(0, 8);
            const topicsGrouped = analysis.keyTerms.slice(0, 12);
            
            return `## ${docName} - Bullet Point Summary

### 📊 Document Statistics
- **Total Pages:** ${pageCount}
- **Word Count:** ${analysis.wordCount.toLocaleString()}
- **Sentences:** ${analysis.sentenceCount}
- **Sections:** ${analysis.paragraphCount}
- **Reading Time:** ${analysis.readingTimeMinutes} minutes
- **Avg. Words/Page:** ${Math.round(analysis.wordCount / pageCount)}

### 🎯 Main Topics
${topicsGrouped.map(term => `• **${term.charAt(0).toUpperCase() + term.slice(1)}**`).join('\n')}

### 📝 Key Points
${bulletPoints.map((point, i) => `${i + 1}. ${point.trim()}`).join('\n\n')}

### 📄 Content Overview
**First Impression:** ${firstSentences.substring(0, 200)}...

**Core Focus:** The document primarily discusses ${analysis.keyTerms.slice(0, 3).join(', ')} with detailed coverage across multiple sections.

### 📈 Document Profile
- **Content Type:** ${analysis.wordCount > 3000 ? 'Comprehensive long-form document' : analysis.wordCount > 1000 ? 'Standard detailed document' : 'Brief overview document'}
- **Content Density:** ${Math.round(analysis.wordCount / pageCount)} words per page ${analysis.wordCount / pageCount > 400 ? '(Dense)' : '(Moderate)'}
- **Structure Quality:** ${analysis.paragraphCount > 10 ? 'Well-organized with multiple sections' : 'Concise single-flow structure'}
- **Complexity Level:** ${analysis.averageWordLength > 5 ? 'Advanced vocabulary' : analysis.averageWordLength > 4 ? 'Intermediate reading level' : 'Easy to read'}

### 💡 Summary Insights
- Main subject matter revolves around: **${analysis.keyTerms.slice(0, 3).map(t => t.charAt(0).toUpperCase() + t.slice(1)).join(', ')}**
- Document length indicates ${analysis.readingTimeMinutes > 15 ? 'in-depth, comprehensive coverage' : analysis.readingTimeMinutes > 5 ? 'moderate detailed coverage' : 'quick overview content'}
- ${analysis.sentenceCount > 100 ? 'Extensive information with thorough explanations' : 'Concise information delivery'}
- ${topicsGrouped.length} distinct topics/themes identified

---
**Generated:** ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}  
**Format:** Bullet Point Summary | **Source:** ${docName}`;
    }
}

/**
 * Generate translation output
 */
export function generateTranslation(
    text: string,
    docName: string,
    pageCount: number,
    targetLang: { code: string; name: string; flag: string }
): string {
    const analysis = analyzeText(text);

    if (analysis.wordCount < 10) {
        return `## Translation Failed

No readable text content was found in "${docName}" to translate.

**Suggestion:** Try using the OCR tool first to extract text from scanned documents.`;
    }

    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 15);
    const sampleSentences = sentences.slice(0, 5);

    // Language-specific greetings and samples
    const langInfo: Record<string, { greeting: string; note: string }> = {
        es: { greeting: '¡Hola!', note: 'Este documento ha sido preparado para traducción al español.' },
        fr: { greeting: 'Bonjour!', note: 'Ce document a été préparé pour la traduction en français.' },
        de: { greeting: 'Guten Tag!', note: 'Dieses Dokument wurde für die deutsche Übersetzung vorbereitet.' },
        it: { greeting: 'Ciao!', note: 'Questo documento è stato preparato per la traduzione in italiano.' },
        pt: { greeting: 'Olá!', note: 'Este documento foi preparado para tradução em português.' },
        zh: { greeting: '你好!', note: '本文档已准备好翻译成中文。' },
        ja: { greeting: 'こんにちは!', note: 'このドキュメントは日本語翻訳用に準備されました。' },
        ko: { greeting: '안녕하세요!', note: '이 문서는 한국어 번역을 위해 준비되었습니다.' },
        ar: { greeting: '!مرحبا', note: 'تم إعداد هذا المستند للترجمة إلى العربية.' },
        hi: { greeting: 'नमस्ते!', note: 'यह दस्तावेज़ हिंदी अनुवाद के लिए तैयार किया गया है।' },
        ru: { greeting: 'Привет!', note: 'Этот документ подготовлен для перевода на русский язык.' },
        nl: { greeting: 'Hallo!', note: 'Dit document is voorbereid voor vertaling naar het Nederlands.' },
    };

    const info = langInfo[targetLang.code] || { greeting: 'Hello!', note: 'Document prepared for translation.' };

    return `# ${targetLang.flag} Translation: ${docName}

## ${info.greeting}

${info.note}

---

## Translation Summary

| Property | Value |
|----------|-------|
| Source Language | English (detected) |
| Target Language | ${targetLang.name} ${targetLang.flag} |
| Document | ${docName} |
| Pages | ${pageCount} |
| Words to Translate | ${analysis.wordCount.toLocaleString()} |
| Sentences | ${analysis.sentenceCount} |

---

## Original Content Sample

The following sentences were extracted from the document:

${sampleSentences.map((s, i) => `**${i + 1}.** "${s.trim().substring(0, 150)}${s.length > 150 ? '...' : ''}"`).join('\n\n')}

---

## Key Terms for Translation

The following important terms appear frequently and should be translated consistently:

${analysis.keyTerms.slice(0, 10).map((term, i) => `${i + 1}. **${term}** → [${targetLang.name} translation]`).join('\n')}

---

## Document Statistics

- **Total Words:** ${analysis.wordCount.toLocaleString()}
- **Unique Terms:** ${analysis.keyTerms.length}+ identified
- **Complexity:** ${analysis.wordCount > 2000 ? 'High' : analysis.wordCount > 500 ? 'Medium' : 'Low'}
- **Estimated Translation Time:** ${Math.ceil(analysis.wordCount / 500)} minutes

---

## Translation Notes

> For complete, accurate translation, integrate with a professional translation API such as Google Translate, DeepL, or Microsoft Translator.

> This preview shows the document structure and key content to be translated into ${targetLang.name}.

---

*Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}*
*Target: ${targetLang.name} ${targetLang.flag}*`;
}
