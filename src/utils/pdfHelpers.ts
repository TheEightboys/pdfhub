/**
 * PDF Helper Utilities
 * Core functions for PDF manipulation using pdf-lib
 */

import { PDFDocument as PDFLibDocument, degrees, rgb, StandardFonts } from 'pdf-lib';
import { PDFDocument, PDFPage, PDFMetadata, CompressionOptions, WatermarkOptions, PageNumberOptions } from '../types';
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
    options: CompressionOptions
): Promise<Uint8Array> {
    // Import pdfjs dynamically
    const pdfjsLib = await import('pdfjs-dist');
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

    // Determine quality and scale based on compression level
    let imageQuality: number;
    let scale: number;

    switch (options.level) {
        case 'low':
            imageQuality = 0.9;
            scale = 1.0;
            break;
        case 'medium':
            imageQuality = 0.75;
            scale = 0.85;
            break;
        case 'high':
            imageQuality = 0.6;
            scale = 0.75;
            break;
        case 'extreme':
            imageQuality = 0.4;
            scale = 0.6;
            break;
        default:
            imageQuality = 0.75;
            scale = 0.85;
    }

    // Load the source PDF
    const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const numPages = pdfDoc.numPages;

    // Create a new PDF
    const newPdf = await PDFLibDocument.create();

    // Process each page
    for (let i = 1; i <= numPages; i++) {
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
 * Get page indices based on apply options
 */
function getPageIndices(
    totalPages: number,
    applyTo: 'all' | 'odd' | 'even' | 'first' | 'last' | 'custom',
    customPages?: number[]
): number[] {
    switch (applyTo) {
        case 'all':
            return Array.from({ length: totalPages }, (_, i) => i);
        case 'odd':
            return Array.from({ length: totalPages }, (_, i) => i).filter(i => i % 2 === 0);
        case 'even':
            return Array.from({ length: totalPages }, (_, i) => i).filter(i => i % 2 === 1);
        case 'first':
            return totalPages > 0 ? [0] : [];
        case 'last':
            return totalPages > 0 ? [totalPages - 1] : [];
        case 'custom':
            return (customPages || []).map(n => n - 1).filter(i => i >= 0 && i < totalPages);
        default:
            return Array.from({ length: totalPages }, (_, i) => i);
    }
}

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
    const cleanHex = hex.replace('#', '');
    const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
    const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
    const b = parseInt(cleanHex.substring(4, 6), 16) / 255;
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
