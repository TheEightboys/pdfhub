/**
 * Images to PDF Tool
 */

import { useState, useCallback } from 'react';
import { useApp, useToast } from '../../store/appStore';
import { Dropzone } from '../UI/Dropzone';
import { imagesToPDF } from '../../utils/imageHelpers';
import { downloadPDF } from '../../utils/pdfHelpers';
import {
    GripVertical,
    Trash2,
    Download,
    ChevronUp,
    ChevronDown,
    Loader2,
    RotateCw,
} from 'lucide-react';
import './Tools.css';

interface ImageItem {
    id: string;
    file: File;
    preview: string;
    rotation: number;
}

export function ImagesToPDFTool() {
    const { setLoading } = useApp();
    const { addToast } = useToast();

    const [images, setImages] = useState<ImageItem[]>([]);
    const [pageSize, setPageSize] = useState<'a4' | 'letter' | 'fit'>('a4');
    const [isProcessing, setIsProcessing] = useState(false);

    const handleFilesAccepted = useCallback((newFiles: File[]) => {
        const imageFiles = newFiles.filter(f => f.type.startsWith('image/'));

        const newItems: ImageItem[] = imageFiles.map(file => ({
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            file,
            preview: URL.createObjectURL(file),
            rotation: 0,
        }));

        setImages(prev => [...prev, ...newItems]);
    }, []);

    const removeImage = (id: string) => {
        setImages(prev => {
            const item = prev.find(i => i.id === id);
            if (item) URL.revokeObjectURL(item.preview);
            return prev.filter(i => i.id !== id);
        });
    };

    const moveImage = (id: string, direction: 'up' | 'down') => {
        setImages(prev => {
            const index = prev.findIndex(i => i.id === id);
            if (index === -1) return prev;

            const newIndex = direction === 'up' ? index - 1 : index + 1;
            if (newIndex < 0 || newIndex >= prev.length) return prev;

            const newImages = [...prev];
            [newImages[index], newImages[newIndex]] = [newImages[newIndex], newImages[index]];
            return newImages;
        });
    };

    const rotateImage = (id: string) => {
        setImages(prev => prev.map(item => {
            if (item.id === id) {
                return { ...item, rotation: (item.rotation + 90) % 360 };
            }
            return item;
        }));
    };

    const handleConvert = async () => {
        if (images.length === 0) {
            addToast({
                type: 'warning',
                title: 'No images',
                message: 'Add at least one image to create a PDF.',
            });
            return;
        }

        setIsProcessing(true);
        setLoading(true, 'Creating PDF...');

        try {
            // Map items to { file, rotation }
            const files = images.map(i => ({ file: i.file, rotation: i.rotation }));

            const pdfBytes = await imagesToPDF(files, {
                pageSize,
                orientation: 'auto',
                margin: 10,
                quality: 0.92,
            });

            const fileName = `images_${images.length}_pages.pdf`;
            downloadPDF(pdfBytes, fileName);

            addToast({
                type: 'success',
                title: 'PDF created!',
                message: `Created ${fileName} with ${images.length} pages.`,
            });

            // Clear images
            images.forEach(i => URL.revokeObjectURL(i.preview));
            setImages([]);
        } catch (error) {
            console.error('Conversion failed:', error);
            addToast({
                type: 'error',
                title: 'Conversion failed',
                message: 'An error occurred while creating the PDF.',
            });
        } finally {
            setIsProcessing(false);
            setLoading(false);
        }
    };

    return (
        <div className="tool-panel">
            <div className="tool-header">
                <h2 className="tool-title">Images to PDF</h2>
                <p className="tool-description">
                    Create a PDF from multiple images. Each image becomes a page.
                </p>
            </div>

            <div className="tool-content">
                {images.length === 0 ? (
                    <Dropzone
                        onFilesAccepted={handleFilesAccepted}
                        accept=".jpg,.jpeg,.png,.webp,.gif,.bmp"
                        multiple={true}
                        label="Drop images here"
                        hint="JPG, PNG, WebP, GIF, BMP supported"
                        showSecurityScan={false}
                    />
                ) : (
                    <>
                        {/* Page Size */}
                        <div className="tool-section">
                            <h4 className="section-title">Page Size</h4>
                            <div className="mode-tabs">
                                <button
                                    className={`mode-tab ${pageSize === 'a4' ? 'active' : ''}`}
                                    onClick={() => setPageSize('a4')}
                                >
                                    A4
                                </button>
                                <button
                                    className={`mode-tab ${pageSize === 'letter' ? 'active' : ''}`}
                                    onClick={() => setPageSize('letter')}
                                >
                                    Letter
                                </button>
                                <button
                                    className={`mode-tab ${pageSize === 'fit' ? 'active' : ''}`}
                                    onClick={() => setPageSize('fit')}
                                >
                                    Fit to Image
                                </button>
                            </div>
                        </div>

                        {/* Image List */}
                        <div className="tool-section">
                            <div className="section-header">
                                <h4 className="section-title">Images ({images.length})</h4>
                            </div>

                            <div className="image-list">
                                {images.map((item, index) => (
                                    <div key={item.id} className="image-item">
                                        <div className="file-drag-handle">
                                            <GripVertical size={16} />
                                        </div>

                                        <div className="file-number">{index + 1}</div>

                                        <div className="image-preview" style={{ transform: `rotate(${item.rotation}deg)` }}>
                                            <img src={item.preview} alt={item.file.name} />
                                        </div>

                                        <div className="file-info">
                                            <span className="file-name">{item.file.name}</span>
                                            <span className="file-meta">
                                                {(item.file.size / 1024).toFixed(1)} KB
                                            </span>
                                        </div>

                                        <div className="file-actions">
                                            <button
                                                className="file-action-btn"
                                                onClick={() => rotateImage(item.id)}
                                                title="Rotate 90°"
                                            >
                                                <RotateCw size={16} />
                                            </button>
                                            <button
                                                className="file-action-btn"
                                                onClick={() => moveImage(item.id, 'up')}
                                                disabled={index === 0}
                                            >
                                                <ChevronUp size={16} />
                                            </button>
                                            <button
                                                className="file-action-btn"
                                                onClick={() => moveImage(item.id, 'down')}
                                                disabled={index === images.length - 1}
                                            >
                                                <ChevronDown size={16} />
                                            </button>
                                            <button
                                                className="file-action-btn delete"
                                                onClick={() => removeImage(item.id)}
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <Dropzone
                            onFilesAccepted={handleFilesAccepted}
                            accept=".jpg,.jpeg,.png,.webp,.gif,.bmp"
                            multiple={true}
                            label="Drop more images"
                            hint=""
                            showSecurityScan={false}
                        />
                    </>
                )}
            </div>

            {images.length > 0 && (
                <div className="tool-footer">
                    <div className="tool-summary">
                        <span className="summary-stat">
                            <strong>{images.length}</strong> images
                        </span>
                        <span className="summary-divider">•</span>
                        <span className="summary-stat">
                            Page size: <strong>{pageSize.toUpperCase()}</strong>
                        </span>
                    </div>

                    <button
                        className="btn btn-primary btn-lg"
                        onClick={handleConvert}
                        disabled={isProcessing}
                    >
                        {isProcessing ? (
                            <>
                                <Loader2 size={18} className="animate-spin" />
                                Creating PDF...
                            </>
                        ) : (
                            <>
                                <Download size={18} />
                                Create PDF
                            </>
                        )}
                    </button>
                </div>
            )}
        </div>
    );
}
