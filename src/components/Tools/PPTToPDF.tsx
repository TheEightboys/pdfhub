/**
 * PPT to PDF Tool
 * Convert PowerPoint presentations to PDF
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
    Presentation,
    AlertTriangle,
} from 'lucide-react';
import './Tools.css';

interface SlideItem {
    id: string;
    slideNumber: number;
    preview: string;
    width: number;
    height: number;
}

interface PPTFile {
    id: string;
    file: File;
    name: string;
    slides: SlideItem[];
    isLoading: boolean;
    error?: string;
}

// Extract text content from slide XML
function extractTextFromSlideXml(xml: string): string[] {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, 'application/xml');
    const texts: string[] = [];
    
    // Find all text elements (a:t tags in OOXML)
    const textElements = doc.getElementsByTagName('a:t');
    for (let i = 0; i < textElements.length; i++) {
        const text = textElements[i].textContent?.trim();
        if (text) texts.push(text);
    }
    
    return texts;
}

// Parse PPTX file and render slides with extracted content
async function parsePPTXWithRenderer(file: File): Promise<SlideItem[]> {
    const JSZip = (await import('jszip')).default;
    const arrayBuffer = await file.arrayBuffer();
    const zip = await JSZip.loadAsync(arrayBuffer);
    
    const slides: SlideItem[] = [];
    const slideWidth = 960;
    const slideHeight = 540;
    
    // Find slide XML files
    const slideFiles = Object.keys(zip.files)
        .filter(name => /^ppt\/slides\/slide\d+\.xml$/.test(name))
        .sort((a, b) => {
            const numA = parseInt(a.match(/slide(\d+)\.xml/)?.[1] || '0');
            const numB = parseInt(b.match(/slide(\d+)\.xml/)?.[1] || '0');
            return numA - numB;
        });
    
    // Extract all media files as blob URLs for potential use
    const mediaFiles: Record<string, string> = {};
    const mediaFolder = 'ppt/media/';
    for (const filename of Object.keys(zip.files)) {
        if (filename.startsWith(mediaFolder) && !filename.endsWith('/')) {
            try {
                const blob = await zip.files[filename].async('blob');
                mediaFiles[filename] = URL.createObjectURL(blob);
            } catch (e) {
                console.warn('Failed to extract media:', filename);
            }
        }
    }
    
    // Process each slide
    for (let i = 0; i < slideFiles.length; i++) {
        const slideNum = i + 1;
        const slideFile = slideFiles[i];
        
        try {
            // Read slide XML
            const slideXml = await zip.files[slideFile].async('string');
            const texts = extractTextFromSlideXml(slideXml);
            
            // Try to find slide relationship file for images
            const slideRelPath = `ppt/slides/_rels/slide${slideNum}.xml.rels`;
            let slideImages: string[] = [];
            
            if (zip.files[slideRelPath]) {
                const relXml = await zip.files[slideRelPath].async('string');
                const relParser = new DOMParser();
                const relDoc = relParser.parseFromString(relXml, 'application/xml');
                const relationships = relDoc.getElementsByTagName('Relationship');
                
                for (let j = 0; j < relationships.length; j++) {
                    const type = relationships[j].getAttribute('Type') || '';
                    const target = relationships[j].getAttribute('Target') || '';
                    
                    if (type.includes('/image') && target) {
                        // Resolve relative path
                        const imagePath = target.startsWith('../') 
                            ? 'ppt/' + target.substring(3) 
                            : 'ppt/slides/' + target;
                        
                        if (mediaFiles[imagePath]) {
                            slideImages.push(mediaFiles[imagePath]);
                        }
                    }
                }
            }
            
            // Render preview with text and images
            const preview = await renderEnhancedSlidePreview(slideNum, texts, slideImages, slideWidth, slideHeight);
            
            slides.push({
                id: `slide-${slideNum}-${Date.now()}`,
                slideNumber: slideNum,
                preview,
                width: slideWidth,
                height: slideHeight,
            });
        } catch (error) {
            console.warn(`Failed to parse slide ${slideNum}:`, error);
            slides.push({
                id: `slide-${slideNum}-${Date.now()}`,
                slideNumber: slideNum,
                preview: createFallbackSlide(slideNum),
                width: slideWidth,
                height: slideHeight,
            });
        }
    }
    
    return slides;
}

// Render slide preview with text and images
async function renderEnhancedSlidePreview(
    slideNum: number, 
    texts: string[], 
    imageUrls: string[], 
    width: number, 
    height: number
): Promise<string> {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return createFallbackSlide(slideNum);
    
    // White background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    
    // Draw images first (as background)
    if (imageUrls.length > 0) {
        for (const url of imageUrls.slice(0, 3)) { // Limit to 3 images
            try {
                const img = await loadImage(url);
                // Scale and center the largest image
                const scale = Math.min(width / img.width, height / img.height, 1);
                const x = (width - img.width * scale) / 2;
                const y = (height - img.height * scale) / 2;
                ctx.globalAlpha = 0.9;
                ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
                ctx.globalAlpha = 1;
            } catch (e) {
                console.warn('Failed to load image:', e);
            }
        }
    }
    
    // Draw text overlay
    if (texts.length > 0 && imageUrls.length < 2) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.fillRect(20, 20, width - 40, Math.min(200, height / 2));
        
        ctx.fillStyle = '#1f2937';
        ctx.font = 'bold 28px Arial, sans-serif';
        ctx.textAlign = 'left';
        const title = texts[0].length > 50 ? texts[0].substring(0, 50) + '...' : texts[0];
        ctx.fillText(title, 40, 60);
        
        if (texts[1]) {
            ctx.fillStyle = '#4b5563';
            ctx.font = '18px Arial, sans-serif';
            const subtitle = texts[1].length > 70 ? texts[1].substring(0, 70) + '...' : texts[1];
            ctx.fillText(subtitle, 40, 95);
        }
    }
    
    // Slide number badge
    ctx.fillStyle = '#dc2626';
    ctx.beginPath();
    ctx.roundRect(width - 50, 10, 40, 28, 6);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${slideNum}`, width - 30, 29);
    
    // Border
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, width, height);
    
    return canvas.toDataURL('image/png', 0.9);
}

// Load image from URL as promise
function loadImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = url;
    });
}

// Create a fallback placeholder slide image
function createFallbackSlide(slideNum: number): string {
    const canvas = document.createElement('canvas');
    canvas.width = 960;
    canvas.height = 540;
    const ctx = canvas.getContext('2d');
    
    if (ctx) {
        // White background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Border
        ctx.strokeStyle = '#e5e7eb';
        ctx.lineWidth = 2;
        ctx.strokeRect(1, 1, canvas.width - 2, canvas.height - 2);
        
        // Slide number
        ctx.fillStyle = '#6b7280';
        ctx.font = 'bold 48px Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`Slide ${slideNum}`, canvas.width / 2, canvas.height / 2);
    }
    
    return canvas.toDataURL('image/png');
}



export function PPTToPDFTool() {
    const { setLoading } = useApp();
    const { addToast } = useToast();

    const [pptFiles, setPPTFiles] = useState<PPTFile[]>([]);
    const [pageSize, setPageSize] = useState<'a4' | 'letter' | 'widescreen'>('widescreen');
    const [isProcessing, setIsProcessing] = useState(false);

    const handleFilesAccepted = useCallback(async (newFiles: File[]) => {
        const pptxFiles = newFiles.filter(f => 
            f.name.endsWith('.pptx') || f.name.endsWith('.ppt')
        );

        if (pptxFiles.length === 0) {
            addToast({
                type: 'warning',
                title: 'Invalid file type',
                message: 'Please upload PowerPoint files (.ppt, .pptx)',
            });
            return;
        }

        for (const file of pptxFiles) {
            const fileId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            
            // Add file with loading state
            setPPTFiles(prev => [...prev, {
                id: fileId,
                file,
                name: file.name,
                slides: [],
                isLoading: true,
            }]);

            try {
                if (file.name.endsWith('.ppt')) {
                    // Old .ppt format is not supported
                    setPPTFiles(prev => prev.map(f => 
                        f.id === fileId 
                            ? { ...f, isLoading: false, error: 'Legacy .ppt format not supported. Please convert to .pptx first.' }
                            : f
                    ));
                    continue;
                }

                const slides = await parsePPTXWithRenderer(file);
                
                setPPTFiles(prev => prev.map(f => 
                    f.id === fileId 
                        ? { ...f, slides, isLoading: false }
                        : f
                ));
            } catch (error) {
                console.error('Failed to parse PPTX:', error);
                setPPTFiles(prev => prev.map(f => 
                    f.id === fileId 
                        ? { ...f, isLoading: false, error: 'Failed to parse PowerPoint file' }
                        : f
                ));
            }
        }
    }, [addToast]);

    const removeFile = (id: string) => {
        setPPTFiles(prev => {
            const file = prev.find(f => f.id === id);
            if (file) {
                file.slides.forEach(s => {
                    if (s.preview.startsWith('blob:')) {
                        URL.revokeObjectURL(s.preview);
                    }
                });
            }
            return prev.filter(f => f.id !== id);
        });
    };

    const moveFile = (id: string, direction: 'up' | 'down') => {
        setPPTFiles(prev => {
            const index = prev.findIndex(f => f.id === id);
            if (index === -1) return prev;

            const newIndex = direction === 'up' ? index - 1 : index + 1;
            if (newIndex < 0 || newIndex >= prev.length) return prev;

            const newFiles = [...prev];
            [newFiles[index], newFiles[newIndex]] = [newFiles[newIndex], newFiles[index]];
            return newFiles;
        });
    };

    const getAllSlides = () => {
        return pptFiles.flatMap(f => f.slides);
    };

    const handleConvert = async () => {
        const allSlides = getAllSlides();
        
        if (allSlides.length === 0) {
            addToast({
                type: 'warning',
                title: 'No slides',
                message: 'No slides available to convert.',
            });
            return;
        }

        setIsProcessing(true);
        setLoading(true, 'Creating PDF from slides...');

        try {
            // Convert slide previews to image files
            const imageFiles: { file: File; rotation: number }[] = [];
            
            for (const slide of allSlides) {
                const response = await fetch(slide.preview);
                const blob = await response.blob();
                const file = new File([blob], `slide_${slide.slideNumber}.png`, { type: 'image/png' });
                imageFiles.push({ file, rotation: 0 });
            }

            // Determine page size
            let pageSizeOption: 'a4' | 'letter' | 'fit' = pageSize === 'widescreen' ? 'fit' : pageSize;

            const pdfBytes = await imagesToPDF(imageFiles, {
                pageSize: pageSizeOption,
                orientation: 'auto',
                margin: 0,
                quality: 0.95,
            });

            const fileName = pptFiles.length === 1 
                ? pptFiles[0].name.replace(/\.(pptx?|PPTX?)$/, '.pdf')
                : `presentation_${allSlides.length}_slides.pdf`;
            
            downloadPDF(pdfBytes, fileName);

            addToast({
                type: 'success',
                title: 'PDF created!',
                message: `Created ${fileName} with ${allSlides.length} pages.`,
            });

            // Clean up
            pptFiles.forEach(f => {
                f.slides.forEach(s => {
                    if (s.preview.startsWith('blob:')) {
                        URL.revokeObjectURL(s.preview);
                    }
                });
            });
            setPPTFiles([]);
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

    const totalSlides = getAllSlides().length;
    const isLoading = pptFiles.some(f => f.isLoading);

    return (
        <div className="tool-panel">
            <div className="tool-header">
                <h2 className="tool-title">PPT to PDF</h2>
                <p className="tool-description">
                    Convert PowerPoint presentations to PDF format.
                </p>
            </div>

            <div className="tool-content">
                {pptFiles.length === 0 ? (
                    <>
                        <Dropzone
                            onFilesAccepted={handleFilesAccepted}
                            accept=".pptx,.ppt"
                            multiple={true}
                            label="Drop PowerPoint files here"
                            hint="PPTX format supported"
                            showSecurityScan={false}
                        />
                        <div className="tool-info-box" style={{ marginTop: '1rem' }}>
                            <AlertTriangle size={16} />
                            <span>Note: Legacy .ppt files need to be converted to .pptx first using Microsoft PowerPoint or LibreOffice.</span>
                        </div>
                    </>
                ) : (
                    <>
                        {/* Page Size */}
                        <div className="tool-section">
                            <h4 className="section-title">Output Size</h4>
                            <div className="mode-tabs">
                                <button
                                    className={`mode-tab ${pageSize === 'widescreen' ? 'active' : ''}`}
                                    onClick={() => setPageSize('widescreen')}
                                >
                                    Widescreen (16:9)
                                </button>
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
                            </div>
                        </div>

                        {/* File List */}
                        <div className="tool-section">
                            <div className="section-header">
                                <h4 className="section-title">Files ({pptFiles.length})</h4>
                            </div>

                            <div className="file-list">
                                {pptFiles.map((pptFile, index) => (
                                    <div key={pptFile.id} className={`file-item ${pptFile.error ? 'error' : ''}`}>
                                        <div className="file-drag-handle">
                                            <GripVertical size={16} />
                                        </div>

                                        <div className="file-number">{index + 1}</div>

                                        <div className="file-icon">
                                            <Presentation size={24} />
                                        </div>

                                        <div className="file-info">
                                            <span className="file-name">{pptFile.name}</span>
                                            <span className="file-meta">
                                                {pptFile.isLoading ? (
                                                    <span className="loading-text">
                                                        <Loader2 size={12} className="animate-spin" /> Processing...
                                                    </span>
                                                ) : pptFile.error ? (
                                                    <span className="error-text">{pptFile.error}</span>
                                                ) : (
                                                    `${pptFile.slides.length} slides`
                                                )}
                                            </span>
                                        </div>

                                        <div className="file-actions">
                                            <button
                                                className="file-action-btn"
                                                onClick={() => moveFile(pptFile.id, 'up')}
                                                disabled={index === 0}
                                            >
                                                <ChevronUp size={16} />
                                            </button>
                                            <button
                                                className="file-action-btn"
                                                onClick={() => moveFile(pptFile.id, 'down')}
                                                disabled={index === pptFiles.length - 1}
                                            >
                                                <ChevronDown size={16} />
                                            </button>
                                            <button
                                                className="file-action-btn delete"
                                                onClick={() => removeFile(pptFile.id)}
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Slide Preview Grid */}
                        {totalSlides > 0 && (
                            <div className="tool-section">
                                <h4 className="section-title">Slide Preview</h4>
                                <div className="slide-preview-grid">
                                    {getAllSlides().slice(0, 8).map((slide, idx) => (
                                        <div key={slide.id} className="slide-preview-item">
                                            <img src={slide.preview} alt={`Slide ${slide.slideNumber}`} />
                                            <span className="slide-number">{idx + 1}</span>
                                        </div>
                                    ))}
                                    {totalSlides > 8 && (
                                        <div className="slide-preview-more">
                                            +{totalSlides - 8} more
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        <Dropzone
                            onFilesAccepted={handleFilesAccepted}
                            accept=".pptx,.ppt"
                            multiple={true}
                            label="Drop more files"
                            hint=""
                            showSecurityScan={false}
                        />
                    </>
                )}
            </div>

            {pptFiles.length > 0 && (
                <div className="tool-footer">
                    <div className="tool-summary">
                        <span className="summary-stat">
                            <strong>{pptFiles.length}</strong> file{pptFiles.length > 1 ? 's' : ''}
                        </span>
                        <span className="summary-divider">•</span>
                        <span className="summary-stat">
                            <strong>{totalSlides}</strong> slide{totalSlides !== 1 ? 's' : ''}
                        </span>
                    </div>

                    <button
                        className="btn btn-primary btn-lg"
                        onClick={handleConvert}
                        disabled={isProcessing || isLoading || totalSlides === 0}
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
