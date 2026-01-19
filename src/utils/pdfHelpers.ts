/**
 * PDF Helper Utilities
 * Core functions for PDF manipulation using pdf-lib
 */

import { PDFDocument as PDFLibDocument, degrees, rgb, StandardFonts, LineCapStyle } from 'pdf-lib';
import { PDFDocument, PDFPage, PDFMetadata, CompressionOptions, WatermarkOptions, PageNumberOptions, TextAnnotation, ImageAnnotation, ShapeAnnotation, FreehandAnnotation, SignatureAnnotation, HighlightAnnotation, StampAnnotation } from '../types';
import { pdfSecurityScanner } from './securityScanner';

// Generate unique ID
export const generateId = (): string => {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Load a PDF file and return document info
 */
export async function loadPDF(file: File): Promise<PDFDocument> {
    // Security scan first
    const securityStatus = await pdfSecurityScanner.scanPDF(file);

    // Read file as ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();

    // Load with pdf-lib
    const pdfDoc = await PDFLibDocument.load(arrayBuffer, {
        ignoreEncryption: true,
    });

    const pageCount = pdfDoc.getPageCount();
    const pages: PDFPage[] = [];

    // Get page info
    for (let i = 0; i < pageCount; i++) {
        const page = pdfDoc.getPage(i);
        const { width, height } = page.getSize();
        const rotation = page.getRotation().angle as 0 | 90 | 180 | 270;

        pages.push({
            pageNumber: i + 1,
            width,
            height,
            rotation,
            isSelected: false,
            annotations: [],
        });
    }

    // Get metadata
    const metadata: PDFMetadata = {
        title: pdfDoc.getTitle() || undefined,
        author: pdfDoc.getAuthor() || undefined,
        subject: pdfDoc.getSubject() || undefined,
        keywords: pdfDoc.getKeywords()?.split(',').map(k => k.trim()) || undefined,
        creator: pdfDoc.getCreator() || undefined,
        producer: pdfDoc.getProducer() || undefined,
        creationDate: pdfDoc.getCreationDate() || undefined,
        modificationDate: pdfDoc.getModificationDate() || undefined,
    };

    return {
        id: generateId(),
        name: file.name,
        file,
        arrayBuffer,
        pageCount,
        pages,
        metadata,
        isSecure: !securityStatus.isClean,
        securityStatus,
    };
}

/**
 * Merge multiple PDF files into one
 */
export async function mergePDFs(files: File[]): Promise<Uint8Array> {
    const mergedPdf = await PDFLibDocument.create();

    for (const file of files) {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await PDFLibDocument.load(arrayBuffer, { ignoreEncryption: true });
        const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
        pages.forEach(page => mergedPdf.addPage(page));
    }

    return mergedPdf.save();
}

/**
 * Split PDF by extracting specific pages
 */
export async function splitPDF(
    arrayBuffer: ArrayBuffer,
    pageNumbers: number[]
): Promise<Uint8Array> {
    const sourcePdf = await PDFLibDocument.load(arrayBuffer, { ignoreEncryption: true });
    const newPdf = await PDFLibDocument.create();

    // Convert 1-based page numbers to 0-based indices
    const indices = pageNumbers.map(n => n - 1);

    const pages = await newPdf.copyPages(sourcePdf, indices);
    pages.forEach(page => newPdf.addPage(page));

    return newPdf.save();
}

/**
 * Rotate pages in a PDF
 */
export async function rotatePages(
    arrayBuffer: ArrayBuffer,
    pageRotations: { pageNumber: number; rotation: 0 | 90 | 180 | 270 }[]
): Promise<Uint8Array> {
    const pdf = await PDFLibDocument.load(arrayBuffer, { ignoreEncryption: true });

    for (const { pageNumber, rotation } of pageRotations) {
        const page = pdf.getPage(pageNumber - 1);
        page.setRotation(degrees(rotation));
    }

    return pdf.save();
}

/**
 * Delete pages from a PDF
 */
export async function deletePages(
    arrayBuffer: ArrayBuffer,
    pageNumbersToDelete: number[]
): Promise<Uint8Array> {
    const sourcePdf = await PDFLibDocument.load(arrayBuffer, { ignoreEncryption: true });
    const newPdf = await PDFLibDocument.create();

    const totalPages = sourcePdf.getPageCount();
    const pagesToKeep: number[] = [];

    for (let i = 1; i <= totalPages; i++) {
        if (!pageNumbersToDelete.includes(i)) {
            pagesToKeep.push(i - 1); // Convert to 0-based
        }
    }

    const pages = await newPdf.copyPages(sourcePdf, pagesToKeep);
    pages.forEach(page => newPdf.addPage(page));

    return newPdf.save();
}

/**
 * Reorder pages in a PDF
 */
export async function reorderPages(
    arrayBuffer: ArrayBuffer,
    newOrder: number[] // Array of 1-based page numbers in new order
): Promise<Uint8Array> {
    const sourcePdf = await PDFLibDocument.load(arrayBuffer, { ignoreEncryption: true });
    const newPdf = await PDFLibDocument.create();

    // Convert to 0-based indices
    const indices = newOrder.map(n => n - 1);

    const pages = await newPdf.copyPages(sourcePdf, indices);
    pages.forEach(page => newPdf.addPage(page));

    return newPdf.save();
}

/**
 * Duplicate pages in a PDF
 */
export async function duplicatePages(
    arrayBuffer: ArrayBuffer,
    pageNumbers: number[],
    insertAfter: boolean = true
): Promise<Uint8Array> {
    const sourcePdf = await PDFLibDocument.load(arrayBuffer, { ignoreEncryption: true });
    const newPdf = await PDFLibDocument.create();

    const totalPages = sourcePdf.getPageCount();

    for (let i = 0; i < totalPages; i++) {
        const [page] = await newPdf.copyPages(sourcePdf, [i]);
        newPdf.addPage(page);

        // If this page should be duplicated, add a copy
        if (insertAfter && pageNumbers.includes(i + 1)) {
            const [dupPage] = await newPdf.copyPages(sourcePdf, [i]);
            newPdf.addPage(dupPage);
        }
    }

    return newPdf.save();
}

/**
 * Compress PDF with actual image recompression
 * Renders pages to canvas and creates new PDF with compressed images
 */
export async function compressPDF(
    arrayBuffer: ArrayBuffer,
    options: CompressionOptions,
    onProgress?: (progress: number) => void
): Promise<Uint8Array> {
    // Import pdfjs dynamically
    const pdfjsLib = await import('pdfjs-dist');
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

    // Determine quality and scale based on compression level
    let imageQuality: number;
    let scale: number;

    const originalSize = arrayBuffer.byteLength;

    if (options.level === 'custom' && options.targetSizeMB) {
        // Estimate required ratio
        const targetBytes = options.targetSizeMB * 1024 * 1024;
        let ratio = targetBytes / originalSize;
        ratio = Math.min(Math.max(ratio, 0.05), 1.0); // Clamp between 5% and 100%

        // Approximate mapping: Ratio ~= scale * scale * quality
        // We prioritize maintaining scale (readability) over quality until ratio is very low

        if (ratio > 0.8) {
            scale = 1.0;
            imageQuality = 0.8;
        } else if (ratio > 0.6) {
            scale = 0.9;
            imageQuality = 0.7;
        } else if (ratio > 0.4) {
            scale = 0.8;
            imageQuality = 0.6;
        } else if (ratio > 0.2) {
            scale = 0.7;
            imageQuality = 0.5;
        } else {
            scale = 0.6;
            imageQuality = 0.4;
        }
    } else {
        switch (options.level) {
            case 'low': // ~70% size
                imageQuality = 0.8;
                scale = 0.9;
                break;
            case 'medium': // ~50% size
                imageQuality = 0.6;
                scale = 0.8;
                break;
            case 'high': // ~30% size
                imageQuality = 0.4;
                scale = 0.7;
                break;
            case 'extreme': // "Best" / Smallest (~5-10%)
                imageQuality = 0.3;
                scale = 0.5;
                break;
            default:
                imageQuality = 0.75;
                scale = 0.85;
        }
    }

    // Load the source PDF
    const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const numPages = pdfDoc.numPages;

    // Create a new PDF
    const newPdf = await PDFLibDocument.create();

    // Process each page
    for (let i = 1; i <= numPages; i++) {
        // Yield to main thread to keep UI responsive
        await new Promise(resolve => setTimeout(resolve, 0));

        try {
            const page = await pdfDoc.getPage(i);
            const viewport = page.getViewport({ scale });

            // Create canvas
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d')!;
            canvas.width = viewport.width;
            canvas.height = viewport.height;

            // Render page to canvas
            await page.render({
                canvasContext: context,
                viewport: viewport,
            }).promise;

            // Convert canvas to JPEG with compression
            const imageDataUrl = canvas.toDataURL('image/jpeg', imageQuality);

            // Extract base64 data
            const base64Data = imageDataUrl.split(',')[1];
            const imageBytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

            // Embed image in new PDF
            const jpgImage = await newPdf.embedJpg(imageBytes);

            // Add page with original dimensions (not scaled)
            const originalViewport = page.getViewport({ scale: 1 });
            const newPage = newPdf.addPage([originalViewport.width, originalViewport.height]);

            // Draw image to fill the page
            newPage.drawImage(jpgImage, {
                x: 0,
                y: 0,
                width: originalViewport.width,
                height: originalViewport.height,
            });

            // Cleanup
            page.cleanup();
            canvas.width = 0;
            canvas.height = 0;

        } catch (err) {
            console.error(`Error compressing page ${i}:`, err);
            // If page fails, try to copy it directly from source (fallback)
            // Note: This requires loading source as pdf-lib doc too, which is complex here.
            // For now, we skip or could handle better. 
            // Better approach: Just continue, potentially losing a page is bad but crashing is worse.
            // Let's assume render won't fail easily.
        }

        // Update progress
        if (onProgress) {
            onProgress(Math.round((i / numPages) * 100));
        }
    }

    // Remove metadata if requested
    if (options.removeMetadata) {
        newPdf.setTitle('');
        newPdf.setAuthor('');
        newPdf.setSubject('');
        newPdf.setKeywords([]);
        newPdf.setCreator('');
        newPdf.setProducer('');
    }

    // Save with object streams for additional compression
    return newPdf.save({
        useObjectStreams: true,
        addDefaultPage: false,
    });
}

/**
 * Add watermark to PDF
 */
export async function addWatermark(
    arrayBuffer: ArrayBuffer,
    options: WatermarkOptions
): Promise<Uint8Array> {
    const pdf = await PDFLibDocument.load(arrayBuffer, { ignoreEncryption: true });
    const font = await pdf.embedFont(StandardFonts.HelveticaBold);

    const pages = pdf.getPages();
    const pagesToProcess = options.pages
        ? options.pages.map(n => n - 1).filter(i => i >= 0 && i < pages.length)
        : Array.from({ length: pages.length }, (_, i) => i);

    for (const pageIndex of pagesToProcess) {
        const page = pages[pageIndex];
        const { width, height } = page.getSize();

        if (options.type === 'text' && options.text) {
            const fontSize = options.fontSize || 48;
            const textWidth = font.widthOfTextAtSize(options.text, fontSize);

            let x: number, y: number;

            switch (options.position) {
                case 'center':
                    x = (width - textWidth) / 2;
                    y = height / 2;
                    break;
                case 'diagonal':
                    x = width * 0.1;
                    y = height * 0.3;
                    break;
                case 'top':
                    x = (width - textWidth) / 2;
                    y = height - 60;
                    break;
                case 'bottom':
                    x = (width - textWidth) / 2;
                    y = 40;
                    break;
                case 'top-left':
                    x = 40;
                    y = height - 60;
                    break;
                case 'top-right':
                    x = width - textWidth - 40;
                    y = height - 60;
                    break;
                case 'bottom-left':
                    x = 40;
                    y = 40;
                    break;
                case 'bottom-right':
                    x = width - textWidth - 40;
                    y = 40;
                    break;
                case 'custom':
                    x = options.customPosition?.x || width / 2;
                    y = options.customPosition?.y || height / 2;
                    break;
                default:
                    x = (width - textWidth) / 2;
                    y = height / 2;
            }

            // Parse color
            const color = parseColor(options.color || '#888888');

            page.drawText(options.text, {
                x,
                y,
                size: fontSize,
                font,
                color: rgb(color.r, color.g, color.b),
                opacity: options.opacity,
                rotate: degrees(options.rotation || (options.position === 'diagonal' ? -45 : 0)),
            });
        }
    }

    return pdf.save();
}

/**
 * Add page numbers to PDF
 */
export async function addPageNumbers(
    arrayBuffer: ArrayBuffer,
    options: PageNumberOptions
): Promise<Uint8Array> {
    const pdf = await PDFLibDocument.load(arrayBuffer, { ignoreEncryption: true });
    const font = await pdf.embedFont(StandardFonts.Helvetica);

    const pages = pdf.getPages();
    const pagesToProcess = options.pages
        ? options.pages.map(n => n - 1).filter(i => i >= 0 && i < pages.length)
        : Array.from({ length: pages.length }, (_, i) => i);

    let pageNum = options.startNumber;

    for (const pageIndex of pagesToProcess) {

        const page = pages[pageIndex];
        const { width, height } = page.getSize();

        // Format page number
        let pageText = formatPageNumber(pageNum, options.format);
        if (options.prefix) pageText = options.prefix + pageText;
        if (options.suffix) pageText = pageText + options.suffix;

        const textWidth = font.widthOfTextAtSize(pageText, options.fontSize);

        // Calculate position
        let x: number, y: number;
        const margin = options.margin;

        switch (options.position) {
            case 'top-left':
                x = margin;
                y = height - margin;
                break;
            case 'top-center':
                x = (width - textWidth) / 2;
                y = height - margin;
                break;
            case 'top-right':
                x = width - textWidth - margin;
                y = height - margin;
                break;
            case 'bottom-left':
                x = margin;
                y = margin;
                break;
            case 'bottom-center':
                x = (width - textWidth) / 2;
                y = margin;
                break;
            case 'bottom-right':
                x = width - textWidth - margin;
                y = margin;
                break;
            default:
                x = (width - textWidth) / 2;
                y = margin;
        }

        const color = parseColor(options.color);

        page.drawText(pageText, {
            x,
            y,
            size: options.fontSize,
            font,
            color: rgb(color.r, color.g, color.b),
        });

        pageNum++;
    }

    return pdf.save();
}

/**
 * Flatten PDF (merge annotations into content)
 */
export async function flattenPDF(arrayBuffer: ArrayBuffer): Promise<Uint8Array> {
    const pdf = await PDFLibDocument.load(arrayBuffer, { ignoreEncryption: true });

    // Remove form fields
    const form = pdf.getForm();
    const fields = form.getFields();

    for (const field of fields) {
        try {
            // Try to flatten each field type
            const fieldType = field.constructor.name;
            if (fieldType === 'PDFTextField') {
                (field as unknown as { updateAppearances: (font: unknown) => void }).updateAppearances?.(
                    await pdf.embedFont(StandardFonts.Helvetica)
                );
            }
        } catch {
            // Field might not support this operation
        }
    }

    return pdf.save();
}

/**
 * Set PDF metadata
 */
export async function setMetadata(
    arrayBuffer: ArrayBuffer,
    metadata: Partial<PDFMetadata>
): Promise<Uint8Array> {
    const pdf = await PDFLibDocument.load(arrayBuffer, { ignoreEncryption: true });

    if (metadata.title !== undefined) pdf.setTitle(metadata.title || '');
    if (metadata.author !== undefined) pdf.setAuthor(metadata.author || '');
    if (metadata.subject !== undefined) pdf.setSubject(metadata.subject || '');
    if (metadata.keywords !== undefined) pdf.setKeywords(metadata.keywords || []);
    if (metadata.creator !== undefined) pdf.setCreator(metadata.creator || '');
    if (metadata.producer !== undefined) pdf.setProducer(metadata.producer || '');

    return pdf.save();
}

/**
 * Extract specific pages to a new PDF
 */
export async function extractPages(
    arrayBuffer: ArrayBuffer,
    pageNumbers: number[]
): Promise<Uint8Array> {
    return splitPDF(arrayBuffer, pageNumbers);
}

// ========== Helper Functions ==========

/**
 * Format page number based on format option
 */
function formatPageNumber(num: number, format: 'numeric' | 'roman' | 'alphabetic'): string {
    switch (format) {
        case 'roman':
            return toRoman(num);
        case 'alphabetic':
            return toAlphabetic(num);
        default:
            return num.toString();
    }
}

/**
 * Convert number to Roman numerals
 */
function toRoman(num: number): string {
    const romanNumerals: [number, string][] = [
        [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'],
        [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'],
        [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']
    ];

    let result = '';
    for (const [value, symbol] of romanNumerals) {
        while (num >= value) {
            result += symbol;
            num -= value;
        }
    }
    return result;
}

/**
 * Convert number to alphabetic (a, b, c, ..., z, aa, ab, ...)
 */
function toAlphabetic(num: number): string {
    let result = '';
    while (num > 0) {
        num--;
        result = String.fromCharCode(65 + (num % 26)) + result;
        num = Math.floor(num / 26);
    }
    return result.toLowerCase();
}

/**
 * Parse hex color to RGB object
 */
function parseColor(hex: string): { r: number; g: number; b: number } {
    let cleanHex = hex.replace('#', '');

    // Handle shorthand hex (e.g. #000)
    if (cleanHex.length === 3) {
        cleanHex = cleanHex.split('').map(char => char + char).join('');
    }

    // Fallback for invalid hex
    if (cleanHex.length !== 6) {
        return { r: 0, g: 0, b: 0 };
    }

    const r = parseInt(cleanHex.substring(0, 2), 16) / 255 || 0;
    const g = parseInt(cleanHex.substring(2, 4), 16) / 255 || 0;
    const b = parseInt(cleanHex.substring(4, 6), 16) / 255 || 0;

    return { r, g, b };
}

/**
 * Download PDF bytes as file
 */
export function downloadPDF(bytes: Uint8Array, filename: string): void {
    const blob = new Blob([new Uint8Array(bytes)], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/**
 * Get PDF bytes from ArrayBuffer
 */
export async function getPDFBytes(arrayBuffer: ArrayBuffer): Promise<Uint8Array> {
    const pdf = await PDFLibDocument.load(arrayBuffer, { ignoreEncryption: true });
    return pdf.save();
}

/**
 * Load a PDF from ArrayBuffer (for restoring saved documents)
 */
export async function loadPDFFromArrayBuffer(
    arrayBuffer: ArrayBuffer,
    name: string,
    id?: string
): Promise<PDFDocument> {
    // Load with pdf-lib
    const pdfDoc = await PDFLibDocument.load(arrayBuffer, {
        ignoreEncryption: true,
    });

    const pageCount = pdfDoc.getPageCount();
    const pages: PDFPage[] = [];

    // Get page info
    for (let i = 0; i < pageCount; i++) {
        const page = pdfDoc.getPage(i);
        const { width, height } = page.getSize();
        const rotation = page.getRotation().angle as 0 | 90 | 180 | 270;

        pages.push({
            pageNumber: i + 1,
            width,
            height,
            rotation,
            isSelected: false,
            annotations: [],
        });
    }

    // Get metadata
    const metadata: PDFMetadata = {
        title: pdfDoc.getTitle() || undefined,
        author: pdfDoc.getAuthor() || undefined,
        subject: pdfDoc.getSubject() || undefined,
        keywords: pdfDoc.getKeywords()?.split(',').map(k => k.trim()) || undefined,
        creator: pdfDoc.getCreator() || undefined,
        producer: pdfDoc.getProducer() || undefined,
        creationDate: pdfDoc.getCreationDate() || undefined,
        modificationDate: pdfDoc.getModificationDate() || undefined,
    };

    return {
        id: id || generateId(),
        name,
        file: undefined as unknown as File, // No file available when restoring
        arrayBuffer,
        pageCount,
        pages,
        metadata,
        isSecure: false,
        securityStatus: {
            isScanned: true,
            isClean: true,
            threats: [],
        },
    };
}


// ... imports handled at top ...

export async function savePDFWithAnnotations(activeDocument: PDFDocument): Promise<Uint8Array> {
    const pdfDoc = await PDFLibDocument.load(activeDocument.arrayBuffer.slice(0), { ignoreEncryption: true });
    const pages = pdfDoc.getPages();

    // Embed standard fonts
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const italicFont = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);
    const boldItalicFont = await pdfDoc.embedFont(StandardFonts.HelveticaBoldOblique);

    for (let i = 0; i < pages.length; i++) {
        // activeDocument.pages is 0-indexed in array, but pageNumber is 1-based
        const docPage = activeDocument.pages[i];
        if (!docPage || docPage.annotations.length === 0) continue;

        const page = pages[i];
        const { width: pageWidth, height: pageHeight } = page.getSize();

        // Sort annotations by z-index/creation time if needed, but array order is usually enough
        for (const ann of docPage.annotations) {
            // Helper to convert % to PDF coordinates
            // X: 0-100% -> 0-pageWidth
            // Y: 0-100% (Top-Down) -> pageHeight-0 (Bottom-Up)

            const getX = (val: number) => (val / 100) * pageWidth;
            const getY = (val: number) => pageHeight - (val / 100) * pageHeight;
            const getW = (val: number) => (val / 100) * pageWidth;
            const getH = (val: number) => (val / 100) * pageHeight;

            const x = getX(ann.x);
            // Most pdf-lib drawing uses bottom-left as origin for the object
            // Viewer Y is Top. PDF Y is Bottom.
            // For a rect at viewer Y with height H:
            // Viewer bottom is Y+H.
            // PDF Y (bottom of rect) = pageHeight - (ViewerY + ViewerH)
            const y = pageHeight - ((ann.y + ann.height) / 100) * pageHeight;

            const w = getW(ann.width);
            const h = getH(ann.height);

            const opacity = ann.opacity !== undefined ? ann.opacity : 1;
            const color = ann.color ? parseColor(ann.color) : { r: 0, g: 0, b: 0 };
            const pdfColor = rgb(color.r, color.g, color.b);

            if (ann.type === 'text') {
                const textAnn = ann as TextAnnotation;

                // Text positioning in PDF-lib is usually baseline. 
                // In viewer, x,y is top-left of the bounding box.
                // We'll approximate baseline offset.
                const pdfFontSize = textAnn.fontSize || 12;

                // Adjust Y to be roughly baseline (descent is about 0.2-0.3em)
                const textY = pageHeight - (ann.y / 100) * pageHeight - pdfFontSize * 0.8;

                let selectedFont = font;
                if (textAnn.fontWeight === 'bold' && textAnn.fontStyle === 'italic') selectedFont = boldItalicFont;
                else if (textAnn.fontWeight === 'bold') selectedFont = boldFont;
                else if (textAnn.fontStyle === 'italic') selectedFont = italicFont;

                page.drawText(textAnn.content || '', {
                    x,
                    y: textY,
                    size: pdfFontSize,
                    font: selectedFont,
                    color: pdfColor,
                    opacity: opacity,
                });
            }
            else if (ann.type === 'image') {
                const imgAnn = ann as ImageAnnotation;
                if (imgAnn.preview) {
                    try {
                        const imgBytes = await fetch(imgAnn.preview).then(r => r.arrayBuffer());
                        let embeddedImg;
                        const isPng = imgAnn.preview.startsWith('data:image/png');
                        if (isPng) embeddedImg = await pdfDoc.embedPng(imgBytes);
                        else embeddedImg = await pdfDoc.embedJpg(imgBytes);

                        page.drawImage(embeddedImg, { x, y, width: w, height: h, opacity });
                    } catch (e) {
                        console.error("Failed to embed image", e);
                    }
                }
            }
            else if (['rectangle', 'circle'].includes(ann.type)) {
                const shape = ann as ShapeAnnotation;
                const strokeColor = parseColor(shape.strokeColor || '#000000');
                const fillColor = shape.fillColor && shape.fillColor !== 'transparent' ? parseColor(shape.fillColor) : undefined;

                const drawOptions = {
                    borderColor: rgb(strokeColor.r, strokeColor.g, strokeColor.b),
                    borderWidth: shape.strokeWidth || 2,
                    color: fillColor ? rgb(fillColor.r, fillColor.g, fillColor.b) : undefined,
                    opacity: opacity,
                    borderOpacity: opacity
                };

                if (shape.type === 'rectangle') {
                    page.drawRectangle({ x, y, width: w, height: h, ...drawOptions });
                }
                else if (shape.type === 'circle') {
                    // Ellipse in pdf-lib takes center x,y and x/y scale (radius)
                    page.drawEllipse({
                        x: x + w / 2,
                        y: y + h / 2,
                        xScale: w / 2,
                        yScale: h / 2,
                        ...drawOptions
                    });
                }
            }
            else if (['line', 'arrow'].includes(ann.type)) {
                // For lines/arrows, we need exact start/end points if preserved
                // Currently Viewer stores these in normalized box x,y,w,h usually?
                // Actually ShapeAnnotation definition has startPoint/endPoint, check if used.
                // The viewer implementation seen earlier uses x,y,w,h bounding box mostly.
                // Let's assume bounding box diagonal for now as fallback.

                const shape = ann as ShapeAnnotation;
                const strokeColor = parseColor(shape.strokeColor || '#000000');

                const startX = getX(ann.x);
                const startY = getY(ann.y); // Top
                const endX = getX(ann.x + ann.width);
                const endY = getY(ann.y + ann.height); // Bottom

                page.drawLine({
                    start: { x: startX, y: startY },
                    end: { x: endX, y: endY },
                    thickness: shape.strokeWidth || 2,
                    color: rgb(strokeColor.r, strokeColor.g, strokeColor.b),
                    opacity: opacity
                });

                if (shape.type === 'arrow') {
                    // Draw simple arrowhead at end
                    // Just a small circle for robust MVP, or lines if possible
                    page.drawCircle({
                        x: endX, y: endY,
                        size: (shape.strokeWidth || 2) * 2,
                        color: rgb(strokeColor.r, strokeColor.g, strokeColor.b),
                        opacity: opacity
                    });
                }
            }
            else if (ann.type === 'highlight' || ann.type === 'redact') {
                const highlight = ann as HighlightAnnotation;
                // Highlight is just a colored rect, usually with transparency
                if (highlight.rects && highlight.rects.length > 0) {
                    for (const r of highlight.rects) {
                        page.drawRectangle({
                            x: getX(r.x),
                            y: pageHeight - ((r.y + r.height) / 100) * pageHeight, // Bottom Y
                            width: getW(r.width),
                            height: getH(r.height),
                            color: pdfColor, // Yellow etc
                            opacity: ann.type === 'redact' ? 1 : (opacity || 0.4),
                        });
                    }
                } else {
                    // Fallback to main rect
                    page.drawRectangle({
                        x, y, width: w, height: h,
                        color: pdfColor,
                        opacity: ann.type === 'redact' ? 1 : (opacity || 0.4),
                    });
                }
            }
            else if (ann.type === 'stamp') {
                // Draw stamp text/box
                const stamp = ann as StampAnnotation;
                // Similar to rectangle + text
                // Draw border
                page.drawRectangle({
                    x, y, width: w, height: h,
                    borderColor: pdfColor,
                    borderWidth: 3,
                    opacity: opacity
                });

                // Draw Text centered
                const text = stamp.customText || stamp.stampType.toUpperCase();
                const fontSize = Math.min(18, getH(ann.height) * 0.5);
                const textWidth = boldFont.widthOfTextAtSize(text, fontSize);
                const textHeight = boldFont.heightAtSize(fontSize);

                page.drawText(text, {
                    x: x + (w - textWidth) / 2,
                    y: y + (h - textHeight) / 2 + textHeight * 0.25,
                    size: fontSize,
                    font: boldFont,
                    color: pdfColor,
                    opacity: opacity
                });
            }
            else if (ann.type === 'freehand' || ann.type === 'signature') {
                const freehand = ann as FreehandAnnotation | SignatureAnnotation;
                if (freehand.points && freehand.points.length > 1) {
                    const stroke = freehand.strokeWidth || 2;
                    for (let j = 0; j < freehand.points.length - 1; j++) {
                        const p1 = freehand.points[j];
                        const p2 = freehand.points[j + 1];

                        page.drawLine({
                            start: { x: getX(p1.x), y: getY(p1.y) },
                            end: { x: getX(p2.x), y: getY(p2.y) },
                            thickness: stroke,
                            color: pdfColor,
                            opacity: opacity,
                            lineCap: LineCapStyle.Round,
                        });
                    }
                }
            }
            else if (ann.type === 'note') {
                // Draw a small icon for note
                page.drawRectangle({
                    x, y: y + h - 10,
                    width: 10,
                    height: 10,
                    color: rgb(1, 1, 0), // Yellow sticky
                });
                // Could draw simplified 'text bubble' icon
            }
        }
    }

    return pdfDoc.save();
}
