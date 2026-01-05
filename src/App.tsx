/**
 * PDF Editor Pro
 * Main Application Component
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { AppProvider, ToastProvider, useApp, useToast } from './store/appStore';
import { RibbonToolbar } from './components/Layout/RibbonToolbar';
import { PDFViewer } from './components/PDFViewer/PDFViewer';
import { WelcomeScreen } from './components/WelcomeScreen/WelcomeScreen';
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
            <div className="app-main word-layout">

                {/* Center - PDF Viewer, Welcome Screen, or Empty State with Upload Prompt */}
                <div className="app-content">
                    {activeDocument ? (
                        <PDFViewer />
                    ) : activeTool ? (
                        /* Show upload prompt when tool is selected but no PDF loaded */
                        <div className="editor-upload-prompt">
                            <div className="upload-prompt-content">
                                {/* Illustrated Icon */}
                                <div className="upload-prompt-illustration">
                                    <svg width="140" height="140" viewBox="0 0 140 140" fill="none">
                                        {/* Background circle */}
                                        <circle cx="70" cy="70" r="68" fill="url(#bgGradient)" />

                                        {/* Paper stack effect */}
                                        <rect x="38" y="32" width="56" height="72" rx="6" fill="#e5e7eb" transform="rotate(-5 38 32)" />
                                        <rect x="42" y="28" width="56" height="72" rx="6" fill="#f3f4f6" transform="rotate(3 42 28)" />

                                        {/* Main PDF document */}
                                        <rect x="40" y="26" width="60" height="78" rx="6" fill="white" stroke="#dc2626" strokeWidth="2.5" />

                                        {/* PDF corner fold */}
                                        <path d="M84 26 L100 42 L84 42 Z" fill="#fecaca" stroke="#dc2626" strokeWidth="2" />

                                        {/* PDF text lines */}
                                        <rect x="50" y="52" width="32" height="5" rx="2.5" fill="#e5e7eb" />
                                        <rect x="50" y="64" width="40" height="4" rx="2" fill="#f3f4f6" />
                                        <rect x="50" y="74" width="36" height="4" rx="2" fill="#f3f4f6" />
                                        <rect x="50" y="84" width="28" height="4" rx="2" fill="#f3f4f6" />

                                        {/* Upload arrow circle */}
                                        <circle cx="82" cy="88" r="22" fill="#dc2626" />
                                        <path d="M82 78 L82 96 M74 86 L82 78 L90 86" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />

                                        <defs>
                                            <linearGradient id="bgGradient" x1="0" y1="0" x2="140" y2="140">
                                                <stop offset="0%" stopColor="#fef2f2" />
                                                <stop offset="100%" stopColor="#fee2e2" />
                                            </linearGradient>
                                        </defs>
                                    </svg>
                                </div>

                                <h2 className="upload-prompt-title">Upload a PDF to Get Started</h2>
                                <p className="upload-prompt-desc">
                                    Select or drop a PDF file to use this tool.
                                </p>
                                <div className="upload-prompt-features">
                                    <span className="feature-badge">✓ 100% Free</span>
                                    <span className="feature-badge">✓ Secure</span>
                                    <span className="feature-badge">✓ No Sign-up</span>
                                </div>

                                <button
                                    className="btn btn-primary btn-lg upload-prompt-btn"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                        <polyline points="17 8 12 3 7 8" />
                                        <line x1="12" y1="3" x2="12" y2="15" />
                                    </svg>
                                    Choose PDF File
                                </button>

                                <div className="upload-prompt-dropzone">
                                    <span className="upload-prompt-or">— or —</span>
                                    <span className="upload-prompt-drop-text">Drag & drop your file anywhere</span>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <WelcomeScreen onFileOpen={handleFileOpen} />
                    )}
                </div>

                {/* Tool Panel - Slides in from right when a tool is active */}
                {activeTool && (
                    <div className="tool-panel-overlay">
                        <ToolPanel />
                    </div>
                )}
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
