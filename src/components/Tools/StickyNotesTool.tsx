/**
 * StickyNotesTool.tsx
 * Improved UI/UX with compact horizontal design
 */

import { useState } from 'react';
import { useApp } from '../../store/appStore';
import { StickyNote, Trash2, Edit3, CheckCircle2, Maximize2 } from 'lucide-react';
import './Tools.css';

const NOTE_COLORS = [
    { name: 'Yellow', value: '#fef08a' },
    { name: 'Pink', value: '#fecdd3' },
    { name: 'Green', value: '#bbf7d0' },
    { name: 'Blue', value: '#bfdbfe' },
    { name: 'Orange', value: '#fed7aa' },
    { name: 'Purple', value: '#ddd6fe' },
];

const NOTE_SIZES = [
    { label: 'S', value: 'small', iconSize: 24 },
    { label: 'M', value: 'medium', iconSize: 32 },
    { label: 'L', value: 'large', iconSize: 40 },
];

export function StickyNotesTool() {
    const { state, setToolOptions, deleteAnnotation, updateAnnotation, setActiveTool } = useApp();
    const { activeDocument, toolOptions } = state;

    const [noteSize, setNoteSize] = useState(NOTE_SIZES[1]); // Medium default
    const [editingNote, setEditingNote] = useState<string | null>(null);
    const [editText, setEditText] = useState('');

    // Use global options
    const selectedColor = NOTE_COLORS.find(c => c.value === toolOptions.noteColor) || NOTE_COLORS[0];

    // Active notes on current page(s)
    const activeNotes = activeDocument?.pages.flatMap(p => p.annotations).filter(a => a.type === 'note') || [];

    const handleColorChange = (color: typeof NOTE_COLORS[0]) => {
        setToolOptions({ noteColor: color.value });
    };

    const handleSizeChange = (size: typeof NOTE_SIZES[0]) => {
        setNoteSize(size);
        setToolOptions({ noteSize: size.value as 'small' | 'medium' | 'large' });
    };

    const removeNote = (id: string) => {
        deleteAnnotation(id);
    };

    const startEditing = (note: any) => {
        setEditingNote(note.id);
        setEditText(note.content || '');
    };

    const saveEdit = (id: string) => {
        updateAnnotation(id, { content: editText } as any);
        setEditingNote(null);
        setEditText('');
    };

    return (
        <div className="tool-panel">
            <div className="tool-header">
                <h2 className="tool-title">
                    <StickyNote size={20} />
                    Sticky Notes
                </h2>
                <p className="tool-description">Click on the PDF to place a note</p>
            </div>

            <div className="tool-content">
                {/* Note Color - Compact Horizontal Layout */}
                <div className="tool-section">
                    <h4 className="section-title-inline">Color</h4>
                    <div className="color-row">
                        {NOTE_COLORS.map(color => (
                            <button
                                key={color.value}
                                className={`color-btn-sm ${selectedColor.value === color.value ? 'active' : ''}`}
                                style={{ backgroundColor: color.value }}
                                onClick={() => handleColorChange(color)}
                                title={color.name}
                            />
                        ))}
                    </div>
                </div>

                {/* Note Size - Compact */}
                <div className="tool-section">
                    <h4 className="section-title-inline">
                        <Maximize2 size={12} />
                        Size
                    </h4>
                    <div className="size-row">
                        {NOTE_SIZES.map(size => (
                            <button
                                key={size.value}
                                className={`size-btn-sm ${noteSize.value === size.value ? 'active' : ''}`}
                                onClick={() => handleSizeChange(size)}
                            >
                                {size.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Ready Banner - Compact */}
                <div className="tool-section">
                    <div className="info-banner-compact" style={{ backgroundColor: selectedColor.value }}>
                        <StickyNote size={20} fill={selectedColor.value} />
                        <span>Click on PDF to add note</span>
                    </div>
                </div>

                {/* Notes List - Compact Horizontal Cards */}
                {activeNotes.length > 0 && (
                    <div className="tool-section">
                        <h4 className="section-title-inline">Notes ({activeNotes.length})</h4>
                        <div className="notes-compact-list">
                            {activeNotes.map((note: any) => (
                                <div
                                    key={note.id}
                                    className="note-card-compact"
                                    style={{ borderLeftColor: note.color || '#fef08a' }}
                                >
                                    {editingNote === note.id ? (
                                        <div className="note-edit-inline">
                                            <input
                                                type="text"
                                                value={editText}
                                                onChange={(e) => setEditText(e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && saveEdit(note.id)}
                                                autoFocus
                                                placeholder="Enter note..."
                                            />
                                            <button
                                                className="btn-icon-xs"
                                                onClick={() => saveEdit(note.id)}
                                            >
                                                <CheckCircle2 size={14} />
                                            </button>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="note-info">
                                                <span className="note-text-compact">
                                                    {note.content || <em>Empty</em>}
                                                </span>
                                                <span className="note-page-badge">P{note.pageNumber}</span>
                                            </div>
                                            <div className="note-actions-compact">
                                                <button
                                                    className="btn-icon-xs"
                                                    onClick={() => startEditing(note)}
                                                    title="Edit"
                                                >
                                                    <Edit3 size={12} />
                                                </button>
                                                <button
                                                    className="btn-icon-xs danger"
                                                    onClick={() => removeNote(note.id)}
                                                    title="Delete"
                                                >
                                                    <Trash2 size={12} />
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <div className="tool-footer">
                <div className="tool-summary">
                    <StickyNote size={16} />
                    <span>{activeNotes.length} note(s)</span>
                </div>
                <button
                    className="btn btn-primary"
                    onClick={() => setActiveTool(null)}
                >
                    <CheckCircle2 size={18} />
                    <span>Done</span>
                </button>
            </div>
        </div>
    );
}
