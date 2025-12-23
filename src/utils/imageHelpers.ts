/**
 * Image Helper Utilities
 * Functions for image-to-PDF and PDF-to-image conversions
 */

import { jsPDF } from 'jspdf';
import * as pdfjsLib from 'pdfjs-dist';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

// Set worker for PDF.js - use CDN
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export interface ImageToPageOptions {
    pageSize: 'a4' | 'letter' | 'legal' | 'fit';
    orientation: 'portrait' | 'landscape' | 'auto';
    margin: number;
    quality: number;
}

export interface PDFToImageOptions {
    format: 'png' | 'jpeg' | 'webp';
    quality: number; // 0-1 for JPEG/WebP
    scale: number;  // 1-5
    pageRange: 'all' | number[];
}

/**
 * Convert images to a PDF document
 */
export async function imagesToPDF(
    images: File[],
    options: ImageToPageOptions = {
        pageSize: 'a4',
        orientation: 'auto',
        margin: 10,
        quality: 0.92
    }
): Promise<Uint8Array> {
    // Page sizes in mm
    const pageSizes: Record<string, { width: number; height: number }> = {
        a4: { width: 210, height: 297 },
        letter: { width: 215.9, height: 279.4 },
        legal: { width: 215.9, height: 355.6 },
    };

    const pdf = new jsPDF({
        unit: 'mm',
        format: options.pageSize === 'fit' ? 'a4' : options.pageSize,
    });

    for (let i = 0; i < images.length; i++) {
        const image = images[i];

        // Convert image to data URL
        const dataUrl = await fileToDataUrl(image);

        // Get image dimensions
        const dimensions = await getImageDimensions(dataUrl);

        // Determine orientation
        let orientation: 'portrait' | 'landscape' = 'portrait';
        if (options.orientation === 'auto') {
            orientation = dimensions.width > dimensions.height ? 'landscape' : 'portrait';
        } else {
            orientation = options.orientation;
        }

        // Calculate page and image dimensions
        let pageWidth: number, pageHeight: number;

        if (options.pageSize === 'fit') {
            // Use image dimensions for page size (convert px to mm at 96 DPI)
            pageWidth = (dimensions.width / 96) * 25.4;
            pageHeight = (dimensions.height / 96) * 25.4;
        } else {
            const size = pageSizes[options.pageSize];
            pageWidth = orientation === 'landscape' ? size.height : size.width;
            pageHeight = orientation === 'landscape' ? size.width : size.height;
        }

        // Add new page (except for first)
        if (i > 0) {
            pdf.addPage(
                options.pageSize === 'fit' ? [pageWidth, pageHeight] : options.pageSize,
                orientation
            );
        } else if (options.pageSize === 'fit') {
            // Resize first page
            pdf.internal.pageSize.width = pageWidth;
            pdf.internal.pageSize.height = pageHeight;
        }

        // Calculate image placement with margins
        const margin = options.margin;
        const availableWidth = pageWidth - (margin * 2);
        const availableHeight = pageHeight - (margin * 2);

        // Scale image to fit available space
        const scale = Math.min(
            availableWidth / (dimensions.width / 96 * 25.4),
            availableHeight / (dimensions.height / 96 * 25.4),
            1 // Don't upscale
        );

        const imgWidth = (dimensions.width / 96 * 25.4) * scale;
        const imgHeight = (dimensions.height / 96 * 25.4) * scale;

        // Center image on page
        const x = margin + (availableWidth - imgWidth) / 2;
        const y = margin + (availableHeight - imgHeight) / 2;

        // Add image to PDF
        const format = getImageFormat(image.type);
        pdf.addImage(dataUrl, format, x, y, imgWidth, imgHeight, undefined, 'MEDIUM');
    }

    // Return as Uint8Array
    const output = pdf.output('arraybuffer');
    return new Uint8Array(output);
}

/**
 * Convert PDF pages to images
 */
export async function pdfToImages(
    arrayBuffer: ArrayBuffer,
    options: PDFToImageOptions = {
        format: 'png',
        quality: 0.92,
        scale: 2,
        pageRange: 'all'
    }
): Promise<{ pageNumber: number; dataUrl: string; blob: Blob }[]> {
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const results: { pageNumber: number; dataUrl: string; blob: Blob }[] = [];

    // Determine pages to convert
    const pageNumbers: number[] = options.pageRange === 'all'
        ? Array.from({ length: pdf.numPages }, (_, i) => i + 1)
        : options.pageRange;

    for (const pageNum of pageNumbers) {
        if (pageNum < 1 || pageNum > pdf.numPages) continue;

        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale: options.scale });

        // Create canvas
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d')!;
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        // Render page
        await page.render({
            canvasContext: context,
            viewport: viewport,
        }).promise;

        // Convert to image
        const mimeType = `image/${options.format}`;
        const dataUrl = canvas.toDataURL(mimeType, options.quality);

        // Convert to Blob
        const blob = await dataUrlToBlob(dataUrl);

        results.push({
            pageNumber: pageNum,
            dataUrl,
            blob,
        });
    }

    return results;
}

/**
 * Download PDF pages as images (single or ZIP)
 */
export async function downloadPDFAsImages(
    arrayBuffer: ArrayBuffer,
    options: PDFToImageOptions & { filename?: string }
): Promise<void> {
    const images = await pdfToImages(arrayBuffer, options);
    const filename = options.filename || 'pdf-pages';

    if (images.length === 1) {
        // Download single image
        const ext = options.format === 'jpeg' ? 'jpg' : options.format;
        saveAs(images[0].blob, `${filename}_page_1.${ext}`);
    } else {
        // Create ZIP file
        const zip = new JSZip();
        const folder = zip.folder('images')!;

        const ext = options.format === 'jpeg' ? 'jpg' : options.format;

        for (const image of images) {
            const name = `page_${String(image.pageNumber).padStart(3, '0')}.${ext}`;
            folder.file(name, image.blob);
        }

        const zipBlob = await zip.generateAsync({ type: 'blob' });
        saveAs(zipBlob, `${filename}_images.zip`);
    }
}

/**
 * Generate thumbnail for a PDF page
 */
export async function generateThumbnail(
    arrayBuffer: ArrayBuffer,
    pageNumber: number,
    maxWidth: number = 200,
    retries: number = 2
): Promise<string> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            // Clone the array buffer to avoid mutation issues
            const bufferCopy = arrayBuffer.slice(0);
            const pdf = await pdfjsLib.getDocument({ data: bufferCopy }).promise;

            if (pageNumber < 1 || pageNumber > pdf.numPages) {
                throw new Error(`Invalid page number: ${pageNumber}`);
            }

            const page = await pdf.getPage(pageNumber);
            const viewport = page.getViewport({ scale: 1 });

            // Calculate scale to fit maxWidth
            const scale = maxWidth / viewport.width;
            const scaledViewport = page.getViewport({ scale });

            // Create canvas
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d')!;
            canvas.width = Math.floor(scaledViewport.width);
            canvas.height = Math.floor(scaledViewport.height);

            // Render page
            await page.render({
                canvasContext: context,
                viewport: scaledViewport,
            }).promise;

            const dataUrl = canvas.toDataURL('image/png');

            // Cleanup
            page.cleanup();
            pdf.destroy();

            return dataUrl;
        } catch (error) {
            lastError = error as Error;
            // Wait a bit before retrying
            if (attempt < retries) {
                await new Promise(resolve => setTimeout(resolve, 100 * (attempt + 1)));
            }
        }
    }

    throw lastError || new Error('Failed to generate thumbnail');
}

/**
 * Generate thumbnails for all pages with optimized parallel batch loading
 */
export async function generateAllThumbnails(
    arrayBuffer: ArrayBuffer,
    maxWidth: number = 150,
    onProgress?: (progress: number) => void
): Promise<string[]> {
    // Clone the array buffer to avoid mutation issues
    const bufferCopy = arrayBuffer.slice(0);
    const pdf = await pdfjsLib.getDocument({
        data: bufferCopy,
        disableRange: true,
    }).promise;

    const totalPages = pdf.numPages;
    const thumbnails: string[] = new Array(totalPages).fill('');
    const batchSize = 6; // Process 6 thumbnails in parallel

    // Process pages in parallel batches
    for (let batchStart = 0; batchStart < totalPages; batchStart += batchSize) {
        const batchEnd = Math.min(batchStart + batchSize, totalPages);
        const batchPromises: Promise<void>[] = [];

        for (let pageNum = batchStart + 1; pageNum <= batchEnd; pageNum++) {
            batchPromises.push(
                (async () => {
                    try {
                        const page = await pdf.getPage(pageNum);
                        const viewport = page.getViewport({ scale: 1 });

                        // Calculate scale to fit maxWidth
                        const scale = maxWidth / viewport.width;
                        const scaledViewport = page.getViewport({ scale });

                        // Create canvas with alpha disabled for performance
                        const canvas = document.createElement('canvas');
                        const context = canvas.getContext('2d', {
                            alpha: false,
                            willReadFrequently: false
                        })!;
                        canvas.width = Math.floor(scaledViewport.width);
                        canvas.height = Math.floor(scaledViewport.height);

                        // Fill white background
                        context.fillStyle = '#ffffff';
                        context.fillRect(0, 0, canvas.width, canvas.height);

                        // Render page
                        await page.render({
                            canvasContext: context,
                            viewport: scaledViewport,
                        }).promise;

                        // Use JPEG for smaller file size and faster processing
                        thumbnails[pageNum - 1] = canvas.toDataURL('image/jpeg', 0.7);

                        // Cleanup page resources
                        page.cleanup();
                    } catch (error) {
                        console.error(`Failed to generate thumbnail for page ${pageNum}:`, error);
                        thumbnails[pageNum - 1] = ''; // Empty placeholder for failed thumbnails
                    }
                })()
            );
        }

        // Wait for batch to complete
        await Promise.all(batchPromises);

        if (onProgress) {
            onProgress((batchEnd / totalPages) * 100);
        }
    }

    // Cleanup PDF document
    pdf.destroy();

    return thumbnails;
}

// ========== Helper Functions ==========

/**
 * Convert File to data URL
 */
function fileToDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

/**
 * Get image dimensions from data URL
 */
function getImageDimensions(dataUrl: string): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve({ width: img.width, height: img.height });
        img.onerror = reject;
        img.src = dataUrl;
    });
}

/**
 * Convert data URL to Blob
 */
function dataUrlToBlob(dataUrl: string): Promise<Blob> {
    return fetch(dataUrl).then(res => res.blob());
}

/**
 * Get jsPDF image format from MIME type
 */
function getImageFormat(mimeType: string): 'JPEG' | 'PNG' | 'WEBP' {
    if (mimeType.includes('jpeg') || mimeType.includes('jpg')) {
        return 'JPEG';
    } else if (mimeType.includes('webp')) {
        return 'WEBP';
    }
    return 'PNG';
}

/**
 * Compress an image file
 */
export async function compressImage(
    file: File,
    quality: number = 0.8,
    maxWidth: number = 2000,
    maxHeight: number = 2000
): Promise<Blob> {
    const dataUrl = await fileToDataUrl(file);
    const dimensions = await getImageDimensions(dataUrl);

    // Calculate new dimensions
    let width = dimensions.width;
    let height = dimensions.height;

    if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
    }

    if (height > maxHeight) {
        width = (width * maxHeight) / height;
        height = maxHeight;
    }

    // Create canvas and draw resized image
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d')!;
    const img = new Image();

    await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = reject;
        img.src = dataUrl;
    });

    ctx.drawImage(img, 0, 0, width, height);

    return new Promise((resolve, reject) => {
        canvas.toBlob(
            blob => {
                if (blob) resolve(blob);
                else reject(new Error('Failed to compress image'));
            },
            'image/jpeg',
            quality
        );
    });
}
