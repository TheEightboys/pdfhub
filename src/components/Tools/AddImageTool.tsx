/**
 * Add Image Tool
 * Insert images into PDF pages
 */

import React, { useState, useCallback, useRef } from 'react';
import { useApp, useToast } from '../../store/appStore';
import { ImagePlus, Upload, Trash2, Loader2, Download } from 'lucide-react';
import { PDFDocument, degrees } from 'pdf-lib';
import { downloadPDF } from '../../utils/pdfHelpers';
import './Tools.css';

interface ImageItem {
    id: string;
    file: File;
    preview: string;
    x: number;
    y: number;
    width: number;
    height: number;
    rotation: number;
    page: number;
}

export function AddImageTool() {
    const { state } = useApp();
    const { addToast } = useToast();
    const { activeDocument, selectedPages } = state;

    const [images, setImages] = useState<ImageItem[]>([]);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [applyTo, setApplyTo] = useState<'selected' | 'all' | 'first'>('selected');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;

        Array.from(files).forEach(file => {
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    const img = new Image();
                    img.onload = () => {
                        const newImage: ImageItem = {
                            id: crypto.randomUUID(),
                            file,
                            preview: event.target?.result as string,
                            x: 50,
                            y: 50,
                            width: Math.min(200, img.width),
                            height: Math.min(200, img.height * (200 / img.width)),
                            rotation: 0,
                            page: selectedPages[0] || 1
                        };
                        setImages(prev => [...prev, newImage]);
                        setSelectedImage(newImage.id);
                    };
                    img.src = event.target?.result as string;
                };
                reader.readAsDataURL(file);
            }
        });

        e.target.value = '';
    }, [selectedPages]);

    const removeImage = useCallback((id: string) => {
        setImages(prev => prev.filter(img => img.id !== id));
        if (selectedImage === id) {
            setSelectedImage(null);
        }
    }, [selectedImage]);

    const updateImage = useCallback((id: string, updates: Partial<ImageItem>) => {
        setImages(prev => prev.map(img =>
            img.id === id ? { ...img, ...updates } : img
        ));
    }, []);

    const handleApply = async () => {
        if (!activeDocument || images.length === 0) {
            addToast({
                type: 'warning',
                title: 'No images',
                message: 'Please add at least one image.',
            });
            return;
        }

        setIsProcessing(true);

        try {
            const pdfDoc = await PDFDocument.load(activeDocument.arrayBuffer.slice(0));
            const pages = pdfDoc.getPages();

            let targetPages: number[] = [];
            if (applyTo === 'all') {
                targetPages = pages.map((_, i) => i);
            } else if (applyTo === 'first') {
                targetPages = [0];
            } else {
                targetPages = selectedPages.map(p => p - 1);
            }

            for (const imgItem of images) {
                const imgBytes = await fetch(imgItem.preview).then(r => r.arrayBuffer());
                let embeddedImg;

                if (imgItem.file.type === 'image/png') {
                    embeddedImg = await pdfDoc.embedPng(imgBytes);
                } else {
                    embeddedImg = await pdfDoc.embedJpg(imgBytes);
                }

                for (const pageIndex of targetPages) {
                    if (pageIndex >= 0 && pageIndex < pages.length) {
                        const page = pages[pageIndex];
                        const { width: pageWidth, height: pageHeight } = page.getSize();

                        page.drawImage(embeddedImg, {
                            x: (imgItem.x / 100) * pageWidth,
                            y: pageHeight - (imgItem.y / 100) * pageHeight - imgItem.height,
                            width: imgItem.width,
                            height: imgItem.height,
                            rotate: degrees(imgItem.rotation),
                        });
                    }
                }
            }

            const pdfBytes = await pdfDoc.save();
            const fileName = activeDocument.name.replace('.pdf', '_with_images.pdf');
            downloadPDF(pdfBytes, fileName);

            addToast({
                type: 'success',
                title: 'Images added',
                message: `Saved as ${fileName}`,
            });
        } catch (error) {
            console.error('Error adding images:', error);
            addToast({
                type: 'error',
                title: 'Error',
                message: 'Failed to add images to PDF.',
            });
        } finally {
            setIsProcessing(false);
        }
    };

    if (!activeDocument) {
        return (
            <div className="tool-panel">
                <div className="tool-empty">
                    <ImagePlus size={48} />
                    <p>Open a PDF to add images</p>
                </div>
            </div>
        );
    }

    return (
        <div className="tool-panel">
            <div className="tool-header">
                <h2 className="tool-title">Add Image</h2>
                <p className="tool-description">Insert images into your PDF pages</p>
            </div>

            <div className="tool-content">
                {/* Upload Area */}
                <div className="upload-section">
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/jpg"
                        multiple
                        onChange={handleFileSelect}
                        style={{ display: 'none' }}
                    />
                    <button
                        className="btn btn-secondary w-full"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <Upload size={18} />
                        <span>Select Images</span>
                    </button>
                </div>

                {/* Images List */}
                {images.length > 0 && (
                    <div className="images-list">
                        <h4>Added Images ({images.length})</h4>
                        {images.map(img => (
                            <div
                                key={img.id}
                                className={`image-item ${selectedImage === img.id ? 'selected' : ''}`}
                                onClick={() => setSelectedImage(img.id)}
                            >
                                <img src={img.preview} alt="" className="image-thumb" />
                                <div className="image-info">
                                    <span className="image-name">{img.file.name}</span>
                                    <span className="image-size">{img.width}x{img.height}px</span>
                                </div>
                                <button
                                    className="btn-icon-sm"
                                    onClick={(e) => { e.stopPropagation(); removeImage(img.id); }}
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {/* Image Controls */}
                {selectedImage && (
                    <div className="image-controls">
                        <h4>Position & Size</h4>
                        {images.filter(img => img.id === selectedImage).map(img => (
                            <div key={img.id} className="control-grid">
                                <div className="control-row">
                                    <label>X Position</label>
                                    <input
                                        type="range"
                                        min="0"
                                        max="100"
                                        value={img.x}
                                        onChange={(e) => updateImage(img.id, { x: Number(e.target.value) })}
                                    />
                                    <span>{img.x}%</span>
                                </div>
                                <div className="control-row">
                                    <label>Y Position</label>
                                    <input
                                        type="range"
                                        min="0"
                                        max="100"
                                        value={img.y}
                                        onChange={(e) => updateImage(img.id, { y: Number(e.target.value) })}
                                    />
                                    <span>{img.y}%</span>
                                </div>
                                <div className="control-row">
                                    <label>Width</label>
                                    <input
                                        type="number"
                                        min="10"
                                        max="1000"
                                        value={img.width}
                                        onChange={(e) => updateImage(img.id, { width: Number(e.target.value) })}
                                    />
                                    <span>px</span>
                                </div>
                                <div className="control-row">
                                    <label>Height</label>
                                    <input
                                        type="number"
                                        min="10"
                                        max="1000"
                                        value={img.height}
                                        onChange={(e) => updateImage(img.id, { height: Number(e.target.value) })}
                                    />
                                    <span>px</span>
                                </div>
                                <div className="control-row">
                                    <label>Rotation</label>
                                    <input
                                        type="range"
                                        min="0"
                                        max="360"
                                        value={img.rotation}
                                        onChange={(e) => updateImage(img.id, { rotation: Number(e.target.value) })}
                                    />
                                    <span>{img.rotation}°</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Apply To Selection */}
                <div className="apply-to-section">
                    <h4>Apply To</h4>
                    <div className="radio-group">
                        <label className="radio-label">
                            <input
                                type="radio"
                                name="applyTo"
                                checked={applyTo === 'selected'}
                                onChange={() => setApplyTo('selected')}
                            />
                            <span>Selected Pages ({selectedPages.length || 'none'})</span>
                        </label>
                        <label className="radio-label">
                            <input
                                type="radio"
                                name="applyTo"
                                checked={applyTo === 'first'}
                                onChange={() => setApplyTo('first')}
                            />
                            <span>First Page Only</span>
                        </label>
                        <label className="radio-label">
                            <input
                                type="radio"
                                name="applyTo"
                                checked={applyTo === 'all'}
                                onChange={() => setApplyTo('all')}
                            />
                            <span>All Pages</span>
                        </label>
                    </div>
                </div>
            </div>

            <div className="tool-footer">
                <div className="tool-summary">
                    <ImagePlus size={16} />
                    <span>{images.length} image(s) ready</span>
                </div>
                <button
                    className="btn btn-primary"
                    onClick={handleApply}
                    disabled={isProcessing || images.length === 0}
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
