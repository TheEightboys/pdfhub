/**
 * PDFViewer Component
 * Enhanced PDF viewing with direct annotation support
 * Fixed coordinate system for accurate drawing
 */

import { useEffect, useState, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { useApp } from '../../store/appStore';
import { ZoomIn, ZoomOut } from 'lucide-react';
import './PDFViewer.css';
// import { downloadPDF, savePDFWithAnnotations } from '../../utils/pdfHelpers';
import { TextInputModal } from '../UI/TextInputModal';
import {
    Annotation,
    FreehandAnnotation,
    HighlightAnnotation,
    TextAnnotation,
    StampAnnotation,
    NoteAnnotation,
    SignatureAnnotation,
    ImageAnnotation,
    ShapeAnnotation,
    LinkAnnotation
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
        deleteAnnotation,
        setToolOptions,
        setActiveTool
    } = useApp();

    const { activeDocument, zoom, viewMode, selectedPages, activeTool, toolOptions } = state;

    const [renderedPages, setRenderedPages] = useState<Record<number, string>>({});
    const [isLoading, setIsLoading] = useState(false);
    const [loadingProgress, setLoadingProgress] = useState(0);
    const [currentVisiblePage, setCurrentVisiblePage] = useState(1);

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
        showFontSizeOption?: boolean;
        initialFontSize?: number;
        onConfirm: (value: string, fontSize?: number) => void;
    } | null>(null);

    // Annotation Selection & Manipulation State
    const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(null);
    const [isDraggingAnnotation, setIsDraggingAnnotation] = useState(false);
    const [isResizingAnnotation, setIsResizingAnnotation] = useState(false);
    const [resizeHandle, setResizeHandle] = useState<string | null>(null);
    const [dragOffset, setDragOffset] = useState<{ x: number, y: number }>({ x: 0, y: 0 });

    // Eraser Visual State
    const [eraserCursor, setEraserCursor] = useState<{ x: number, y: number, pageNum: number } | null>(null);

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

    // Intersection Observer for page rendering and tracking current page
    useEffect(() => {
        if (!activeDocument || viewMode === 'single') return;

        if (observerRef.current) observerRef.current.disconnect();

        // Track visible pages to find the topmost one
        const visiblePages = new Set<number>();

        observerRef.current = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                const pageNum = parseInt(entry.target.getAttribute('data-page-number') || '0');
                
                if (entry.isIntersecting && entry.intersectionRatio > 0.2) {
                    visiblePages.add(pageNum);
                } else {
                    visiblePages.delete(pageNum);
                }
                
                // Render page if not already rendered
                if (entry.isIntersecting && pageNum > 0 && !renderedPagesRef.current[pageNum] && !pendingRendersRef.current.has(pageNum)) {
                    requestAnimationFrame(() => renderPage(pageNum));
                }
            });
            
            // Update current page to the smallest visible page number (topmost)
            if (visiblePages.size > 0) {
                const topmostPage = Math.min(...Array.from(visiblePages));
                setCurrentVisiblePage(topmostPage);
            }
        }, { root: containerRef.current, rootMargin: '100px', threshold: [0.2, 0.5] });

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
                        x: point.x, y: point.y, width: 12, height: 12, // Larger default size
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
                showFontSizeOption: true,
                initialFontSize: toolOptions.fontSize || 12,
                onConfirm: (userText: string, fontSize?: number) => {
                    const newText: TextAnnotation = {
                        id: `text-${Date.now()}`,
                        type: 'text',
                        content: userText,
                        pageNumber: pageNum,
                        x: point.x, y: point.y, width: 20, height: 5,
                        rotation: 0, opacity: 1, color: toolOptions.drawColor || '#000000',
                        createdAt: new Date(), updatedAt: new Date(),
                        fontSize: fontSize || toolOptions.fontSize || 12,
                        fontFamily: toolOptions.fontFamily || 'Arial',
                        fontWeight: toolOptions.isBold ? 'bold' : 'normal',
                        fontStyle: toolOptions.isItalic ? 'italic' : 'normal',
                        textAlign: toolOptions.textAlign || 'left'
                    };
                    addAnnotation(newText);
                    setTextModalOpen(false);
                }
            });
            setTextModalOpen(true);
        }
        else if (activeTool === 'add-image' && toolOptions.pendingImage) {
            const img = toolOptions.pendingImage;
            
            const newImage: ImageAnnotation = {
                id: `image-${Date.now()}`,
                type: 'image',
                preview: img.preview,
                file: img.file,
                pageNumber: pageNum,
                x: point.x, y: point.y, 
                width: 20, height: 20, // Default size 20%
                rotation: 0, opacity: 1, color: '#000000',
                createdAt: new Date(), updatedAt: new Date()
            };
            addAnnotation(newImage);
            // Clear the pending image so next click doesn't add it again
            setToolOptions({ ...toolOptions, pendingImage: null });
            setActiveTool(null); 
        }
        else if (activeTool === 'shapes' && toolOptions.shapeType) {
             const shapeType = toolOptions.shapeType;
             const newShape: ShapeAnnotation = {
                id: `shape-${Date.now()}`,
                type: shapeType,
                pageNumber: pageNum,
                x: point.x, y: point.y, 
                width: 15, height: 15,
                rotation: 0, 
                opacity: toolOptions.shapeOpacity !== undefined ? toolOptions.shapeOpacity : 1, 
                color: '#000000', // Unused for shapes usually, but part of BaseAnnotation
                strokeColor: toolOptions.shapeStrokeColor || '#000000',
                fillColor: toolOptions.shapeFillColor || 'transparent',
                strokeWidth: toolOptions.shapeStrokeWidth || 2,
                createdAt: new Date(), updatedAt: new Date()
            };
            addAnnotation(newShape);
            // Keep shape tool active for multiple shapes or clear it?
            // Usually shape tools stay active.
        }
    };

    // --- Resize Logic ---
    const handleResizeStart = (e: React.MouseEvent, ann: Annotation, handle: string) => {
        e.stopPropagation();
        e.preventDefault();
        setSelectedAnnotationId(ann.id);
        setIsResizingAnnotation(true);
        setResizeHandle(handle);
    };

    const handleResizeMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!isResizingAnnotation || !selectedAnnotationId || !resizeHandle) return;
        
        const point = getPoint(e);
        // Find current annotation
        // This is inefficient but functional for now. Ideally pass ann to this closure or use a ref.
        // Since we only have ID, we have to find it in activeDocument.pages
        // But activeDocument isn't easy to update partially without a full scan
        // Better: trigger 'updateAnnotation' with delta calculation
        
        // We'll dispatch a special UPDATE that handles logic or calculate here
        // Since we don't have the original rect here easily, let's assume `updateAnnotation` can merge
        // Actually we need the original or current values.
        // Let's rely on finding the annotation in `activeDocument`
        
        let targetAnn: Annotation | null = null;
        for(const p of activeDocument?.pages || []) {
            const found = p.annotations.find(a => a.id === selectedAnnotationId);
            if(found) { targetAnn = found; break; }
        }

        if (!targetAnn) return;

        const updates: any = {};
        const { x, y, width, height } = targetAnn;

        // Simple resizing logic (percentages)
        if (resizeHandle.includes('e')) updates.width = Math.max(1, point.x - x);
        if (resizeHandle.includes('s')) updates.height = Math.max(1, point.y - y);
        if (resizeHandle.includes('w')) {
            const diffX = point.x - x;
            updates.x = point.x;
            updates.width = Math.max(1, width - diffX);
        }
        if (resizeHandle.includes('n')) {
            const diffY = point.y - y;
            updates.y = point.y;
            updates.height = Math.max(1, height - diffY);
        }

        updateAnnotation(selectedAnnotationId, updates);
    };

    const handleResizeEnd = () => {
        setIsResizingAnnotation(false);
        setResizeHandle(null);
    };

    // --- Annotation Manipulation ---
    const handleAnnotationSelect = (e: React.MouseEvent, annotationId: string) => {
        e.stopPropagation();
        
        if (activeTool === 'erase') {
            deleteAnnotation(annotationId);
            return;
        }

        if (isResizingAnnotation) return;
        setSelectedAnnotationId(annotationId);
    };

    const handleAnnotationDragStart = (e: React.MouseEvent, ann: Annotation) => {
        e.stopPropagation();
        
        // Find the page container element to get proper coordinates relative to the page
        const pageElement = (e.target as HTMLElement).closest('.page-wrapper');
        if (!pageElement) return;

        const rect = pageElement.getBoundingClientRect();
        
        // Calculate click position as percentage of PAGE dimensions
        const pageX = ((e.clientX - rect.left) / rect.width) * 100;
        const pageY = ((e.clientY - rect.top) / rect.height) * 100;

        setSelectedAnnotationId(ann.id);
        setIsDraggingAnnotation(true);
        
        // Offset is strictly: ClickPos% - AnnotationPos%
        setDragOffset({ x: pageX - ann.x, y: pageY - ann.y });
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

    // --- Selection UI (HTML Layer) ---
    const renderSelectionOverlay = (ann: Annotation) => {
        if (selectedAnnotationId !== ann.id) return null;
        
        // For text, we estimate bounds differently if we want to wrap it tightly, 
        // but for now relying on ann.width/height is safer if we keep them updated.
        // (Text resizing logic usually updates width/height).
        
        return (
            <div
                key={`overlay-${ann.id}`}
                className="annotation-selection-overlay"
                style={{
                    position: 'absolute',
                    left: `${ann.x}%`,
                    top: `${ann.y}%`,
                    width: `${ann.width}%`,
                    height: `${ann.height}%`,
                    pointerEvents: 'auto', // Capture mouse for moving
                    cursor: isDraggingAnnotation ? 'grabbing' : 'grab',
                    border: '1px dashed #3b82f6',
                    boxSizing: 'content-box' // Ensure border doesn't shrink content
                }}
                onMouseDown={(e) => handleAnnotationDragStart(e, ann)}
            >
                {/* Delete Button - Fixed Size HTML */}
                <div
                    title="Delete"
                    onClick={(e) => {
                        e.stopPropagation();
                        deleteAnnotation(ann.id);
                    }}
                    style={{
                        position: 'absolute',
                        top: '-12px',
                        right: '-12px',
                        width: '24px',
                        height: '24px',
                        backgroundColor: '#ef4444',
                        color: 'white',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                        fontSize: '14px',
                        zIndex: 10
                    }}
                >
                    ×
                </div>

                {/* Resize Handles */}
                {['nw', 'ne', 'sw', 'se'].map((h) => {
                    // Position handles
                    const style: React.CSSProperties = {
                        position: 'absolute',
                        width: '10px',
                        height: '10px',
                        backgroundColor: 'white',
                        border: '1px solid #3b82f6',
                        borderRadius: '50%',
                        pointerEvents: 'auto',
                        zIndex: 5
                    };
                    
                    if (h.includes('n')) style.top = '-5px';
                    if (h.includes('s')) style.bottom = '-5px';
                    if (h.includes('w')) style.left = '-5px';
                    if (h.includes('e')) style.right = '-5px';
                    
                    style.cursor = `${h}-resize`;

                    return (
                        <div
                            key={h}
                            style={style}
                            onMouseDown={(e) => handleResizeStart(e, ann, h)}
                        />
                    );
                })}
            </div>
        );
    };

    // --- Mouse Event Handlers ---
    const handleMouseDown = (pageNum: number, e: React.MouseEvent<HTMLDivElement>) => {
        // If dragging annotation, don't start other actions
        if (isDraggingAnnotation || isResizingAnnotation) return;
        
        if (activeTool === 'draw' || activeTool === 'signature') {
            startDrawing(e);
        } else if (activeTool === 'highlight' || activeTool === 'redact') {
            startRegion(e);
        } else if (activeTool === 'shapes' && toolOptions.shapeType) {
            // Start creating a shape via drag interaction
            const point = getPoint(e);
            
            const shapeType = toolOptions.shapeType;
            const newShape: ShapeAnnotation = {
                id: `shape-${Date.now()}`,
                type: shapeType,
                pageNumber: pageNum,
                x: point.x, y: point.y, 
                width: 0, height: 0, // Starts with 0 size
                rotation: 0, 
                opacity: toolOptions.shapeOpacity !== undefined ? toolOptions.shapeOpacity : 1, 
                color: '#000000', 
                strokeColor: toolOptions.shapeStrokeColor || '#dc2626',
                fillColor: toolOptions.shapeFillColor || 'transparent',
                strokeWidth: toolOptions.shapeStrokeWidth || 1,
                createdAt: new Date(), updatedAt: new Date()
            };
            
            addAnnotation(newShape);
            setSelectedAnnotationId(newShape.id);
            // Simulate resize "SE" (Southeast) immediately to allow dragging out the shape
            setIsResizingAnnotation(true);
            setResizeHandle('se');
        } else if (activeTool === 'stamp' || activeTool === 'notes' || activeTool === 'add-text' || activeTool === 'add-image') {
            handlePlacement(pageNum, e);
        } else if (!activeTool) {
            // Clicking on page background deselects annotation
            setSelectedAnnotationId(null);
        }
    };

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (isResizingAnnotation) {
            handleResizeMove(e);
        } else if (isDraggingAnnotation) {
            handleAnnotationDragMove(e);
        } else if (isDrawing) {
            drawMove(e);
        } else if (isSelectingRegion) {
            updateRegion(e);
        }
        
        // Eraser Drag Logic
        if (activeTool === 'erase') {
             const pageWrapper = (e.target as HTMLElement).closest('.page-wrapper');
             if (pageWrapper) {
                 const rect = pageWrapper.getBoundingClientRect();
                 const pageNumStr = pageWrapper.getAttribute('data-page-number');
                 const pageNum = pageNumStr ? parseInt(pageNumStr) : 0;
                 
                 // Initial cursor tracking (visual only)
                 const relX = ((e.clientX - rect.left) / rect.width) * 100;
                 const relY = ((e.clientY - rect.top) / rect.height) * 100;
                 setEraserCursor({ x: relX, y: relY, pageNum });
                 
                 // Actual Deletion (if button pressed)
                 if (e.buttons === 1) {
                    const x = relX;
                    const y = relY;
                    
                    // 2. Find intersecting annotations
                    const page = activeDocument?.pages.find(p => p.pageNumber === pageNum);
                    if (!page) return;
                    
                    const eraserRadius = 3; 
                    
                    page.annotations.forEach(ann => {
                        let isHit = false;
                        if (ann.type === 'freehand' || ann.type === 'signature') {
                            const intersects = x >= ann.x - eraserRadius && x <= ann.x + ann.width + eraserRadius &&
                                              y >= ann.y - eraserRadius && y <= ann.y + ann.height + eraserRadius;
                            isHit = intersects;
                        } else {
                            const intersects = x >= ann.x && x <= ann.x + ann.width &&
                                              y >= ann.y && y <= ann.y + ann.height;
                            isHit = intersects;
                        }
                        
                        if (isHit) {
                            deleteAnnotation(ann.id);
                        }
                    });
                 }
             } else {
                 setEraserCursor(null);
             }
        } else {
             setEraserCursor(null);
        }
    };

    const handleMouseUp = (pageNum: number) => {
        if (isResizingAnnotation) {
            handleResizeEnd();
        } else if (isDraggingAnnotation) {
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
                    const isSelectedVal = selectedAnnotationId === ann.id;
                    return (
                        <g 
                            key={ann.id}
                            style={{ cursor: isDraggingAnnotation ? 'grabbing' : 'grab', pointerEvents: 'auto' }}
                            onMouseDown={(e) => handleAnnotationDragStart(e as any, ann)}
                            onClick={(e) => handleAnnotationSelect(e, ann.id)}
                        >
                            {/* Invisible thick path for easier selection */}
                            <path
                                d={pathD}
                                stroke="transparent"
                                strokeWidth={(stroke.strokeWidth || 2) + 4} // Increase hit area
                                fill="none"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                             {/* Selection Glow */}
                             {isSelectedVal && (
                                <path
                                    d={pathD}
                                    stroke="#3b82f6"
                                    strokeWidth={(stroke.strokeWidth || 2) + 2}
                                    fill="none"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    opacity="0.5"
                                />
                            )}
                            {/* Actual drawing */}
                            <path
                                d={pathD}
                                stroke={ann.color}
                                strokeWidth={stroke.strokeWidth || 2}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                fill="none"
                            />
                        </g>
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

                    // Dynamic sizing fallback if width/height not set
                    const hasContent = noteContent.length > 0;
                    // Use stored dimensions if available, otherwise calculate defaults
                    const finalWidth = ann.width || (hasContent ? Math.min(12, Math.max(5, noteContent.length * 0.5)) : 5);
                    const finalHeight = ann.height || (hasContent ? Math.min(8, Math.max(4, Math.ceil(noteContent.length / 15) * 2 + 2)) : 5);

                    const handleNoteClick = (e: React.MouseEvent) => {
                        handleAnnotationSelect(e, ann.id);
                    };

                    const handleNoteDoubleClick = (e: React.MouseEvent) => {
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
                        <g 
                            key={ann.id} 
                            // transform removed, using direct x/y
                            style={{ cursor: 'pointer', pointerEvents: 'auto' }}
                            onMouseDown={(e) => handleAnnotationDragStart(e as any, ann)}
                            onClick={handleNoteClick}
                            onDoubleClick={handleNoteDoubleClick}
                        >
                            {/* Note Background */}
                            <path
                                d={`M${ann.x} ${ann.y} h${finalWidth} v${finalHeight - 2} l-2 2 h-${finalWidth - 2} z`} // Folded corner effect
                                fill={ann.color || '#fef3c7'}
                                stroke="#d1d5db"
                                strokeWidth="0.1"
                                filter="url(#noteShadow)"
                            />
                            {/* Folded Corner */}
                            <path
                                d={`M${ann.x + finalWidth - 2} ${ann.y + finalHeight - 2} v2 h2 z`}
                                fill="#e5e7eb"
                                stroke="#d1d5db"
                                strokeWidth="0.1"
                            />
                            
                            {/* Text Content */}
                            {lines.map((line, i) => (
                                <text
                                    key={i}
                                    x={ann.x + 0.5}
                                    y={ann.y + 1.5 + (i * 1.2)}
                                    fontSize="1"
                                    fontFamily="Arial"
                                    fill="#4b5563"
                                    style={{ pointerEvents: 'none', userSelect: 'none' }}
                                >
                                    {line}
                                </text>
                            ))}
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

                case 'image':
                    const imgAnn = ann as ImageAnnotation;
                    return (
                        <g 
                           key={ann.id}
                           onMouseDown={(e) => handleAnnotationDragStart(e, ann)}
                           onClick={(e) => handleAnnotationSelect(e, ann.id)}
                           style={{ cursor: isDraggingAnnotation ? 'grabbing' : 'grab' }}
                        >
                            <image
                                x={ann.x} y={ann.y}
                                width={ann.width} height={ann.height}
                                href={imgAnn.preview}
                                preserveAspectRatio="none"
                                style={{ pointerEvents: 'none' }} 
                            />
                            {/* Invisible hit area for easier selection if image has transparency */}
                             <rect
                                x={ann.x} y={ann.y}
                                width={ann.width} height={ann.height}
                                fill="transparent"
                                stroke="none"
                                style={{ pointerEvents: 'auto' }}
                            />
                        </g>
                    );

                case 'rectangle':
                case 'circle':
                case 'arrow':
                case 'line':
                    const shape = ann as ShapeAnnotation;
                    // Scale stroke width: User input 1-10 should map to reasonable SVG % thickness (e.g. 0.1% to 1%)
                    const scaledStroke = (shape.strokeWidth || 1) * 0.15;
                    
                    return (
                        <g 
                            key={ann.id}
                           onMouseDown={(e) => handleAnnotationDragStart(e, ann)}
                           onClick={(e) => handleAnnotationSelect(e, ann.id)}
                           style={{ cursor: isDraggingAnnotation ? 'grabbing' : 'grab' }}
                        >
                            {ann.type === 'rectangle' && (
                                <rect
                                    x={ann.x} y={ann.y}
                                    width={ann.width} height={ann.height}
                                    stroke={shape.strokeColor}
                                    strokeWidth={scaledStroke}
                                    fill={shape.fillColor || 'none'}
                                    vectorEffect="non-scaling-stroke"
                                    style={{ pointerEvents: 'auto' }} 
                                />
                            )}
                            {ann.type === 'circle' && (
                                <ellipse
                                    cx={ann.x + ann.width / 2} cy={ann.y + ann.height / 2}
                                    rx={ann.width / 2} ry={ann.height / 2}
                                    stroke={shape.strokeColor}
                                    strokeWidth={scaledStroke}
                                    fill={shape.fillColor || 'none'}
                                    vectorEffect="non-scaling-stroke"
                                    style={{ pointerEvents: 'auto' }}
                                />
                            )}
                            {ann.type === 'line' && (
                                <line
                                    x1={ann.x} y1={ann.y}
                                    x2={ann.x + ann.width} y2={ann.y + ann.height}
                                    stroke={shape.strokeColor}
                                    strokeWidth={scaledStroke}
                                    vectorEffect="non-scaling-stroke"
                                    style={{ pointerEvents: 'auto' }}
                                />
                            )}
                            {ann.type === 'arrow' && (
                                <g>
                                    <defs>
                                        <marker
                                            id={`arrowhead-${ann.id}`}
                                            markerWidth="10" markerHeight="7"
                                            refX="9" refY="3.5"
                                            orient="auto"
                                        >
                                            <polygon points="0 0, 10 3.5, 0 7" fill={shape.strokeColor} />
                                        </marker>
                                    </defs>
                                    <line
                                        x1={ann.x} y1={ann.y}
                                        x2={ann.x + ann.width} y2={ann.y + ann.height}
                                        stroke={shape.strokeColor}
                                        strokeWidth={scaledStroke}
                                        markerEnd={`url(#arrowhead-${ann.id})`}
                                        vectorEffect="non-scaling-stroke"
                                        style={{ pointerEvents: 'auto' }}
                                    />
                                </g>
                            )}
                        </g>
                    );

                case 'link':
                    const linkAnn = ann as LinkAnnotation;
                    return (
                        <g 
                            key={ann.id}
                           onMouseDown={(e) => handleAnnotationDragStart(e, ann)}
                           onClick={(e) => handleAnnotationSelect(e, ann.id)}
                           style={{ cursor: isDraggingAnnotation ? 'grabbing' : 'grab' }}
                        >
                            <rect
                                x={ann.x} y={ann.y}
                                width={ann.width} height={ann.height}
                                fill="rgba(66, 133, 244, 0.2)" // Light blue transparent
                                stroke="#4285f4"
                                strokeWidth="0.5"
                                strokeDasharray="4,2"
                                vectorEffect="non-scaling-stroke"
                                style={{ pointerEvents: 'auto' }}
                            />
                            {/* Visual Label */}
                            <text
                                x={ann.x + 2}
                                y={ann.y + 4}
                                fontSize="3"
                                fill="#2563eb"
                                style={{ pointerEvents: 'none', userSelect: 'none' }}
                            >
                                {linkAnn.linkType === 'url' ? '🔗 URL' : `📄 Page ${linkAnn.targetPage}`}
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
        else if (activeTool === 'erase') classes.push('erase-mode');
        return classes.join(' ');
    };

    // const { addToast } = useToast();

    if (!activeDocument) return null;

    /* Hidden as per user request
    const handleSave = async () => {
        if (!activeDocument) return;
        try {
            const bytes = await savePDFWithAnnotations(activeDocument);
            downloadPDF(bytes, activeDocument.name);
            addToast({ 
                type: 'success', 
                title: 'Content Saved', 
                duration: 1000 
            });
        } catch (error: any) {
            console.error('Failed to save PDF:', error);
            const errorMsg = error?.message || (typeof error === 'string' ? error : 'Could not burn annotations.');
            addToast({ 
                type: 'error', 
                title: 'Save Failed', 
                message: errorMsg 
            });
        }
    };
    */

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
                        >
                            <div 
                                className="thumbnail-preview"
                                onClick={() => scrollToPage(page.pageNumber)}
                            >
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
                {/* Page Info at Bottom */}
                <div className="thumbnail-page-info">
                    <span>Page {currentVisiblePage} / {activeDocument.pageCount}</span>
                </div>
            </div>

            {/* Main Viewer Area */}
            <div className="pdf-viewer">
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

                                    {/* Selection Overlays (HTML Layer) */}
                                    {page.annotations.map(ann => renderSelectionOverlay(ann))}

                                    {/* Annotations Layer (SVG) */}
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
                                            />
                                        )}

                                        {/* Eraser Visual Cursor */}
                                        {activeTool === 'erase' && eraserCursor && eraserCursor.pageNum === page.pageNumber && (
                                            <circle
                                                cx={eraserCursor.x}
                                                cy={eraserCursor.y}
                                                r="3" 
                                                fill="rgba(255, 255, 255, 0.5)"
                                                stroke="#000"
                                                strokeWidth="0.5"
                                                pointerEvents="none" 
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
                    {/* Hidden as per user request, but functionality preserved
                    <button 
                        onClick={handleSave} 
                        className="btn-zoom btn-save-floating" 
                        disabled={!activeDocument}
                        title="Save Changes (Burn Annotations)"
                    >
                        <Save size={16} />
                        <span style={{ marginLeft: '4px', fontSize: '12px', fontWeight: 600 }}>Save</span>
                    </button>
                    <div className="zoom-divider" /> */}
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
                    showFontSizeOption={textModalConfig.showFontSizeOption}
                    initialFontSize={textModalConfig.initialFontSize}
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
