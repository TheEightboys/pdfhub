/**
 * Sticky Notes Tool
 * Add notes to PDF pages
 */

import { useState, useCallback } from 'react';
import { useApp, useToast } from '../../store/appStore';
import { StickyNote, Download, Loader2, Trash2, Plus, Edit3 } from 'lucide-react';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { downloadPDF } from '../../utils/pdfHelpers';
import './Tools.css';

interface NoteItem {
    id: string;
    text: string;
    color: string;
    x: number;
    y: number;
    page: number;
}

const NOTE_COLORS = [
    { name: 'Yellow', value: '#fef08a', rgb: [1, 0.94, 0.54], textRgb: [0.4, 0.35, 0] },
    { name: 'Pink', value: '#fecdd3', rgb: [1, 0.8, 0.83], textRgb: [0.5, 0.1, 0.2] },
    { name: 'Green', value: '#bbf7d0', rgb: [0.73, 0.97, 0.82], textRgb: [0.1, 0.4, 0.2] },
    { name: 'Blue', value: '#bfdbfe', rgb: [0.75, 0.86, 1], textRgb: [0.1, 0.2, 0.5] },
    { name: 'Orange', value: '#fed7aa', rgb: [1, 0.84, 0.67], textRgb: [0.5, 0.25, 0] },
    { name: 'Purple', value: '#ddd6fe', rgb: [0.87, 0.84, 1], textRgb: [0.3, 0.1, 0.5] },
];

export function StickyNotesTool() {
    const { state } = useApp();
    const { addToast } = useToast();
    const { activeDocument, selectedPages } = state;

    const [notes, setNotes] = useState<NoteItem[]>([]);
    const [selectedColor, setSelectedColor] = useState(NOTE_COLORS[0]);
    const [noteText, setNoteText] = useState('');
    const [editingNote, setEditingNote] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    const addNote = useCallback(() => {
        if (!noteText.trim()) {
            addToast({
                type: 'warning',
                title: 'Empty note',
                message: 'Please enter some text for the note.',
            });
            return;
        }

        const newNote: NoteItem = {
            id: crypto.randomUUID(),
            text: noteText,
            color: selectedColor.value,
            x: 70 + Math.random() * 20,
            y: 10 + Math.random() * 20,
            page: selectedPages[0] || 1,
        };
        setNotes(prev => [...prev, newNote]);
        setNoteText('');
    }, [noteText, selectedColor, selectedPages, addToast]);

    const removeNote = useCallback((id: string) => {
        setNotes(prev => prev.filter(n => n.id !== id));
    }, []);

    const updateNote = useCallback((id: string, updates: Partial<NoteItem>) => {
        setNotes(prev => prev.map(n =>
            n.id === id ? { ...n, ...updates } : n
        ));
    }, []);

    const handleApply = async () => {
        if (!activeDocument || notes.length === 0) {
            addToast({
                type: 'warning',
                title: 'No notes',
                message: 'Please add at least one note.',
            });
            return;
        }

        setIsProcessing(true);

        try {
            const pdfDoc = await PDFDocument.load(activeDocument.arrayBuffer.slice(0));
            const pages = pdfDoc.getPages();
            const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

            for (const note of notes) {
                const pageIndex = note.page - 1;
                if (pageIndex >= 0 && pageIndex < pages.length) {
                    const page = pages[pageIndex];
                    const { width: pageWidth, height: pageHeight } = page.getSize();

                    const x = (note.x / 100) * pageWidth;
                    const y = pageHeight - (note.y / 100) * pageHeight;

                    const colorObj = NOTE_COLORS.find(c => c.value === note.color) || NOTE_COLORS[0];

                    // Note dimensions
                    const noteWidth = 120;
                    const fontSize = 10;
                    const padding = 8;
                    const lineHeight = fontSize * 1.3;

                    // Split text into lines
                    const words = note.text.split(' ');
                    const lines: string[] = [];
                    let currentLine = '';

                    for (const word of words) {
                        const testLine = currentLine ? `${currentLine} ${word}` : word;
                        const testWidth = font.widthOfTextAtSize(testLine, fontSize);
                        if (testWidth < noteWidth - padding * 2) {
                            currentLine = testLine;
                        } else {
                            if (currentLine) lines.push(currentLine);
                            currentLine = word;
                        }
                    }
                    if (currentLine) lines.push(currentLine);

                    const noteHeight = lines.length * lineHeight + padding * 2;

                    // Draw note background
                    page.drawRectangle({
                        x,
                        y: y - noteHeight,
                        width: noteWidth,
                        height: noteHeight,
                        color: rgb(colorObj.rgb[0], colorObj.rgb[1], colorObj.rgb[2]),
                        borderColor: rgb(colorObj.textRgb[0], colorObj.textRgb[1], colorObj.textRgb[2]),
                        borderWidth: 0.5,
                    });

                    // Draw text
                    lines.forEach((line, i) => {
                        page.drawText(line, {
                            x: x + padding,
                            y: y - padding - (i + 1) * lineHeight + fontSize * 0.3,
                            size: fontSize,
                            font,
                            color: rgb(colorObj.textRgb[0], colorObj.textRgb[1], colorObj.textRgb[2]),
                        });
                    });
                }
            }

            const pdfBytes = await pdfDoc.save();
            const fileName = activeDocument.name.replace('.pdf', '_notes.pdf');
            downloadPDF(pdfBytes, fileName);

            addToast({
                type: 'success',
                title: 'Notes added',
                message: `Saved as ${fileName}`,
            });
        } catch (error) {
            console.error('Error adding notes:', error);
            addToast({
                type: 'error',
                title: 'Error',
                message: 'Failed to add notes.',
            });
        } finally {
            setIsProcessing(false);
        }
    };

    if (!activeDocument) {
        return (
            <div className="tool-panel">
                <div className="tool-empty">
                    <StickyNote size={48} />
                    <p>Open a PDF to add sticky notes</p>
                </div>
            </div>
        );
    }

    return (
        <div className="tool-panel">
            <div className="tool-header">
                <h2 className="tool-title">Sticky Notes</h2>
                <p className="tool-description">Add notes to your PDF pages</p>
            </div>

            <div className="tool-content">
                {/* Note Color */}
                <div className="color-section">
                    <h4>Note Color</h4>
                    <div className="color-grid">
                        {NOTE_COLORS.map(color => (
                            <button
                                key={color.value}
                                className={`color-btn ${selectedColor.value === color.value ? 'active' : ''}`}
                                style={{ backgroundColor: color.value }}
                                onClick={() => setSelectedColor(color)}
                                title={color.name}
                            />
                        ))}
                    </div>
                </div>

                {/* Note Text */}
                <div className="note-input-section">
                    <h4>Note Text</h4>
                    <textarea
                        value={noteText}
                        onChange={(e) => setNoteText(e.target.value)}
                        placeholder="Enter your note..."
                        rows={3}
                        maxLength={200}
                    />
                    <div className="note-char-count">{noteText.length}/200</div>
                </div>

                {/* Add Note Button */}
                <button
                    className="btn btn-secondary w-full"
                    onClick={addNote}
                    disabled={!noteText.trim()}
                >
                    <Plus size={18} />
                    <span>Add Note</span>
                </button>

                {/* Notes List */}
                {notes.length > 0 && (
                    <div className="notes-list">
                        <h4>Notes ({notes.length})</h4>
                        {notes.map((note) => (
                            <div
                                key={note.id}
                                className="note-item"
                                style={{ backgroundColor: note.color }}
                            >
                                <div className="note-content">
                                    {editingNote === note.id ? (
                                        <textarea
                                            value={note.text}
                                            onChange={(e) => updateNote(note.id, { text: e.target.value })}
                                            onBlur={() => setEditingNote(null)}
                                            autoFocus
                                            rows={2}
                                        />
                                    ) : (
                                        <p onClick={() => setEditingNote(note.id)}>{note.text}</p>
                                    )}
                                    <span className="note-page">Page {note.page}</span>
                                </div>
                                <div className="note-actions">
                                    <button
                                        className="btn-icon-sm"
                                        onClick={() => setEditingNote(note.id)}
                                    >
                                        <Edit3 size={14} />
                                    </button>
                                    <button
                                        className="btn-icon-sm"
                                        onClick={() => removeNote(note.id)}
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="tool-footer">
                <div className="tool-summary">
                    <StickyNote size={16} />
                    <span>{notes.length} note(s)</span>
                </div>
                <button
                    className="btn btn-primary"
                    onClick={handleApply}
                    disabled={isProcessing || notes.length === 0}
                >
                    {isProcessing ? (
                        <>
                            <Loader2 size={18} className="animate-spin" />
                            <span>Processing...</span>
                        </>
                    ) : (
                        <>
                            <Download size={18} />
                            <span>Apply & Download</span>
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}
