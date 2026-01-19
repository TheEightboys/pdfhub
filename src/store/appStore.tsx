/**
 * App State Management
 * React Context-based state for the PDF Editor
 */

import React, { createContext, useContext, useReducer, useCallback, ReactNode } from 'react';
import { AppState, AppAction, PDFDocument, ToolId, Annotation, PreviewState } from '../types';

// Initial state
const initialState: AppState = {
    theme: (localStorage.getItem('theme') as 'light' | 'dark') || 'light',
    sidebarCollapsed: false,
    activeTool: null,
    activeDocument: null,
    documents: [],
    selectedPages: [],
    zoom: 100,
    viewMode: 'continuous',
    isLoading: false,
    loadingMessage: undefined,
    previewState: null,
    user: null,
    toolOptions: {
        drawColor: '#000000',
        drawWidth: 3,
        noteColor: '#fef08a',
        shapeType: 'rectangle',
        shapeStrokeColor: '#000000',
        shapeFillColor: 'transparent',
        shapeStrokeWidth: 2,
    },
};

// Reducer
function appReducer(state: AppState, action: AppAction): AppState {
    switch (action.type) {
        case 'SET_THEME':
            localStorage.setItem('theme', action.payload);
            document.documentElement.setAttribute('data-theme', action.payload);
            return { ...state, theme: action.payload };

        case 'TOGGLE_SIDEBAR':
            return { ...state, sidebarCollapsed: !state.sidebarCollapsed };

        case 'SET_ACTIVE_TOOL':
            return { ...state, activeTool: action.payload };

        case 'LOAD_DOCUMENT':
            return {
                ...state,
                activeDocument: action.payload,
                documents: [...state.documents, action.payload],
                selectedPages: [],
                isLoading: false,
            };

        case 'CLOSE_DOCUMENT':
            const remainingDocs = state.documents.filter(d => d.id !== action.payload);
            return {
                ...state,
                documents: remainingDocs,
                activeDocument: remainingDocs.length > 0 ? remainingDocs[remainingDocs.length - 1] : null,
                selectedPages: [],
            };

        case 'UPDATE_DOCUMENT':
            if (!state.activeDocument) return state;
            const updatedDoc = { ...state.activeDocument, ...action.payload } as PDFDocument;
            return {
                ...state,
                activeDocument: updatedDoc,
                documents: state.documents.map(d =>
                    d.id === updatedDoc.id ? updatedDoc : d
                ),
            };

        case 'SELECT_PAGES':
            return { ...state, selectedPages: action.payload };

        case 'SET_ZOOM':
            return { ...state, zoom: Math.max(25, Math.min(400, action.payload)) };

        case 'SET_VIEW_MODE':
            return { ...state, viewMode: action.payload };

        case 'SET_LOADING':
            return {
                ...state,
                isLoading: action.payload.isLoading,
                loadingMessage: action.payload.message,
            };

        case 'SET_PREVIEW_STATE':
            return {
                ...state,
                previewState: action.payload,
            };

        case 'ADD_ANNOTATION':
            if (!state.activeDocument) return state;
            const pageIndex = action.payload.pageNumber - 1;
            const updatedPages = [...state.activeDocument.pages];
            updatedPages[pageIndex] = {
                ...updatedPages[pageIndex],
                annotations: [...updatedPages[pageIndex].annotations, action.payload],
            };
            const newActiveDoc = { ...state.activeDocument, pages: updatedPages };
            return {
                ...state,
                activeDocument: newActiveDoc,
                documents: state.documents.map(d => 
                    d.id === newActiveDoc.id ? newActiveDoc : d
                ),
            };

        case 'UPDATE_ANNOTATION':
            if (!state.activeDocument) return state;
            const updatedActiveDocUpdate = {
                ...state.activeDocument,
                pages: state.activeDocument.pages.map(page => ({
                    ...page,
                    annotations: page.annotations.map(ann =>
                        ann.id === action.payload.id
                            ? { ...ann, ...action.payload.updates } as Annotation
                            : ann
                    ),
                })),
            };
            return {
                ...state,
                activeDocument: updatedActiveDocUpdate,
                documents: state.documents.map(d => 
                    d.id === updatedActiveDocUpdate.id ? updatedActiveDocUpdate : d
                ),
            };

        case 'DELETE_ANNOTATION':
            if (!state.activeDocument) return state;
            const updatedActiveDocDelete = {
                ...state.activeDocument,
                pages: state.activeDocument.pages.map(page => ({
                    ...page,
                    annotations: page.annotations.filter(ann => ann.id !== action.payload),
                })),
            };
            return {
                ...state,
                activeDocument: updatedActiveDocDelete,
                documents: state.documents.map(d => 
                    d.id === updatedActiveDocDelete.id ? updatedActiveDocDelete : d
                ),
            };

        case 'LOGIN':
            return { ...state, user: action.payload };

        case 'LOGOUT':
            return { ...state, user: null };

        case 'SET_TOOL_OPTIONS':
            return {
                ...state,
                toolOptions: { ...state.toolOptions, ...action.payload },
            };

        default:
            return state;
    }
}

// Context
interface AppContextType {
    state: AppState;
    dispatch: React.Dispatch<AppAction>;
    // Helper actions
    setTheme: (theme: 'light' | 'dark') => void;
    toggleTheme: () => void;
    toggleSidebar: () => void;
    setActiveTool: (tool: ToolId | null) => void;
    loadDocument: (doc: PDFDocument) => void;
    closeDocument: (id: string) => void;
    updateDocument: (updates: Partial<PDFDocument>) => void;
    selectPages: (pages: number[]) => void;
    togglePageSelection: (pageNumber: number) => void;
    selectAllPages: () => void;
    deselectAllPages: () => void;
    setZoom: (zoom: number) => void;
    zoomIn: () => void;
    zoomOut: () => void;
    setViewMode: (mode: 'single' | 'continuous' | 'grid') => void;
    setLoading: (isLoading: boolean, message?: string) => void;
    addAnnotation: (annotation: Annotation) => void;
    updateAnnotation: (id: string, updates: Partial<Annotation>) => void;
    deleteAnnotation: (id: string) => void;
    setPreviewState: (state: PreviewState | null) => void;
    login: (user: import('../types').User) => void;
    logout: () => void;
    setToolOptions: (options: Partial<import('../types').ToolOptions>) => void;
}

const AppContext = createContext<AppContextType | null>(null);

// Provider
export function AppProvider({ children }: { children: ReactNode }) {
    const [state, dispatch] = useReducer(appReducer, initialState);

    // Apply initial theme
    React.useEffect(() => {
        document.documentElement.setAttribute('data-theme', state.theme);
    }, []);

    // Helper functions
    const setTheme = useCallback((theme: 'light' | 'dark') => {
        dispatch({ type: 'SET_THEME', payload: theme });
    }, []);

    const toggleTheme = useCallback(() => {
        dispatch({ type: 'SET_THEME', payload: state.theme === 'light' ? 'dark' : 'light' });
    }, [state.theme]);

    const toggleSidebar = useCallback(() => {
        dispatch({ type: 'TOGGLE_SIDEBAR' });
    }, []);

    const setActiveTool = useCallback((tool: ToolId | null) => {
        dispatch({ type: 'SET_ACTIVE_TOOL', payload: tool });
    }, []);

    const loadDocument = useCallback((doc: PDFDocument) => {
        dispatch({ type: 'LOAD_DOCUMENT', payload: doc });
    }, []);

    const closeDocument = useCallback((id: string) => {
        dispatch({ type: 'CLOSE_DOCUMENT', payload: id });
    }, []);

    const updateDocument = useCallback((updates: Partial<PDFDocument>) => {
        dispatch({ type: 'UPDATE_DOCUMENT', payload: updates });
    }, []);

    const selectPages = useCallback((pages: number[]) => {
        dispatch({ type: 'SELECT_PAGES', payload: pages });
    }, []);

    const togglePageSelection = useCallback((pageNumber: number) => {
        const newSelection = state.selectedPages.includes(pageNumber)
            ? state.selectedPages.filter(p => p !== pageNumber)
            : [...state.selectedPages, pageNumber].sort((a, b) => a - b);
        dispatch({ type: 'SELECT_PAGES', payload: newSelection });
    }, [state.selectedPages]);

    const selectAllPages = useCallback(() => {
        if (state.activeDocument) {
            const allPages = state.activeDocument.pages.map(p => p.pageNumber);
            dispatch({ type: 'SELECT_PAGES', payload: allPages });
        }
    }, [state.activeDocument]);

    const deselectAllPages = useCallback(() => {
        dispatch({ type: 'SELECT_PAGES', payload: [] });
    }, []);

    const setZoom = useCallback((zoom: number) => {
        dispatch({ type: 'SET_ZOOM', payload: zoom });
    }, []);

    const zoomIn = useCallback(() => {
        dispatch({ type: 'SET_ZOOM', payload: state.zoom + 25 });
    }, [state.zoom]);

    const zoomOut = useCallback(() => {
        dispatch({ type: 'SET_ZOOM', payload: state.zoom - 25 });
    }, [state.zoom]);

    const setViewMode = useCallback((mode: 'single' | 'continuous' | 'grid') => {
        dispatch({ type: 'SET_VIEW_MODE', payload: mode });
    }, []);

    const setLoading = useCallback((isLoading: boolean, message?: string) => {
        dispatch({ type: 'SET_LOADING', payload: { isLoading, message } });
    }, []);

    const addAnnotation = useCallback((annotation: Annotation) => {
        dispatch({ type: 'ADD_ANNOTATION', payload: annotation });
    }, []);

    const updateAnnotation = useCallback((id: string, updates: Partial<Annotation>) => {
        dispatch({ type: 'UPDATE_ANNOTATION', payload: { id, updates } });
    }, []);

    const deleteAnnotation = useCallback((id: string) => {
        dispatch({ type: 'DELETE_ANNOTATION', payload: id });
    }, []);

    const setPreviewState = useCallback((preview: PreviewState | null) => {
        dispatch({ type: 'SET_PREVIEW_STATE', payload: preview });
    }, []);

    const login = useCallback((user: import('../types').User) => {
        dispatch({ type: 'LOGIN', payload: user });
    }, []);

    const logout = useCallback(() => {
        dispatch({ type: 'LOGOUT' });
    }, []);

    const setToolOptions = useCallback((options: Partial<import('../types').ToolOptions>) => {
        dispatch({ type: 'SET_TOOL_OPTIONS', payload: options });
    }, []);

    const value: AppContextType = {
        state,
        dispatch,
        setTheme,
        toggleTheme,
        toggleSidebar,
        setActiveTool,
        loadDocument,
        closeDocument,
        updateDocument,
        selectPages,
        togglePageSelection,
        selectAllPages,
        deselectAllPages,
        setZoom,
        zoomIn,
        zoomOut,
        setViewMode,
        setLoading,
        addAnnotation,
        updateAnnotation,
        deleteAnnotation,
        setPreviewState,
        login,
        logout,
        setToolOptions,
    };

    return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

// Hook
export function useApp() {
    const context = useContext(AppContext);
    if (!context) {
        throw new Error('useApp must be used within an AppProvider');
    }
    return context;
}

// Toast management (simple version without external dependency)
interface Toast {
    id: string;
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message?: string;
}

interface ToastContextType {
    toasts: Toast[];
    addToast: (toast: Omit<Toast, 'id'>) => void;
    removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = React.useState<Toast[]>([]);

    const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
        const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        setToasts(prev => [...prev, { ...toast, id }]);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 5000);
    }, []);

    const removeToast = useCallback((id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    return (
        <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
            {children}
        </ToastContext.Provider>
    );
}

export function useToast() {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
}
