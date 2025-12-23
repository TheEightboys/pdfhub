/**
 * PDFViewer Component
 * Enhanced PDF viewing with direct annotation support
 * Supports: Draw, Signature, Highlight, Redact tools directly on PDF
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { useApp } from '../../store/appStore';
import { gsap } from 'gsap';
import {
    ZoomIn,
    ZoomOut,
    Grid,
    Columns,
    FileText,
    ChevronLeft,
    ChevronRight,
    Check,
    Maximize2,
    Type,
    X,
    Pencil,
    Highlighter,
    EyeOff,
    PenTool,
    Undo2,
    Trash2,
} from 'lucide-react';
import './PDFViewer.css';

// Configure PDF.js worker - use CDN worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

// Text annotation interface
interface TextAnnotation {
    id: string;
    pageNumber: number;
    x: number;
    y: number;
    text: string;
    fontSize: number;
    fontFamily: string;
    color: string;
    isEditing: boolean;
}

// Drawing point interface
interface DrawPoint {
    x: number;
    y: number;
}

// Generic stroke interface for draw and signature tools
interface DrawStroke {
    id: string;
    pageNumber: number;
    points: DrawPoint[];
    color: string;
    width: number;
    type: 'draw' | 'signature';
}

// Highlight/Redact region interface
interface AnnotationRegion {
    id: string;
    pageNumber: number;
    startX: number;
    startY: number;
    endX: number;
    endY: number;
    color: string;
    opacity: number;
    type: 'highlight' | 'redact';
}

// Tool settings interface
interface ToolSettings {
    drawColor: string;
    drawWidth: number;
    signatureColor: string;
    signatureWidth: number;
    highlightColor: string;
    highlightOpacity: number;
    redactColor: string;
}

export function PDFViewer() {
    const { state, setZoom, zoomIn, zoomOut, setViewMode, togglePageSelection, selectPages } = useApp();
    const { activeDocument, zoom, viewMode, selectedPages, activeTool } = state;

    const [currentPage, setCurrentPage] = useState(1);
    const [pageImages, setPageImages] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [loadProgress, setLoadProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);

    // Text annotation state
    const [textAnnotations, setTextAnnotations] = useState<TextAnnotation[]>([]);
    const [, setActiveAnnotation] = useState<string | null>(null);
    const [textSettings] = useState({
        fontSize: 16,
        fontFamily: 'Arial',
        color: '#000000',
    });

    // Tool settings - these can be updated from tool panels
    const [toolSettings] = useState<ToolSettings>({
        drawColor: '#dc2626',
        drawWidth: 3,
        signatureColor: '#000000',
        signatureWidth: 2,
        highlightColor: '#FFEB3B',
        highlightOpacity: 0.35,
        redactColor: '#000000',
    });

    // Drawing/Signature strokes state
    const [strokes, setStrokes] = useState<DrawStroke[]>([]);
    const [currentStroke, setCurrentStroke] = useState<DrawPoint[]>([]);
    const [isDrawing, setIsDrawing] = useState(false);

    // Highlight/Redact regions state
    const [regions, setRegions] = useState<AnnotationRegion[]>([]);
    const [currentRegion, setCurrentRegion] = useState<{ startX: number; startY: number; endX: number; endY: number } | null>(null);
    const [isSelectingRegion, setIsSelectingRegion] = useState(false);

    const containerRef = useRef<HTMLDivElement>(null);
    const pageRefs = useRef<(HTMLDivElement | null)[]>([]);

    // Animate pages on load
    useEffect(() => {
        if (pageImages.length > 0 && containerRef.current) {
            gsap.fromTo(
                containerRef.current.querySelectorAll('.page-item'),
                { opacity: 0, y: 20, scale: 0.95 },
                {
                    opacity: 1,
                    y: 0,
                    scale: 1,
                    duration: 0.4,
                    stagger: 0.05,
                    ease: 'power2.out'
                }
            );
        }
    }, [pageImages.length, viewMode]);

    // Render all pages when document loads - OPTIMIZED
    useEffect(() => {
        if (!activeDocument) {
            setPageImages([]);
            setError(null);
            return;
        }

        const renderAllPages = async () => {
            setIsLoading(true);
            setLoadProgress(0);
            setError(null);

            try {
                const loadingTask = pdfjsLib.getDocument({
                    data: activeDocument.arrayBuffer.slice(0),
                    // Disable range requests for faster loading
                    disableRange: true,
                    disableAutoFetch: false,
                });

                const pdf = await loadingTask.promise;
                const totalPages = pdf.numPages;

                // Create array with empty strings as placeholders
                const images: string[] = new Array(totalPages).fill('');

                // Use lower scale for faster rendering (1.2 instead of 2)
                const scale = 1.2;

                // Batch size for parallel processing
                const batchSize = 4;

                // Process pages in parallel batches for faster loading
                for (let batchStart = 0; batchStart < totalPages; batchStart += batchSize) {
                    const batchEnd = Math.min(batchStart + batchSize, totalPages);
                    const batchPromises: Promise<void>[] = [];

                    for (let pageNum = batchStart + 1; pageNum <= batchEnd; pageNum++) {
                        batchPromises.push(
                            (async () => {
                                try {
                                    const page = await pdf.getPage(pageNum);
                                    const viewport = page.getViewport({ scale });

                                    const canvas = document.createElement('canvas');
                                    const ctx = canvas.getContext('2d', {
                                        alpha: false,
                                        willReadFrequently: false
                                    });

                                    if (!ctx) {
                                        images[pageNum - 1] = '';
                                        return;
                                    }

                                    canvas.width = viewport.width;
                                    canvas.height = viewport.height;

                                    ctx.fillStyle = '#ffffff';
                                    ctx.fillRect(0, 0, canvas.width, canvas.height);

                                    await page.render({
                                        canvasContext: ctx,
                                        viewport: viewport,
                                    }).promise;

                                    // Use lower quality JPEG for faster processing
                                    images[pageNum - 1] = canvas.toDataURL('image/jpeg', 0.75);

                                    // Clean up
                                    page.cleanup();
                                } catch (pageError) {
                                    console.error(`Error rendering page ${pageNum}:`, pageError);
                                    images[pageNum - 1] = '';
                                }
                            })()
                        );
                    }

                    // Wait for batch to complete
                    await Promise.all(batchPromises);

                    // Update progress after each batch
                    setLoadProgress(Math.round((batchEnd / totalPages) * 100));

                    // Update images progressively for better UX
                    setPageImages([...images]);
                }

            } catch (err) {
                console.error('Error loading PDF:', err);
                setError('Failed to load PDF. Please try again.');
            }

            setIsLoading(false);
        };

        renderAllPages();
    }, [activeDocument?.id]);

    // Handle click for text placement when AddText tool is active
    const handleTextPlacement = useCallback((pageNumber: number, e: React.MouseEvent<HTMLDivElement>) => {
        if (activeTool !== 'add-text') return;

        const target = e.currentTarget as HTMLDivElement;
        const rect = target.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;

        const newAnnotation: TextAnnotation = {
            id: `text-${Date.now()}`,
            pageNumber,
            x,
            y,
            text: '',
            fontSize: textSettings.fontSize,
            fontFamily: textSettings.fontFamily,
            color: textSettings.color,
            isEditing: true,
        };

        setTextAnnotations(prev => [...prev, newAnnotation]);
        setActiveAnnotation(newAnnotation.id);
    }, [activeTool, textSettings]);

    // Update annotation text
    const updateAnnotationText = useCallback((id: string, text: string) => {
        setTextAnnotations(prev =>
            prev.map(ann => ann.id === id ? { ...ann, text } : ann)
        );
    }, []);

    // Finish editing annotation
    const finishEditing = useCallback((id: string) => {
        setTextAnnotations(prev =>
            prev.map(ann => ann.id === id ? { ...ann, isEditing: false } : ann)
                .filter(ann => ann.text.trim() !== '') // Remove empty annotations
        );
        setActiveAnnotation(null);
    }, []);

    // Delete annotation
    const deleteAnnotation = useCallback((id: string) => {
        setTextAnnotations(prev => prev.filter(ann => ann.id !== id));
        setActiveAnnotation(null);
    }, []);

    // Drawing handlers - supports draw, signature, highlight, redact
    const getDrawPoint = useCallback((e: React.MouseEvent<HTMLDivElement>, target: HTMLDivElement) => {
        const rect = target.getBoundingClientRect();
        return {
            x: ((e.clientX - rect.left) / rect.width) * 100,
            y: ((e.clientY - rect.top) / rect.height) * 100,
        };
    }, []);

    // Check if current tool is a freehand drawing tool
    const isFreehandTool = activeTool === 'draw' || activeTool === 'signature';

    // Check if current tool is a region selection tool
    const isRegionTool = activeTool === 'highlight' || activeTool === 'redact';

    // Start freehand drawing (draw or signature)
    const startDrawing = useCallback((_pageNumber: number, e: React.MouseEvent<HTMLDivElement>) => {
        if (!isFreehandTool) return;
        e.preventDefault();
        const target = e.currentTarget as HTMLDivElement;
        const point = getDrawPoint(e, target);
        setIsDrawing(true);
        setCurrentStroke([point]);
    }, [isFreehandTool, getDrawPoint]);

    // Continue freehand drawing
    const draw = useCallback((_pageNumber: number, e: React.MouseEvent<HTMLDivElement>) => {
        if (!isDrawing || !isFreehandTool) return;
        const target = e.currentTarget as HTMLDivElement;
        const point = getDrawPoint(e, target);
        setCurrentStroke(prev => [...prev, point]);
    }, [isDrawing, isFreehandTool, getDrawPoint]);

    // Stop freehand drawing and save stroke
    const stopDrawing = useCallback((pageNumber: number) => {
        if (!isDrawing || currentStroke.length < 2) {
            setIsDrawing(false);
            setCurrentStroke([]);
            return;
        }

        const strokeType = activeTool === 'signature' ? 'signature' : 'draw';
        const strokeColor = activeTool === 'signature' ? toolSettings.signatureColor : toolSettings.drawColor;
        const strokeWidth = activeTool === 'signature' ? toolSettings.signatureWidth : toolSettings.drawWidth;

        const newStroke: DrawStroke = {
            id: `${strokeType}-${Date.now()}`,
            pageNumber,
            points: currentStroke,
            color: strokeColor,
            width: strokeWidth,
            type: strokeType,
        };

        setStrokes(prev => [...prev, newStroke]);
        setIsDrawing(false);
        setCurrentStroke([]);
    }, [isDrawing, currentStroke, activeTool, toolSettings]);

    // Start region selection (highlight or redact)
    const startRegionSelection = useCallback((_pageNumber: number, e: React.MouseEvent<HTMLDivElement>) => {
        if (!isRegionTool) return;
        e.preventDefault();
        const target = e.currentTarget as HTMLDivElement;
        const point = getDrawPoint(e, target);
        setIsSelectingRegion(true);
        setCurrentRegion({ startX: point.x, startY: point.y, endX: point.x, endY: point.y });
    }, [isRegionTool, getDrawPoint]);

    // Update region selection
    const updateRegionSelection = useCallback((_pageNumber: number, e: React.MouseEvent<HTMLDivElement>) => {
        if (!isSelectingRegion || !isRegionTool || !currentRegion) return;
        const target = e.currentTarget as HTMLDivElement;
        const point = getDrawPoint(e, target);
        setCurrentRegion(prev => prev ? { ...prev, endX: point.x, endY: point.y } : null);
    }, [isSelectingRegion, isRegionTool, currentRegion, getDrawPoint]);

    // Finish region selection and save
    const finishRegionSelection = useCallback((pageNumber: number) => {
        if (!isSelectingRegion || !currentRegion) {
            setIsSelectingRegion(false);
            setCurrentRegion(null);
            return;
        }

        // Calculate normalized coordinates (ensure start < end)
        const minX = Math.min(currentRegion.startX, currentRegion.endX);
        const maxX = Math.max(currentRegion.startX, currentRegion.endX);
        const minY = Math.min(currentRegion.startY, currentRegion.endY);
        const maxY = Math.max(currentRegion.startY, currentRegion.endY);

        // Only save if region has meaningful size
        const width = maxX - minX;
        const height = maxY - minY;
        if (width < 1 || height < 1) {
            setIsSelectingRegion(false);
            setCurrentRegion(null);
            return;
        }

        const regionType = activeTool === 'highlight' ? 'highlight' : 'redact';
        const regionColor = activeTool === 'highlight' ? toolSettings.highlightColor : toolSettings.redactColor;
        const regionOpacity = activeTool === 'highlight' ? toolSettings.highlightOpacity : 1;

        const newRegion: AnnotationRegion = {
            id: `${regionType}-${Date.now()}`,
            pageNumber,
            startX: minX,
            startY: minY,
            endX: maxX,
            endY: maxY,
            color: regionColor,
            opacity: regionOpacity,
            type: regionType,
        };

        setRegions(prev => [...prev, newRegion]);
        setIsSelectingRegion(false);
        setCurrentRegion(null);
    }, [isSelectingRegion, currentRegion, activeTool, toolSettings]);

    // Unified mouse handlers
    const handleMouseDown = useCallback((pageNumber: number, e: React.MouseEvent<HTMLDivElement>) => {
        if (isFreehandTool) {
            startDrawing(pageNumber, e);
        } else if (isRegionTool) {
            startRegionSelection(pageNumber, e);
        }
    }, [isFreehandTool, isRegionTool, startDrawing, startRegionSelection]);

    const handleMouseMove = useCallback((pageNumber: number, e: React.MouseEvent<HTMLDivElement>) => {
        if (isFreehandTool) {
            draw(pageNumber, e);
        } else if (isRegionTool) {
            updateRegionSelection(pageNumber, e);
        }
    }, [isFreehandTool, isRegionTool, draw, updateRegionSelection]);

    const handleMouseUp = useCallback((pageNumber: number) => {
        if (isFreehandTool) {
            stopDrawing(pageNumber);
        } else if (isRegionTool) {
            finishRegionSelection(pageNumber);
        }
    }, [isFreehandTool, isRegionTool, stopDrawing, finishRegionSelection]);

    const handleMouseLeave = useCallback((pageNumber: number) => {
        handleMouseUp(pageNumber);
    }, [handleMouseUp]);

    // Undo last stroke or region based on active tool
    const undoLastAnnotation = useCallback(() => {
        if (activeTool === 'draw' || activeTool === 'signature') {
            const type = activeTool === 'signature' ? 'signature' : 'draw';
            setStrokes(prev => {
                const lastIndex = [...prev].reverse().findIndex(s => s.type === type);
                if (lastIndex === -1) return prev;
                const indexToRemove = prev.length - 1 - lastIndex;
                return prev.filter((_, i) => i !== indexToRemove);
            });
        } else if (activeTool === 'highlight' || activeTool === 'redact') {
            const type = activeTool;
            setRegions(prev => {
                const lastIndex = [...prev].reverse().findIndex(r => r.type === type);
                if (lastIndex === -1) return prev;
                const indexToRemove = prev.length - 1 - lastIndex;
                return prev.filter((_, i) => i !== indexToRemove);
            });
        }
    }, [activeTool]);

    // Clear all annotations for current tool
    const clearToolAnnotations = useCallback(() => {
        if (activeTool === 'draw') {
            setStrokes(prev => prev.filter(s => s.type !== 'draw'));
        } else if (activeTool === 'signature') {
            setStrokes(prev => prev.filter(s => s.type !== 'signature'));
        } else if (activeTool === 'highlight') {
            setRegions(prev => prev.filter(r => r.type !== 'highlight'));
        } else if (activeTool === 'redact') {
            setRegions(prev => prev.filter(r => r.type !== 'redact'));
        }
    }, [activeTool]);

    // Get annotation counts for display
    const getAnnotationCount = useCallback((type: string) => {
        if (type === 'draw' || type === 'signature') {
            return strokes.filter(s => s.type === type).length;
        } else if (type === 'highlight' || type === 'redact') {
            return regions.filter(r => r.type === type).length;
        }
        return 0;
    }, [strokes, regions]);

    // Check if any annotation tool is active
    const isAnnotationToolActive = activeTool === 'draw' || activeTool === 'signature' ||
        activeTool === 'highlight' || activeTool === 'redact';

    const handlePageClick = useCallback((pageNumber: number, e: React.MouseEvent) => {
        // If any annotation tool is active, don't do normal page selection
        if (activeTool === 'add-text' || isAnnotationToolActive) return;

        const target = e.currentTarget as HTMLElement;

        // Add click animation
        gsap.fromTo(target,
            { scale: 0.98 },
            { scale: 1, duration: 0.2, ease: 'back.out(1.5)' }
        );

        if (e.ctrlKey || e.metaKey) {
            togglePageSelection(pageNumber);
        } else if (e.shiftKey && selectedPages.length > 0) {
            const lastSelected = selectedPages[selectedPages.length - 1];
            const start = Math.min(lastSelected, pageNumber);
            const end = Math.max(lastSelected, pageNumber);
            const range = Array.from({ length: end - start + 1 }, (_, i) => start + i);
            selectPages(range);
        } else {
            setCurrentPage(pageNumber);
            selectPages([pageNumber]);
        }
    }, [selectedPages, selectPages, togglePageSelection, activeTool, isAnnotationToolActive]);

    if (!activeDocument) {
        return null;
    }

    if (error) {
        return (
            <div className="pdf-viewer pdf-error">
                <div className="error-content">
                    <p>{error}</p>
                    <button className="btn btn-primary" onClick={() => window.location.reload()}>
                        Reload Page
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="pdf-viewer">
            {/* Toolbar */}
            <div className="viewer-toolbar">
                <div className="toolbar-left">
                    <div className="zoom-controls">
                        <button onClick={zoomOut} disabled={zoom <= 50} className="btn-tool" title="Zoom Out">
                            <ZoomOut size={18} />
                        </button>
                        <select
                            value={zoom}
                            onChange={(e) => setZoom(Number(e.target.value))}
                            className="zoom-select"
                        >
                            {[50, 75, 100, 125, 150, 200].map(v => (
                                <option key={v} value={v}>{v}%</option>
                            ))}
                        </select>
                        <button onClick={zoomIn} disabled={zoom >= 200} className="btn-tool" title="Zoom In">
                            <ZoomIn size={18} />
                        </button>
                    </div>
                    <button className="btn-tool" onClick={() => setZoom(100)} title="Fit to Width">
                        <Maximize2 size={18} />
                    </button>
                </div>

                <div className="toolbar-center">
                    <button
                        onClick={() => currentPage > 1 && setCurrentPage(currentPage - 1)}
                        disabled={currentPage <= 1}
                        className="btn-nav"
                    >
                        <ChevronLeft size={20} />
                    </button>

                    <span className="page-info">
                        <input
                            type="number"
                            value={currentPage}
                            onChange={(e) => {
                                const p = parseInt(e.target.value);
                                if (p >= 1 && p <= activeDocument.pageCount) setCurrentPage(p);
                            }}
                            className="page-input"
                            min={1}
                            max={activeDocument.pageCount}
                        />
                        <span className="page-divider">/</span>
                        <span className="page-count">{activeDocument.pageCount}</span>
                    </span>

                    <button
                        onClick={() => currentPage < activeDocument.pageCount && setCurrentPage(currentPage + 1)}
                        disabled={currentPage >= activeDocument.pageCount}
                        className="btn-nav"
                    >
                        <ChevronRight size={20} />
                    </button>
                </div>

                <div className="toolbar-right">
                    <div className="view-modes">
                        <button
                            onClick={() => setViewMode('single')}
                            className={`btn-view ${viewMode === 'single' ? 'active' : ''}`}
                            title="Single Page"
                        >
                            <FileText size={18} />
                        </button>
                        <button
                            onClick={() => setViewMode('continuous')}
                            className={`btn-view ${viewMode === 'continuous' ? 'active' : ''}`}
                            title="Continuous"
                        >
                            <Columns size={18} />
                        </button>
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`btn-view ${viewMode === 'grid' ? 'active' : ''}`}
                            title="Grid View"
                        >
                            <Grid size={18} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Main content */}
            <div className="viewer-main">
                {/* Thumbnail sidebar */}
                <div className="thumb-sidebar">
                    <div className="thumb-header">
                        <span>Pages</span>
                        {selectedPages.length > 0 && (
                            <span className="selection-badge">{selectedPages.length}</span>
                        )}
                    </div>
                    <div className="thumb-list">
                        {Array.from({ length: activeDocument.pageCount }, (_, i) => i + 1).map(pageNum => {
                            const isSelected = selectedPages.includes(pageNum);
                            const isCurrent = currentPage === pageNum;
                            const imgSrc = pageImages[pageNum - 1];

                            return (
                                <div
                                    key={pageNum}
                                    className={`thumb-item ${isSelected ? 'selected' : ''} ${isCurrent ? 'current' : ''}`}
                                    onClick={(e) => handlePageClick(pageNum, e)}
                                >
                                    {isSelected && (
                                        <div className="thumb-check"><Check size={10} /></div>
                                    )}
                                    <div className="thumb-img">
                                        {imgSrc ? (
                                            <img src={imgSrc} alt={`Page ${pageNum}`} />
                                        ) : (
                                            <div className="thumb-loading">
                                                <div className="spinner-sm"></div>
                                            </div>
                                        )}
                                    </div>
                                    <span className="thumb-num">{pageNum}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Page viewer */}
                <div className="page-viewport" ref={containerRef}>
                    <div className="page-canvas" style={{ transform: `scale(${zoom / 100})` }}>
                        {viewMode === 'single' && (
                            <div className="view-single">
                                {pageImages[currentPage - 1] ? (
                                    <div
                                        className={`page-item single-page ${activeTool === 'add-text' ? 'add-text-mode' : ''} ${isFreehandTool ? 'draw-mode' : ''} ${isRegionTool ? 'selection-mode' : ''}`}
                                        onClick={(e) => handleTextPlacement(currentPage, e)}
                                        onMouseDown={(e) => handleMouseDown(currentPage, e)}
                                        onMouseMove={(e) => handleMouseMove(currentPage, e)}
                                        onMouseUp={() => handleMouseUp(currentPage)}
                                        onMouseLeave={() => handleMouseLeave(currentPage)}
                                        style={{ position: 'relative' }}
                                    >
                                        <img
                                            src={pageImages[currentPage - 1]}
                                            alt={`Page ${currentPage}`}
                                            style={{ pointerEvents: isAnnotationToolActive || activeTool === 'add-text' ? 'none' : 'auto' }}
                                        />

                                        {/* SVG Annotations Overlay */}
                                        <svg
                                            className="annotations-overlay"
                                            style={{
                                                position: 'absolute',
                                                top: 0,
                                                left: 0,
                                                width: '100%',
                                                height: '100%',
                                                pointerEvents: 'none',
                                                overflow: 'visible',
                                            }}
                                        >
                                            {/* Highlight regions */}
                                            {regions
                                                .filter(r => r.pageNumber === currentPage && r.type === 'highlight')
                                                .map(region => (
                                                    <rect
                                                        key={region.id}
                                                        x={`${region.startX}%`}
                                                        y={`${region.startY}%`}
                                                        width={`${region.endX - region.startX}%`}
                                                        height={`${region.endY - region.startY}%`}
                                                        fill={region.color}
                                                        opacity={region.opacity}
                                                    />
                                                ))}

                                            {/* Redact regions */}
                                            {regions
                                                .filter(r => r.pageNumber === currentPage && r.type === 'redact')
                                                .map(region => (
                                                    <rect
                                                        key={region.id}
                                                        x={`${region.startX}%`}
                                                        y={`${region.startY}%`}
                                                        width={`${region.endX - region.startX}%`}
                                                        height={`${region.endY - region.startY}%`}
                                                        fill={region.color}
                                                        opacity={1}
                                                    />
                                                ))}

                                            {/* Current region being drawn */}
                                            {isSelectingRegion && currentRegion && (
                                                <rect
                                                    x={`${Math.min(currentRegion.startX, currentRegion.endX)}%`}
                                                    y={`${Math.min(currentRegion.startY, currentRegion.endY)}%`}
                                                    width={`${Math.abs(currentRegion.endX - currentRegion.startX)}%`}
                                                    height={`${Math.abs(currentRegion.endY - currentRegion.startY)}%`}
                                                    fill={activeTool === 'highlight' ? toolSettings.highlightColor : toolSettings.redactColor}
                                                    opacity={activeTool === 'highlight' ? toolSettings.highlightOpacity : 0.7}
                                                    stroke={activeTool === 'highlight' ? '#B8860B' : '#333'}
                                                    strokeWidth="2"
                                                    strokeDasharray="5,5"
                                                />
                                            )}

                                            {/* All strokes (draw and signature) */}
                                            {strokes
                                                .filter(s => s.pageNumber === currentPage)
                                                .map(stroke => (
                                                    <path
                                                        key={stroke.id}
                                                        d={stroke.points.map((p, i) =>
                                                            `${i === 0 ? 'M' : 'L'} ${p.x}% ${p.y}%`
                                                        ).join(' ')}
                                                        stroke={stroke.color}
                                                        strokeWidth={stroke.width}
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        fill="none"
                                                        vectorEffect="non-scaling-stroke"
                                                        className={stroke.type === 'signature' ? 'signature-stroke' : 'draw-stroke'}
                                                    />
                                                ))}

                                            {/* Current stroke being drawn */}
                                            {isDrawing && currentStroke.length > 1 && (
                                                <path
                                                    d={currentStroke.map((p, i) =>
                                                        `${i === 0 ? 'M' : 'L'} ${p.x}% ${p.y}%`
                                                    ).join(' ')}
                                                    stroke={activeTool === 'signature' ? toolSettings.signatureColor : toolSettings.drawColor}
                                                    strokeWidth={activeTool === 'signature' ? toolSettings.signatureWidth : toolSettings.drawWidth}
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    fill="none"
                                                    vectorEffect="non-scaling-stroke"
                                                />
                                            )}
                                        </svg>

                                        {/* Text Annotation Overlay */}
                                        {textAnnotations
                                            .filter(ann => ann.pageNumber === currentPage)
                                            .map(annotation => (
                                                <div
                                                    key={annotation.id}
                                                    className={`text-annotation ${annotation.isEditing ? 'editing' : ''}`}
                                                    style={{
                                                        position: 'absolute',
                                                        left: `${annotation.x}%`,
                                                        top: `${annotation.y}%`,
                                                        transform: 'translate(-50%, -50%)',
                                                        zIndex: 10,
                                                    }}
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    {annotation.isEditing ? (
                                                        <div className="text-annotation-editor">
                                                            <input
                                                                type="text"
                                                                autoFocus
                                                                placeholder="Type here..."
                                                                value={annotation.text}
                                                                onChange={(e) => updateAnnotationText(annotation.id, e.target.value)}
                                                                onKeyDown={(e) => {
                                                                    if (e.key === 'Enter') finishEditing(annotation.id);
                                                                    if (e.key === 'Escape') deleteAnnotation(annotation.id);
                                                                }}
                                                                onBlur={() => finishEditing(annotation.id)}
                                                                style={{
                                                                    fontSize: `${annotation.fontSize}px`,
                                                                    fontFamily: annotation.fontFamily,
                                                                    color: annotation.color,
                                                                }}
                                                                className="text-annotation-input"
                                                            />
                                                            <button
                                                                className="text-annotation-delete"
                                                                onClick={() => deleteAnnotation(annotation.id)}
                                                            >
                                                                <X size={14} />
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <span
                                                            className="text-annotation-content"
                                                            style={{
                                                                fontSize: `${annotation.fontSize}px`,
                                                                fontFamily: annotation.fontFamily,
                                                                color: annotation.color,
                                                            }}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setTextAnnotations(prev =>
                                                                    prev.map(ann => ({ ...ann, isEditing: ann.id === annotation.id }))
                                                                );
                                                                setActiveAnnotation(annotation.id);
                                                            }}
                                                        >
                                                            {annotation.text}
                                                        </span>
                                                    )}
                                                </div>
                                            ))}

                                        {/* Add Text Mode Indicator */}
                                        {activeTool === 'add-text' && (
                                            <div className="tool-mode-indicator">
                                                <Type size={16} />
                                                <span>Click anywhere to add text</span>
                                            </div>
                                        )}

                                        {/* Draw Mode Indicator */}
                                        {activeTool === 'draw' && (
                                            <div className="tool-mode-indicator draw-indicator">
                                                <Pencil size={16} />
                                                <span>Draw on the page</span>
                                            </div>
                                        )}

                                        {/* Signature Mode Indicator */}
                                        {activeTool === 'signature' && (
                                            <div className="tool-mode-indicator signature-indicator">
                                                <PenTool size={16} />
                                                <span>Sign directly on the page</span>
                                            </div>
                                        )}

                                        {/* Highlight Mode Indicator */}
                                        {activeTool === 'highlight' && (
                                            <div className="tool-mode-indicator highlight-indicator">
                                                <Highlighter size={16} />
                                                <span>Drag to highlight areas</span>
                                            </div>
                                        )}

                                        {/* Redact Mode Indicator */}
                                        {activeTool === 'redact' && (
                                            <div className="tool-mode-indicator redact-indicator">
                                                <EyeOff size={16} />
                                                <span>Drag to redact areas</span>
                                            </div>
                                        )}

                                        {/* Annotation Controls - Undo/Clear */}
                                        {isAnnotationToolActive && (
                                            <div className="annotation-controls">
                                                <button
                                                    className="annotation-control-btn"
                                                    onClick={undoLastAnnotation}
                                                    title="Undo last"
                                                >
                                                    <Undo2 size={14} />
                                                </button>
                                                <button
                                                    className="annotation-control-btn"
                                                    onClick={clearToolAnnotations}
                                                    title="Clear all"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                                <span className="annotation-count">
                                                    {getAnnotationCount(activeTool || '')} items
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="page-loading">
                                        <div className="spinner"></div>
                                        <span>Loading page {currentPage}...</span>
                                    </div>
                                )}
                            </div>
                        )}

                        {viewMode === 'continuous' && (
                            <div className="view-continuous">
                                {Array.from({ length: activeDocument.pageCount }, (_, i) => i + 1).map(pageNum => (
                                    <div
                                        key={pageNum}
                                        ref={el => pageRefs.current[pageNum - 1] = el}
                                        className={`page-item continuous-page ${selectedPages.includes(pageNum) ? 'selected' : ''}`}
                                        onClick={(e) => handlePageClick(pageNum, e)}
                                    >
                                        {pageImages[pageNum - 1] ? (
                                            <img src={pageImages[pageNum - 1]} alt={`Page ${pageNum}`} />
                                        ) : (
                                            <div className="page-skeleton"></div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}

                        {viewMode === 'grid' && (
                            <div className="view-grid">
                                {Array.from({ length: activeDocument.pageCount }, (_, i) => i + 1).map(pageNum => (
                                    <div
                                        key={pageNum}
                                        className={`page-item grid-card ${selectedPages.includes(pageNum) ? 'selected' : ''}`}
                                        onClick={(e) => handlePageClick(pageNum, e)}
                                    >
                                        <div className="grid-thumb">
                                            {pageImages[pageNum - 1] ? (
                                                <img src={pageImages[pageNum - 1]} alt={`Page ${pageNum}`} />
                                            ) : (
                                                <div className="grid-skeleton"></div>
                                            )}
                                        </div>
                                        <span className="grid-num">{pageNum}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Loading bar */}
            {
                isLoading && (
                    <div className="loading-bar">
                        <div className="loading-track">
                            <div className="loading-fill" style={{ width: `${loadProgress}%` }}></div>
                        </div>
                        <span className="loading-text">Rendering pages... {loadProgress}%</span>
                    </div>
                )
            }
        </div >
    );
}
