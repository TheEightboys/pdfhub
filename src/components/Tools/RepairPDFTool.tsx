/**
 * Repair PDF Tool
 * Attempt to repair corrupted or damaged PDF files
 */

import { useState, useCallback } from 'react';
import { useApp, useToast } from '../../store/appStore';
import { PDFDocument } from 'pdf-lib';
import { downloadPDF } from '../../utils/pdfHelpers';
import { Wrench, Download, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import './Tools.css';

interface RepairResult {
    success: boolean;
    issues: string[];
    fixed: string[];
}

export function RepairPDFTool() {
    const { state, setLoading } = useApp();
    const { addToast } = useToast();
    const { activeDocument } = state;

    const [isProcessing, setIsProcessing] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<RepairResult | null>(null);
    const [repairComplete, setRepairComplete] = useState(false);

    const analyzePDF = useCallback(async () => {
        if (!activeDocument) return;

        setIsAnalyzing(true);
        setAnalysisResult(null);

        try {
            const issues: string[] = [];
            const fixed: string[] = [];

            // Try to load the PDF with various options
            try {
                await PDFDocument.load(activeDocument.arrayBuffer.slice(0), {
                    ignoreEncryption: true,
                    updateMetadata: false,
                });
            } catch (loadError: any) {
                if (loadError.message.includes('encrypt')) {
                    issues.push('PDF is encrypted or password protected');
                } else if (loadError.message.includes('stream')) {
                    issues.push('Corrupted stream data detected');
                } else if (loadError.message.includes('xref')) {
                    issues.push('Damaged cross-reference table');
                } else {
                    issues.push(`Load error: ${loadError.message}`);
                }
            }

            // Check file size
            const sizeMB = activeDocument.arrayBuffer.byteLength / (1024 * 1024);
            if (sizeMB > 100) {
                issues.push('Very large file size may cause performance issues');
            }

            // Basic PDF header check
            const bytes = new Uint8Array(activeDocument.arrayBuffer.slice(0, 8));
            const header = String.fromCharCode(...bytes);
            if (!header.startsWith('%PDF-')) {
                issues.push('Invalid or missing PDF header');
            }

            // Check for EOF marker
            const endBytes = new Uint8Array(activeDocument.arrayBuffer.slice(-1024));
            const endStr = String.fromCharCode(...endBytes);
            if (!endStr.includes('%%EOF')) {
                issues.push('Missing or damaged end-of-file marker');
            }

            if (issues.length === 0) {
                fixed.push('No issues detected - PDF appears healthy');
            }

            setAnalysisResult({ success: true, issues, fixed });
        } catch (error) {
            console.error('Analysis failed:', error);
            setAnalysisResult({
                success: false,
                issues: ['Unable to analyze the PDF file'],
                fixed: [],
            });
        } finally {
            setIsAnalyzing(false);
        }
    }, [activeDocument]);

    const handleRepair = useCallback(async () => {
        if (!activeDocument) return;

        setIsProcessing(true);
        setLoading(true, 'Repairing PDF...');
        setRepairComplete(false);

        try {
            // Attempt to load and rebuild the PDF
            const pdfDoc = await PDFDocument.load(activeDocument.arrayBuffer.slice(0), {
                ignoreEncryption: true,
                updateMetadata: true,
            });

            // Create a new clean PDF by copying all pages
            const repairedPdf = await PDFDocument.create();

            const pages = pdfDoc.getPages();
            const pageIndices = pages.map((_, i) => i);

            const copiedPages = await repairedPdf.copyPages(pdfDoc, pageIndices);
            copiedPages.forEach(page => repairedPdf.addPage(page));

            // Copy metadata
            const originalTitle = pdfDoc.getTitle();
            const originalAuthor = pdfDoc.getAuthor();
            const originalSubject = pdfDoc.getSubject();

            if (originalTitle) repairedPdf.setTitle(originalTitle);
            if (originalAuthor) repairedPdf.setAuthor(originalAuthor);
            if (originalSubject) repairedPdf.setSubject(originalSubject);

            repairedPdf.setProducer('PDF Editor Tool - Repaired');
            repairedPdf.setCreationDate(new Date());

            // Save with optimized settings
            const pdfBytes = await repairedPdf.save({
                useObjectStreams: false, // More compatible
                addDefaultPage: false,
            });

            const fileName = activeDocument.name.replace('.pdf', '_repaired.pdf');
            downloadPDF(pdfBytes, fileName);

            setRepairComplete(true);
            addToast({
                type: 'success',
                title: 'PDF repaired!',
                message: 'The repaired PDF has been downloaded.',
            });
        } catch (error: any) {
            console.error('Repair failed:', error);
            addToast({
                type: 'error',
                title: 'Repair failed',
                message: error.message || 'The PDF could not be repaired. It may be too corrupted.',
            });
        } finally {
            setIsProcessing(false);
            setLoading(false);
        }
    }, [activeDocument, setLoading, addToast]);

    if (!activeDocument) {
        return (
            <div className="tool-panel">
                <div className="tool-empty">
                    <Wrench size={48} />
                    <h3>Open a PDF first</h3>
                    <p>Upload a PDF file to repair it.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="tool-panel">
            <div className="tool-header">
                <h2 className="tool-title">Repair PDF</h2>
                <p className="tool-description">
                    Attempt to fix corrupted or damaged PDF files
                </p>
            </div>

            <div className="tool-content">
                {/* Document Info */}
                <div className="tool-section">
                    <h4 className="section-title">Document Info</h4>
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

                {/* Analysis Button */}
                <div className="tool-section">
                    <button
                        className="btn btn-secondary btn-block"
                        onClick={analyzePDF}
                        disabled={isAnalyzing || isProcessing}
                    >
                        {isAnalyzing ? (
                            <>
                                <Loader2 size={18} className="animate-spin" />
                                Analyzing...
                            </>
                        ) : (
                            <>
                                <AlertTriangle size={18} />
                                Analyze PDF for Issues
                            </>
                        )}
                    </button>
                </div>

                {/* Analysis Results */}
                {analysisResult && (
                    <div className="tool-section">
                        <h4 className="section-title">Analysis Results</h4>

                        {analysisResult.issues.length > 0 ? (
                            <div className="issues-list">
                                {analysisResult.issues.map((issue, i) => (
                                    <div key={i} className="issue-item warning">
                                        <AlertTriangle size={16} />
                                        <span>{issue}</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="issues-list">
                                {analysisResult.fixed.map((item, i) => (
                                    <div key={i} className="issue-item success">
                                        <CheckCircle2 size={16} />
                                        <span>{item}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Repair Status */}
                {repairComplete && (
                    <div className="tool-section">
                        <div className="success-box">
                            <CheckCircle2 size={24} />
                            <div>
                                <strong>Repair Complete!</strong>
                                <p>The repaired PDF has been downloaded to your computer.</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* What repair does */}
                <div className="tool-section">
                    <h4 className="section-title">What Repair Does</h4>
                    <div className="info-box">
                        <ul>
                            <li>Rebuilds the PDF structure from scratch</li>
                            <li>Fixes corrupted cross-reference tables</li>
                            <li>Removes damaged or unreadable content</li>
                            <li>Preserves text, images, and layouts where possible</li>
                            <li>Creates a clean, optimized output file</li>
                        </ul>
                    </div>
                </div>

                {/* Warning */}
                <div className="tool-section">
                    <div className="warning-box">
                        <strong>⚠️ Note:</strong> Severely corrupted PDFs may not be fully recoverable.
                        Some content might be lost in the repair process. Always keep a backup of the original file.
                    </div>
                </div>

                {/* Action Button */}
                <div className="tool-actions">
                    <button
                        className="btn btn-primary btn-lg"
                        onClick={handleRepair}
                        disabled={isProcessing}
                    >
                        {isProcessing ? (
                            <>
                                <Loader2 size={20} className="animate-spin" />
                                Repairing...
                            </>
                        ) : (
                            <>
                                <Download size={20} />
                                Repair & Download
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
