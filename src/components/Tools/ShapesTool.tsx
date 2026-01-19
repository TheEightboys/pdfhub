/**
 * Shapes Tool
 * Add geometric shapes to PDF pages via canvas interaction
 */

import React, { useState, useEffect } from 'react';
import { useApp } from '../../store/appStore';
import { Shapes, Square, Circle, ArrowRight, Minus } from 'lucide-react';
import './Tools.css';

type ShapeType = 'rectangle' | 'circle' | 'line' | 'arrow';

const SHAPE_COLORS = [
    { name: 'Black', value: '#000000' },
    { name: 'Red', value: '#dc2626' },
    { name: 'Blue', value: '#2563eb' },
    { name: 'Green', value: '#16a34a' },
    { name: 'Orange', value: '#ea580c' },
    { name: 'Purple', value: '#9333ea' },
    { name: 'None', value: 'transparent' },
];

const SHAPE_TYPES: { type: ShapeType; name: string; icon: React.ReactNode }[] = [
    { type: 'rectangle', name: 'Rectangle', icon: <Square size={20} /> },
    { type: 'circle', name: 'Circle', icon: <Circle size={20} /> },
    { type: 'line', name: 'Line', icon: <Minus size={20} /> },
    { type: 'arrow', name: 'Arrow', icon: <ArrowRight size={20} /> },
];

export function ShapesTool() {
    const { state, setToolOptions, setActiveTool } = useApp();
    const { activeDocument } = state;

    const [selectedShapeType, setSelectedShapeType] = useState<ShapeType>('rectangle');
    const [strokeColor, setStrokeColor] = useState(SHAPE_COLORS[1]); // Default Red
    const [fillColor, setFillColor] = useState<typeof SHAPE_COLORS[0]>(SHAPE_COLORS[6]); // Default transparent
    const [strokeWidth, setStrokeWidth] = useState(1); // Default thinner stroke
    const [opacity, setOpacity] = useState(100);

    // Update global tool options whenever local state changes
    useEffect(() => {
        setToolOptions({
            shapeType: selectedShapeType,
            shapeStrokeColor: strokeColor.value,
            shapeFillColor: fillColor.value,
            shapeStrokeWidth: strokeWidth,
            shapeOpacity: opacity / 100
        });
        // We also want to ensure the tool is active if this component is mounted and we are interacting
        // But we shouldn't force it if user selected another tool. 
        // Although this component IS the tool panel, so if it's visible, the user likely wants to use it.
        setActiveTool('shapes');
    }, [selectedShapeType, strokeColor, fillColor, strokeWidth, opacity, setToolOptions, setActiveTool]);

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
                <p className="tool-description">Click on the document to place shapes</p>
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
                                    className={`color-btn ${fillColor.value === color.value ? 'active' : ''} ${color.value === 'transparent' ? 'no-fill' : ''}`}
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
                
                {/* Opacity */}
                <div className="control-section">
                    <h4>Opacity</h4>
                    <div className="control-row">
                        <input
                            type="range"
                            min="10"
                            max="100"
                            value={opacity}
                            onChange={(e) => setOpacity(Number(e.target.value))}
                        />
                        <span>{opacity}%</span>
                    </div>
                </div>
                
                <div className="mt-4 p-3 bg-blue-50 text-blue-800 rounded-md text-sm">
                    Select a shape type and style above, then click anywhere on the document to place it.
                </div>
            </div>
        </div>
    );
}
