/**
 * Merge PDF Tool
 * Combine multiple PDFs into one
 */

import React, { useState, useCallback, useEffect } from 'react';
import { useApp, useToast } from '../../store/appStore';
import { Dropzone } from '../UI/Dropzone';
import { mergePDFs, loadPDF, downloadPDF } from '../../utils/pdfHelpers';
import {
    FileText,
    GripVertical,
    Trash2,
    Plus,
    ChevronUp,
    ChevronDown,
    Loader2,
    Combine,
    Download,
    Check,
    RefreshCw,
    Eye,
} from 'lucide-react';
import './Tools.css';

interface FileItem {
    id: string;
    file: File;
    pageCount?: number;
}

export function MergePDFTool() {
    const { state, setLoading, loadDocument } = useApp();
    const { addToast } = useToast();
    const { activeDocument } = state;

    const [files, setFiles] = useState<FileItem[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [draggedItem, setDraggedItem] = useState<string | null>(null);
    const [activeDocAdded, setActiveDocAdded] = useState(false);

    // Result state - PREVIEW_READY state
    const [mergedData, setMergedData] = useState<Uint8Array | null>(null);
    const [mergedFileName, setMergedFileName] = useState('');
    const [mergedFileCount, setMergedFileCount] = useState(0);
    const [mergedPageCount, setMergedPageCount] = useState(0);
    const [isPreviewReady, setIsPreviewReady] = useState(false);

    // Auto-add the currently opened document when the tool opens
    useEffect(() => {
        if (activeDocument && !activeDocAdded && !isPreviewReady) {
            const blob = new Blob([activeDocument.arrayBuffer], { type: 'application/pdf' });
            const file = new File([blob], activeDocument.name, { type: 'application/pdf' });

            setFiles([{
                id: `active-${Date.now()}`,
                file,
                pageCount: activeDocument.pageCount,
            }]);
            setActiveDocAdded(true);
        }
    }, [activeDocument, activeDocAdded, isPreviewReady]);

    const handleFilesAccepted = useCallback(async (newFiles: File[]) => {
        const fileItems: FileItem[] = [];

        for (const file of newFiles) {
            try {
                const doc = await loadPDF(file);
                fileItems.push({
                    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    file,
                    pageCount: doc.pageCount,
                });
            } catch (error) {
                console.error('Failed to load PDF:', error);
                addToast({
                    type: 'error',
                    title: 'Failed to load file',
                    message: `Could not load ${file.name}`,
                });
            }
        }

        setFiles(prev => [...prev, ...fileItems]);
    }, [addToast]);

    const removeFile = (id: string) => {
        setFiles(prev => prev.filter(f => f.id !== id));
    };

    const moveFile = (id: string, direction: 'up' | 'down') => {
        setFiles(prev => {
            const index = prev.findIndex(f => f.id === id);
            if (index === -1) return prev;

            const newIndex = direction === 'up' ? index - 1 : index + 1;
            if (newIndex < 0 || newIndex >= prev.length) return prev;

            const newFiles = [...prev];
            [newFiles[index], newFiles[newIndex]] = [newFiles[newIndex], newFiles[index]];
            return newFiles;
        });
    };

    const handleDragStart = (e: React.DragEvent, id: string) => {
        setDraggedItem(id);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e: React.DragEvent, targetId: string) => {
        e.preventDefault();
        if (!draggedItem || draggedItem === targetId) return;

        setFiles(prev => {
            const draggedIndex = prev.findIndex(f => f.id === draggedItem);
            const targetIndex = prev.findIndex(f => f.id === targetId);

            if (draggedIndex === -1 || targetIndex === -1) return prev;

            const newFiles = [...prev];
            const [removed] = newFiles.splice(draggedIndex, 1);
            newFiles.splice(targetIndex, 0, removed);
            return newFiles;
        });

        setDraggedItem(null);
    };

    const handleMerge = async () => {
        if (files.length < 2) {
            addToast({
                type: 'warning',
                title: 'Add more files',
                message: 'You need at least 2 PDF files to merge.',
            });
            return;
        }

        setIsProcessing(true);
        setLoading(true, 'Merging PDFs...');

        try {
            const pdfFiles = files.map(f => f.file);
            const mergedBytes = await mergePDFs(pdfFiles);

            const totalPages = files.reduce((sum, f) => sum + (f.pageCount || 0), 0);
            const fileName = `merged_${files.length}_files_${totalPages}_pages.pdf`;

            // Store merged data
            setMergedData(mergedBytes);
            setMergedFileName(fileName);
            setMergedFileCount(files.length);
            setMergedPageCount(totalPages);

            // CRITICAL: Load merged PDF into the main viewer for preview
            const blob = new Blob([new Uint8Array(mergedBytes).buffer], { type: 'application/pdf' });
            const mergedFile = new File([blob], fileName, { type: 'application/pdf' });
            const doc = await loadPDF(mergedFile);
            loadDocument(doc);

            // Set preview ready state
            setIsPreviewReady(true);
            setFiles([]);

            addToast({
                type: 'success',
                title: 'Merge complete!',
                message: 'Preview is now showing in the viewer. Review before downloading.',
            });

        } catch (error) {
            console.error('Merge failed:', error);
            addToast({
                type: 'error',
                title: 'Merge failed',
                message: 'An error occurred while merging the PDFs.',
            });
        } finally {
            setIsProcessing(false);
            setLoading(false);
        }
    };

    const handleDownload = () => {
        if (mergedData && mergedFileName) {
            downloadPDF(mergedData, mergedFileName);
            addToast({
                type: 'success',
                title: 'Downloaded!',
                message: `Saved as ${mergedFileName}`,
            });
        }
    };

    const handleReset = () => {
        setMergedData(null);
        setMergedFileName('');
        setMergedFileCount(0);
        setMergedPageCount(0);
        setIsPreviewReady(false);
        setActiveDocAdded(false);
    };

    const totalPages = files.reduce((sum, f) => sum + (f.pageCount || 0), 0);

    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    // ========== PREVIEW_READY STATE ==========
    if (isPreviewReady && mergedData) {
        return (
            <div className="tool-panel">
                {/* Preview Banner */}
                <div className="preview-banner">
                    <Eye size={18} />
                    <span>Preview: Merged PDF</span>
                </div>

                <div className="tool-header">
                    <h2 className="tool-title">Merge Complete</h2>
                    <p className="tool-description">
                        Review the merged PDF in the viewer, then download when ready.
                    </p>
                </div>

                <div className="tool-content">
                    <div className="preview-info">
                        <div className="preview-info-icon">
                            <Check size={32} strokeWidth={2.5} />
                        </div>
                        <div className="preview-info-text">
                            <h3>Ready for Download</h3>
                            <p>The merged PDF is now showing in the viewer. Scroll through pages to verify the result.</p>
                        </div>
                    </div>

                    {/* File Card */}
                    <div className="download-result-file">
                        <FileText size={24} />
                        <div className="download-result-file-info">
                            <span className="download-result-filename">{mergedFileName}</span>
                            <span className="download-result-filesize">{formatFileSize(mergedData.length)}</span>
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="preview-stats">
                        <div className="preview-stat">
                            <span className="stat-value">{mergedFileCount}</span>
                            <span className="stat-label">Files Merged</span>
                        </div>
                        <div className="preview-stat">
                            <span className="stat-value">{mergedPageCount}</span>
                            <span className="stat-label">Total Pages</span>
                        </div>
                    </div>
                </div>

                <div className="tool-footer">
                    <button className="btn btn-secondary" onClick={handleReset}>
                        <RefreshCw size={16} />
                        Merge More PDFs
                    </button>
                    <button className="btn btn-primary btn-lg" onClick={handleDownload}>
                        <Download size={18} />
                        Download PDF
                    </button>
                </div>
            </div>
        );
    }

    // ========== NORMAL STATE ==========
    return (
        <div className="tool-panel">
            <div className="tool-header">
                <h2 className="tool-title">Merge PDF</h2>
                <p className="tool-description">
                    Combine multiple PDF files into a single document. Drag to reorder.
                </p>
            </div>

            <div className="tool-content">
                {files.length === 0 ? (
                    <Dropzone
                        onFilesAccepted={handleFilesAccepted}
                        accept=".pdf"
                        multiple={true}
                        label="Drop PDF files here"
                        hint="or click to browse"
                    />
                ) : (
                    <>
                        <div className="file-list">
                            {files.map((item, index) => (
                                <div
                                    key={item.id}
                                    className={`file-item ${draggedItem === item.id ? 'dragging' : ''}`}
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, item.id)}
                                    onDragOver={handleDragOver}
                                    onDrop={(e) => handleDrop(e, item.id)}
                                >
                                    <div className="file-drag-handle">
                                        <GripVertical size={16} />
                                    </div>

                                    <div className="file-number">{index + 1}</div>

                                    <div className="file-icon">
                                        <FileText size={24} />
                                    </div>

                                    <div className="file-info">
                                        <span className="file-name">{item.file.name}</span>
                                        <span className="file-meta">
                                            {item.pageCount} {item.pageCount === 1 ? 'page' : 'pages'} •{' '}
                                            {(item.file.size / 1024 / 1024).toFixed(2)} MB
                                        </span>
                                    </div>

                                    <div className="file-actions">
                                        <button
                                            className="file-action-btn"
                                            onClick={() => moveFile(item.id, 'up')}
                                            disabled={index === 0}
                                            title="Move up"
                                        >
                                            <ChevronUp size={16} />
                                        </button>
                                        <button
                                            className="file-action-btn"
                                            onClick={() => moveFile(item.id, 'down')}
                                            disabled={index === files.length - 1}
                                            title="Move down"
                                        >
                                            <ChevronDown size={16} />
                                        </button>
                                        <button
                                            className="file-action-btn delete"
                                            onClick={() => removeFile(item.id)}
                                            title="Remove"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <button
                            className="add-more-btn"
                            onClick={() => document.getElementById('dropzone-input')?.click()}
                        >
                            <Plus size={18} />
                            Add more files
                        </button>

                        <Dropzone
                            onFilesAccepted={handleFilesAccepted}
                            accept=".pdf"
                            multiple={true}
                            label="Drop more PDFs"
                            hint=""
                        />
                    </>
                )}
            </div>

            {files.length >= 1 && (
                <div className="tool-footer">
                    <div className="tool-summary">
                        <span className="summary-stat">
                            <strong>{files.length}</strong> {files.length === 1 ? 'file' : 'files'}
                        </span>
                        <span className="summary-divider">•</span>
                        <span className="summary-stat">
                            <strong>{totalPages}</strong> pages total
                        </span>
                    </div>

                    {files.length === 1 ? (
                        <div className="merge-info-row">
                            <span className="merge-info-text">Add at least one more PDF to merge</span>
                            <button
                                className="btn btn-primary btn-lg"
                                disabled
                                title="Add more files to enable merge"
                            >
                                <Combine size={18} />
                                Merge PDFs
                            </button>
                        </div>
                    ) : (
                        <button
                            className="btn btn-primary btn-lg"
                            onClick={handleMerge}
                            disabled={isProcessing}
                        >
                            {isProcessing ? (
                                <>
                                    <Loader2 size={18} className="animate-spin" />
                                    Merging...
                                </>
                            ) : (
                                <>
                                    <Combine size={18} />
                                    Merge PDFs
                                </>
                            )}
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
