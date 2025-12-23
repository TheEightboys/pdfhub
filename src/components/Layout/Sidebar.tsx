/**
 * Sidebar Component
 * Left sidebar with tool categories and tools list
 * Clean flat design with sharp edges
 */

import React, { useState } from 'react';
import { useApp } from '../../store/appStore';
import { ToolId, ToolCategory, Tool } from '../../types';
import {
    Combine, Split, RotateCcw, Trash2, ArrowUpDown, Copy, FileOutput,
    Minimize2, Image, FileImage, FileType, FileSpreadsheet,
    Type, ImagePlus, Crop, Maximize, Palette,
    Highlighter, Pencil, Shapes, PenTool, Stamp, StickyNote,
    Lock, Unlock, EyeOff,
    Droplets, Hash, FileSearch, Layers, Wrench, Bookmark, Link, ScanText,
    ChevronDown, ChevronRight, Zap, LayoutTemplate, Sparkles, Globe,
} from 'lucide-react';
import './Sidebar.css';

const TOOLS: Tool[] = [
    // Organize
    { id: 'merge', name: 'Merge PDF', description: 'Combine multiple PDFs', icon: 'combine', category: 'organize', isPremium: false },
    { id: 'split', name: 'Split PDF', description: 'Extract pages', icon: 'split', category: 'organize', isPremium: false },
    { id: 'rotate', name: 'Rotate Pages', description: 'Rotate PDF pages', icon: 'rotate', category: 'organize', isPremium: false },
    { id: 'delete', name: 'Delete Pages', description: 'Remove pages', icon: 'trash', category: 'organize', isPremium: false },
    { id: 'reorder', name: 'Reorder Pages', description: 'Drag to reorder', icon: 'reorder', category: 'organize', isPremium: false },
    { id: 'duplicate', name: 'Duplicate Pages', description: 'Copy pages', icon: 'copy', category: 'organize', isPremium: false },
    { id: 'extract', name: 'Extract Pages', description: 'Save selected pages', icon: 'extract', category: 'organize', isPremium: false },
    // Convert
    { id: 'compress', name: 'Compress PDF', description: 'Reduce file size', icon: 'compress', category: 'convert', isPremium: false },
    { id: 'pdf-to-image', name: 'PDF to Images', description: 'Export as PNG/JPG', icon: 'pdf-to-image', category: 'convert', isPremium: false },
    { id: 'image-to-pdf', name: 'Images to PDF', description: 'Create PDF from images', icon: 'image-to-pdf', category: 'convert', isPremium: false },
    { id: 'pdf-to-word', name: 'PDF to Word', description: 'Convert to DOCX', icon: 'pdf-to-word', category: 'convert', isPremium: false },
    { id: 'pdf-to-excel', name: 'PDF to Excel', description: 'Convert to XLSX', icon: 'pdf-to-excel', category: 'convert', isPremium: false },
    // Edit
    { id: 'add-text', name: 'Add Text', description: 'Place text on PDF', icon: 'add-text', category: 'edit', isPremium: false },
    { id: 'add-image', name: 'Add Image', description: 'Insert images', icon: 'add-image', category: 'edit', isPremium: false },
    { id: 'crop', name: 'Crop Pages', description: 'Crop margins', icon: 'crop', category: 'edit', isPremium: false },
    { id: 'resize', name: 'Resize Pages', description: 'Change dimensions', icon: 'resize', category: 'edit', isPremium: false },
    { id: 'background', name: 'Page Background', description: 'Add background', icon: 'background', category: 'edit', isPremium: false },
    // Annotate
    { id: 'highlight', name: 'Highlight', description: 'Highlight text', icon: 'highlight', category: 'annotate', isPremium: false },
    { id: 'draw', name: 'Draw', description: 'Freehand drawing', icon: 'draw', category: 'annotate', isPremium: false },
    { id: 'shapes', name: 'Shapes', description: 'Add shapes', icon: 'shapes', category: 'annotate', isPremium: false },
    { id: 'signature', name: 'Signature', description: 'Add signature', icon: 'signature', category: 'annotate', isPremium: false },
    { id: 'stamp', name: 'Stamp', description: 'Add stamps', icon: 'stamp', category: 'annotate', isPremium: false },
    { id: 'notes', name: 'Sticky Notes', description: 'Add notes', icon: 'notes', category: 'annotate', isPremium: false },
    // Security
    { id: 'password-protect', name: 'Password Protect', description: 'Encrypt PDF', icon: 'lock', category: 'security', isPremium: false },
    { id: 'unlock', name: 'Unlock PDF', description: 'Remove password', icon: 'unlock', category: 'security', isPremium: false },
    { id: 'redact', name: 'Redact', description: 'Black out content', icon: 'redact', category: 'security', isPremium: false },
    // Advanced
    { id: 'watermark', name: 'Watermark', description: 'Add watermark', icon: 'watermark', category: 'advanced', isPremium: false },
    { id: 'page-numbers', name: 'Page Numbers', description: 'Add numbering', icon: 'page-numbers', category: 'advanced', isPremium: false },
    { id: 'header-footer', name: 'Header & Footer', description: 'Add headers', icon: 'header-footer', category: 'advanced', isPremium: false },
    { id: 'ocr', name: 'OCR', description: 'Extract text from images', icon: 'ocr', category: 'advanced', isPremium: false },
    { id: 'metadata', name: 'Edit Metadata', description: 'Modify properties', icon: 'metadata', category: 'advanced', isPremium: false },
    { id: 'flatten', name: 'Flatten PDF', description: 'Merge annotations', icon: 'flatten', category: 'advanced', isPremium: false },
    { id: 'repair', name: 'Repair PDF', description: 'Fix corrupted', icon: 'repair', category: 'advanced', isPremium: false },
    { id: 'bookmark', name: 'Add Bookmarks', description: 'Create bookmarks', icon: 'bookmark', category: 'advanced', isPremium: false },
    { id: 'hyperlinks', name: 'Add Links', description: 'Insert hyperlinks', icon: 'hyperlinks', category: 'advanced', isPremium: false },
    // AI Tools
    { id: 'ai-summarize', name: 'AI Summarize', description: 'Smart summary of PDF', icon: 'ai-summarize', category: 'advanced', isPremium: false },
    { id: 'ai-translate', name: 'AI Translate', description: 'Translate PDF content', icon: 'ai-translate', category: 'advanced', isPremium: false },
];

const CATEGORIES: { id: ToolCategory; name: string; icon: React.ReactNode }[] = [
    { id: 'organize', name: 'Organize', icon: <ArrowUpDown size={18} /> },
    { id: 'convert', name: 'Convert', icon: <FileOutput size={18} /> },
    { id: 'edit', name: 'Edit', icon: <Type size={18} /> },
    { id: 'annotate', name: 'Annotate', icon: <Pencil size={18} /> },
    { id: 'security', name: 'Security', icon: <Lock size={18} /> },
    { id: 'advanced', name: 'Advanced', icon: <Zap size={18} /> },
];

const getToolIcon = (iconName: string, size: number = 20) => {
    const icons: Record<string, React.ReactNode> = {
        combine: <Combine size={size} />, split: <Split size={size} />, rotate: <RotateCcw size={size} />,
        trash: <Trash2 size={size} />, reorder: <ArrowUpDown size={size} />, copy: <Copy size={size} />,
        extract: <FileOutput size={size} />, compress: <Minimize2 size={size} />,
        'pdf-to-image': <Image size={size} />, 'image-to-pdf': <FileImage size={size} />,
        'pdf-to-word': <FileType size={size} />, 'pdf-to-excel': <FileSpreadsheet size={size} />,
        'add-text': <Type size={size} />, 'add-image': <ImagePlus size={size} />,
        crop: <Crop size={size} />, resize: <Maximize size={size} />, background: <Palette size={size} />,
        highlight: <Highlighter size={size} />, draw: <Pencil size={size} />, shapes: <Shapes size={size} />,
        signature: <PenTool size={size} />, stamp: <Stamp size={size} />, notes: <StickyNote size={size} />,
        lock: <Lock size={size} />, unlock: <Unlock size={size} />, redact: <EyeOff size={size} />,
        watermark: <Droplets size={size} />, 'page-numbers': <Hash size={size} />,
        'header-footer': <LayoutTemplate size={size} />, ocr: <ScanText size={size} />,
        metadata: <FileSearch size={size} />, flatten: <Layers size={size} />, repair: <Wrench size={size} />,
        bookmark: <Bookmark size={size} />, hyperlinks: <Link size={size} />,
        'ai-summarize': <Sparkles size={size} />, 'ai-translate': <Globe size={size} />,
    };
    return icons[iconName] || <FileOutput size={size} />;
};

export function Sidebar() {
    const { state, setActiveTool } = useApp();
    const { activeTool, sidebarCollapsed, activeDocument } = state;
    const [expandedCategories, setExpandedCategories] = useState<ToolCategory[]>(['organize', 'convert']);

    const toggleCategory = (category: ToolCategory) => {
        setExpandedCategories(prev =>
            prev.includes(category) ? prev.filter(c => c !== category) : [...prev, category]
        );
    };

    const handleToolClick = (tool: Tool) => {
        const noDocRequired: ToolId[] = ['merge', 'image-to-pdf'];
        if (!noDocRequired.includes(tool.id) && !activeDocument) return;
        setActiveTool(tool.id);
    };

    if (sidebarCollapsed) {
        return (
            <aside className="sidebar sidebar-collapsed">
                <div className="sidebar-collapsed-tools">
                    {CATEGORIES.map(cat => (
                        <button key={cat.id} className="sidebar-collapsed-btn" title={cat.name}>
                            {cat.icon}
                        </button>
                    ))}
                </div>
            </aside>
        );
    }

    return (
        <aside className="sidebar">
            <div className="sidebar-content">
                <div className="sidebar-header">
                    <h2>PDF TOOLS</h2>
                    <span className="tool-count">{TOOLS.length} tools</span>
                </div>
                <div className="sidebar-categories">
                    {CATEGORIES.map(category => {
                        const tools = TOOLS.filter(t => t.category === category.id);
                        const isExpanded = expandedCategories.includes(category.id);
                        return (
                            <div key={category.id} className="sidebar-category">
                                <button className={`category-header ${isExpanded ? 'expanded' : ''}`} onClick={() => toggleCategory(category.id)}>
                                    <span className="category-icon">{category.icon}</span>
                                    <span className="category-name">{category.name}</span>
                                    <span className="category-chevron">{isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}</span>
                                </button>
                                {isExpanded && (
                                    <div className="sidebar-tools">
                                        {tools.map(tool => {
                                            const isActive = activeTool === tool.id;
                                            const isDisabled = !['merge', 'image-to-pdf'].includes(tool.id) && !activeDocument;
                                            return (
                                                <button key={tool.id} className={`sidebar-tool ${isActive ? 'active' : ''} ${isDisabled ? 'disabled' : ''}`}
                                                    onClick={() => handleToolClick(tool)} disabled={isDisabled} title={tool.name}>
                                                    <span className="tool-icon">{getToolIcon(tool.icon)}</span>
                                                    <div className="tool-text">
                                                        <span className="tool-name">{tool.name}</span>
                                                        <span className="tool-desc">{tool.description}</span>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
            <div className="sidebar-footer">
                <Lock size={14} />
                <span>100% Private - Files processed locally</span>
            </div>
        </aside>
    );
}

export { TOOLS, CATEGORIES, getToolIcon };
