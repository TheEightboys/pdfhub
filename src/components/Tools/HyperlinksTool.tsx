/**
 * HyperlinksTool
 * Add clickable links to PDF
 */

import { useState } from 'react';
import { useApp, useToast } from '../../store/appStore';
import { Link, ExternalLink, FileText, Plus } from 'lucide-react';
import { LinkAnnotation } from '../../types';
import './Tools.css';

export function HyperlinksTool() {
    const { state, addAnnotation } = useApp();
    const { addToast } = useToast();
    const { activeDocument } = state;

    const [linkType, setLinkType] = useState<'url' | 'page'>('url');
    const [url, setUrl] = useState('https://');
    const [targetPage, setTargetPage] = useState(1);
    const [sourcePage, setSourcePage] = useState(1);
    
    const createLinkAnnotation = () => {
         if (!activeDocument) return;

        const newLink: LinkAnnotation = {
            id: `link-${Date.now()}`,
            type: 'link',
            pageNumber: sourcePage,
            x: 10,   // Default position %
            y: 10,   // Default position %
            width: 20, // Default width %
            height: 5, // Default height %
            rotation: 0,
            opacity: 1,
            color: '#4285f4',
            createdAt: new Date(),
            updatedAt: new Date(),
            linkType,
            url: linkType === 'url' ? url : undefined,
            targetPage: linkType === 'page' ? targetPage : undefined,
        };

        addAnnotation(newLink);
        
        addToast({
            type: 'success',
            title: 'Link Added',
            message: `Link box added to Page ${sourcePage}. Resize and move it as needed.`,
        });
    };

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
                <h2 className="tool-title">Add Hyperlink</h2>
                <p className="tool-description">Create a clickable area on your PDF.</p>
            </div>

            <div className="tool-content">
                {/* Link Type */}
                <div className="tool-section">
                    <label className="section-label">Link Destination</label>
                    <div className="btn-group">
                        <button
                            className={`btn ${linkType === 'url' ? 'btn-primary' : 'btn-ghost'}`}
                            onClick={() => setLinkType('url')}
                        >
                            <ExternalLink size={16} /> Web
                        </button>
                        <button
                            className={`btn ${linkType === 'page' ? 'btn-primary' : 'btn-ghost'}`}
                            onClick={() => setLinkType('page')}
                        >
                            <FileText size={16} /> Page
                        </button>
                    </div>
                </div>

                {/* Details */}
                <div className="tool-section">
                    {linkType === 'url' ? (
                        <div className="form-group">
                            <label>URL</label>
                            <input
                                type="url"
                                value={url}
                                onChange={(e) => setUrl(e.target.value)}
                                placeholder="https://example.com"
                                className="full-width-input"
                            />
                        </div>
                    ) : (
                        <div className="form-group">
                            <label>Go to Page</label>
                            <input
                                type="number"
                                value={targetPage}
                                onChange={(e) => setTargetPage(Number(e.target.value))}
                                min={1}
                                max={activeDocument.pageCount}
                                className="full-width-input"
                            />
                        </div>
                    )}
                </div>

                {/* Source Page Selection */}
                 <div className="tool-section">
                    <div className="form-group">
                        <label>Place on Page</label>
                        <input
                            type="number"
                            value={sourcePage}
                            onChange={(e) => setSourcePage(Number(e.target.value))}
                            min={1}
                            max={activeDocument.pageCount}
                            className="full-width-input"
                        />
                        <p className="text-xs text-muted">The link box will appear on this page.</p>
                    </div>
                </div>

                <div className="tool-actions">
                    <button className="btn btn-primary btn-full" onClick={createLinkAnnotation}>
                        <Plus size={18} />
                        Add Link Box
                    </button>
                </div>
                
                <div className="tool-info">
                    <p>
                        <strong>Tip:</strong> After adding, you can drag and resize the blue link box on the canvas to cover the text/image you want to make clickable.
                    </p>
                </div>
            </div>
        </div>
    );
}
