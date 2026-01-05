/**
 * QuickAccessBar Component
 * Floating bar with frequently used tools for quick access
 */

import React from 'react';
import { useApp, useToast } from '../../store/appStore';
import { ToolId } from '../../types';
import {
    RotateCcw, Trash2, Highlighter, PenTool, Type, Minimize2, Download,
} from 'lucide-react';
import { downloadPDF, getPDFBytes } from '../../utils/pdfHelpers';
import './QuickAccessBar.css';

interface QuickTool {
    id: ToolId | 'download';
    name: string;
    icon: React.ReactNode;
    requiresDoc?: boolean;
    isAction?: boolean;
}

const QUICK_TOOLS: QuickTool[] = [
    { id: 'rotate', name: 'Rotate', icon: <RotateCcw size={16} />, requiresDoc: true },
    { id: 'delete', name: 'Delete', icon: <Trash2 size={16} />, requiresDoc: true },
    { id: 'highlight', name: 'Highlight', icon: <Highlighter size={16} />, requiresDoc: true },
    { id: 'signature', name: 'Sign', icon: <PenTool size={16} />, requiresDoc: true },
    { id: 'add-text', name: 'Text', icon: <Type size={16} />, requiresDoc: true },
    { id: 'compress', name: 'Compress', icon: <Minimize2 size={16} />, requiresDoc: true },
    { id: 'download', name: 'Save', icon: <Download size={16} />, requiresDoc: true, isAction: true },
];

export function QuickAccessBar() {
    const { state, setActiveTool } = useApp();
    const { addToast } = useToast();
    const { activeDocument, activeTool } = state;

    const handleToolClick = async (tool: QuickTool) => {
        if (tool.requiresDoc && !activeDocument) {
            addToast({
                type: 'warning',
                title: 'No document',
                message: 'Please open a PDF file first.',
            });
            return;
        }

        if (tool.id === 'download') {
            // Handle download action
            try {
                const bytes = await getPDFBytes(activeDocument!.arrayBuffer.slice(0));
                const newName = activeDocument!.name.replace('.pdf', '_edited.pdf');
                downloadPDF(bytes, newName);
                addToast({
                    type: 'success',
                    title: 'Downloaded',
                    message: `Saved as ${newName}`,
                });
            } catch (error) {
                addToast({
                    type: 'error',
                    title: 'Download failed',
                    message: 'Could not download the PDF.',
                });
            }
            return;
        }

        setActiveTool(tool.id as ToolId);
    };

    // Only show when a document is loaded
    if (!activeDocument) return null;

    return (
        <div className="quick-access-bar">
            <div className="quick-access-label">Quick Actions</div>
            <div className="quick-access-tools">
                {QUICK_TOOLS.map(tool => {
                    const isActive = activeTool === tool.id;
                    return (
                        <button
                            key={tool.id}
                            className={`quick-tool-btn ${isActive ? 'active' : ''}`}
                            onClick={() => handleToolClick(tool)}
                            title={tool.name}
                        >
                            {tool.icon}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
