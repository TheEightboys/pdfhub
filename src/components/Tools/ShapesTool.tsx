/**
 * Shapes Tool
 * Add geometric shapes to PDF pages
 */

import React, { useState, useCallback } from 'react';
import { useApp, useToast } from '../../store/appStore';
import { Shapes, Download, Loader2, Trash2, Plus, Square, Circle, ArrowRight, Minus } from 'lucide-react';
import { PDFDocument, rgb } from 'pdf-lib';
import { downloadPDF } from '../../utils/pdfHelpers';
import './Tools.css';

type ShapeType = 'rectangle' | 'circle' | 'line' | 'arrow';

interface ShapeItem {
    id: string;
    type: ShapeType;
    x: number;
    y: number;
    width: number;
    height: number;
    strokeColor: string;
    fillColor: string | null;
    strokeWidth: number;
    page: number;
}

const SHAPE_COLORS = [
    { name: 'Black', value: '#000000', rgb: [0, 0, 0] },
    { name: 'Red', value: '#dc2626', rgb: [0.86, 0.15, 0.15] },
    { name: 'Blue', value: '#2563eb', rgb: [0.15, 0.39, 0.92] },
    { name: 'Green', value: '#16a34a', rgb: [0.09, 0.64, 0.29] },
    { name: 'Orange', value: '#ea580c', rgb: [0.92, 0.34, 0.05] },
    { name: 'Purple', value: '#9333ea', rgb: [0.58, 0.2, 0.92] },
    { name: 'None', value: 'transparent', rgb: [0, 0, 0] },
];

const SHAPE_TYPES: { type: ShapeType; name: string; icon: React.ReactNode }[] = [
    { type: 'rectangle', name: 'Rectangle', icon: <Square size={20} /> },
    { type: 'circle', name: 'Circle', icon: <Circle size={20} /> },
    { type: 'line', name: 'Line', icon: <Minus size={20} /> },
    { type: 'arrow', name: 'Arrow', icon: <ArrowRight size={20} /> },
];

export function ShapesTool() {
    const { state } = useApp();
    const { addToast } = useToast();
    const { activeDocument, selectedPages } = state;

    const [shapes, setShapes] = useState<ShapeItem[]>([]);
    const [selectedShapeType, setSelectedShapeType] = useState<ShapeType>('rectangle');
    const [strokeColor, setStrokeColor] = useState(SHAPE_COLORS[0]);
    const [fillColor, setFillColor] = useState<typeof SHAPE_COLORS[0] | null>(SHAPE_COLORS[6]); // None
    const [strokeWidth, setStrokeWidth] = useState(2);
    const [isProcessing, setIsProcessing] = useState(false);

    const addShape = useCallback(() => {
        const newShape: ShapeItem = {
            id: crypto.randomUUID(),
            type: selectedShapeType,
            x: 20,
            y: 20,
            width: 20,
            height: selectedShapeType === 'line' || selectedShapeType === 'arrow' ? 0 : 15,
            strokeColor: strokeColor.value,
            fillColor: fillColor?.value === 'transparent' ? null : fillColor?.value || null,
            strokeWidth: strokeWidth,
            page: selectedPages[0] || 1,
        };
        setShapes(prev => [...prev, newShape]);
    }, [selectedShapeType, strokeColor, fillColor, strokeWidth, selectedPages]);

    const removeShape = useCallback((id: string) => {
        setShapes(prev => prev.filter(s => s.id !== id));
    }, []);

    const updateShape = useCallback((id: string, updates: Partial<ShapeItem>) => {
        setShapes(prev => prev.map(s =>
            s.id === id ? { ...s, ...updates } : s
        ));
    }, []);

    const handleApply = async () => {
        if (!activeDocument || shapes.length === 0) {
            addToast({
                type: 'warning',
                title: 'No shapes',
                message: 'Please add at least one shape.',
            });
            return;
        }

        setIsProcessing(true);

        try {
            const pdfDoc = await PDFDocument.load(activeDocument.arrayBuffer.slice(0));
            const pages = pdfDoc.getPages();

            for (const shape of shapes) {
                const pageIndex = shape.page - 1;
                if (pageIndex >= 0 && pageIndex < pages.length) {
                    const page = pages[pageIndex];
                    const { width: pageWidth, height: pageHeight } = page.getSize();

                    const x = (shape.x / 100) * pageWidth;
                    const y = pageHeight - (shape.y / 100) * pageHeight;
                    const w = (shape.width / 100) * pageWidth;
                    const h = (shape.height / 100) * pageHeight;

                    const strokeColorObj = SHAPE_COLORS.find(c => c.value === shape.strokeColor) || SHAPE_COLORS[0];
                    const fillColorObj = shape.fillColor ? SHAPE_COLORS.find(c => c.value === shape.fillColor) : null;

                    if (shape.type === 'rectangle') {
                        page.drawRectangle({
                            x,
                            y: y - h,
                            width: w,
                            height: h,
                            borderColor: rgb(strokeColorObj.rgb[0], strokeColorObj.rgb[1], strokeColorObj.rgb[2]),
                            borderWidth: shape.strokeWidth,
                            color: fillColorObj ? rgb(fillColorObj.rgb[0], fillColorObj.rgb[1], fillColorObj.rgb[2]) : undefined,
                        });
                    } else if (shape.type === 'circle') {
                        page.drawEllipse({
                            x: x + w / 2,
                            y: y - h / 2,
                            xScale: w / 2,
                            yScale: h / 2,
                            borderColor: rgb(strokeColorObj.rgb[0], strokeColorObj.rgb[1], strokeColorObj.rgb[2]),
                            borderWidth: shape.strokeWidth,
                            color: fillColorObj ? rgb(fillColorObj.rgb[0], fillColorObj.rgb[1], fillColorObj.rgb[2]) : undefined,
                        });
                    } else if (shape.type === 'line' || shape.type === 'arrow') {
                        page.drawLine({
                            start: { x, y },
                            end: { x: x + w, y },
                            thickness: shape.strokeWidth,
                            color: rgb(strokeColorObj.rgb[0], strokeColorObj.rgb[1], strokeColorObj.rgb[2]),
                        });

                        // Arrow head
                        if (shape.type === 'arrow') {
                            const arrowSize = shape.strokeWidth * 3;
                            page.drawLine({
                                start: { x: x + w, y },
                                end: { x: x + w - arrowSize, y: y + arrowSize },
                                thickness: shape.strokeWidth,
                                color: rgb(strokeColorObj.rgb[0], strokeColorObj.rgb[1], strokeColorObj.rgb[2]),
                            });
                            page.drawLine({
                                start: { x: x + w, y },
                                end: { x: x + w - arrowSize, y: y - arrowSize },
                                thickness: shape.strokeWidth,
                                color: rgb(strokeColorObj.rgb[0], strokeColorObj.rgb[1], strokeColorObj.rgb[2]),
                            });
                        }
                    }
                }
            }

            const pdfBytes = await pdfDoc.save();
            const fileName = activeDocument.name.replace('.pdf', '_shapes.pdf');
            downloadPDF(pdfBytes, fileName);

            addToast({
                type: 'success',
                title: 'Shapes added',
                message: `Saved as ${fileName}`,
            });
        } catch (error) {
            console.error('Error adding shapes:', error);
            addToast({
                type: 'error',
                title: 'Error',
                message: 'Failed to add shapes.',
            });
        } finally {
            setIsProcessing(false);
        }
    };

    if (!activeDocument) {
        return (
            <div className="tool-panel">
                <div className="tool-empty">
                    <Shapes size={48} />
                    <p>Open a PDF to add shapes</p>
                </div>
            </div>
        );
    }

    return (
        <div className="tool-panel">
            <div className="tool-header">
                <h2 className="tool-title">Shapes</h2>
                <p className="tool-description">Add geometric shapes to your PDF</p>
            </div>

            <div className="tool-content">
                {/* Shape Type */}
                <div className="shape-type-section">
                    <h4>Shape Type</h4>
                    <div className="shape-type-grid">
                        {SHAPE_TYPES.map(st => (
                            <button
                                key={st.type}
                                className={`shape-type-btn ${selectedShapeType === st.type ? 'active' : ''}`}
                                onClick={() => setSelectedShapeType(st.type)}
                            >
                                {st.icon}
                                <span>{st.name}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Stroke Color */}
                <div className="color-section">
                    <h4>Stroke Color</h4>
                    <div className="color-grid">
                        {SHAPE_COLORS.filter(c => c.value !== 'transparent').map(color => (
                            <button
                                key={color.value}
                                className={`color-btn ${strokeColor.value === color.value ? 'active' : ''}`}
                                style={{ backgroundColor: color.value }}
                                onClick={() => setStrokeColor(color)}
                                title={color.name}
                            />
                        ))}
                    </div>
                </div>

                {/* Fill Color */}
                {(selectedShapeType === 'rectangle' || selectedShapeType === 'circle') && (
                    <div className="color-section">
                        <h4>Fill Color</h4>
                        <div className="color-grid">
                            {SHAPE_COLORS.map(color => (
                                <button
                                    key={color.value}
                                    className={`color-btn ${fillColor?.value === color.value ? 'active' : ''} ${color.value === 'transparent' ? 'no-fill' : ''}`}
                                    style={{ backgroundColor: color.value === 'transparent' ? '#f3f4f6' : color.value }}
                                    onClick={() => setFillColor(color)}
                                    title={color.name}
                                >
                                    {color.value === 'transparent' && <span className="no-fill-x">×</span>}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Stroke Width */}
                <div className="control-section">
                    <h4>Stroke Width</h4>
                    <div className="control-row">
                        <input
                            type="range"
                            min="1"
                            max="10"
                            value={strokeWidth}
                            onChange={(e) => setStrokeWidth(Number(e.target.value))}
                        />
                        <span>{strokeWidth}px</span>
                    </div>
                </div>

                {/* Add Shape Button */}
                <button className="btn btn-secondary w-full" onClick={addShape}>
                    <Plus size={18} />
                    <span>Add Shape</span>
                </button>

                {/* Shapes List */}
                {shapes.length > 0 && (
                    <div className="shapes-list">
                        <h4>Shapes ({shapes.length})</h4>
                        {shapes.map((shape, index) => (
                            <div key={shape.id} className="shape-item">
                                <div className="shape-icon">
                                    {SHAPE_TYPES.find(st => st.type === shape.type)?.icon}
                                </div>
                                <div className="shape-info">
                                    <span>{SHAPE_TYPES.find(st => st.type === shape.type)?.name} #{index + 1}</span>
                                    <span className="shape-page">Page {shape.page}</span>
                                </div>
                                <div className="shape-controls">
                                    <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        value={shape.x}
                                        onChange={(e) => updateShape(shape.id, { x: Number(e.target.value) })}
                                        title="X Position (%)"
                                        placeholder="X"
                                    />
                                    <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        value={shape.y}
                                        onChange={(e) => updateShape(shape.id, { y: Number(e.target.value) })}
                                        title="Y Position (%)"
                                        placeholder="Y"
                                    />
                                    <input
                                        type="number"
                                        min="1"
                                        max="100"
                                        value={shape.width}
                                        onChange={(e) => updateShape(shape.id, { width: Number(e.target.value) })}
                                        title="Width (%)"
                                        placeholder="W"
                                    />
                                </div>
                                <button
                                    className="btn-icon-sm"
                                    onClick={() => removeShape(shape.id)}
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="tool-footer">
                <div className="tool-summary">
                    <Shapes size={16} />
                    <span>{shapes.length} shape(s)</span>
                </div>
                <button
                    className="btn btn-primary"
                    onClick={handleApply}
                    disabled={isProcessing || shapes.length === 0}
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
