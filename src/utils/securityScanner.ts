/**
 * PDF Security Scanner
 * Protects users from malicious PDFs by scanning for:
 * - JavaScript code (common attack vector)
 * - Embedded files/attachments
 * - Suspicious URLs
 * - Invalid/malformed structure
 * - Encrypted content that might hide malware
 */

import { SecurityStatus, SecurityThreat } from '../types';

// PDF Magic Bytes - must start with %PDF-
const PDF_MAGIC_BYTES = [0x25, 0x50, 0x44, 0x46, 0x2D]; // %PDF-

// Suspicious patterns in PDFs
const SUSPICIOUS_PATTERNS = {
    // JavaScript indicators
    javascript: [
        '/JavaScript',
        '/JS',
        '/AA',           // Auto-action trigger
        '/OpenAction',   // Open action trigger
        '/Names',        // Can contain JS
        'app.launchURL',
        'this.exportDataObject',
        'util.printf',
        'spell.customDictionaryOpen',
    ],

    // Embedded file indicators
    embeddedFiles: [
        '/EmbeddedFiles',
        '/EmbeddedFile',
        '/Filespec',
        '/F',
        '/UF',
    ],

    // Suspicious actions
    suspiciousActions: [
        '/Launch',
        '/SubmitForm',
        '/ImportData',
        '/GoToR',
        '/GoToE',
        '/URI',
    ],

    // Malformed PDF indicators
    malformed: [
        'xref',     // Should be at specific locations
        'trailer',  // Should be at end
        'startxref', // Should be at end
    ],
};

// Maximum file size (100MB)
const MAX_FILE_SIZE = 100 * 1024 * 1024;

// Maximum time to scan (5 seconds)
const MAX_SCAN_TIME = 5000;

export class PDFSecurityScanner {
    private threats: SecurityThreat[] = [];


    /**
     * Scan a PDF file for security threats
     */
    async scanPDF(file: File): Promise<SecurityStatus> {
        this.threats = [];

        try {
            // Check file size
            if (file.size > MAX_FILE_SIZE) {
                this.addThreat({
                    type: 'malformed',
                    severity: 'medium',
                    description: `File is too large (${(file.size / 1024 / 1024).toFixed(2)}MB). Maximum allowed is 100MB.`,
                });
            }

            // Check file extension
            if (!file.name.toLowerCase().endsWith('.pdf')) {
                this.addThreat({
                    type: 'malformed',
                    severity: 'high',
                    description: 'File does not have a .pdf extension.',
                });
            }

            // Read file as ArrayBuffer
            const arrayBuffer = await this.readFileWithTimeout(file);
            const bytes = new Uint8Array(arrayBuffer);

            // Validate PDF magic bytes
            this.validateMagicBytes(bytes);

            // Convert to text for pattern scanning
            const text = await this.arrayBufferToText(arrayBuffer);

            // Scan for JavaScript
            this.scanForJavaScript(text);

            // Scan for embedded files
            this.scanForEmbeddedFiles(text);

            // Scan for suspicious actions
            this.scanForSuspiciousActions(text);

            // Check for encryption
            this.checkEncryption(text);

            // Validate structure
            this.validateStructure(text);

            return {
                isScanned: true,
                isClean: this.threats.length === 0,
                threats: this.threats,
                scanDate: new Date(),
            };
        } catch (error) {
            console.error('PDF scan error:', error);
            this.addThreat({
                type: 'malformed',
                severity: 'high',
                description: `Failed to scan file: ${error instanceof Error ? error.message : 'Unknown error'}`,
            });

            return {
                isScanned: true,
                isClean: false,
                threats: this.threats,
                scanDate: new Date(),
            };
        }
    }

    /**
     * Quick validation for PDF files (for dropzone accept check)
     */
    async quickValidate(file: File): Promise<boolean> {
        try {
            // Check extension
            if (!file.name.toLowerCase().endsWith('.pdf')) {
                return false;
            }

            // Read first 1KB to check magic bytes
            const slice = file.slice(0, 1024);
            const arrayBuffer = await slice.arrayBuffer();
            const bytes = new Uint8Array(arrayBuffer);

            // Check PDF magic bytes
            for (let i = 0; i < PDF_MAGIC_BYTES.length; i++) {
                if (bytes[i] !== PDF_MAGIC_BYTES[i]) {
                    return false;
                }
            }

            return true;
        } catch {
            return false;
        }
    }

    /**
     * Read file with timeout to prevent hanging on large files
     */
    private async readFileWithTimeout(file: File): Promise<ArrayBuffer> {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('File read timeout'));
            }, MAX_SCAN_TIME);

            const reader = new FileReader();
            reader.onload = () => {
                clearTimeout(timeout);
                resolve(reader.result as ArrayBuffer);
            };
            reader.onerror = () => {
                clearTimeout(timeout);
                reject(new Error('Failed to read file'));
            };
            reader.readAsArrayBuffer(file);
        });
    }

    /**
     * Convert ArrayBuffer to text for pattern matching
     */
    private async arrayBufferToText(buffer: ArrayBuffer): Promise<string> {
        // For large files, only scan first 1MB
        const maxScanSize = 1024 * 1024;
        const slicedBuffer = buffer.byteLength > maxScanSize
            ? buffer.slice(0, maxScanSize)
            : buffer;

        const decoder = new TextDecoder('utf-8', { fatal: false });
        return decoder.decode(slicedBuffer);
    }

    /**
     * Validate PDF magic bytes
     */
    private validateMagicBytes(bytes: Uint8Array): void {
        for (let i = 0; i < PDF_MAGIC_BYTES.length; i++) {
            if (bytes[i] !== PDF_MAGIC_BYTES[i]) {
                this.addThreat({
                    type: 'malformed',
                    severity: 'critical',
                    description: 'File does not have valid PDF magic bytes. This may not be a real PDF file.',
                    location: 'File header',
                });
                return;
            }
        }
    }

    /**
     * Scan for JavaScript in PDF
     */
    private scanForJavaScript(text: string): void {
        const jsPatterns = SUSPICIOUS_PATTERNS.javascript;

        for (const pattern of jsPatterns) {
            if (text.includes(pattern)) {
                this.addThreat({
                    type: 'javascript',
                    severity: 'high',
                    description: `PDF contains JavaScript indicator: ${pattern}. JavaScript in PDFs can be used for attacks.`,
                    location: `Pattern: ${pattern}`,
                });
            }
        }
    }

    /**
     * Scan for embedded files
     */
    private scanForEmbeddedFiles(text: string): void {
        const patterns = SUSPICIOUS_PATTERNS.embeddedFiles;

        for (const pattern of patterns) {
            if (text.includes(pattern)) {
                this.addThreat({
                    type: 'embedded_file',
                    severity: 'medium',
                    description: `PDF contains embedded file indicators: ${pattern}. Embedded files could contain malware.`,
                    location: `Pattern: ${pattern}`,
                });
                break; // Only report once
            }
        }
    }

    /**
     * Scan for suspicious actions
     */
    private scanForSuspiciousActions(text: string): void {
        const patterns = SUSPICIOUS_PATTERNS.suspiciousActions;

        for (const pattern of patterns) {
            if (text.includes(pattern)) {
                let severity: 'low' | 'medium' | 'high' = 'medium';
                let description = '';

                switch (pattern) {
                    case '/Launch':
                        severity = 'high';
                        description = 'PDF may attempt to launch external applications.';
                        break;
                    case '/SubmitForm':
                        severity = 'medium';
                        description = 'PDF contains form submission action which could send data externally.';
                        break;
                    case '/ImportData':
                        severity = 'medium';
                        description = 'PDF may attempt to import external data.';
                        break;
                    case '/GoToR':
                    case '/GoToE':
                        severity = 'low';
                        description = 'PDF contains external document reference.';
                        break;
                    case '/URI':
                        severity = 'low';
                        description = 'PDF contains external URL links.';
                        break;
                    default:
                        description = `Suspicious action found: ${pattern}`;
                }

                this.addThreat({
                    type: 'suspicious_link',
                    severity,
                    description,
                    location: `Pattern: ${pattern}`,
                });
            }
        }
    }

    /**
     * Check for encrypted content
     */
    private checkEncryption(text: string): void {
        if (text.includes('/Encrypt')) {
            this.addThreat({
                type: 'encrypted',
                severity: 'low',
                description: 'PDF is encrypted. You may need a password to fully process this file.',
                location: 'Document structure',
            });
        }
    }

    /**
     * Basic structure validation
     */
    private validateStructure(text: string): void {
        // Check for basic PDF structure elements
        if (!text.includes('%%EOF')) {
            this.addThreat({
                type: 'malformed',
                severity: 'low',
                description: 'PDF may have incomplete or malformed structure (missing EOF marker).',
                location: 'End of file',
            });
        }

        // Check for xref table or cross-reference stream
        if (!text.includes('xref') && !text.includes('/XRef')) {
            // This might be a linearized PDF or have a different structure
            // Not necessarily a threat, just noting it
        }
    }

    /**
     * Add a threat to the list
     */
    private addThreat(threat: SecurityThreat): void {
        // Avoid duplicate threats
        const exists = this.threats.some(
            t => t.type === threat.type && t.description === threat.description
        );

        if (!exists) {
            this.threats.push(threat);
        }
    }

    /**
     * Get severity badge color
     */
    static getSeverityColor(severity: SecurityThreat['severity']): string {
        switch (severity) {
            case 'low': return 'var(--color-warning-500)';
            case 'medium': return 'var(--color-warning-600)';
            case 'high': return 'var(--color-error-500)';
            case 'critical': return 'var(--color-error-700)';
            default: return 'var(--color-gray-500)';
        }
    }

    /**
     * Get overall risk level
     */
    static getOverallRisk(threats: SecurityThreat[]): 'safe' | 'low' | 'medium' | 'high' | 'critical' {
        if (threats.length === 0) return 'safe';

        const hasCritical = threats.some(t => t.severity === 'critical');
        const hasHigh = threats.some(t => t.severity === 'high');
        const hasMedium = threats.some(t => t.severity === 'medium');

        if (hasCritical) return 'critical';
        if (hasHigh) return 'high';
        if (hasMedium) return 'medium';
        return 'low';
    }

    /**
     * Get risk level message
     */
    static getRiskMessage(risk: 'safe' | 'low' | 'medium' | 'high' | 'critical'): string {
        switch (risk) {
            case 'safe':
                return 'No security issues detected. File appears safe.';
            case 'low':
                return 'Minor security notes detected. File is likely safe to use.';
            case 'medium':
                return 'Some security concerns detected. Review before proceeding.';
            case 'high':
                return 'Significant security issues detected. Proceed with caution.';
            case 'critical':
                return 'Critical security threats detected. Do not trust this file.';
        }
    }
}

// Export singleton instance
export const pdfSecurityScanner = new PDFSecurityScanner();
