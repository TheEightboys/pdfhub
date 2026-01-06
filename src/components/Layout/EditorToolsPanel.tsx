/**
 * EditorToolsPanel Component
 * Right-side panel with all PDF tools for easy access
 * Provides quick tool access without disturbing the working editor section
 */

import { useState } from 'react';
import { useApp } from '../../store/appStore';
import { ToolId, ToolCategory, Tool } from '../../types';
import { TOOLS, CATEGORIES, getToolIcon } from './Sidebar';
import {
    Search, ChevronLeft, ChevronRight, X
} from 'lucide-react';
import './EditorToolsPanel.css';

// Tool icon colors mapping
const TOOL_COLORS: Record<string, string> = {
    'merge': '#dc2626', 'split': '#dc2626', 'rotate': '#dc2626', 'delete': '#dc2626',
    'reorder': '#dc2626', 'duplicate': '#dc2626', 'extract': '#dc2626',
    'compress': '#16a34a', 'pdf-to-image': '#0891b2', 'image-to-pdf': '#0891b2',
    'pdf-to-word': '#2563eb', 'pdf-to-excel': '#16a34a', 'ppt-to-pdf': '#ea580c',
    'add-text': '#dc2626', 'add-image': '#dc2626', 'crop': '#dc2626',
    'resize': '#dc2626', 'background': '#dc2626',
    'highlight': '#eab308', 'draw': '#7c3aed', 'shapes': '#7c3aed',
    'signature': '#0891b2', 'stamp': '#dc2626', 'notes': '#eab308',
    'password-protect': '#1e40af', 'unlock': '#16a34a', 'redact': '#374151',
    'watermark': '#0891b2', 'page-numbers': '#64748b', 'header-footer': '#7c3aed',
    'ocr': '#ea580c', 'metadata': '#7c3aed', 'flatten': '#475569',
    'repair': '#f59e0b', 'bookmark': '#dc2626', 'hyperlinks': '#2563eb',
    'ai-summarize': '#8b5cf6', 'ai-translate': '#0891b2',
};

interface EditorToolsPanelProps {
    className?: string;
}

export function EditorToolsPanel({ className = '' }: EditorToolsPanelProps) {
    const { state, setActiveTool } = useApp();
    const { activeDocument, activeTool } = state;
    
    const [isExpanded, setIsExpanded] = useState(true);
    const [activeCategory, setActiveCategory] = useState<ToolCategory | 'all'>('all');
    const [searchQuery, setSearchQuery] = useState('');

    // Filter tools
    const filteredTools = TOOLS.filter(tool => {
        const matchesCategory = activeCategory === 'all' || tool.category === activeCategory;
        const matchesSearch = searchQuery === '' ||
            tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            tool.description.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    const handleToolClick = (tool: Tool) => {
        const noDocRequired: ToolId[] = ['merge', 'image-to-pdf', 'ppt-to-pdf'];
        if (!noDocRequired.includes(tool.id) && !activeDocument) {
            // Tool will be activated, but App.tsx will show upload prompt
        }
        setActiveTool(tool.id);
    };

    const getToolColor = (toolId: string) => TOOL_COLORS[toolId] || '#dc2626';

    if (!isExpanded) {
        return (
            <div className={`editor-tools-panel collapsed ${className}`}>
                <button 
                    className="panel-toggle-btn"
                    onClick={() => setIsExpanded(true)}
                    title="Expand Tools Panel"
                >
                    <ChevronLeft size={18} />
                </button>
                <div className="collapsed-tools">
                    {CATEGORIES.slice(0, 5).map(cat => (
                        <button
                            key={cat.id}
                            className="collapsed-category-btn"
                            title={cat.name}
                            onClick={() => {
                                setIsExpanded(true);
                                setActiveCategory(cat.id);
                            }}
                        >
                            {cat.icon}
                        </button>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className={`editor-tools-panel expanded ${className}`}>
            {/* Panel Header */}
            <div className="panel-header">
                <h3 className="panel-title">PDF Tools</h3>
                <button 
                    className="panel-toggle-btn"
                    onClick={() => setIsExpanded(false)}
                    title="Collapse Panel"
                >
                    <ChevronRight size={18} />
                </button>
            </div>

            {/* Search Bar */}
            <div className="panel-search">
                <Search size={16} className="search-icon" />
                <input
                    type="text"
                    placeholder="Search tools..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="search-input"
                />
                {searchQuery && (
                    <button className="search-clear" onClick={() => setSearchQuery('')}>
                        <X size={14} />
                    </button>
                )}
            </div>

            {/* Category Filter */}
            <div className="panel-categories">
                <button
                    className={`category-pill ${activeCategory === 'all' ? 'active' : ''}`}
                    onClick={() => setActiveCategory('all')}
                >
                    All
                </button>
                {CATEGORIES.map(cat => (
                    <button
                        key={cat.id}
                        className={`category-pill ${activeCategory === cat.id ? 'active' : ''}`}
                        onClick={() => setActiveCategory(cat.id)}
                    >
                        {cat.name}
                    </button>
                ))}
            </div>

            {/* Tools Grid */}
            <div className="panel-tools">
                {filteredTools.map(tool => {
                    const isActive = activeTool === tool.id;
                    const color = getToolColor(tool.id);
                    return (
                        <button
                            key={tool.id}
                            className={`panel-tool ${isActive ? 'active' : ''}`}
                            onClick={() => handleToolClick(tool)}
                            title={tool.description}
                        >
                            <div 
                                className="tool-icon-wrapper"
                                style={{ backgroundColor: color }}
                            >
                                {getToolIcon(tool.icon, 18)}
                            </div>
                            <span className="tool-name">{tool.name}</span>
                        </button>
                    );
                })}
            </div>

            {/* Footer */}
            <div className="panel-footer">
                <span className="tool-count">{filteredTools.length} tools</span>
            </div>
        </div>
    );
}
