/**
 * Edit Metadata Tool
 * Edit PDF document metadata (title, author, subject, keywords, etc.)
 */

import { useState, useCallback, useEffect } from 'react';
import { useApp, useToast } from '../../store/appStore';
import { PDFDocument } from 'pdf-lib';
import { downloadPDF } from '../../utils/pdfHelpers';
import { FileText, Download, Loader2 } from 'lucide-react';
import './Tools.css';

interface PDFMetadata {
    title: string;
    author: string;
    subject: string;
    keywords: string;
    creator: string;
    producer: string;
    creationDate: string;
    modificationDate: string;
}

export function EditMetadataTool() {
    const { state, setLoading } = useApp();
    const { addToast } = useToast();
    const { activeDocument } = state;

    const [isProcessing, setIsProcessing] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [metadata, setMetadata] = useState<PDFMetadata>({
        title: '',
        author: '',
        subject: '',
        keywords: '',
        creator: '',
        producer: '',
        creationDate: '',
        modificationDate: '',
    });

    // Load current metadata
    useEffect(() => {
        if (activeDocument?.arrayBuffer) {
            loadMetadata();
        }
    }, [activeDocument?.id]);

    const loadMetadata = async () => {
        if (!activeDocument) return;

        setIsLoading(true);
        try {
            const pdfDoc = await PDFDocument.load(activeDocument.arrayBuffer.slice(0), { ignoreEncryption: true });

            const formatDate = (date: Date | undefined): string => {
                if (!date) return '';
                return date.toISOString().slice(0, 16);
            };

            const meta: PDFMetadata = {
                title: pdfDoc.getTitle() || '',
                author: pdfDoc.getAuthor() || '',
                subject: pdfDoc.getSubject() || '',
                keywords: pdfDoc.getKeywords() || '',
                creator: pdfDoc.getCreator() || '',
                producer: pdfDoc.getProducer() || '',
                creationDate: formatDate(pdfDoc.getCreationDate()),
                modificationDate: formatDate(pdfDoc.getModificationDate()),
            };

            setMetadata(meta);
        } catch (error) {
            console.error('Failed to load metadata:', error);
            addToast({
                type: 'error',
                title: 'Load failed',
                message: 'Could not read PDF metadata.',
            });
        } finally {
            setIsLoading(false);
        }
    };

    const updateMetadata = (field: keyof PDFMetadata, value: string) => {
        setMetadata(prev => ({ ...prev, [field]: value }));
    };

    const handleSave = useCallback(async () => {
        if (!activeDocument) return;

        setIsProcessing(true);
        setLoading(true, 'Updating metadata...');

        try {
            const pdfDoc = await PDFDocument.load(activeDocument.arrayBuffer.slice(0), { ignoreEncryption: true });

            // Set metadata
            if (metadata.title) pdfDoc.setTitle(metadata.title);
            if (metadata.author) pdfDoc.setAuthor(metadata.author);
            if (metadata.subject) pdfDoc.setSubject(metadata.subject);
            if (metadata.keywords) pdfDoc.setKeywords([metadata.keywords]);
            if (metadata.creator) pdfDoc.setCreator(metadata.creator);

            pdfDoc.setProducer(metadata.producer || 'PDF Editor Tool');

            if (metadata.creationDate) {
                pdfDoc.setCreationDate(new Date(metadata.creationDate));
            }

            pdfDoc.setModificationDate(new Date());

            const pdfBytes = await pdfDoc.save();
            const fileName = activeDocument.name.replace('.pdf', '_metadata.pdf');
            downloadPDF(pdfBytes, fileName);

            addToast({
                type: 'success',
                title: 'Metadata updated!',
                message: 'The PDF with updated metadata has been downloaded.',
            });
        } catch (error) {
            console.error('Metadata update failed:', error);
            addToast({
                type: 'error',
                title: 'Update failed',
                message: 'An error occurred while updating metadata.',
            });
        } finally {
            setIsProcessing(false);
            setLoading(false);
        }
    }, [activeDocument, metadata, setLoading, addToast]);

    if (!activeDocument) {
        return (
            <div className="tool-panel">
                <div className="tool-empty">
                    <FileText size={48} />
                    <h3>Open a PDF first</h3>
                    <p>Upload a PDF file to edit its metadata.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="tool-panel">
            <div className="tool-header">
                <h2 className="tool-title">Edit Metadata</h2>
                <p className="tool-description">
                    View and edit PDF document properties and metadata
                </p>
            </div>

            <div className="tool-content">
                {isLoading ? (
                    <div className="loading-state">
                        <Loader2 size={32} className="animate-spin" />
                        <p>Loading metadata...</p>
                    </div>
                ) : (
                    <>
                        {/* Basic Properties */}
                        <div className="tool-section">
                            <h4 className="section-title">Basic Properties</h4>

                            <div className="metadata-form">
                                <div className="form-group">
                                    <label>Title</label>
                                    <input
                                        type="text"
                                        value={metadata.title}
                                        onChange={(e) => updateMetadata('title', e.target.value)}
                                        placeholder="Document title"
                                    />
                                </div>

                                <div className="form-group">
                                    <label>Author</label>
                                    <input
                                        type="text"
                                        value={metadata.author}
                                        onChange={(e) => updateMetadata('author', e.target.value)}
                                        placeholder="Author name"
                                    />
                                </div>

                                <div className="form-group">
                                    <label>Subject</label>
                                    <input
                                        type="text"
                                        value={metadata.subject}
                                        onChange={(e) => updateMetadata('subject', e.target.value)}
                                        placeholder="Document subject"
                                    />
                                </div>

                                <div className="form-group">
                                    <label>Keywords</label>
                                    <input
                                        type="text"
                                        value={metadata.keywords}
                                        onChange={(e) => updateMetadata('keywords', e.target.value)}
                                        placeholder="keyword1, keyword2, keyword3"
                                    />
                                    <span className="form-hint">Separate keywords with commas</span>
                                </div>
                            </div>
                        </div>

                        {/* Application Info */}
                        <div className="tool-section">
                            <h4 className="section-title">Application Info</h4>

                            <div className="metadata-form">
                                <div className="form-group">
                                    <label>Creator</label>
                                    <input
                                        type="text"
                                        value={metadata.creator}
                                        onChange={(e) => updateMetadata('creator', e.target.value)}
                                        placeholder="Application that created the document"
                                    />
                                </div>

                                <div className="form-group">
                                    <label>Producer</label>
                                    <input
                                        type="text"
                                        value={metadata.producer}
                                        onChange={(e) => updateMetadata('producer', e.target.value)}
                                        placeholder="PDF producer application"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Dates */}
                        <div className="tool-section">
                            <h4 className="section-title">Dates</h4>

                            <div className="metadata-form">
                                <div className="form-group">
                                    <label>Creation Date</label>
                                    <input
                                        type="datetime-local"
                                        value={metadata.creationDate}
                                        onChange={(e) => updateMetadata('creationDate', e.target.value)}
                                    />
                                </div>

                                <div className="form-group">
                                    <label>Modification Date</label>
                                    <input
                                        type="datetime-local"
                                        value={metadata.modificationDate}
                                        readOnly
                                        disabled
                                    />
                                    <span className="form-hint">Will be updated automatically when saved</span>
                                </div>
                            </div>
                        </div>

                        {/* File Info (read-only) */}
                        <div className="tool-section">
                            <h4 className="section-title">File Info</h4>
                            <div className="doc-info">
                                <div className="info-row">
                                    <span className="info-label">File name:</span>
                                    <span className="info-value">{activeDocument.name}</span>
                                </div>
                                <div className="info-row">
                                    <span className="info-label">Pages:</span>
                                    <span className="info-value">{activeDocument.pageCount}</span>
                                </div>
                                <div className="info-row">
                                    <span className="info-label">File size:</span>
                                    <span className="info-value">
                                        {(activeDocument.arrayBuffer.byteLength / 1024).toFixed(1)} KB
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Action Button */}
                        <div className="tool-actions">
                            <button
                                className="btn btn-primary btn-lg"
                                onClick={handleSave}
                                disabled={isProcessing}
                            >
                                {isProcessing ? (
                                    <>
                                        <Loader2 size={20} className="animate-spin" />
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <Download size={20} />
                                        Save & Download
                                    </>
                                )}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
