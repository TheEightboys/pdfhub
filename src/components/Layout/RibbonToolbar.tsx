/**
 * RibbonToolbar Component
 * Compact Microsoft Word-like ribbon toolbar
 */

import React, { useState } from 'react';
import { useApp, useToast } from '../../store/appStore';
import { ToolId } from '../../types';
import {
    Upload, FileText, Save, Undo2, Redo2,
    Combine, Split, RotateCcw, Trash2, ArrowUpDown, Copy, FileOutput,
    Minimize2, Image, FileImage, FileType, FileSpreadsheet,
    Type, ImagePlus, Crop, Maximize, Palette, Eraser,
    Highlighter, Pencil, Shapes, PenTool, Stamp, StickyNote,
    Lock, Unlock, EyeOff,
    Droplets, Hash, LayoutTemplate, ScanText, FileSearch, Layers, Wrench, Bookmark, Link,
    Sparkles, Globe,
    Sun, Moon, X,
} from 'lucide-react';
import { downloadPDF, getPDFBytes } from '../../utils/pdfHelpers';
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
                name: 'Pages',
                tools: [
                    { id: 'rotate', name: 'Rotate', icon: <RotateCcw size={20} />, requiresDoc: true },
                    { id: 'delete', name: 'Delete', icon: <Trash2 size={20} />, requiresDoc: true },
                    { id: 'reorder', name: 'Reorder', icon: <ArrowUpDown size={20} />, requiresDoc: true },
                    { id: 'duplicate', name: 'Copy', icon: <Copy size={20} />, requiresDoc: true },
                    { id: 'extract', name: 'Extract', icon: <FileOutput size={20} />, requiresDoc: true },
                ],
            },
            {
                name: 'Document',
                tools: [
                    { id: 'merge', name: 'Merge', icon: <Combine size={20} />, requiresDoc: false },
                    { id: 'split', name: 'Split', icon: <Split size={20} />, requiresDoc: true },
                    { id: 'compress', name: 'Compress', icon: <Minimize2 size={20} />, requiresDoc: true },
                ],
            },
        ],
    },
    {
        id: 'insert',
        name: 'INSERT',
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
        name: 'COMMENTS',
        groups: [
            {
                name: 'Markup',
                tools: [
                    { id: 'highlight', name: 'Highlight', icon: <Highlighter size={20} />, requiresDoc: true },
                    { id: 'draw', name: 'Draw', icon: <Pencil size={20} />, requiresDoc: true },
                    { id: 'erase', name: 'Eraser', icon: <Eraser size={20} />, requiresDoc: true },
                    { id: 'signature', name: 'Sign', icon: <PenTool size={20} />, requiresDoc: true },
                ],
            },
            {
                name: 'Notes',
                tools: [
                    { id: 'stamp', name: 'Stamp', icon: <Stamp size={20} />, requiresDoc: true },
                    { id: 'notes', name: 'Notes', icon: <StickyNote size={20} />, requiresDoc: true },
                ],
            },
        ],
    },
    {
        id: 'forms',
        name: 'FORMS',
        groups: [
            {
                name: 'Page',
                tools: [
                    { id: 'crop', name: 'Crop', icon: <Crop size={20} />, requiresDoc: true },
                    { id: 'resize', name: 'Resize', icon: <Maximize size={20} />, requiresDoc: true },
                    { id: 'background', name: 'Background', icon: <Palette size={20} />, requiresDoc: true },
                ],
            },
        ],
    },
    {
        id: 'convert',
        name: 'CONVERT',
        groups: [
            {
                name: 'Export',
                tools: [
                    { id: 'pdf-to-image', name: 'Images', icon: <Image size={20} />, requiresDoc: true },
                    { id: 'pdf-to-word', name: 'Word', icon: <FileType size={20} />, requiresDoc: true },
                    { id: 'pdf-to-excel', name: 'Excel', icon: <FileSpreadsheet size={20} />, requiresDoc: true },
                ],
            },
            {
                name: 'Import',
                tools: [
                    { id: 'image-to-pdf', name: 'From Images', icon: <FileImage size={20} />, requiresDoc: false },
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
                    { id: 'unlock', name: 'Unlock', icon: <Unlock size={20} />, requiresDoc: true },
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
    const { state, setActiveTool, toggleTheme, closeDocument } = useApp();
    const { addToast } = useToast();
    const { theme, activeDocument, activeTool } = state;
    const [activeTab, setActiveTab] = useState<string>('home');

    const handleToolClick = (tool: RibbonTool) => {
        if (tool.requiresDoc && !activeDocument) {
            addToast({ type: 'warning', title: 'No document', message: 'Please open a PDF first.' });
            return;
        }
        if (tool.id !== 'save') setActiveTool(tool.id as ToolId);
    };

    const handleDownload = async () => {
        if (!activeDocument) return;
        try {
            const bytes = await getPDFBytes(activeDocument.arrayBuffer.slice(0));
            const newName = activeDocument.name.replace('.pdf', '_edited.pdf');
            downloadPDF(bytes, newName);
            addToast({ type: 'success', title: 'Saved', message: newName });
        } catch { addToast({ type: 'error', title: 'Failed', message: 'Could not save.' }); }
    };

    const currentTab = RIBBON_TABS.find(t => t.id === activeTab);

    return (
        <div className="ribbon">
            {/* Header Row: Logo, Doc Name, Actions */}
            <div className="ribbon-header">
                <div className="ribbon-brand">
                    <FileText size={16} />
                    <span className="ribbon-title">PDFHub</span>
                </div>
                <div className="ribbon-doc-name">
                    {activeDocument?.name || ''}
                </div>
                <div className="ribbon-actions">
                    <button className="ribbon-icon-btn undo" disabled={!activeDocument} title="Undo (Ctrl+Z)">
                        <Undo2 size={14} />
                    </button>
                    <button className="ribbon-icon-btn redo" disabled={!activeDocument} title="Redo (Ctrl+Y)">
                        <Redo2 size={14} />
                    </button>
                    <div className="ribbon-divider"></div>
                    <button className="ribbon-action" onClick={onOpenFile} title="Open">
                        <Upload size={14} />
                        <span>Open</span>
                    </button>
                    <button className="ribbon-action" onClick={handleDownload} disabled={!activeDocument} title="Save">
                        <Save size={14} />
                        <span>Save</span>
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
        </div>
    );
}

export { RIBBON_TABS };
