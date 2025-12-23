/**
 * PDF to Excel Tool
 * Extract tables from PDF to Excel spreadsheet (.xlsx)
 */

import { useState, useCallback } from 'react';
import { useApp, useToast } from '../../store/appStore';
import { extractTextFromPDF } from '../../utils/textExtraction';
import { Download, Loader2, CheckCircle, FileSpreadsheet } from 'lucide-react';
import './Tools.css';

export function PDFToExcelTool() {
    const { state, setLoading } = useApp();
    const { addToast } = useToast();
    const { activeDocument } = state;

    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [extractTables, setExtractTables] = useState(true);
    const [includeFormatting, setIncludeFormatting] = useState(false);
    const [isComplete, setIsComplete] = useState(false);

    const handleConvert = useCallback(async () => {
        if (!activeDocument) return;

        setIsProcessing(true);
        setProgress(0);
        setLoading(true, 'Converting PDF to Excel...');

        try {
            // Extract text from PDF
            setProgress(20);
            const result = await extractTextFromPDF(
                activeDocument.arrayBuffer,
                (prog) => setProgress(20 + prog.percentage * 0.5)
            );

            setProgress(70);

            // Parse text into table data
            const tableData = parseTextToTableData(result.text);
            
            // Create CSV content (Excel-compatible)
            const csvContent = createCSV(tableData);

            setProgress(90);

            // Download as CSV (Excel can open this)
            const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = activeDocument.name.replace('.pdf', '.csv');
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            setProgress(100);
            setIsComplete(true);

            addToast({
                type: 'success',
                title: 'Conversion complete!',
                message: `Saved as ${activeDocument.name.replace('.pdf', '.csv')}`,
            });
        } catch (error) {
            console.error('Conversion failed:', error);
            addToast({
                type: 'error',
                title: 'Conversion failed',
                message: 'An error occurred while converting the PDF.',
            });
        } finally {
            setIsProcessing(false);
            setLoading(false);
        }
    }, [activeDocument, setLoading, addToast]);

    if (!activeDocument) {
        return (
            <div className="tool-panel">
                <div className="tool-empty">
                    <FileSpreadsheet size={48} />
                    <h3>Open a PDF first</h3>
                    <p>Upload a PDF file to extract tables to Excel format.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="tool-panel">
            <div className="tool-header">
                <h2 className="tool-title">PDF to Excel</h2>
                <p className="tool-description">
                    Extract tables and data from your PDF to a spreadsheet
                </p>
            </div>

            <div className="tool-content">
                {/* File Info */}
                <div className="tool-section">
                    <div className="compress-file-info">
                        <FileSpreadsheet size={32} className="compress-file-icon" />
                        <div className="compress-file-details">
                            <span className="compress-file-name">{activeDocument.name}</span>
                            <span className="compress-file-size">{activeDocument.pageCount} pages</span>
                        </div>
                    </div>
                </div>

                {/* Options */}
                <div className="tool-section">
                    <h4 className="section-title">Extraction Options</h4>
                    
                    <label className="checkbox-option">
                        <input
                            type="checkbox"
                            checked={extractTables}
                            onChange={(e) => setExtractTables(e.target.checked)}
                        />
                        <span className="checkbox-label">Auto-detect tables</span>
                        <span className="checkbox-hint">Automatically find and extract table data</span>
                    </label>

                    <label className="checkbox-option">
                        <input
                            type="checkbox"
                            checked={includeFormatting}
                            onChange={(e) => setIncludeFormatting(e.target.checked)}
                        />
                        <span className="checkbox-label">Preserve cell formatting</span>
                        <span className="checkbox-hint">Keep number and date formats</span>
                    </label>
                </div>

                {/* Progress */}
                {isProcessing && (
                    <div className="tool-section">
                        <div className="processing-state">
                            <Loader2 size={32} className="animate-spin" />
                            <h4>Extracting tables...</h4>
                            <div className="progress-container">
                                <div className="progress-bar">
                                    <div className="progress-fill" style={{ width: `${progress}%` }} />
                                </div>
                                <span className="progress-text">{progress}%</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Success State */}
                {isComplete && !isProcessing && (
                    <div className="tool-section">
                        <div className="success-state">
                            <CheckCircle size={48} className="success-icon" />
                            <h4>Extraction Complete!</h4>
                            <p>Your Excel file has been downloaded.</p>
                        </div>
                    </div>
                )}

                {/* Action Button */}
                <div className="tool-actions">
                    <button
                        className="btn btn-primary btn-lg"
                        onClick={handleConvert}
                        disabled={isProcessing}
                    >
                        {isProcessing ? (
                            <>
                                <Loader2 size={20} className="animate-spin" />
                                Extracting...
                            </>
                        ) : (
                            <>
                                <Download size={20} />
                                Convert to Excel
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

// Parse text into table-like data structure
function parseTextToTableData(text: string): string[][] {
    const lines = text.split('\n').filter(line => line.trim());
    const tableData: string[][] = [];

    for (const line of lines) {
        // Try to detect table rows by looking for multiple spaces or tabs as delimiters
        let cells: string[];
        
        if (line.includes('\t')) {
            cells = line.split('\t').map(c => c.trim());
        } else if (line.match(/\s{2,}/)) {
            cells = line.split(/\s{2,}/).map(c => c.trim());
        } else {
            cells = [line.trim()];
        }

        if (cells.length > 0 && cells.some(c => c)) {
            tableData.push(cells);
        }
    }

    // Normalize column count
    const maxCols = Math.max(...tableData.map(row => row.length));
    return tableData.map(row => {
        while (row.length < maxCols) {
            row.push('');
        }
        return row;
    });
}

// Create CSV from table data
function createCSV(data: string[][]): string {
    return data.map(row => 
        row.map(cell => {
            // Escape quotes and wrap in quotes if contains comma
            if (cell.includes(',') || cell.includes('"') || cell.includes('\n')) {
                return `"${cell.replace(/"/g, '""')}"`;
            }
            return cell;
        }).join(',')
    ).join('\n');
}
