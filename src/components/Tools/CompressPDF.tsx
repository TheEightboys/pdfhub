/**
 * Compress PDF Tool
 */

import { useState } from 'react';
import { useApp, useToast } from '../../store/appStore';
import { compressPDF, downloadPDF, loadPDF } from '../../utils/pdfHelpers';
import { CompressionOptions } from '../../types';
import {
    Loader2,
    Minimize2,
    FileText,
    ArrowRight,
    Download,
    RefreshCw,
    Check,
    Eye,
} from 'lucide-react';
import './Tools.css';

const compressionPresets: { id: CompressionOptions['level']; name: string; desc: string; reduction: string }[] = [
    { id: 'low', name: 'Low', desc: 'Minimal compression, best quality', reduction: '~70% size' },
    { id: 'medium', name: 'Medium', desc: 'Balanced compression', reduction: '~50% size' },
    { id: 'high', name: 'High', desc: 'Strong compression', reduction: '~30% size' },
    { id: 'extreme', name: 'Best', desc: 'Maximum compression', reduction: 'Smallest possible' },
    { id: 'custom', name: 'Custom', desc: 'Set target size', reduction: 'User defined' },
];

function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function CompressPDFTool() {
    const { state, setLoading, loadDocument } = useApp();
    const { addToast } = useToast();
    const { activeDocument } = state;

    const [level, setLevel] = useState<CompressionOptions['level']>('medium');
    const [targetSizeMB, setTargetSizeMB] = useState<number>(1);
    const [removeMetadata, setRemoveMetadata] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);

    // Result state - PREVIEW_READY
    const [resultData, setResultData] = useState<Uint8Array | null>(null);
    const [resultFileName, setResultFileName] = useState('');
    const [compressionResult, setCompressionResult] = useState<{ originalSize: number; newSize: number } | null>(null);
    const [isPreviewReady, setIsPreviewReady] = useState(false);

    const handleCompress = async () => {
        if (!activeDocument) return;

        setIsProcessing(true);
        setProgress(0);

        try {
            const options: CompressionOptions = {
                level,
                targetSizeMB: level === 'custom' ? targetSizeMB : undefined,
                imageQuality: level === 'extreme' ? 30 : level === 'high' ? 40 : level === 'medium' ? 60 : 80,
                removeMetadata,
                removeBookmarks: false,
                linearize: true,
            };

            const compressedBytes = await compressPDF(
                activeDocument.arrayBuffer.slice(0),
                options,
                (p) => setProgress(p)
            );

            const originalSize = activeDocument.arrayBuffer.byteLength;
            const newSize = compressedBytes.length;
            const fileName = activeDocument.name.replace('.pdf', '_compressed.pdf');

            setResultData(compressedBytes);
            setResultFileName(fileName);
            setCompressionResult({ originalSize, newSize });

            // Load compressed PDF into viewer for preview
            const blob = new Blob([new Uint8Array(compressedBytes).buffer], { type: 'application/pdf' });
            const compressedFile = new File([blob], fileName, { type: 'application/pdf' });
            const doc = await loadPDF(compressedFile);
            loadDocument(doc);

            setIsPreviewReady(true);

            const reduction = ((1 - newSize / originalSize) * 100).toFixed(1);
            addToast({
                type: 'success',
                title: 'Compression complete!',
                message: `Reduced by ${reduction}%. Preview is showing in the viewer.`,
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
            setProgress(0);
            setLoading(false);
        }
    };

    const handleDownload = () => {
        if (resultData && resultFileName) {
            downloadPDF(resultData, resultFileName);
            addToast({
                type: 'success',
                title: 'Downloaded!',
                message: `Saved as ${resultFileName}`,
            });
        }
    };

    const handleReset = () => {
        setResultData(null);
        setResultFileName('');
        setCompressionResult(null);
        setIsPreviewReady(false);
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

    // ========== PREVIEW_READY STATE ==========
    if (isPreviewReady && resultData && compressionResult) {
        const reduction = ((1 - compressionResult.newSize / compressionResult.originalSize) * 100).toFixed(1);

        return (
            <div className="tool-panel">
                <div className="preview-banner">
                    <Eye size={18} />
                    <span>Preview: Compressed PDF</span>
                </div>

                <div className="tool-header">
                    <h2 className="tool-title">Compression Complete</h2>
                    <p className="tool-description">
                        Review the compressed PDF in the viewer, then download when ready.
                    </p>
                </div>

                <div className="tool-content">
                    <div className="preview-info">
                        <div className="preview-info-icon">
                            <Check size={32} strokeWidth={2.5} />
                        </div>
                        <div className="preview-info-text">
                            <h3>Ready for Download</h3>
                            <p>The compressed PDF is now showing in the viewer. File size reduced by {reduction}%.</p>
                        </div>
                    </div>

                    {/* Compression Stats */}
                    <div className="compress-result" style={{ marginBottom: '20px' }}>
                        <div className="compress-result-item">
                            <span className="result-label">Original</span>
                            <span className="result-value">{formatBytes(compressionResult.originalSize)}</span>
                        </div>
                        <ArrowRight size={20} className="result-arrow" />
                        <div className="compress-result-item">
                            <span className="result-label">Compressed</span>
                            <span className="result-value success">{formatBytes(compressionResult.newSize)}</span>
                        </div>
                        <div className="compress-result-savings">
                            -{reduction}%
                        </div>
                    </div>

                    <div className="download-result-file">
                        <FileText size={24} />
                        <div className="download-result-file-info">
                            <span className="download-result-filename">{resultFileName}</span>
                            <span className="download-result-filesize">{formatBytes(resultData.length)}</span>
                        </div>
                    </div>
                </div>

                <div className="tool-footer">
                    <button className="btn btn-secondary" onClick={handleReset}>
                        <RefreshCw size={16} />
                        Compress Again
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
                <h2 className="tool-title">Compress PDF</h2>
                <p className="tool-description">
                    Reduce file size while preserving quality.
                </p>
            </div>

            <div className="tool-content">
                <div className="tool-section">
                    <div className="compress-file-info">
                        <FileText size={32} className="compress-file-icon" />
                        <div className="compress-file-details">
                            <span className="compress-file-name">{activeDocument.name}</span>
                            <span className="compress-file-size">{formatBytes(activeDocument.arrayBuffer.byteLength)}</span>
                        </div>
                    </div>
                </div>

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
                    {level === 'custom' && (
                        <div className="custom-compression-input" style={{ marginTop: '15px' }}>
                            <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '5px', color: '#475569' }}>
                                Target Size (MB)
                            </label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <input
                                    type="number"
                                    step="0.1"
                                    min="0.1"
                                    value={targetSizeMB}
                                    onChange={(e) => setTargetSizeMB(parseFloat(e.target.value))}
                                    style={{
                                        padding: '8px 12px',
                                        border: '1px solid #cbd5e1',
                                        borderRadius: '6px',
                                        width: '100px',
                                        fontSize: '14px'
                                    }}
                                />
                                <span style={{ fontSize: '13px', color: '#64748b' }}>
                                    (Original: {(activeDocument.arrayBuffer.byteLength / (1024 * 1024)).toFixed(2)} MB)
                                </span>
                            </div>
                        </div>
                    )}
                </div>

                <div className="tool-section">
                    <h4 className="section-title">Options</h4>
                    <label className="checkbox-option">
                        <input
                            type="checkbox"
                            checked={removeMetadata}
                            onChange={(e) => setRemoveMetadata(e.target.checked)}
                        />
                        <span className="checkbox-label">Remove metadata</span>
                    </label>
                </div>
            </div>

            <div className="tool-footer">
                {isProcessing && (
                    <div className="progress-container" style={{ width: '100%', marginBottom: '10px' }}>
                        <div className="progress-bar-bg" style={{ width: '100%', height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                            <div
                                className="progress-bar-fill"
                                style={{
                                    width: `${progress}%`,
                                    height: '100%',
                                    background: '#ef4444',
                                    transition: 'width 0.2s ease'
                                }}
                            />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                            <span>Compressing pages...</span>
                            <span>{progress}%</span>
                        </div>
                    </div>
                )}

                <div className="tool-summary">
                    <span className="summary-stat">
                        <strong>{activeDocument.pageCount}</strong> pages
                    </span>
                    <span className="summary-divider">•</span>
                    <span className="summary-stat">
                        <strong>{formatBytes(activeDocument.arrayBuffer.byteLength)}</strong>
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
                            Processing...
                        </>
                    ) : (
                        <>
                            <Minimize2 size={18} />
                            Compress PDF
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}
