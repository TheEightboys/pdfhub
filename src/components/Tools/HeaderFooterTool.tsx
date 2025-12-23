/**
 * Header Footer Tool
 * Add headers and footers to PDF pages
 */

import { useState, useCallback } from 'react';
import { useApp, useToast } from '../../store/appStore';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { downloadPDF } from '../../utils/pdfHelpers';
import { AlignVerticalJustifyStart, Download, Loader2 } from 'lucide-react';
import './Tools.css';

interface HeaderFooterConfig {
    headerLeft: string;
    headerCenter: string;
    headerRight: string;
    footerLeft: string;
    footerCenter: string;
    footerRight: string;
}

const PLACEHOLDERS = [
    { label: 'Page Number', value: '{{page}}' },
    { label: 'Total Pages', value: '{{total}}' },
    { label: 'Date', value: '{{date}}' },
    { label: 'Time', value: '{{time}}' },
    { label: 'File Name', value: '{{filename}}' },
];

const FONT_SIZES = [8, 9, 10, 11, 12, 14, 16, 18];

export function HeaderFooterTool() {
    const { state, setLoading } = useApp();
    const { addToast } = useToast();
    const { activeDocument } = state;

    const [isProcessing, setIsProcessing] = useState(false);
    const [config, setConfig] = useState<HeaderFooterConfig>({
        headerLeft: '',
        headerCenter: '',
        headerRight: '',
        footerLeft: '',
        footerCenter: 'Page {{page}} of {{total}}',
        footerRight: '',
    });
    const [fontSize, setFontSize] = useState(10);
    const [fontColor, setFontColor] = useState('#000000');
    const [margin, setMargin] = useState(36); // 0.5 inch
    const [applyTo, setApplyTo] = useState<'all' | 'odd' | 'even' | 'custom'>('all');
    const [customPages, setCustomPages] = useState('');
    const [skipFirstPage, setSkipFirstPage] = useState(false);

    const updateConfig = (field: keyof HeaderFooterConfig, value: string) => {
        setConfig(prev => ({ ...prev, [field]: value }));
    };

    const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16) / 255,
            g: parseInt(result[2], 16) / 255,
            b: parseInt(result[3], 16) / 255,
        } : { r: 0, g: 0, b: 0 };
    };

    const processText = (text: string, pageNum: number, totalPages: number, fileName: string): string => {
        const now = new Date();
        return text
            .replace(/\{\{page\}\}/g, String(pageNum))
            .replace(/\{\{total\}\}/g, String(totalPages))
            .replace(/\{\{date\}\}/g, now.toLocaleDateString())
            .replace(/\{\{time\}\}/g, now.toLocaleTimeString())
            .replace(/\{\{filename\}\}/g, fileName.replace('.pdf', ''));
    };

    const handleApply = useCallback(async () => {
        if (!activeDocument) return;

        const hasContent = Object.values(config).some(v => v.trim() !== '');
        if (!hasContent) {
            addToast({
                type: 'error',
                title: 'No content',
                message: 'Please enter header or footer text.',
            });
            return;
        }

        setIsProcessing(true);
        setLoading(true, 'Adding headers/footers...');

        try {
            const pdfDoc = await PDFDocument.load(activeDocument.arrayBuffer.slice(0), { ignoreEncryption: true });
            const pages = pdfDoc.getPages();
            const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
            const color = hexToRgb(fontColor);
            const totalPages = pages.length;

            // Determine which pages to apply to
            let pagesToApply: number[] = [];

            if (applyTo === 'all') {
                pagesToApply = Array.from({ length: pages.length }, (_, i) => i);
            } else if (applyTo === 'odd') {
                pagesToApply = Array.from({ length: pages.length }, (_, i) => i).filter(i => i % 2 === 0);
            } else if (applyTo === 'even') {
                pagesToApply = Array.from({ length: pages.length }, (_, i) => i).filter(i => i % 2 === 1);
            } else {
                pagesToApply = parsePageRange(customPages, pages.length);
            }

            // Skip first page if enabled
            if (skipFirstPage) {
                pagesToApply = pagesToApply.filter(i => i !== 0);
            }

            // Apply to selected pages
            for (const pageIndex of pagesToApply) {
                if (pageIndex >= 0 && pageIndex < pages.length) {
                    const page = pages[pageIndex];
                    const { width, height } = page.getSize();
                    const pageNum = pageIndex + 1;

                    // Draw header
                    if (config.headerLeft) {
                        const text = processText(config.headerLeft, pageNum, totalPages, activeDocument.name);
                        page.drawText(text, {
                            x: margin,
                            y: height - margin,
                            size: fontSize,
                            font,
                            color: rgb(color.r, color.g, color.b),
                        });
                    }

                    if (config.headerCenter) {
                        const text = processText(config.headerCenter, pageNum, totalPages, activeDocument.name);
                        const textWidth = font.widthOfTextAtSize(text, fontSize);
                        page.drawText(text, {
                            x: (width - textWidth) / 2,
                            y: height - margin,
                            size: fontSize,
                            font,
                            color: rgb(color.r, color.g, color.b),
                        });
                    }

                    if (config.headerRight) {
                        const text = processText(config.headerRight, pageNum, totalPages, activeDocument.name);
                        const textWidth = font.widthOfTextAtSize(text, fontSize);
                        page.drawText(text, {
                            x: width - margin - textWidth,
                            y: height - margin,
                            size: fontSize,
                            font,
                            color: rgb(color.r, color.g, color.b),
                        });
                    }

                    // Draw footer
                    if (config.footerLeft) {
                        const text = processText(config.footerLeft, pageNum, totalPages, activeDocument.name);
                        page.drawText(text, {
                            x: margin,
                            y: margin,
                            size: fontSize,
                            font,
                            color: rgb(color.r, color.g, color.b),
                        });
                    }

                    if (config.footerCenter) {
                        const text = processText(config.footerCenter, pageNum, totalPages, activeDocument.name);
                        const textWidth = font.widthOfTextAtSize(text, fontSize);
                        page.drawText(text, {
                            x: (width - textWidth) / 2,
                            y: margin,
                            size: fontSize,
                            font,
                            color: rgb(color.r, color.g, color.b),
                        });
                    }

                    if (config.footerRight) {
                        const text = processText(config.footerRight, pageNum, totalPages, activeDocument.name);
                        const textWidth = font.widthOfTextAtSize(text, fontSize);
                        page.drawText(text, {
                            x: width - margin - textWidth,
                            y: margin,
                            size: fontSize,
                            font,
                            color: rgb(color.r, color.g, color.b),
                        });
                    }
                }
            }

            const pdfBytes = await pdfDoc.save();
            const fileName = activeDocument.name.replace('.pdf', '_headerfooter.pdf');
            downloadPDF(pdfBytes, fileName);

            addToast({
                type: 'success',
                title: 'Headers/Footers added!',
                message: `Applied to ${pagesToApply.length} page(s)`,
            });
        } catch (error) {
            console.error('Header/Footer apply failed:', error);
            addToast({
                type: 'error',
                title: 'Apply failed',
                message: 'An error occurred while adding headers/footers.',
            });
        } finally {
            setIsProcessing(false);
            setLoading(false);
        }
    }, [activeDocument, config, fontSize, fontColor, margin, applyTo, customPages, skipFirstPage, setLoading, addToast]);

    if (!activeDocument) {
        return (
            <div className="tool-panel">
                <div className="tool-empty">
                    <AlignVerticalJustifyStart size={48} />
                    <h3>Open a PDF first</h3>
                    <p>Upload a PDF file to add headers and footers.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="tool-panel">
            <div className="tool-header">
                <h2 className="tool-title">Header & Footer</h2>
                <p className="tool-description">
                    Add custom headers and footers with page numbers and text
                </p>
            </div>

            <div className="tool-content">
                {/* Placeholders Info */}
                <div className="tool-section">
                    <h4 className="section-title">Available Placeholders</h4>
                    <div className="placeholders-list">
                        {PLACEHOLDERS.map(p => (
                            <span key={p.value} className="placeholder-tag" title={p.label}>
                                {p.value}
                            </span>
                        ))}
                    </div>
                </div>

                {/* Header Configuration */}
                <div className="tool-section">
                    <h4 className="section-title">Header</h4>
                    <div className="header-footer-grid">
                        <div className="hf-input">
                            <label>Left</label>
                            <input
                                type="text"
                                value={config.headerLeft}
                                onChange={(e) => updateConfig('headerLeft', e.target.value)}
                                placeholder="Header left..."
                            />
                        </div>
                        <div className="hf-input">
                            <label>Center</label>
                            <input
                                type="text"
                                value={config.headerCenter}
                                onChange={(e) => updateConfig('headerCenter', e.target.value)}
                                placeholder="Header center..."
                            />
                        </div>
                        <div className="hf-input">
                            <label>Right</label>
                            <input
                                type="text"
                                value={config.headerRight}
                                onChange={(e) => updateConfig('headerRight', e.target.value)}
                                placeholder="Header right..."
                            />
                        </div>
                    </div>
                </div>

                {/* Footer Configuration */}
                <div className="tool-section">
                    <h4 className="section-title">Footer</h4>
                    <div className="header-footer-grid">
                        <div className="hf-input">
                            <label>Left</label>
                            <input
                                type="text"
                                value={config.footerLeft}
                                onChange={(e) => updateConfig('footerLeft', e.target.value)}
                                placeholder="Footer left..."
                            />
                        </div>
                        <div className="hf-input">
                            <label>Center</label>
                            <input
                                type="text"
                                value={config.footerCenter}
                                onChange={(e) => updateConfig('footerCenter', e.target.value)}
                                placeholder="Footer center..."
                            />
                        </div>
                        <div className="hf-input">
                            <label>Right</label>
                            <input
                                type="text"
                                value={config.footerRight}
                                onChange={(e) => updateConfig('footerRight', e.target.value)}
                                placeholder="Footer right..."
                            />
                        </div>
                    </div>
                </div>

                {/* Font Settings */}
                <div className="tool-section">
                    <h4 className="section-title">Font Settings</h4>
                    <div className="font-settings">
                        <div className="setting-item">
                            <label>Size</label>
                            <select value={fontSize} onChange={(e) => setFontSize(parseInt(e.target.value))}>
                                {FONT_SIZES.map(s => (
                                    <option key={s} value={s}>{s} pt</option>
                                ))}
                            </select>
                        </div>
                        <div className="setting-item">
                            <label>Color</label>
                            <input
                                type="color"
                                value={fontColor}
                                onChange={(e) => setFontColor(e.target.value)}
                            />
                        </div>
                        <div className="setting-item">
                            <label>Margin</label>
                            <select value={margin} onChange={(e) => setMargin(parseInt(e.target.value))}>
                                <option value={18}>0.25"</option>
                                <option value={36}>0.5"</option>
                                <option value={54}>0.75"</option>
                                <option value={72}>1"</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Apply To */}
                <div className="tool-section">
                    <h4 className="section-title">Apply To</h4>
                    <div className="radio-options">
                        <label className="radio-option">
                            <input
                                type="radio"
                                name="applyTo"
                                checked={applyTo === 'all'}
                                onChange={() => setApplyTo('all')}
                            />
                            <span>All pages</span>
                        </label>
                        <label className="radio-option">
                            <input
                                type="radio"
                                name="applyTo"
                                checked={applyTo === 'odd'}
                                onChange={() => setApplyTo('odd')}
                            />
                            <span>Odd pages only</span>
                        </label>
                        <label className="radio-option">
                            <input
                                type="radio"
                                name="applyTo"
                                checked={applyTo === 'even'}
                                onChange={() => setApplyTo('even')}
                            />
                            <span>Even pages only</span>
                        </label>
                        <label className="radio-option">
                            <input
                                type="radio"
                                name="applyTo"
                                checked={applyTo === 'custom'}
                                onChange={() => setApplyTo('custom')}
                            />
                            <span>Custom range</span>
                        </label>
                    </div>

                    {applyTo === 'custom' && (
                        <input
                            type="text"
                            className="custom-pages-input"
                            placeholder="e.g., 1-3, 5, 7-10"
                            value={customPages}
                            onChange={(e) => setCustomPages(e.target.value)}
                        />
                    )}

                    <label className="checkbox-option" style={{ marginTop: '0.5rem' }}>
                        <input
                            type="checkbox"
                            checked={skipFirstPage}
                            onChange={(e) => setSkipFirstPage(e.target.checked)}
                        />
                        <span>Skip first page</span>
                    </label>
                </div>

                {/* Action Button */}
                <div className="tool-actions">
                    <button
                        className="btn btn-primary btn-lg"
                        onClick={handleApply}
                        disabled={isProcessing}
                    >
                        {isProcessing ? (
                            <>
                                <Loader2 size={20} className="animate-spin" />
                                Applying...
                            </>
                        ) : (
                            <>
                                <Download size={20} />
                                Apply & Download
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

// Helper function to parse page range string
function parsePageRange(input: string, maxPages: number): number[] {
    const pages: Set<number> = new Set();
    const parts = input.split(',').map(p => p.trim());

    for (const part of parts) {
        if (part.includes('-')) {
            const [start, end] = part.split('-').map(n => parseInt(n.trim()));
            if (!isNaN(start) && !isNaN(end)) {
                for (let i = Math.max(1, start); i <= Math.min(maxPages, end); i++) {
                    pages.add(i - 1);
                }
            }
        } else {
            const num = parseInt(part);
            if (!isNaN(num) && num >= 1 && num <= maxPages) {
                pages.add(num - 1);
            }
        }
    }

    return Array.from(pages).sort((a, b) => a - b);
}
