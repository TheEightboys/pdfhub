/**
 * Compress PDF Tool
 */

import { useState } from 'react';
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
    { id: 'low', name: 'Low', desc: 'Minimal compression, best quality', reduction: '~70% size' },
    { id: 'medium', name: 'Medium', desc: 'Balanced compression', reduction: '~50% size' },
    { id: 'high', name: 'High', desc: 'Strong compression', reduction: '~30% size' },
    { id: 'extreme', name: 'Best', desc: 'Maximum compression', reduction: 'Smallest possible' },
    { id: 'custom', name: 'Custom', desc: 'Set target size', reduction: 'User defined' },
];

export function CompressPDFTool() {
    const { state, setLoading } = useApp();
    const { addToast } = useToast();
    const { activeDocument } = state;

    const [level, setLevel] = useState<CompressionOptions['level']>('medium');
    const [targetSizeMB, setTargetSizeMB] = useState<number>(1);
    const [removeMetadata, setRemoveMetadata] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [result, setResult] = useState<{ originalSize: number; newSize: number } | null>(null);
    const [progress, setProgress] = useState(0);

    const handleCompress = async () => {
        if (!activeDocument) return;

        setIsProcessing(true);
        setProgress(0);

        try {
            const options: CompressionOptions = {
                level,
                targetSizeMB: level === 'custom' ? targetSizeMB : undefined,
                imageQuality: level === 'extreme' ? 30 : level === 'high' ? 40 : level === 'medium' ? 60 : 80, // Fallback defaults, overridden in helper
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
            setProgress(0);
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

    // Default target size logic (initially set to 50% of current)
    if (activeDocument && level === 'custom' && targetSizeMB === 1 && activeDocument.arrayBuffer.byteLength > 0) {
        // Only if user hasn't touched it, maybe set intelligent default? 
        // For now 1MB default is safe.
    }

    return (
        <div className="tool-panel">
            <div className="tool-header">
                <h2 className="tool-title">Compress PDF</h2>
                <p className="tool-description">
                    Reduce file size while preserving quality.
                </p>
            </div>

            <div className="tool-content">
                {/* File Info */}
                <div className="tool-section">
                    <div className="compress-file-info">
                        <FileText size={32} className="compress-file-icon" />
                        <div className="compress-file-details">
                            <span className="compress-file-name">{activeDocument.name}</span>
                            <span className="compress-file-size">{formatBytes(activeDocument.arrayBuffer.byteLength)}</span>
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
