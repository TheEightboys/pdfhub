/**
 * StampTool.tsx
 * Enhanced with custom sizing options
 */

import { useState } from 'react';
import { useApp } from '../../store/appStore';
import { Stamp, Check, X, AlertTriangle, FileText, Clock, Trash2, CheckCircle2, Maximize2 } from 'lucide-react';
import './Tools.css';

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
    { name: 'Red', value: '#dc2626' },
    { name: 'Green', value: '#16a34a' },
    { name: 'Blue', value: '#2563eb' },
    { name: 'Orange', value: '#f59e0b' },
    { name: 'Gray', value: '#6b7280' },
    { name: 'Purple', value: '#9333ea' },
];

const STAMP_SIZES = [
    { label: 'S', value: 'small', scale: 0.7 },
    { label: 'M', value: 'medium', scale: 1 },
    { label: 'L', value: 'large', scale: 1.3 },
    { label: 'XL', value: 'xlarge', scale: 1.6 },
];

export function StampTool() {
    const { state, setToolOptions, deleteAnnotation, setActiveTool } = useApp();
    const { activeDocument, toolOptions } = state;

    const [stampSize, setStampSize] = useState(STAMP_SIZES[1]); // Medium default

    const selectedStamp = toolOptions.selectedStamp || { ...PREDEFINED_STAMPS[0], type: 'predefined' as const };

    // Active stamps (annotations)
    const activeStamps = activeDocument?.pages.flatMap(p => p.annotations).filter(a => a.type === 'stamp') || [];

    const handleStampSelect = (stamp: typeof PREDEFINED_STAMPS[0]) => {
        setToolOptions({
            selectedStamp: {
                text: stamp.text,
                color: stamp.color,
                type: 'predefined',
                size: stampSize.value
            }
        });
    };

    const handleCustomChange = (text: string) => {
        setToolOptions({
            selectedStamp: {
                ...selectedStamp,
                text: text.toUpperCase(),
                type: 'custom',
                size: stampSize.value
            }
        });
    };

    const handleColorChange = (color: string) => {
        setToolOptions({
            selectedStamp: {
                ...selectedStamp,
                color: color,
                size: stampSize.value
            }
        });
    };

    const handleSizeChange = (size: typeof STAMP_SIZES[0]) => {
        setStampSize(size);
        if (selectedStamp) {
            setToolOptions({
                selectedStamp: {
                    ...selectedStamp,
                    size: size.value
                }
            });
        }
    };

    return (
        <div className="tool-panel">
            <div className="tool-header">
                <h2 className="tool-title">Stamps</h2>
                <p className="tool-description">Click on PDF to place the selected stamp</p>
            </div>

            <div className="tool-content">
                {/* Predefined Stamps */}
                <div className="stamps-section">
                    <h4>Predefined Stamps</h4>
                    <div className="stamps-grid">
                        {PREDEFINED_STAMPS.map((stamp, index) => (
                            <button
                                key={index}
                                className={`stamp-btn ${selectedStamp.text === stamp.text && selectedStamp.type === 'predefined' ? 'active' : ''}`}
                                style={{ borderColor: stamp.color, color: stamp.color }}
                                onClick={() => handleStampSelect(stamp)}
                            >
                                {stamp.icon}
                                <span>{stamp.text}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Stamp Size */}
                <div className="tool-section">
                    <h4 className="section-title">
                        <Maximize2 size={14} />
                        Stamp Size
                    </h4>
                    <div className="size-options">
                        {STAMP_SIZES.map(size => (
                            <button
                                key={size.value}
                                className={`size-btn ${stampSize.value === size.value ? 'active' : ''}`}
                                onClick={() => handleSizeChange(size)}
                            >
                                {size.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Custom Stamp */}
                <div className="custom-stamp-section">
                    <h4>Custom Stamp</h4>
                    <div className="custom-stamp-input">
                        <input
                            type="text"
                            value={selectedStamp.type === 'custom' ? selectedStamp.text : ''}
                            onChange={(e) => handleCustomChange(e.target.value)}
                            placeholder="Enter custom text..."
                            maxLength={20}
                        />
                    </div>
                    <div className="color-grid" style={{ marginTop: '12px' }}>
                        {STAMP_COLORS.map(color => (
                            <button
                                key={color.value}
                                className={`color-btn ${selectedStamp.color === color.value ? 'active' : ''}`}
                                style={{ backgroundColor: color.value }}
                                onClick={() => handleColorChange(color.value)}
                                title={color.name}
                            />
                        ))}
                    </div>
                </div>

                {/* Preview */}
                <div className="tool-section">
                    <h4 className="section-title">Preview</h4>
                    <div className="stamp-preview" style={{
                        display: 'flex',
                        justifyContent: 'center',
                        padding: '20px',
                        background: '#f9fafb',
                        borderRadius: '8px'
                    }}>
                        <div style={{
                            border: `3px solid ${selectedStamp.color}`,
                            color: selectedStamp.color,
                            padding: `${8 * stampSize.scale}px ${16 * stampSize.scale}px`,
                            fontWeight: 'bold',
                            fontSize: `${18 * stampSize.scale}px`,
                            transform: 'rotate(-12deg)',
                            whiteSpace: 'nowrap',
                            letterSpacing: '2px'
                        }}>
                            {selectedStamp.text || 'STAMP'}
                        </div>
                    </div>
                </div>

                {/* Stamps List */}
                {activeStamps.length > 0 && (
                    <div className="stamps-list">
                        <h4>Placed Stamps ({activeStamps.length})</h4>
                        {activeStamps.map((stamp: any) => (
                            <div key={stamp.id} className="stamp-item" style={{ color: stamp.color }}>
                                <Stamp size={16} />
                                <span className="stamp-text">{(stamp as any).customText || 'Stamp'}</span>
                                <button
                                    className="btn-icon-sm"
                                    onClick={() => deleteAnnotation(stamp.id)}
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
                    <Stamp size={16} />
                    <span>{activeStamps.length} stamp(s)</span>
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
