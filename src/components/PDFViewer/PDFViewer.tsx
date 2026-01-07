/**
 * PDFViewer Component
 * Enhanced PDF viewing with direct annotation support
 * Fixed coordinate system for accurate drawing
 */

import { useEffect, useState, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { useApp } from '../../store/appStore';
import {
    ZoomIn,
    ZoomOut,
} from 'lucide-react';
import './PDFViewer.css';
import { TextInputModal } from '../UI/TextInputModal';
import {
    Annotation,
    FreehandAnnotation,
    HighlightAnnotation,
    TextAnnotation,
    StampAnnotation,
    NoteAnnotation,
    SignatureAnnotation
} from '../../types';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export function PDFViewer() {
    const {
        state,
        zoomIn,
        zoomOut,
        addAnnotation,
        updateAnnotation,
        deleteAnnotation
    } = useApp();

    const { activeDocument, zoom, viewMode, selectedPages, activeTool, toolOptions } = state;

    const [renderedPages, setRenderedPages] = useState<Record<number, string>>({});
    const [isLoading, setIsLoading] = useState(false);
    const [loadingProgress, setLoadingProgress] = useState(0);

    // Interaction State
    const [isDrawing, setIsDrawing] = useState(false);
    const [currentStroke, setCurrentStroke] = useState<{ x: number, y: number }[]>([]);

    const [isSelectingRegion, setIsSelectingRegion] = useState(false);
    const [currentRegion, setCurrentRegion] = useState<{ startX: number, startY: number, endX: number, endY: number } | null>(null);

    const pdfDocRef = useRef<pdfjsLib.PDFDocumentProxy | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const observerRef = useRef<IntersectionObserver | null>(null);
    const pendingRendersRef = useRef<Set<number>>(new Set());
    const renderedPagesRef = useRef<Record<number, string>>({});

    // Text Input Modal State
    const [textModalOpen, setTextModalOpen] = useState(false);
    const [textModalConfig, setTextModalConfig] = useState<{
        title: string;
        placeholder: string;
        defaultValue: string;
        onConfirm: (value: string) => void;
    } | null>(null);

    // Annotation Selection & Manipulation State
    const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(null);
    const [isDraggingAnnotation, setIsDraggingAnnotation] = useState(false);
    const [dragOffset, setDragOffset] = useState<{ x: number, y: number }>({ x: 0, y: 0 });

    // Keyboard handler for Delete key
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.key === 'Delete' || e.key === 'Backspace') && selectedAnnotationId) {
                // Don't delete if user is typing in an input
                if (document.activeElement?.tagName === 'INPUT' || 
                    document.activeElement?.tagName === 'TEXTAREA') {
                    return;
                }
                e.preventDefault();
                deleteAnnotation(selectedAnnotationId);
                setSelectedAnnotationId(null);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedAnnotationId, deleteAnnotation]);

    // Sync ref
    useEffect(() => { renderedPagesRef.current = renderedPages; }, [renderedPages]);

    // Initialize Document
    useEffect(() => {
        if (!activeDocument) {
            setRenderedPages({});
            pdfDocRef.current = null;
            return;
        }

        const initDoc = async () => {
            setIsLoading(true);
            setLoadingProgress(10);
            try {
                const loadingTask = pdfjsLib.getDocument({
                    data: activeDocument.arrayBuffer.slice(0),
                    disableRange: true,
                    disableAutoFetch: false,
                });

                loadingTask.onProgress = (p: { loaded: number; total: number }) => {
                    const percent = Math.min(90, Math.round((p.loaded / p.total) * 100));
                    setLoadingProgress(percent);
                };

                pdfDocRef.current = await loadingTask.promise;
                setLoadingProgress(100);
                setTimeout(() => setIsLoading(false), 500);
                renderPage(1);
            } catch (err) {
                console.error('Error loading PDF:', err);
                setIsLoading(false);
            }
        };

        setRenderedPages({});
        renderedPagesRef.current = {};
        initDoc();
    }, [activeDocument?.id]);

    // Intersection Observer
    useEffect(() => {
        if (!activeDocument || viewMode === 'single') return;

        if (observerRef.current) observerRef.current.disconnect();

        observerRef.current = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const pageNum = parseInt(entry.target.getAttribute('data-page-number') || '0');
                    if (pageNum > 0 && !renderedPagesRef.current[pageNum] && !pendingRendersRef.current.has(pageNum)) {
                        requestAnimationFrame(() => renderPage(pageNum));
                    }
                }
            });
        }, { root: containerRef.current, rootMargin: '200px', threshold: 0.1 });

        const pages = document.querySelectorAll('.page-wrapper');
        pages.forEach(p => observerRef.current?.observe(p));

        return () => observerRef.current?.disconnect();
    }, [activeDocument, viewMode]);

    const renderPage = async (pageNum: number) => {
        if (!pdfDocRef.current || pendingRendersRef.current.has(pageNum)) return;
        pendingRendersRef.current.add(pageNum);

        try {
            const page = await pdfDocRef.current.getPage(pageNum);
            const scale = 1.5;
            const viewport = page.getViewport({ scale });

            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d', { alpha: false });
            if (!ctx) throw new Error('No context');

            canvas.width = viewport.width;
            canvas.height = viewport.height;
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            await page.render({ canvasContext: ctx, viewport }).promise;

            setRenderedPages(prev => ({ ...prev, [pageNum]: canvas.toDataURL('image/jpeg', 0.8) }));
            page.cleanup();
        } catch (err) {
            console.error(`Error rendering page ${pageNum}:`, err);
        } finally {
            pendingRendersRef.current.delete(pageNum);
        }
    };

    // --- Coordinate Helper (returns percentage relative to container) ---
    const getPoint = (e: React.MouseEvent<HTMLDivElement>) => {
        const target = e.currentTarget;
        const rect = target.getBoundingClientRect();
        return {
            x: ((e.clientX - rect.left) / rect.width) * 100,
            y: ((e.clientY - rect.top) / rect.height) * 100,
        };
    };

    // --- Drawing (Freehand and Signature) ---
    const startDrawing = (e: React.MouseEvent<HTMLDivElement>) => {
        if (activeTool !== 'draw' && activeTool !== 'signature') return;
        e.preventDefault();
        e.stopPropagation();
        const point = getPoint(e);
        setIsDrawing(true);
        setCurrentStroke([point]);
    };

    const drawMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!isDrawing) return;
        e.preventDefault();
        const point = getPoint(e);
        setCurrentStroke(prev => [...prev, point]);
    };

    const stopDrawing = (pageNum: number) => {
        if (!isDrawing || currentStroke.length < 3) {
            setIsDrawing(false);
            setCurrentStroke([]);
            return;
        }

        if (activeTool === 'signature') {
            const newSignature: SignatureAnnotation = {
                id: `signature-${Date.now()}`,
                type: 'signature',
                pageNumber: pageNum,
                x: 0, y: 0, width: 100, height: 100, rotation: 0, opacity: 1,
                color: '#000000',
                createdAt: new Date(), updatedAt: new Date(),
                points: [...currentStroke],
                strokeWidth: 2
            };
            addAnnotation(newSignature);
        } else {
            const newFreehand: FreehandAnnotation = {
                id: `freehand-${Date.now()}`,
                type: 'freehand',
                pageNumber: pageNum,
                x: 0, y: 0, width: 100, height: 100, rotation: 0, opacity: 1,
                color: toolOptions.drawColor,
                createdAt: new Date(), updatedAt: new Date(),
                path: '',
                points: [...currentStroke],
                strokeWidth: toolOptions.drawWidth
            };
            addAnnotation(newFreehand);
        }

        setIsDrawing(false);
        setCurrentStroke([]);
    };

    // --- Region Selection (Highlight/Redact) ---
    const startRegion = (e: React.MouseEvent<HTMLDivElement>) => {
        if (activeTool !== 'highlight' && activeTool !== 'redact') return;
        e.preventDefault();
        e.stopPropagation();
        const point = getPoint(e);
        setIsSelectingRegion(true);
        setCurrentRegion({ startX: point.x, startY: point.y, endX: point.x, endY: point.y });
    };

    const updateRegion = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!isSelectingRegion || !currentRegion) return;
        e.preventDefault();
        const point = getPoint(e);
        setCurrentRegion(prev => prev ? { ...prev, endX: point.x, endY: point.y } : null);
    };

    const finishRegion = (pageNum: number) => {
        if (!isSelectingRegion || !currentRegion) {
            setIsSelectingRegion(false);
            setCurrentRegion(null);
            return;
        }

        const minX = Math.min(currentRegion.startX, currentRegion.endX);
        const minY = Math.min(currentRegion.startY, currentRegion.endY);
        const width = Math.abs(currentRegion.endX - currentRegion.startX);
        const height = Math.abs(currentRegion.endY - currentRegion.startY);

        if (width > 1 && height > 1) {
            const newAnnotation: HighlightAnnotation = {
                id: `${activeTool}-${Date.now()}`,
                type: activeTool as 'highlight' | 'redact',
                pageNumber: pageNum,
                x: minX, y: minY, width, height,
                rotation: 0, opacity: activeTool === 'highlight' ? 0.4 : 1,
                color: activeTool === 'highlight' ? toolOptions.drawColor || '#FFFF00' : '#000000',
                createdAt: new Date(), updatedAt: new Date(),
                rects: [{ x: minX, y: minY, width, height }]
            };
            addAnnotation(newAnnotation);
        }
        setIsSelectingRegion(false);
        setCurrentRegion(null);
    };

    // --- Placement (Stamps, Notes, Text) ---
    const handlePlacement = (pageNum: number, e: React.MouseEvent<HTMLDivElement>) => {
        const point = getPoint(e);

        if (activeTool === 'stamp' && toolOptions.selectedStamp) {
            const stamp = toolOptions.selectedStamp;
            const newStamp: StampAnnotation = {
                id: `stamp-${Date.now()}`,
                type: 'stamp',
                stampType: stamp.type as any,
                customText: stamp.text,
                pageNumber: pageNum,
                x: point.x, y: point.y, width: 20, height: 8,
                rotation: 0, opacity: 1, color: stamp.color,
                createdAt: new Date(), updatedAt: new Date()
            };
            addAnnotation(newStamp);
        }
        else if (activeTool === 'notes') {
            // Open modal for note input
            setTextModalConfig({
                title: 'Add Note',
                placeholder: 'Enter note text...',
                defaultValue: '',
                onConfirm: (noteText: string) => {
                    const newNote: NoteAnnotation = {
                        id: `note-${Date.now()}`,
                        type: 'note',
                        content: noteText,
                        isOpen: true,
                        pageNumber: pageNum,
                        x: point.x, y: point.y, width: 5, height: 5,
                        rotation: 0, opacity: 1, color: toolOptions.noteColor || '#fef08a',
                        createdAt: new Date(), updatedAt: new Date()
                    };
                    addAnnotation(newNote);
                    setTextModalOpen(false);
                }
            });
            setTextModalOpen(true);
        }
        else if (activeTool === 'add-text') {
            // Open modal for text input
            setTextModalConfig({
                title: 'Add Text',
                placeholder: 'Enter your text...',
                defaultValue: '',
                onConfirm: (userText: string) => {
                    const newText: TextAnnotation = {
                        id: `text-${Date.now()}`,
                        type: 'text',
                        content: userText,
                        pageNumber: pageNum,
                        x: point.x, y: point.y, width: 20, height: 5,
                        rotation: 0, opacity: 1, color: toolOptions.drawColor || '#000000',
                        createdAt: new Date(), updatedAt: new Date(),
                        fontSize: 12, fontFamily: 'Arial', fontWeight: 'normal', fontStyle: 'normal', textAlign: 'left'
                    };
                    addAnnotation(newText);
                    setTextModalOpen(false);
                }
            });
            setTextModalOpen(true);
        }
    };

    // --- Annotation Manipulation ---
    const handleAnnotationSelect = (e: React.MouseEvent, annotationId: string) => {
        e.stopPropagation();
        setSelectedAnnotationId(annotationId);
    };

    const handleAnnotationDragStart = (e: React.MouseEvent, ann: Annotation) => {
        e.stopPropagation();
        const target = e.currentTarget as HTMLElement;
        const rect = target.getBoundingClientRect();
        const pointX = ((e.clientX - rect.left) / rect.width) * 100;
        const pointY = ((e.clientY - rect.top) / rect.height) * 100;
        setSelectedAnnotationId(ann.id);
        setIsDraggingAnnotation(true);
        setDragOffset({ x: pointX - ann.x, y: pointY - ann.y });
    };

    const handleAnnotationDragMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!isDraggingAnnotation || !selectedAnnotationId) return;
        
        const point = getPoint(e);
        const newX = Math.max(0, Math.min(100, point.x - dragOffset.x));
        const newY = Math.max(0, Math.min(100, point.y - dragOffset.y));
        
        updateAnnotation(selectedAnnotationId, { x: newX, y: newY } as any);
    };

    const handleAnnotationDragEnd = () => {
        setIsDraggingAnnotation(false);
    };

    // --- Mouse Event Handlers ---
    const handleMouseDown = (pageNum: number, e: React.MouseEvent<HTMLDivElement>) => {
        // If dragging annotation, don't start other actions
        if (isDraggingAnnotation) return;
        
        if (activeTool === 'draw' || activeTool === 'signature') {
            startDrawing(e);
        } else if (activeTool === 'highlight' || activeTool === 'redact') {
            startRegion(e);
        } else if (activeTool === 'stamp' || activeTool === 'notes' || activeTool === 'add-text') {
            handlePlacement(pageNum, e);
        } else if (!activeTool) {
            // Clicking on page background deselects annotation
            setSelectedAnnotationId(null);
        }
    };

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (isDraggingAnnotation) {
            handleAnnotationDragMove(e);
        } else if (isDrawing) {
            drawMove(e);
        } else if (isSelectingRegion) {
            updateRegion(e);
        }
    };

    const handleMouseUp = (pageNum: number) => {
        if (isDraggingAnnotation) {
            handleAnnotationDragEnd();
        } else if (isDrawing) {
            stopDrawing(pageNum);
        } else if (isSelectingRegion) {
            finishRegion(pageNum);
        }
    };

    // --- Render Annotations ---
    const renderAnnotations = (annotations: Annotation[]) => {
        return annotations.map(ann => {
            switch (ann.type) {
                case 'freehand':
                case 'signature':
                    const stroke = ann as FreehandAnnotation | SignatureAnnotation;
                    if (!stroke.points || stroke.points.length < 2) return null;
                    const pathD = stroke.points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
                    return (
                        <path
                            key={ann.id}
                            d={pathD}
                            stroke={ann.color}
                            strokeWidth={stroke.strokeWidth || 2}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            fill="none"
                        />
                    );

                case 'highlight':
                case 'redact':
                    return (
                        <rect
                            key={ann.id}
                            x={ann.x}
                            y={ann.y}
                            width={ann.width}
                            height={ann.height}
                            fill={ann.color}
                            fillOpacity={ann.opacity}
                        />
                    );

                case 'stamp':
                    const stamp = ann as StampAnnotation;
                    // Use text element for proper SVG scaling
                    return (
                        <g key={ann.id} transform={`translate(${ann.x}, ${ann.y})`}>
                            <rect
                                x="-8" y="-2" width="16" height="4"
                                fill="rgba(255,255,255,0.9)"
                                stroke={ann.color}
                                strokeWidth="0.15"
                                rx="0.3"
                                transform="rotate(-12)"
                            />
                            <text
                                x="0" y="0.8"
                                fill={ann.color}
                                fontSize="2"
                                fontWeight="bold"
                                textAnchor="middle"
                                letterSpacing="0.1"
                                transform="rotate(-12)"
                                style={{ textTransform: 'uppercase', pointerEvents: 'auto' }}
                            >
                                {stamp.customText || 'STAMP'}
                            </text>
                        </g>
                    );

                case 'note':
                    const note = ann as NoteAnnotation;
                    const noteContent = note.content || '';

                    // Dynamic sizing based on content
                    const hasContent = noteContent.length > 0;
                    const noteWidth = hasContent ? Math.min(12, Math.max(5, noteContent.length * 0.5)) : 4;
                    const noteHeight = hasContent ? Math.min(8, Math.max(4, Math.ceil(noteContent.length / 15) * 2 + 2)) : 4;

                    const handleNoteClick = (e: React.MouseEvent) => {
                        e.stopPropagation();
                        setTextModalConfig({
                            title: 'Edit Note',
                            placeholder: 'Edit note text...',
                            defaultValue: noteContent,
                            onConfirm: (newContent: string) => {
                                updateAnnotation(ann.id, { content: newContent } as any);
                                setTextModalOpen(false);
                                setTextModalConfig(null);
                            }
                        });
                        setTextModalOpen(true);
                    };

                    // Truncate long text for display
                    const displayText = noteContent.length > 30 ? noteContent.substring(0, 27) + '...' : noteContent;
                    const lines = displayText ? displayText.match(/.{1,12}/g) || [] : [];

                    return (
                        <g key={ann.id} transform={`translate(${ann.x}, ${ann.y})`} style={{ cursor: 'pointer', pointerEvents: 'auto' }}>
                            {/* Note background */}
                            <rect
                                x={-noteWidth / 2} y={-noteHeight / 2}
                                width={noteWidth} height={noteHeight}
                                fill={ann.color || '#fef08a'}
                                stroke="rgba(0,0,0,0.2)"
                                strokeWidth="0.08"
                                rx="0.3"
                                filter="url(#noteShadow)"
                                onClick={handleNoteClick}
                            />
                            {/* Folded corner effect */}
                            <path
                                d={`M${noteWidth / 2 - 1},${-noteHeight / 2} L${noteWidth / 2},${-noteHeight / 2 + 1} L${noteWidth / 2 - 1},${-noteHeight / 2 + 1} Z`}
                                fill="rgba(0,0,0,0.1)"
                            />
                            {/* Text content */}
                            {hasContent ? (
                                <>
                                    {lines.slice(0, 3).map((line, i) => (
                                        <text
                                            key={i}
                                            x={-noteWidth / 2 + 0.4}
                                            y={-noteHeight / 2 + 1.2 + i * 1.1}
                                            fill="#333"
                                            fontSize="0.9"
                                            fontFamily="Arial, sans-serif"
                                            onClick={handleNoteClick}
                                        >
                                            {line}
                                        </text>
                                    ))}
                                </>
                            ) : (
                                <text
                                    x="0" y="0.3"
                                    fill="#999"
                                    fontSize="0.8"
                                    textAnchor="middle"
                                    fontStyle="italic"
                                    onClick={handleNoteClick}
                                >
                                    Click to add
                                </text>
                            )}
                        </g>
                    );

                case 'text':
                    const textAnn = ann as TextAnnotation;
                    // Scale font size - fontSize 12 should be about 1.2 in viewBox units
                    const scaledSize = (textAnn.fontSize || 12) / 10;
                    const textContent = textAnn.content || 'Text';

                    const handleTextClick = (e: React.MouseEvent) => {
                        e.stopPropagation();
                        // Single click selects, double click edits
                        handleAnnotationSelect(e, ann.id);
                    };

                    const handleTextDoubleClick = (e: React.MouseEvent) => {
                        e.stopPropagation();
                        setTextModalConfig({
                            title: 'Edit Text',
                            placeholder: 'Edit your text...',
                            defaultValue: textContent,
                            onConfirm: (newText: string) => {
                                updateAnnotation(ann.id, { content: newText } as any);
                                setTextModalOpen(false);
                                setTextModalConfig(null);
                            }
                        });
                        setTextModalOpen(true);
                    };

                    const isSelected = selectedAnnotationId === ann.id;
                    const textWidth = textContent.length * scaledSize * 0.6;
                    const textHeight = scaledSize * 1.5;

                    return (
                        <g
                            key={ann.id}
                            style={{ cursor: isDraggingAnnotation ? 'grabbing' : 'grab' }}
                            onMouseDown={(e) => handleAnnotationDragStart(e as any, ann)}
                            onClick={handleTextClick}
                            onDoubleClick={handleTextDoubleClick}
                        >
                            {/* Selection border */}
                            {isSelected && (
                                <rect
                                    x={ann.x - 0.5}
                                    y={ann.y - textHeight}
                                    width={textWidth + 1}
                                    height={textHeight + 0.5}
                                    fill="none"
                                    stroke="#3b82f6"
                                    strokeWidth="0.15"
                                    strokeDasharray="0.5,0.3"
                                    style={{ pointerEvents: 'none' }}
                                />
                            )}
                            <text
                                x={ann.x}
                                y={ann.y}
                                fill={ann.color || '#000000'}
                                fontSize={scaledSize}
                                fontFamily={textAnn.fontFamily || 'Arial'}
                                fontWeight={textAnn.fontWeight || 'normal'}
                                fontStyle={textAnn.fontStyle || 'normal'}
                                style={{ pointerEvents: 'auto' }}
                            >
                                {textContent}
                            </text>
                        </g>
                    );

                default:
                    return null;
            }
        });
    };

    // --- Page Classes ---
    const getPageClasses = () => {
        const classes = ['page-content', 'page-item'];
        if (activeTool === 'draw') classes.push('draw-mode');
        else if (activeTool === 'signature') classes.push('signature-mode');
        else if (activeTool === 'highlight' || activeTool === 'redact') classes.push('selection-mode');
        else if (activeTool === 'add-text') classes.push('add-text-mode');
        return classes.join(' ');
    };

    if (!activeDocument) return null;

    // Scroll to a specific page
    const scrollToPage = (pageNum: number) => {
        const pageElement = document.querySelector(`[data-page-number="${pageNum}"]`);
        if (pageElement) {
            pageElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    return (
        <div className="pdf-viewer-layout">
            {/* Left Thumbnail Panel */}
            <div className="thumbnail-panel">
                <div className="thumbnail-list">
                    {activeDocument.pages.map((page) => (
                        <div
                            key={page.pageNumber}
                            className={`thumbnail-item ${selectedPages.includes(page.pageNumber) ? 'active' : ''}`}
                            onClick={() => scrollToPage(page.pageNumber)}
                        >
                            <div className="thumbnail-preview">
                                {renderedPages[page.pageNumber] ? (
                                    <img
                                        src={renderedPages[page.pageNumber]}
                                        alt={`Page ${page.pageNumber}`}
                                        draggable={false}
                                    />
                                ) : (
                                    <div className="thumbnail-placeholder">
                                        <span>{page.pageNumber}</span>
                                    </div>
                                )}
                            </div>
                            <span className="thumbnail-label">{page.pageNumber}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Main Viewer Area */}
            <div className="pdf-viewer">
                {/* Toolbar - Only page info */}
                <div className="viewer-toolbar">
                    <div className="toolbar-center">
                        <span className="page-info">
                            Page {selectedPages[0] || 1} / {activeDocument.pageCount}
                        </span>
                    </div>
                </div>

                {/* Viewer Content */}
                <div className="viewer-content">
                    <div className="documents-container" ref={containerRef}>
                        {activeDocument.pages.map((page) => (
                            <div key={page.pageNumber} className="page-wrapper" data-page-number={page.pageNumber}>
                                <div
                                    className={getPageClasses()}
                                    style={{
                                        width: `${page.width * (zoom / 100)}px`,
                                        height: `${page.height * (zoom / 100)}px`,
                                        position: 'relative'
                                    }}
                                    onMouseDown={(e) => handleMouseDown(page.pageNumber, e)}
                                    onMouseMove={handleMouseMove}
                                    onMouseUp={() => handleMouseUp(page.pageNumber)}
                                    onMouseLeave={() => handleMouseUp(page.pageNumber)}
                                >
                                    {/* PDF Image Layer */}
                                    {renderedPages[page.pageNumber] ? (
                                        <img
                                            src={renderedPages[page.pageNumber]}
                                            alt={`Page ${page.pageNumber}`}
                                            className="page-image"
                                            draggable={false}
                                            style={{ width: '100%', height: '100%', pointerEvents: 'none' }}
                                        />
                                    ) : (
                                        <div className="page-placeholder loading"></div>
                                    )}

                                    {/* Annotations Layer */}
                                    <svg
                                        className="annotations-overlay"
                                        viewBox="0 0 100 100"
                                        preserveAspectRatio="none"
                                        style={{
                                            position: 'absolute',
                                            top: 0,
                                            left: 0,
                                            width: '100%',
                                            height: '100%',
                                            pointerEvents: 'none'
                                        }}
                                    >
                                        {/* SVG Filters */}
                                        <defs>
                                            <filter id="noteShadow" x="-20%" y="-20%" width="140%" height="140%">
                                                <feDropShadow dx="0.1" dy="0.1" stdDeviation="0.2" floodOpacity="0.3" />
                                            </filter>
                                        </defs>

                                        {renderAnnotations(page.annotations)}

                                        {/* Drawing Preview */}
                                        {isDrawing && currentStroke.length > 1 && (
                                            <path
                                                d={currentStroke.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')}
                                                stroke={activeTool === 'signature' ? '#000000' : toolOptions.drawColor}
                                                strokeWidth={activeTool === 'signature' ? 2 : toolOptions.drawWidth}
                                                fill="none"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                            />
                                        )}

                                        {/* Region Preview */}
                                        {isSelectingRegion && currentRegion && (
                                            <rect
                                                x={Math.min(currentRegion.startX, currentRegion.endX)}
                                                y={Math.min(currentRegion.startY, currentRegion.endY)}
                                                width={Math.abs(currentRegion.endX - currentRegion.startX)}
                                                height={Math.abs(currentRegion.endY - currentRegion.startY)}
                                                fill={activeTool === 'highlight' ? toolOptions.drawColor || '#FFFF00' : '#000000'}
                                                fillOpacity={0.4}
                                            />
                                        )}
                                    </svg>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Zoom Controls at Bottom of Editor */}
                <div className="editor-zoom-controls">
                    <button onClick={zoomOut} className="btn-zoom" title="Zoom Out">
                        <ZoomOut size={16} />
                    </button>
                    <span className="zoom-percentage">{zoom}%</span>
                    <button onClick={zoomIn} className="btn-zoom" title="Zoom In">
                        <ZoomIn size={16} />
                    </button>
                </div>

                {isLoading && (
                    <div className="viewer-loading">
                        Loading... {loadingProgress}%
                    </div>
                )}
            </div>

            {/* Text Input Modal */}
            {textModalConfig && (
                <TextInputModal
                    isOpen={textModalOpen}
                    title={textModalConfig.title}
                    placeholder={textModalConfig.placeholder}
                    defaultValue={textModalConfig.defaultValue}
                    onConfirm={textModalConfig.onConfirm}
                    onCancel={() => {
                        setTextModalOpen(false);
                        setTextModalConfig(null);
                    }}
                />
            )}
        </div>
    );
}
