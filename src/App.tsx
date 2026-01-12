/**
 * PDF Editor Pro
 * Main Application Component
 */

import { useCallback, useRef, useEffect } from 'react';
import { AppProvider, ToastProvider, useApp, useToast } from './store/appStore';
import { RibbonToolbar } from './components/Layout/RibbonToolbar';
import { PDFViewer } from './components/PDFViewer/PDFViewer';
import { ToolPanel } from './components/Tools/ToolPanel';
import { ToastContainer } from './components/UI/Toast';
import { loadPDF, loadPDFFromArrayBuffer } from './utils/pdfHelpers';
import { saveDocumentToStorage, getLastDocumentFromStorage } from './utils/documentStorage';
import './styles/global.css';
import './styles/components.css';

// Inner App component that uses the context
function AppContent() {
    const { state, loadDocument, setLoading, setActiveTool } = useApp();
    const { addToast } = useToast();
    const { activeDocument, activeTool, isLoading, loadingMessage } = state;

    const fileInputRef = useRef<HTMLInputElement>(null);
    const hasAutoRestored = useRef<boolean>(false);

    // Auto-restore last document on mount
    useEffect(() => {
        if (hasAutoRestored.current) return;
        hasAutoRestored.current = true;

        const autoRestore = async () => {
            try {
                const savedDoc = await getLastDocumentFromStorage();
                if (savedDoc) {
                    setLoading(true, 'Restoring document...');
                    const doc = await loadPDFFromArrayBuffer(savedDoc.arrayBuffer, savedDoc.name, savedDoc.id);
                    loadDocument(doc);
                    addToast({
                        type: 'success',
                        title: 'Document restored',
                        message: savedDoc.name,
                    });
                    setLoading(false);
                }
            } catch (error) {
                console.error('Failed to auto-restore document:', error);
                setLoading(false);
            }
        };

        autoRestore();
    }, [loadDocument, setLoading, addToast]);

    // Handle file open
    const handleFileOpen = useCallback(async (files: File[]) => {
        if (files.length === 0) return;

        const file = files[0];
        setLoading(true, 'Loading PDF...');

        try {
            const doc = await loadPDF(file);
            
            // Load document directly without security checks
            loadDocument(doc);
            setActiveTool(null); // Clear any active tool

            // Save document to IndexedDB for persistence
            try {
                await saveDocumentToStorage({
                    id: doc.id,
                    name: doc.name,
                    arrayBuffer: doc.arrayBuffer,
                    pageCount: doc.pageCount,
                });
            } catch (storageError) {
                console.warn('Failed to save document to storage:', storageError);
            }

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
