// PDF Editor Pro - Type Definitions

// ========== PDF Document Types ==========
export interface PDFDocument {
    id: string;
    name: string;
    file: File;
    arrayBuffer: ArrayBuffer;
    pageCount: number;
    pages: PDFPage[];
    metadata: PDFMetadata;
    isSecure: boolean;
    securityStatus: SecurityStatus;
}

export interface PDFPage {
    pageNumber: number;
    width: number;
    height: number;
    rotation: 0 | 90 | 180 | 270;
    thumbnailUrl?: string;
    isSelected: boolean;
    annotations: Annotation[];
}

export interface PDFMetadata {
    title?: string;
    author?: string;
    subject?: string;
    keywords?: string[];
    creator?: string;
    producer?: string;
    creationDate?: Date;
    modificationDate?: Date;
}

// ========== Security Types ==========
export interface SecurityStatus {
    isScanned: boolean;
    isClean: boolean;
    threats: SecurityThreat[];
    scanDate?: Date;
}

export interface SecurityThreat {
    type: 'javascript' | 'embedded_file' | 'suspicious_link' | 'malformed' | 'encrypted';
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    location?: string;
}

// ========== Annotation Types ==========
export type AnnotationType =
    | 'text'
    | 'highlight'
    | 'underline'
    | 'strikethrough'
    | 'rectangle'
    | 'circle'
    | 'arrow'
    | 'line'
    | 'freehand'
    | 'signature'
    | 'stamp'
    | 'note'
    | 'redact'
    | 'image'
    | 'link';

export interface BaseAnnotation {
    id: string;
    type: AnnotationType;
    pageNumber: number;
    x: number;
    y: number;
    width: number;
    height: number;
    rotation: number;
    opacity: number;
    color: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface TextAnnotation extends BaseAnnotation {
    type: 'text';
    content: string;
    fontSize: number;
    fontFamily: string;
    fontWeight: 'normal' | 'bold';
    fontStyle: 'normal' | 'italic';
    textAlign: 'left' | 'center' | 'right';
}

export interface HighlightAnnotation extends BaseAnnotation {
    type: 'highlight' | 'underline' | 'strikethrough' | 'redact';
    rects: { x: number; y: number; width: number; height: number }[];
}

export interface ShapeAnnotation extends BaseAnnotation {
    type: 'rectangle' | 'circle' | 'arrow' | 'line';
    strokeWidth: number;
    strokeColor: string;
    fillColor?: string;
    startPoint?: { x: number; y: number };
    endPoint?: { x: number; y: number };
}

export interface FreehandAnnotation extends BaseAnnotation {
    type: 'freehand';
    path: string;
    points?: { x: number; y: number }[];
    strokeWidth: number;
}

export interface SignatureAnnotation extends BaseAnnotation {
    type: 'signature';
    imageData?: string;
    points?: { x: number; y: number }[];
    strokeWidth?: number;
}

export interface StampAnnotation extends BaseAnnotation {
    type: 'stamp';
    stampType: 'approved' | 'rejected' | 'draft' | 'confidential' | 'custom';
    customText?: string;
}

export interface NoteAnnotation extends BaseAnnotation {
    type: 'note';
    content: string;
    isOpen: boolean;
}


export interface ImageAnnotation extends BaseAnnotation {
    type: 'image';
    file?: File;
    preview: string;
}

export interface LinkAnnotation extends BaseAnnotation {
    type: 'link';
    linkType: 'url' | 'page';
    url?: string;
    targetPage?: number;
}

export type Annotation =
    | TextAnnotation
    | HighlightAnnotation
    | ShapeAnnotation
    | FreehandAnnotation
    | SignatureAnnotation
    | StampAnnotation
    | NoteAnnotation
    | ImageAnnotation
    | LinkAnnotation;

// ========== Tool Types ==========
export type ToolCategory =
    | 'organize'
    | 'convert'
    | 'edit'
    | 'annotate'
    | 'security'
    | 'advanced'
    | 'ai-tools';

export type ToolId =
    | 'save'
    | 'undo'
    | 'redo'
    // Organize
    | 'merge'
    | 'split'
    | 'rotate'
    | 'delete'
    | 'reorder'
    | 'extract'
    | 'duplicate'
    // Convert
    | 'compress'
    | 'pdf-to-image'
    | 'image-to-pdf'
    | 'pdf-to-word'
    | 'pdf-to-excel'
    | 'pdf-to-ppt'
    | 'ppt-to-pdf'
    | 'html-to-pdf'
    | 'word-to-pdf'
    // Edit
    | 'add-text'
    | 'edit-text'
    | 'add-image'
    | 'crop'
    | 'resize'
    | 'add-image'
    | 'background'
    | 'crop'
    | 'resize'
    | 'erase'
    // Annotate
    | 'highlight'
    | 'underline'
    | 'strikethrough'
    | 'draw'
    | 'shapes'
    | 'signature'
    | 'stamp'
    | 'notes'
    | 'comments'
    // Security
    | 'password-protect'
    | 'unlock'
    | 'redact'
    | 'sign'
    | 'permissions'
    // Advanced
    | 'watermark'
    | 'page-numbers'
    | 'header-footer'
    | 'ocr'
    | 'metadata'
    | 'flatten'
    | 'repair'
    | 'bookmark'
    | 'hyperlinks'
    // AI Tools
    | 'ai-summarize'
    | 'ai-translate';

export interface ToolOptions {
    // Draw Settings
    drawColor: string;
    drawWidth: number;

    // Stamp Settings
    activeStampId?: string; // For adding new stamps
    selectedStamp?: { text: string; color: string; icon?: any; type: 'predefined' | 'custom'; size?: string };

    // Note Settings
    noteColor: string;

    // Shape Settings
    shapeType: 'rectangle' | 'circle' | 'arrow' | 'line';
    shapeStrokeColor: string;
    shapeFillColor: string;
    shapeStrokeWidth: number;
    shapeOpacity?: number;
    // Text Formatting Settings
    fontSize?: number;
    fontFamily?: string;
    isBold?: boolean;
    isItalic?: boolean;
    textAlign?: 'left' | 'center' | 'right';

    // Image Settings
    pendingImage?: { file: File; preview: string } | null;
}

export interface Tool {
    id: ToolId;
    name: string;
    description: string;
    icon: string;
    category: ToolCategory;
    isPremium: boolean;
    shortcut?: string;
}

// ========== State Types ==========
export interface User {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string;
    plan: 'free' | 'pro' | 'enterprise';
}

export interface AppState {
    theme: 'light' | 'dark';
    sidebarCollapsed: boolean;
    activeTool: ToolId | null;
    activeDocument: PDFDocument | null;
    documents: PDFDocument[];
    selectedPages: number[];
    zoom: number;
    viewMode: 'single' | 'continuous' | 'grid';
    isLoading: boolean;
    loadingMessage?: string;
    previewState: PreviewState | null;
    user: User | null;
    saveStatus: 'saved' | 'saving' | 'unsaved';
    toolOptions: ToolOptions;
}

export interface PreviewState {
    type: 'watermark' | 'page-numbers' | 'header-footer' | 'rotate' | null;
    data: any;
    timestamp: number;
}

export interface HistoryState {
    past: PDFDocument[];
    present: PDFDocument | null;
    future: PDFDocument[];
}

// ========== Action Types ==========
export type AppAction =
    | { type: 'SET_THEME'; payload: 'light' | 'dark' }
    | { type: 'TOGGLE_SIDEBAR' }
    | { type: 'SET_ACTIVE_TOOL'; payload: ToolId | null }
    | { type: 'LOAD_DOCUMENT'; payload: PDFDocument }
    | { type: 'CLOSE_DOCUMENT'; payload: string }
    | { type: 'UPDATE_DOCUMENT'; payload: Partial<PDFDocument> }
    | { type: 'SELECT_PAGES'; payload: number[] }
    | { type: 'SET_ZOOM'; payload: number }
    | { type: 'SET_VIEW_MODE'; payload: 'single' | 'continuous' | 'grid' }
    | { type: 'SET_LOADING'; payload: { isLoading: boolean; message?: string } }
    | { type: 'ADD_ANNOTATION'; payload: Annotation }
    | { type: 'UPDATE_ANNOTATION'; payload: { id: string; updates: Partial<Annotation> } }
    | { type: 'DELETE_ANNOTATION'; payload: string }
    | { type: 'SET_PREVIEW_STATE'; payload: PreviewState | null }
    | { type: 'SET_SAVE_STATUS'; payload: 'saved' | 'saving' | 'unsaved' }
    | { type: 'LOGIN'; payload: User }
    | { type: 'LOGOUT' }
    | { type: 'SET_TOOL_OPTIONS'; payload: Partial<ToolOptions> }
    | { type: 'UNDO' }
    | { type: 'REDO' };

// ========== UI Types ==========
export interface ToastMessage {
    id: string;
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message?: string;
    duration?: number;
}

export interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
    children: React.ReactNode;
}

export interface DropzoneState {
    isDragActive: boolean;
    acceptedFiles: File[];
    rejectedFiles: File[];
}

// ========== Export Options ==========
export interface ExportOptions {
    format: 'pdf' | 'png' | 'jpg' | 'webp';
    quality: number; // 0-100
    dpi: number;
    pageRange: 'all' | 'selected' | 'custom';
    customPages?: number[];
    flattenAnnotations: boolean;
    preserveFormFields: boolean;
}

export interface CompressionOptions {
    level: 'low' | 'medium' | 'high' | 'extreme' | 'custom';
    targetSizeMB?: number;
    imageQuality: number;
    removeMetadata: boolean;
    removeBookmarks: boolean;
    linearize: boolean;
}

// ========== Form Field Types ==========
export interface FormField {
    id: string;
    type: 'text' | 'checkbox' | 'radio' | 'dropdown' | 'signature' | 'date';
    name: string;
    pageNumber: number;
    x: number;
    y: number;
    width: number;
    height: number;
    value: string | boolean;
    options?: string[];
    isRequired: boolean;
    isReadOnly: boolean;
}

// ========== Watermark Options ==========
export interface WatermarkOptions {
    type: 'text' | 'image';
    text?: string;
    imageUrl?: string;
    fontSize?: number;
    fontFamily?: string;
    color?: string;
    opacity: number;
    rotation: number;
    position: 'center' | 'diagonal' | 'top' | 'bottom' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'custom';
    customPosition?: { x: number; y: number };
    pages?: number[];
}

// ========== Page Number Options ==========
export interface PageNumberOptions {
    format: 'numeric' | 'roman' | 'alphabetic';
    position: 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
    startNumber: number;
    prefix?: string;
    suffix?: string;
    fontSize: number;
    fontFamily?: string;
    color: string;
    margin: number;
    pages?: number[];
}

// ========== Header/Footer Options ==========
export interface HeaderFooterOptions {
    type: 'header' | 'footer';
    leftText?: string;
    centerText?: string;
    rightText?: string;
    fontSize: number;
    fontFamily: string;
    color: string;
    margin: number;
    includePageNumber: boolean;
    pageNumberFormat: 'numeric' | 'roman';
    includeDate: boolean;
    dateFormat: string;
    applyToPages: 'all' | 'odd' | 'even' | 'custom';
    customPageNumbers?: number[];
}
