/**
 * Download Result Component
 * Displays success state with download button after PDF processing
 */

import React from 'react';
import { Check, Download, RefreshCw, FileText } from 'lucide-react';
import { downloadPDF } from '../../utils/pdfHelpers';
import { useToast } from '../../store/appStore';
import './Tools.css';

interface DownloadResultProps {
    /** Title displayed in success state, e.g., "Merge Complete!" */
    title: string;
    /** Descriptive message about the operation */
    message: string;
    /** Name of the output file */
    fileName: string;
    /** The processed PDF bytes */
    fileData: Uint8Array;
    /** Callback to reset and allow new processing */
    onReset: () => void;
    /** Label for reset button, e.g., "Merge More" */
    resetLabel?: string;
    /** Optional details to display (e.g., page count, file size) */
    details?: { label: string; value: string | number }[];
}

export function DownloadResult({
    title,
    message,
    fileName,
    fileData,
    onReset,
    resetLabel = 'Process More',
    details,
}: DownloadResultProps) {
    const { addToast } = useToast();
    const [isDownloading, setIsDownloading] = React.useState(false);
    const [downloadCount, setDownloadCount] = React.useState(0);

    const handleDownload = () => {
        if (!fileData || fileData.length === 0) {
            addToast({
                type: 'error',
                title: 'Download failed',
                message: 'No file data available to download.',
            });
            return;
        }

        setIsDownloading(true);
        
        try {
            downloadPDF(fileData, fileName);
            setDownloadCount(prev => prev + 1);
            addToast({
                type: 'success',
                title: 'Downloaded!',
                message: `Saved as ${fileName}`,
            });
        } catch (error) {
            console.error('Download failed:', error);
            addToast({
                type: 'error',
                title: 'Download failed',
                message: 'An error occurred while downloading.',
            });
        } finally {
            setIsDownloading(false);
        }
    };

    const fileSizeFormatted = React.useMemo(() => {
        if (!fileData) return '0 B';
        const bytes = fileData.length;
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }, [fileData]);

    return (
        <div className="download-result">
            <div className="download-result-content">
                {/* Success Icon */}
                <div className="download-result-icon">
                    <Check size={48} strokeWidth={3} />
                </div>

                {/* Title & Message */}
                <h3 className="download-result-title">{title}</h3>
                <p className="download-result-message">{message}</p>

                {/* File Info Card */}
                <div className="download-result-file">
                    <FileText size={24} />
                    <div className="download-result-file-info">
                        <span className="download-result-filename">{fileName}</span>
                        <span className="download-result-filesize">{fileSizeFormatted}</span>
                    </div>
                </div>

                {/* Optional Details */}
                {details && details.length > 0 && (
                    <div className="download-result-details">
                        {details.map((detail, index) => (
                            <div key={index} className="download-result-detail">
                                <span className="detail-label">{detail.label}</span>
                                <span className="detail-value">{detail.value}</span>
                            </div>
                        ))}
                    </div>
                )}

                {/* Download Button - Primary and Prominent */}
                <button
                    className="btn btn-primary btn-lg download-result-btn"
                    onClick={handleDownload}
                    disabled={isDownloading}
                >
                    <Download size={20} />
                    {isDownloading ? 'Downloading...' : downloadCount > 0 ? 'Download Again' : 'Download PDF'}
                </button>

                {/* Reset Button */}
                <button
                    className="btn btn-secondary download-result-reset"
                    onClick={onReset}
                >
                    <RefreshCw size={16} />
                    {resetLabel}
                </button>
            </div>
        </div>
    );
}
