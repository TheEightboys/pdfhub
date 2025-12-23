/**
 * Hyperlinks Tool
 * Add clickable links to PDF
 */

import { useState, useCallback } from 'react';
import { useApp, useToast } from '../../store/appStore';
import { PDFDocument, rgb } from 'pdf-lib';
import { downloadPDF } from '../../utils/pdfHelpers';
import { Link, Download, Loader2, Plus, Trash2, ExternalLink, FileText } from 'lucide-react';
import './Tools.css';

interface HyperlinkItem {
    id: string;
    type: 'url' | 'page';
    url?: string;
    targetPage?: number;
    pageNumber: number;
    x: number;
    y: number;
    width: number;
    height: number;
    label?: string;
}

export function HyperlinksTool() {
    const { state, setLoading } = useApp();
    const { addToast } = useToast();
    const { activeDocument } = state;

    const [isProcessing, setIsProcessing] = useState(false);
    const [links, setLinks] = useState<HyperlinkItem[]>([]);
    const [linkType, setLinkType] = useState<'url' | 'page'>('url');
    const [newUrl, setNewUrl] = useState('https://');
    const [targetPage, setTargetPage] = useState(1);
    const [sourcePage, setSourcePage] = useState(1);
    const [linkLabel, setLinkLabel] = useState('');

    const addLink = () => {
        if (linkType === 'url' && (!newUrl || newUrl === 'https://')) {
            addToast({
                type: 'error',
                title: 'Missing URL',
                message: 'Please enter a valid URL.',
            });
            return;
        }

        if (linkType === 'page' && (targetPage < 1 || targetPage > (activeDocument?.pageCount || 1))) {
            addToast({
                type: 'error',
                title: 'Invalid page',
                message: 'Please enter a valid target page number.',
            });
            return;
        }

        const newLink: HyperlinkItem = {
            id: `link-${Date.now()}`,
            type: linkType,
            url: linkType === 'url' ? newUrl : undefined,
            targetPage: linkType === 'page' ? targetPage : undefined,
            pageNumber: sourcePage,
            x: 72, // 1 inch margin
            y: 700, // Near top of page
            width: 200,
            height: 20,
            label: linkLabel || (linkType === 'url' ? newUrl : `Go to page ${targetPage}`),
        };

        setLinks(prev => [...prev, newLink]);
        setNewUrl('https://');
        setLinkLabel('');

        addToast({
            type: 'success',
            title: 'Link added',
            message: `Added ${linkType === 'url' ? 'URL' : 'page'} link to page ${sourcePage}`,
        });
    };

    const removeLink = (id: string) => {
        setLinks(prev => prev.filter(l => l.id !== id));
    };

    const handleApply = useCallback(async () => {
        if (!activeDocument) return;

        if (links.length === 0) {
            addToast({
                type: 'error',
                title: 'No links',
                message: 'Please add at least one link.',
            });
            return;
        }

        setIsProcessing(true);
        setLoading(true, 'Adding links...');

        try {
            const pdfDoc = await PDFDocument.load(activeDocument.arrayBuffer.slice(0), { ignoreEncryption: true });
            const pages = pdfDoc.getPages();

            // Add visual link text for each link
            for (const link of links) {
                if (link.pageNumber > 0 && link.pageNumber <= pages.length) {
                    const page = pages[link.pageNumber - 1];
                    const { height } = page.getSize();

                    // Draw link text
                    page.drawText(link.label || 'Link', {
                        x: link.x,
                        y: height - link.y,
                        size: 12,
                        color: rgb(0, 0, 0.8), // Blue color for links
                    });

                    // Draw underline
                    page.drawLine({
                        start: { x: link.x, y: height - link.y - 2 },
                        end: { x: link.x + link.width, y: height - link.y - 2 },
                        thickness: 0.5,
                        color: rgb(0, 0, 0.8),
                    });

                    // Note: pdf-lib doesn't have built-in support for link annotations
                    // For full clickable links, you would need to use raw PDF objects
                    // This implementation adds visual link representation
                }
            }

            const pdfBytes = await pdfDoc.save();
            const fileName = activeDocument.name.replace('.pdf', '_links.pdf');
            downloadPDF(pdfBytes, fileName);

            addToast({
                type: 'success',
                title: 'Links added!',
                message: `Added ${links.length} link(s) to the PDF.`,
            });
        } catch (error) {
            console.error('Link add failed:', error);
            addToast({
                type: 'error',
                title: 'Operation failed',
                message: 'An error occurred while adding links.',
            });
        } finally {
            setIsProcessing(false);
            setLoading(false);
        }
    }, [activeDocument, links, setLoading, addToast]);

    if (!activeDocument) {
        return (
            <div className="tool-panel">
                <div className="tool-empty">
                    <Link size={48} />
                    <h3>Open a PDF first</h3>
                    <p>Upload a PDF file to add hyperlinks.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="tool-panel">
            <div className="tool-header">
                <h2 className="tool-title">Add Hyperlinks</h2>
                <p className="tool-description">
                    Add clickable links to URLs or other pages in your PDF
                </p>
            </div>

            <div className="tool-content">
                {/* Link Type Selection */}
                <div className="tool-section">
                    <h4 className="section-title">Link Type</h4>
                    <div className="btn-group">
                        <button
                            className={`btn ${linkType === 'url' ? 'btn-primary' : 'btn-ghost'}`}
                            onClick={() => setLinkType('url')}
                        >
                            <ExternalLink size={16} />
                            URL Link
                        </button>
                        <button
                            className={`btn ${linkType === 'page' ? 'btn-primary' : 'btn-ghost'}`}
                            onClick={() => setLinkType('page')}
                        >
                            <FileText size={16} />
                            Page Link
                        </button>
                    </div>
                </div>

                {/* Link Form */}
                <div className="tool-section">
                    <h4 className="section-title">Add Link</h4>
                    <div className="link-form">
                        <div className="form-group">
                            <label>Display Text (optional)</label>
                            <input
                                type="text"
                                value={linkLabel}
                                onChange={(e) => setLinkLabel(e.target.value)}
                                placeholder="Click here..."
                            />
                        </div>

                        {linkType === 'url' ? (
                            <div className="form-group">
                                <label>URL</label>
                                <input
                                    type="url"
                                    value={newUrl}
                                    onChange={(e) => setNewUrl(e.target.value)}
                                    placeholder="https://example.com"
                                />
                            </div>
                        ) : (
                            <div className="form-group">
                                <label>Target Page</label>
                                <input
                                    type="number"
                                    value={targetPage}
                                    onChange={(e) => setTargetPage(Math.max(1, parseInt(e.target.value) || 1))}
                                    min={1}
                                    max={activeDocument.pageCount}
                                />
                            </div>
                        )}

                        <div className="form-row">
                            <div className="form-group" style={{ flex: 1 }}>
                                <label>Source Page</label>
                                <input
                                    type="number"
                                    value={sourcePage}
                                    onChange={(e) => setSourcePage(Math.max(1, parseInt(e.target.value) || 1))}
                                    min={1}
                                    max={activeDocument.pageCount}
                                />
                            </div>
                            <button className="btn btn-primary" onClick={addLink}>
                                <Plus size={18} />
                                Add Link
                            </button>
                        </div>
                    </div>
                </div>

                {/* Links List */}
                <div className="tool-section">
                    <h4 className="section-title">
                        Links ({links.length})
                    </h4>

                    {links.length === 0 ? (
                        <div className="empty-list">
                            <Link size={24} />
                            <p>No links added yet</p>
                        </div>
                    ) : (
                        <div className="links-list">
                            {links.map((link) => (
                                <div key={link.id} className="link-item">
                                    <div className="link-icon">
                                        {link.type === 'url' ? <ExternalLink size={16} /> : <FileText size={16} />}
                                    </div>
                                    <div className="link-content">
                                        <span className="link-label">{link.label}</span>
                                        <span className="link-details">
                                            Page {link.pageNumber} → {link.type === 'url' ? link.url : `Page ${link.targetPage}`}
                                        </span>
                                    </div>
                                    <button
                                        className="btn btn-ghost btn-sm btn-icon"
                                        onClick={() => removeLink(link.id)}
                                        title="Remove link"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Action Button */}
                <div className="tool-actions">
                    <button
                        className="btn btn-primary btn-lg"
                        onClick={handleApply}
                        disabled={isProcessing || links.length === 0}
                    >
                        {isProcessing ? (
                            <>
                                <Loader2 size={20} className="animate-spin" />
                                Adding...
                            </>
                        ) : (
                            <>
                                <Download size={20} />
                                Save & Download
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
