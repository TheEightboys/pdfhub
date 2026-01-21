/**
 * RibbonToolbar Component
 * Compact Microsoft Word-like ribbon toolbar
 */

import React, { useState, useEffect, useRef } from 'react';
import { useApp, useToast } from '../../store/appStore';
import { ToolId } from '../../types';
import {
    Upload, FileText, Save, Undo2, Redo2,
    Combine, Split, RotateCcw, Trash2, ArrowUpDown, Copy, FileOutput,
    Minimize2, Image, FileImage, FileType, FileSpreadsheet, Presentation,
    Type, ImagePlus, Crop, Maximize, Eraser,
    Highlighter, Pencil, Shapes, PenTool, Stamp, StickyNote,
    Lock, EyeOff,
    Droplets, Hash, LayoutTemplate, ScanText, FileSearch, Layers, Wrench, Bookmark, Link,
    Sparkles, Globe,
    Sun, Moon, X, RotateCw, Trash, LayoutGrid,
} from 'lucide-react';
import { downloadPDF, savePDFWithAnnotations, loadPDFFromArrayBuffer } from '../../utils/pdfHelpers';
import { getLastDocumentFromStorage, clearDocumentStorage, hasSavedDocument } from '../../utils/documentStorage';
import { ProductNavPopup } from '../UI/ProductNavPopup';
import './RibbonToolbar.css';

interface RibbonTool {
    id: ToolId | 'save';
    name: string;
    icon: React.ReactNode;
    requiresDoc?: boolean;
}

interface RibbonGroup {
    name: string;
    tools: RibbonTool[];
}

interface RibbonTab {
    id: string;
    name: string;
    groups: RibbonGroup[];
}

const RIBBON_TABS: RibbonTab[] = [
    {
        id: 'home',
        name: 'HOME',
        groups: [
            {
                name: 'Quick Access',
                tools: [
                    { id: 'save', name: 'Save', icon: <Save size={20} />, requiresDoc: true },
                    { id: 'undo', name: 'Undo', icon: <Undo2 size={20} />, requiresDoc: true },
                    { id: 'redo', name: 'Redo', icon: <Redo2 size={20} />, requiresDoc: true },
                    { id: 'split', name: 'Split', icon: <Split size={20} />, requiresDoc: true },
                    { id: 'compress', name: 'Compress', icon: <Minimize2 size={20} />, requiresDoc: true },
                    { id: 'rotate', name: 'Rotate', icon: <RotateCcw size={20} />, requiresDoc: true },
                    { id: 'signature', name: 'Sign', icon: <PenTool size={20} />, requiresDoc: true },
                    { id: 'highlight', name: 'Highlight', icon: <Highlighter size={20} />, requiresDoc: true },
                    { id: 'ocr', name: 'OCR', icon: <ScanText size={20} />, requiresDoc: true },
                    { id: 'password-protect', name: 'Encrypt', icon: <Lock size={20} />, requiresDoc: true },
                ],
            },
        ],
    },
    {
        id: 'edit',
        name: 'EDIT',
        groups: [
            {
                name: 'Content',
                tools: [
                    { id: 'add-text', name: 'Text', icon: <Type size={20} />, requiresDoc: true },
                    { id: 'add-image', name: 'Image', icon: <ImagePlus size={20} />, requiresDoc: true },
                    { id: 'shapes', name: 'Shapes', icon: <Shapes size={20} />, requiresDoc: true },
                ],
            },
            {
                name: 'Page Layout',
                tools: [
                    { id: 'crop', name: 'Crop', icon: <Crop size={20} />, requiresDoc: true },
                    { id: 'resize', name: 'Resize', icon: <Maximize size={20} />, requiresDoc: true },
                ],
            },
            {
                name: 'Links',
                tools: [
                    { id: 'hyperlinks', name: 'Hyperlink', icon: <Link size={20} />, requiresDoc: true },
                    { id: 'bookmark', name: 'Bookmark', icon: <Bookmark size={20} />, requiresDoc: true },
                ],
            },
        ],
    },
    {
        id: 'annotate',
        name: 'ANNOTATE',
        groups: [
            {
                name: 'Markup',
                tools: [
                    { id: 'highlight', name: 'Highlight', icon: <Highlighter size={20} />, requiresDoc: true },
                    { id: 'draw', name: 'Draw', icon: <Pencil size={20} />, requiresDoc: true },
                    { id: 'erase', name: 'Eraser', icon: <Eraser size={20} />, requiresDoc: true },
                    { id: 'signature', name: 'Sign', icon: <PenTool size={20} />, requiresDoc: true },
                    { id: 'stamp', name: 'Stamp', icon: <Stamp size={20} />, requiresDoc: true },
                    { id: 'notes', name: 'Notes', icon: <StickyNote size={20} />, requiresDoc: true },
                ],
            },
        ],
    },
    {
        id: 'organize',
        name: 'ORGANIZE',
        groups: [
            {
                name: 'Pages',
                tools: [
                    { id: 'merge', name: 'Merge', icon: <Combine size={20} />, requiresDoc: false },
                    { id: 'split', name: 'Split', icon: <Split size={20} />, requiresDoc: true },
                    { id: 'extract', name: 'Extract', icon: <FileOutput size={20} />, requiresDoc: true },
                    { id: 'rotate', name: 'Rotate', icon: <RotateCcw size={20} />, requiresDoc: true },
                    { id: 'delete', name: 'Delete', icon: <Trash2 size={20} />, requiresDoc: true },
                    { id: 'reorder', name: 'Reorder', icon: <ArrowUpDown size={20} />, requiresDoc: true },
                    { id: 'duplicate', name: 'Duplicate', icon: <Copy size={20} />, requiresDoc: true },
                ],
            },
        ],
    },
    {
        id: 'convert',
        name: 'CONVERT',
        groups: [
            {
                name: 'Compress',
                tools: [
                    { id: 'compress', name: 'Compress', icon: <Minimize2 size={20} />, requiresDoc: true },
                ],
            },
            {
                name: 'Export',
                tools: [
                    { id: 'pdf-to-image', name: 'To Images', icon: <Image size={20} />, requiresDoc: true },
                    { id: 'pdf-to-word', name: 'To Word', icon: <FileType size={20} />, requiresDoc: true },
                    { id: 'pdf-to-excel', name: 'To Excel', icon: <FileSpreadsheet size={20} />, requiresDoc: true },
                ],
            },
            {
                name: 'Import',
                tools: [
                    { id: 'image-to-pdf', name: 'From Images', icon: <FileImage size={20} />, requiresDoc: false },
                    { id: 'ppt-to-pdf', name: 'From PPT', icon: <Presentation size={20} />, requiresDoc: false },
                ],
            },
        ],
    },
    {
        id: 'security',
        name: 'SECURITY',
        groups: [
            {
                name: 'Protect',
                tools: [
                    { id: 'password-protect', name: 'Encrypt', icon: <Lock size={20} />, requiresDoc: true },
                    { id: 'redact', name: 'Redact', icon: <EyeOff size={20} />, requiresDoc: true },
                ],
            },
        ],
    },
    {
        id: 'tools',
        name: 'TOOLS',
        groups: [
            {
                name: 'Enhance',
                tools: [
                    { id: 'watermark', name: 'Watermark', icon: <Droplets size={20} />, requiresDoc: true },
                    { id: 'page-numbers', name: 'Numbers', icon: <Hash size={20} />, requiresDoc: true },
                    { id: 'header-footer', name: 'Header', icon: <LayoutTemplate size={20} />, requiresDoc: true },
                ],
            },
            {
                name: 'Advanced',
                tools: [
                    { id: 'ocr', name: 'OCR', icon: <ScanText size={20} />, requiresDoc: true },
                    { id: 'flatten', name: 'Flatten', icon: <Layers size={20} />, requiresDoc: true },
                    { id: 'repair', name: 'Repair', icon: <Wrench size={20} />, requiresDoc: true },
                    { id: 'metadata', name: 'Info', icon: <FileSearch size={20} />, requiresDoc: true },
                ],
            },
        ],
    },
    {
        id: 'ai',
        name: 'AI',
        groups: [
            {
                name: 'AI Tools',
                tools: [
                    { id: 'ai-summarize', name: 'Summarize', icon: <Sparkles size={20} />, requiresDoc: true },
                    { id: 'ai-translate', name: 'Translate', icon: <Globe size={20} />, requiresDoc: true },
                ],
            },
        ],
    },
];

interface RibbonToolbarProps {
    onOpenFile: () => void;
}

export function RibbonToolbar({ onOpenFile }: RibbonToolbarProps) {
    const { state, setActiveTool, toggleTheme, closeDocument, loadDocument, undo, redo, canUndo, canRedo } = useApp();
    const { addToast } = useToast();
    const { theme, activeDocument, activeTool } = state;
    const [activeTab, setActiveTab] = useState<string>('home');
    const [editableFileName, setEditableFileName] = useState<string>('');
    const [hasSavedDoc, setHasSavedDoc] = useState<boolean>(false);
    const [isProductNavOpen, setIsProductNavOpen] = useState(false);

    // Track last toast time to prevent duplicate notifications
    const lastUndoToastTime = useRef<number>(0);
    const lastRedoToastTime = useRef<number>(0);
    const TOAST_DEBOUNCE_MS = 1000; // Show toast at most once per second

    // Keyboard shortcuts for undo/redo
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Check if we're in an input field - don't intercept there
            const target = e.target as HTMLElement;
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
                return;
            }

            if (e.ctrlKey || e.metaKey) {
                if (e.key === 'z' && !e.shiftKey) {
                    e.preventDefault();
                    if (canUndo) undo();
                } else if (e.key === 'y' || (e.key === 'z' && e.shiftKey)) {
                    e.preventDefault();
                    if (canRedo) redo();
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [canUndo, canRedo, undo, redo]);

    // Check for saved document on mount
    useEffect(() => {
        hasSavedDocument().then(setHasSavedDoc);
    }, []);

    // Update editable filename when active document changes
    useEffect(() => {
        if (activeDocument) {
            setEditableFileName(activeDocument.name);
        } else {
            setEditableFileName('');
        }
    }, [activeDocument]);

    const handleToolClick = (tool: RibbonTool) => {
        if (tool.requiresDoc && !activeDocument) {
            addToast({ type: 'warning', title: 'No document', message: 'Please open a PDF first.' });
            return;
        }

        // Handle immediate actions (don't open a panel)
        if (tool.id === 'save') {
            handleDownload();
        } else if (tool.id === 'undo') {
            if (canUndo) {
                undo();
                // Show toast only once per second even with rapid clicks
                const now = Date.now();
                if (now - lastUndoToastTime.current > TOAST_DEBOUNCE_MS) {
                    addToast({ type: 'info', title: 'Undo', duration: 800 });
                    lastUndoToastTime.current = now;
                }
            }
        } else if (tool.id === 'redo') {
            if (canRedo) {
                redo();
                // Show toast only once per second even with rapid clicks
                const now = Date.now();
                if (now - lastRedoToastTime.current > TOAST_DEBOUNCE_MS) {
                    addToast({ type: 'info', title: 'Redo', duration: 800 });
                    lastRedoToastTime.current = now;
                }
            }
        } else {
            setActiveTool(tool.id as ToolId);
        }
    };


    const handleDownload = async () => {
        if (!activeDocument) return;
        try {
            const bytes = await savePDFWithAnnotations(activeDocument);
            // Use the editable filename from the input field
            const baseName = editableFileName.replace(/\.pdf$/i, '');
            const newName = `${baseName}.pdf`; // Keep original name if possible
            downloadPDF(bytes, newName);
            addToast({
                type: 'success',
                title: 'Content Saved',
                duration: 1000
            });
        } catch { addToast({ type: 'error', title: 'Failed', message: 'Could not save.' }); }
    };


    const handleRestoreDocument = async () => {
        try {
            const savedDoc = await getLastDocumentFromStorage();
            if (savedDoc) {
                const doc = await loadPDFFromArrayBuffer(savedDoc.arrayBuffer, savedDoc.name, savedDoc.id);
                loadDocument(doc);
                setActiveTool(null);
                addToast({ type: 'success', title: 'Restored', message: `${savedDoc.name} restored from storage` });
            } else {
                addToast({ type: 'warning', title: 'No saved document', message: 'No document found in storage.' });
            }
        } catch (error) {
            console.error('Failed to restore document:', error);
            addToast({ type: 'error', title: 'Restore failed', message: 'Could not restore document.' });
        }
    };

    const handleClearStorage = async () => {
        try {
            await clearDocumentStorage();
            setHasSavedDoc(false);
            addToast({ type: 'success', title: 'Storage cleared', message: 'Saved document has been removed.' });
        } catch (error) {
            console.error('Failed to clear storage:', error);
            addToast({ type: 'error', title: 'Clear failed', message: 'Could not clear storage.' });
        }
    };

    const currentTab = RIBBON_TABS.find(t => t.id === activeTab);

    return (
        <div className="ribbon">
            {/* Header Row: Logo, Doc Name, Actions */}
            <div className="ribbon-header">
                <div className="ribbon-brand">
                    <FileText size={16} />
                    <span className="ribbon-title">PDF Editor</span>
                </div>
                <input
                    type="text"
                    className="ribbon-doc-name"
                    value={editableFileName}
                    onChange={(e) => setEditableFileName(e.target.value)}
                    placeholder="Untitled Document"
                    readOnly={!activeDocument}
                />
                <div className="ribbon-actions">
                    <button
                        className="ribbon-icon-btn undo"
                        disabled={!activeDocument || !canUndo}
                        title="Undo (Ctrl+Z)"
                        onClick={() => undo()}
                    >
                        <Undo2 size={14} />
                    </button>
                    <button
                        className="ribbon-icon-btn redo"
                        disabled={!activeDocument || !canRedo}
                        title="Redo (Ctrl+Y)"
                        onClick={() => redo()}
                    >
                        <Redo2 size={14} />
                    </button>
                    <div className="ribbon-divider"></div>
                    <button className="ribbon-action" onClick={onOpenFile} title="Open">
                        <Upload size={14} />
                        <span>Open</span>
                    </button>
                    {hasSavedDoc && !activeDocument && (
                        <button className="ribbon-action" onClick={handleRestoreDocument} title="Restore last document">
                            <RotateCw size={14} />
                            <span>Restore</span>
                        </button>
                    )}
                    <button className="ribbon-action" onClick={handleDownload} disabled={!activeDocument} title="Download">
                        <Save size={14} />
                        <span>Download</span>
                    </button>
                    {hasSavedDoc && (
                        <button className="ribbon-icon-btn" onClick={handleClearStorage} title="Clear saved document">
                            <Trash size={14} />
                        </button>
                    )}
                    <div className="ribbon-divider"></div>
                    <button
                        className="ribbon-icon-btn products-toggle"
                        onClick={() => setIsProductNavOpen(true)}
                        title="Famral Products"
                    >
                        <LayoutGrid size={14} />
                    </button>
                    <button className="ribbon-icon-btn" onClick={toggleTheme} title="Theme">
                        {theme === 'light' ? <Moon size={14} /> : <Sun size={14} />}
                    </button>
                    {activeDocument && (
                        <button className="ribbon-icon-btn close" onClick={() => closeDocument(activeDocument.id)} title="Close">
                            <X size={14} />
                        </button>
                    )}
                </div>
            </div>

            {/* Tab Strip */}
            <div className="ribbon-tabs">
                {RIBBON_TABS.map(tab => (
                    <button
                        key={tab.id}
                        className={`ribbon-tab ${activeTab === tab.id ? 'active' : ''}`}
                        onClick={() => setActiveTab(tab.id)}
                    >
                        {tab.name}
                    </button>
                ))}
            </div>

            {/* Tool Groups - Compact Row */}
            {currentTab && (
                <div className="ribbon-content">
                    {currentTab.groups.map((group, idx) => (
                        <div key={idx} className="ribbon-group">
                            <div className="ribbon-group-tools">
                                {group.tools.map(tool => {
                                    const isActive = activeTool === tool.id;
                                    const isDisabled = tool.requiresDoc && !activeDocument;
                                    return (
                                        <button
                                            key={tool.id}
                                            className={`ribbon-tool ${isActive ? 'active' : ''}`}
                                            onClick={() => handleToolClick(tool)}
                                            disabled={isDisabled}
                                            title={tool.name}
                                        >
                                            {tool.icon}
                                            <span>{tool.name}</span>
                                        </button>
                                    );
                                })}
                            </div>
                            <div className="ribbon-group-label">{group.name.toUpperCase()}</div>
                        </div>
                    ))}
                </div>
            )}

            {/* Product Navigation Popup */}
            <ProductNavPopup isOpen={isProductNavOpen} onClose={() => setIsProductNavOpen(false)} />
        </div>
    );
}

export { RIBBON_TABS };
