/**
 * PDF Editor Pro
 * Main Application Component
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { AppProvider, ToastProvider, useApp, useToast } from './store/appStore';
import { RibbonToolbar } from './components/Layout/RibbonToolbar';
import { PDFViewer } from './components/PDFViewer/PDFViewer';
import { ToolPanel } from './components/Tools/ToolPanel';
import { ToastContainer } from './components/UI/Toast';
import { Modal } from './components/UI/Modal';
import { loadPDF } from './utils/pdfHelpers';
import { PDFSecurityScanner } from './utils/securityScanner';
import { ShieldAlert, AlertTriangle } from 'lucide-react';
import './styles/global.css';
import './styles/components.css';

// Inner App component that uses the context
function AppContent() {
    const { state, loadDocument, setLoading, setActiveTool } = useApp();
    const { addToast } = useToast();
    const { activeDocument, activeTool, isLoading, loadingMessage } = state;

    const [showSecurityModal, setShowSecurityModal] = useState(false);
    const [pendingDocument, setPendingDocument] = useState<{
        doc: Awaited<ReturnType<typeof loadPDF>>;
        riskLevel: string;
    } | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    // Handle file open
    const handleFileOpen = useCallback(async (files: File[]) => {
        if (files.length === 0) return;

        const file = files[0];
        setLoading(true, 'Loading PDF...');

        try {
            const doc = await loadPDF(file);
            const riskLevel = PDFSecurityScanner.getOverallRisk(doc.securityStatus.threats);

            // If there are high/critical threats, show warning modal
            if (riskLevel === 'high' || riskLevel === 'critical') {
                setPendingDocument({ doc, riskLevel });
                setShowSecurityModal(true);
                setLoading(false);
                return;
            }

            // Safe to load
            loadDocument(doc);
            setActiveTool(null); // Clear any active tool

            addToast({
                type: 'success',
                title: 'PDF loaded',
                message: `${file.name} (${doc.pageCount} pages)`,
            });
        } catch (error) {
            console.error('Failed to load PDF:', error);
            addToast({
                type: 'error',
                title: 'Failed to load PDF',
                message: 'The file may be corrupted or password-protected.',
            });
        } finally {
            setLoading(false);
        }
    }, [loadDocument, setLoading, setActiveTool, addToast]);

    // Handle security modal confirm
    const handleSecurityConfirm = useCallback(() => {
        if (pendingDocument) {
            loadDocument(pendingDocument.doc);
            setPendingDocument(null);
            setShowSecurityModal(false);
            setActiveTool(null);

            addToast({
                type: 'warning',
                title: 'Document loaded with warnings',
                message: 'This PDF has security concerns. Be cautious.',
            });
        }
    }, [pendingDocument, loadDocument, setActiveTool, addToast]);

    // Handle security modal cancel
    const handleSecurityCancel = useCallback(() => {
        setPendingDocument(null);
        setShowSecurityModal(false);
        addToast({
            type: 'info',
            title: 'Document not loaded',
            message: 'The potentially unsafe PDF was not opened.',
        });
    }, [addToast]);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Ctrl/Cmd + O: Open file
            if ((e.ctrlKey || e.metaKey) && e.key === 'o') {
                e.preventDefault();
                fileInputRef.current?.click();
            }

            // Escape: Close active tool
            if (e.key === 'Escape' && activeTool) {
                setActiveTool(null);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [activeTool, setActiveTool]);

    return (
        <div className="app-layout">
            {/* Hidden file input */}
            <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                onChange={(e) => {
                    if (e.target.files?.length) {
                        handleFileOpen(Array.from(e.target.files));
                    }
                    e.target.value = '';
                }}
                style={{ display: 'none' }}
            />

            {/* Word-like Ribbon Toolbar */}
            <RibbonToolbar onOpenFile={() => fileInputRef.current?.click()} />

            {/* Main Content Area */}
            <div className="app-main editor-layout">
                {/* Left/Center - PDF Viewer or compact Upload Prompt */}
                <div className="app-content">
                {activeDocument ? (
                        <PDFViewer />
                    ) : (
                        /* Check if a standalone tool is active that doesn't need a PDF */
                        (() => {
                            const standaloneTools = ['merge', 'image-to-pdf', 'ppt-to-pdf'];
                            const isStandaloneTool = activeTool && standaloneTools.includes(activeTool);
                            
                            if (isStandaloneTool) {
                                // Show the tool panel in the main content area
                                return (
                                    <div className="standalone-tool-container">
                                        <ToolPanel />
                                    </div>
                                );
                            }
                            
                            // Show compact upload prompt
                            return (
                                <div className="editor-upload-prompt compact">
                                    <div className="upload-prompt-content">
                                        {/* Small Icon */}
                                        <div className="upload-prompt-illustration">
                                            <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
                                                <circle cx="40" cy="40" r="38" fill="url(#bgGradient)" />
                                                <rect x="22" y="18" width="32" height="42" rx="4" fill="white" stroke="#dc2626" strokeWidth="2" />
                                                <path d="M46 18 L54 26 L46 26 Z" fill="#fecaca" stroke="#dc2626" strokeWidth="1.5" />
                                                <rect x="28" y="32" width="18" height="3" rx="1.5" fill="#e5e7eb" />
                                                <rect x="28" y="38" width="22" height="2" rx="1" fill="#f3f4f6" />
                                                <rect x="28" y="44" width="16" height="2" rx="1" fill="#f3f4f6" />
                                                <circle cx="48" cy="52" r="12" fill="#dc2626" />
                                                <path d="M48 46 L48 56 M44 50 L48 46 L52 50" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                <defs>
                                                    <linearGradient id="bgGradient" x1="0" y1="0" x2="80" y2="80">
                                                        <stop offset="0%" stopColor="#fef2f2" />
                                                        <stop offset="100%" stopColor="#fee2e2" />
                                                    </linearGradient>
                                                </defs>
                                            </svg>
                                        </div>

                                        <h2 className="upload-prompt-title">Upload a PDF</h2>
                                        <p className="upload-prompt-desc">
                                            Select a tool from the right panel, then upload your PDF.
                                        </p>

                                        <button
                                            className="btn btn-primary upload-prompt-btn"
                                            onClick={() => fileInputRef.current?.click()}
                                        >
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                                <polyline points="17 8 12 3 7 8" />
                                                <line x1="12" y1="3" x2="12" y2="15" />
                                            </svg>
                                            Choose PDF
                                        </button>

                                        <span className="upload-prompt-hint">or drag & drop</span>
                                    </div>
                                </div>
                            );
                        })()
                    )}
                </div>

                {/* Tool Panel - Slides in from right when a tool is active (except standalone tools without doc) */}
                {activeTool && (() => {
                    const standaloneTools = ['merge', 'image-to-pdf', 'ppt-to-pdf'];
                    const isStandaloneTool = standaloneTools.includes(activeTool);
                    // Show overlay only if there's a document OR it's not a standalone tool
                    if (activeDocument || !isStandaloneTool) {
                        return (
                            <div className="tool-panel-overlay">
                                <ToolPanel />
                            </div>
                        );
                    }
                    return null;
                })()}
            </div>

            {/* Loading Overlay - Windows/Android Style Dots */}
            {isLoading && (
                <div className="loading-overlay">
                    <div className="loading-content">
                        <div className="loading-logo">
                            <img src="/logo.png" alt="PDFHub" style={{ width: 64, height: 64, objectFit: 'contain' }} />
                        </div>

                        {/* Windows-style bouncing dots */}
                        <div className="loading-dots">
                            <div className="loading-dot"></div>
                            <div className="loading-dot"></div>
                            <div className="loading-dot"></div>
                            <div className="loading-dot"></div>
                            <div className="loading-dot"></div>
                        </div>

                        <span className="loading-message">{loadingMessage || 'Loading...'}</span>

                        {/* Shimmer progress bar */}
                        <div className="loading-shimmer-bar">
                            <div className="loading-shimmer-fill"></div>
                        </div>
                    </div>
                </div>
            )}

            {/* Security Warning Modal */}
            <Modal
                isOpen={showSecurityModal}
                onClose={handleSecurityCancel}
                title="Security Warning"
                size="md"
                footer={
                    <>
                        <button className="btn btn-secondary" onClick={handleSecurityCancel}>
                            Cancel
                        </button>
                        <button className="btn btn-danger" onClick={handleSecurityConfirm}>
                            Open Anyway
                        </button>
                    </>
                }
            >
                <div className="security-warning">
                    <div className="security-warning-icon">
                        <ShieldAlert size={48} />
                    </div>
                    <h3>This PDF may be unsafe</h3>
                    <p>
                        The security scan detected potential threats in this file.
                        Opening it could be risky.
                    </p>

                    {pendingDocument && (
                        <div className="security-threats">
                            {pendingDocument.doc.securityStatus.threats.map((threat, index) => (
                                <div key={index} className="threat-item">
                                    <AlertTriangle size={16} style={{ color: PDFSecurityScanner.getSeverityColor(threat.severity) }} />
                                    <div className="threat-content">
                                        <span className="threat-type">{threat.type.replace('_', ' ')}</span>
                                        <span className="threat-desc">{threat.description}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    <p className="security-warning-note">
                        <strong>Recommendation:</strong> Only open this file if you trust its source.
                    </p>
                </div>
            </Modal>

            {/* Toast Container */}
            <ToastContainer />
        </div>
    );
}

// Main App with providers
export default function App() {
    return (
        <ToastProvider>
            <AppProvider>
                <AppContent />
            </AppProvider>
        </ToastProvider>
    );
}
