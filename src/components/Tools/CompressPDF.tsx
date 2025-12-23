/**
 * Compress PDF Tool
 */

import React, { useState } from 'react';
import { useApp, useToast } from '../../store/appStore';
import { compressPDF, downloadPDF } from '../../utils/pdfHelpers';
import { CompressionOptions } from '../../types';
import {
    Download,
    Loader2,
    Minimize2,
    FileText,
    ArrowRight,
} from 'lucide-react';
import './Tools.css';

const compressionPresets: { id: CompressionOptions['level']; name: string; desc: string; reduction: string }[] = [
    { id: 'low', name: 'Low', desc: 'Minimal compression, best quality', reduction: '~10-20%' },
    { id: 'medium', name: 'Medium', desc: 'Balanced compression', reduction: '~30-50%' },
    { id: 'high', name: 'High', desc: 'Strong compression', reduction: '~50-70%' },
    { id: 'extreme', name: 'Extreme', desc: 'Maximum compression', reduction: '~70-90%' },
];

export function CompressPDFTool() {
    const { state, setLoading } = useApp();
    const { addToast } = useToast();
    const { activeDocument } = state;

    const [level, setLevel] = useState<CompressionOptions['level']>('medium');
    const [removeMetadata, setRemoveMetadata] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [result, setResult] = useState<{ originalSize: number; newSize: number } | null>(null);

    const handleCompress = async () => {
        if (!activeDocument) return;

        setIsProcessing(true);
        setLoading(true, 'Compressing PDF...');

        try {
            const options: CompressionOptions = {
                level,
                imageQuality: level === 'extreme' ? 50 : level === 'high' ? 70 : 85,
                removeMetadata,
                removeBookmarks: false,
                linearize: true,
            };

            const compressedBytes = await compressPDF(activeDocument.arrayBuffer.slice(0), options);

            const originalSize = activeDocument.file.size;
            const newSize = compressedBytes.length;

            setResult({ originalSize, newSize });

            const fileName = activeDocument.name.replace('.pdf', '_compressed.pdf');
            downloadPDF(compressedBytes, fileName);

            const reduction = ((1 - newSize / originalSize) * 100).toFixed(1);

            addToast({
                type: 'success',
                title: 'PDF compressed!',
                message: `Reduced by ${reduction}% (${formatBytes(originalSize)} → ${formatBytes(newSize)})`,
            });
        } catch (error) {
            console.error('Compression failed:', error);
            addToast({
                type: 'error',
                title: 'Compression failed',
                message: 'An error occurred while compressing the PDF.',
            });
        } finally {
            setIsProcessing(false);
            setLoading(false);
        }
    };

    if (!activeDocument) {
        return (
            <div className="tool-panel">
                <div className="tool-empty">
                    <Minimize2 size={48} />
                    <h3>Open a PDF first</h3>
                    <p>Upload a PDF file to compress it.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="tool-panel">
            <div className="tool-header">
                <h2 className="tool-title">Compress PDF</h2>
                <p className="tool-description">
                    Reduce file size while preserving quality. Great for sharing and uploading.
                </p>
            </div>

            <div className="tool-content">
                {/* File Info */}
                <div className="tool-section">
                    <div className="compress-file-info">
                        <FileText size={32} className="compress-file-icon" />
                        <div className="compress-file-details">
                            <span className="compress-file-name">{activeDocument.name}</span>
                            <span className="compress-file-size">{formatBytes(activeDocument.file.size)}</span>
                        </div>
                    </div>
                </div>

                {/* Compression Level */}
                <div className="tool-section">
                    <h4 className="section-title">Compression Level</h4>
                    <div className="compression-levels">
                        {compressionPresets.map(preset => (
                            <button
                                key={preset.id}
                                className={`compression-level ${level === preset.id ? 'active' : ''}`}
                                onClick={() => setLevel(preset.id)}
                            >
                                <div className="level-header">
                                    <span className="level-name">{preset.name}</span>
                                    <span className="level-reduction">{preset.reduction}</span>
                                </div>
                                <span className="level-desc">{preset.desc}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Options */}
                <div className="tool-section">
                    <h4 className="section-title">Options</h4>
                    <label className="checkbox-option">
                        <input
                            type="checkbox"
                            checked={removeMetadata}
                            onChange={(e) => setRemoveMetadata(e.target.checked)}
                        />
                        <span className="checkbox-label">Remove metadata</span>
                        <span className="checkbox-hint">Remove title, author, and other document info</span>
                    </label>
                </div>

                {/* Result */}
                {result && (
                    <div className="tool-section">
                        <div className="compress-result">
                            <div className="compress-result-item">
                                <span className="result-label">Original</span>
                                <span className="result-value">{formatBytes(result.originalSize)}</span>
                            </div>
                            <ArrowRight size={20} className="result-arrow" />
                            <div className="compress-result-item">
                                <span className="result-label">Compressed</span>
                                <span className="result-value success">{formatBytes(result.newSize)}</span>
                            </div>
                            <div className="compress-result-savings">
                                -{((1 - result.newSize / result.originalSize) * 100).toFixed(1)}%
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div className="tool-footer">
                <div className="tool-summary">
                    <span className="summary-stat">
                        <strong>{activeDocument.pageCount}</strong> pages
                    </span>
                    <span className="summary-divider">•</span>
                    <span className="summary-stat">
                        <strong>{formatBytes(activeDocument.file.size)}</strong>
                    </span>
                </div>

                <button
                    className="btn btn-primary btn-lg"
                    onClick={handleCompress}
                    disabled={isProcessing}
                >
                    {isProcessing ? (
                        <>
                            <Loader2 size={18} className="animate-spin" />
                            Compressing...
                        </>
                    ) : (
                        <>
                            <Download size={18} />
                            Compress & Download
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}

function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
