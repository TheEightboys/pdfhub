/**
 * Stamp Tool
 * Add predefined or custom stamps to PDF pages
 */

import { useState, useCallback } from 'react';
import { useApp, useToast } from '../../store/appStore';
import { Stamp, Download, Loader2, Check, X, AlertTriangle, Clock, FileText } from 'lucide-react';
import { PDFDocument, rgb, StandardFonts, degrees } from 'pdf-lib';
import { downloadPDF } from '../../utils/pdfHelpers';
import './Tools.css';


interface StampItem {
    id: string;
    type: 'predefined' | 'custom';
    text: string;
    color: string;
    x: number;
    y: number;
    size: number;
    rotation: number;
    page: number;
    customImage?: string;
}

const PREDEFINED_STAMPS = [
    { text: 'APPROVED', color: '#16a34a', icon: <Check size={16} /> },
    { text: 'REJECTED', color: '#dc2626', icon: <X size={16} /> },
    { text: 'DRAFT', color: '#6b7280', icon: <FileText size={16} /> },
    { text: 'CONFIDENTIAL', color: '#dc2626', icon: <AlertTriangle size={16} /> },
    { text: 'REVIEWED', color: '#2563eb', icon: <Check size={16} /> },
    { text: 'PENDING', color: '#f59e0b', icon: <Clock size={16} /> },
    { text: 'COPY', color: '#6b7280', icon: <FileText size={16} /> },
    { text: 'FINAL', color: '#16a34a', icon: <Check size={16} /> },
];

const STAMP_COLORS = [
    { name: 'Red', value: '#dc2626', rgb: [0.86, 0.15, 0.15] },
    { name: 'Green', value: '#16a34a', rgb: [0.09, 0.64, 0.29] },
    { name: 'Blue', value: '#2563eb', rgb: [0.15, 0.39, 0.92] },
    { name: 'Orange', value: '#f59e0b', rgb: [0.96, 0.62, 0.04] },
    { name: 'Gray', value: '#6b7280', rgb: [0.42, 0.45, 0.5] },
    { name: 'Purple', value: '#9333ea', rgb: [0.58, 0.2, 0.92] },
];

export function StampTool() {
    const { state } = useApp();
    const { addToast } = useToast();
    const { activeDocument, selectedPages } = state;

    const [stamps, setStamps] = useState<StampItem[]>([]);
    const [selectedStamp, setSelectedStamp] = useState(PREDEFINED_STAMPS[0]);
    const [customText, setCustomText] = useState('');
    const [stampColor, setStampColor] = useState(STAMP_COLORS[0]);
    const [stampSize, setStampSize] = useState(24);
    const [stampRotation, setStampRotation] = useState(-15);
    const [applyTo, setApplyTo] = useState<'selected' | 'all'>('selected');
    const [isProcessing, setIsProcessing] = useState(false);

    const addStamp = useCallback((predefined: boolean = true) => {
        const text = predefined ? selectedStamp.text : (customText || 'STAMP');
        const color = predefined ? selectedStamp.color : stampColor.value;

        const newStamp: StampItem = {
            id: crypto.randomUUID(),
            type: predefined ? 'predefined' : 'custom',
            text,
            color,
            x: 50,
            y: 50,
            size: stampSize,
            rotation: stampRotation,
            page: selectedPages[0] || 1,
        };
        setStamps(prev => [...prev, newStamp]);
    }, [selectedStamp, customText, stampColor, stampSize, stampRotation, selectedPages]);

    const removeStamp = useCallback((id: string) => {
        setStamps(prev => prev.filter(s => s.id !== id));
    }, []);

    const handleApply = async () => {
        if (!activeDocument || stamps.length === 0) {
            addToast({
                type: 'warning',
                title: 'No stamps',
                message: 'Please add at least one stamp.',
            });
            return;
        }

        setIsProcessing(true);

        try {
            const pdfDoc = await PDFDocument.load(activeDocument.arrayBuffer.slice(0));
            const pages = pdfDoc.getPages();
            const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

            let targetPages: number[] = [];
            if (applyTo === 'all') {
                targetPages = pages.map((_, i) => i);
            } else {
                targetPages = selectedPages.length > 0 ? selectedPages.map(p => p - 1) : [0];
            }

            for (const stamp of stamps) {
                const colorObj = STAMP_COLORS.find(c => c.value === stamp.color) || STAMP_COLORS[0];

                for (const pageIndex of targetPages) {
                    if (pageIndex >= 0 && pageIndex < pages.length) {
                        const page = pages[pageIndex];
                        const { width: pageWidth, height: pageHeight } = page.getSize();

                        const x = (stamp.x / 100) * pageWidth;
                        const y = pageHeight - (stamp.y / 100) * pageHeight;

                        // Draw stamp border
                        const textWidth = font.widthOfTextAtSize(stamp.text, stamp.size);
                        const padding = stamp.size * 0.4;

                        page.drawRectangle({
                            x: x - padding,
                            y: y - stamp.size * 0.3,
                            width: textWidth + padding * 2,
                            height: stamp.size + padding,
                            borderColor: rgb(colorObj.rgb[0], colorObj.rgb[1], colorObj.rgb[2]),
                            borderWidth: 2,
                            rotate: degrees(stamp.rotation),
                        });

                        // Draw stamp text
                        page.drawText(stamp.text, {
                            x,
                            y,
                            size: stamp.size,
                            font,
                            color: rgb(colorObj.rgb[0], colorObj.rgb[1], colorObj.rgb[2]),
                            rotate: degrees(stamp.rotation),
                        });
                    }
                }
            }

            const pdfBytes = await pdfDoc.save();
            const fileName = activeDocument.name.replace('.pdf', '_stamped.pdf');
            downloadPDF(pdfBytes, fileName);

            addToast({
                type: 'success',
                title: 'Stamps applied',
                message: `Saved as ${fileName}`,
            });
        } catch (error) {
            console.error('Error applying stamps:', error);
            addToast({
                type: 'error',
                title: 'Error',
                message: 'Failed to apply stamps.',
            });
        } finally {
            setIsProcessing(false);
        }
    };

    if (!activeDocument) {
        return (
            <div className="tool-panel">
                <div className="tool-empty">
                    <Stamp size={48} />
                    <p>Open a PDF to add stamps</p>
                </div>
            </div>
        );
    }

    return (
        <div className="tool-panel">
            <div className="tool-header">
                <h2 className="tool-title">Stamps</h2>
                <p className="tool-description">Add stamps like Approved, Draft, Confidential</p>
            </div>

            <div className="tool-content">
                {/* Predefined Stamps */}
                <div className="stamps-section">
                    <h4>Predefined Stamps</h4>
                    <div className="stamps-grid">
                        {PREDEFINED_STAMPS.map((stamp, index) => (
                            <button
                                key={index}
                                className={`stamp-btn ${selectedStamp.text === stamp.text ? 'active' : ''}`}
                                style={{ borderColor: stamp.color, color: stamp.color }}
                                onClick={() => setSelectedStamp(stamp)}
                            >
                                {stamp.icon}
                                <span>{stamp.text}</span>
                            </button>
                        ))}
                    </div>
                    <button
                        className="btn btn-secondary w-full"
                        onClick={() => addStamp(true)}
                    >
                        Add "{selectedStamp.text}" Stamp
                    </button>
                </div>

                {/* Custom Stamp */}
                <div className="custom-stamp-section">
                    <h4>Custom Stamp</h4>
                    <div className="custom-stamp-input">
                        <input
                            type="text"
                            value={customText}
                            onChange={(e) => setCustomText(e.target.value.toUpperCase())}
                            placeholder="Enter custom text..."
                            maxLength={20}
                        />
                    </div>
                    <div className="color-grid">
                        {STAMP_COLORS.map(color => (
                            <button
                                key={color.value}
                                className={`color-btn ${stampColor.value === color.value ? 'active' : ''}`}
                                style={{ backgroundColor: color.value }}
                                onClick={() => setStampColor(color)}
                                title={color.name}
                            />
                        ))}
                    </div>
                    <button
                        className="btn btn-secondary w-full"
                        onClick={() => addStamp(false)}
                        disabled={!customText.trim()}
                    >
                        Add Custom Stamp
                    </button>
                </div>

                {/* Stamp Settings */}
                <div className="stamp-settings">
                    <h4>Settings</h4>
                    <div className="control-row">
                        <label>Size</label>
                        <input
                            type="range"
                            min="12"
                            max="48"
                            value={stampSize}
                            onChange={(e) => setStampSize(Number(e.target.value))}
                        />
                        <span>{stampSize}pt</span>
                    </div>
                    <div className="control-row">
                        <label>Rotation</label>
                        <input
                            type="range"
                            min="-45"
                            max="45"
                            value={stampRotation}
                            onChange={(e) => setStampRotation(Number(e.target.value))}
                        />
                        <span>{stampRotation}°</span>
                    </div>
                </div>

                {/* Apply To */}
                <div className="apply-to-section">
                    <h4>Apply To</h4>
                    <div className="radio-group">
                        <label className="radio-label">
                            <input
                                type="radio"
                                checked={applyTo === 'selected'}
                                onChange={() => setApplyTo('selected')}
                            />
                            <span>Selected Pages ({selectedPages.length || 1})</span>
                        </label>
                        <label className="radio-label">
                            <input
                                type="radio"
                                checked={applyTo === 'all'}
                                onChange={() => setApplyTo('all')}
                            />
                            <span>All Pages</span>
                        </label>
                    </div>
                </div>

                {/* Stamps List */}
                {stamps.length > 0 && (
                    <div className="stamps-list">
                        <h4>Added Stamps ({stamps.length})</h4>
                        {stamps.map((stamp) => (
                            <div key={stamp.id} className="stamp-item" style={{ color: stamp.color }}>
                                <Stamp size={16} />
                                <span className="stamp-text">{stamp.text}</span>
                                <button
                                    className="btn-icon-sm"
                                    onClick={() => removeStamp(stamp.id)}
                                >
                                    <X size={14} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="tool-footer">
                <div className="tool-summary">
                    <Stamp size={16} />
                    <span>{stamps.length} stamp(s)</span>
                </div>
                <button
                    className="btn btn-primary"
                    onClick={handleApply}
                    disabled={isProcessing || stamps.length === 0}
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
