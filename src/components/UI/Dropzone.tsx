/**
 * Dropzone Component - Premium Design
 * Enhanced with animated PDF icon and prominent button
 */

import React, { useCallback, useState, useEffect, useRef } from 'react';
import { Upload, CheckCircle, FileWarning, FileText } from 'lucide-react';
import gsap from 'gsap';
import { pdfSecurityScanner } from '../../utils/securityScanner';
import './Dropzone.css';

interface DropzoneProps {
    onFilesAccepted: (files: File[]) => void;
    accept?: string;
    multiple?: boolean;
    maxSize?: number;
    label?: string;
    hint?: string;
    disabled?: boolean;
    showSecurityScan?: boolean;
}

interface ScanResult {
    file: File;
    isValid: boolean;
    error?: string;
}

export function Dropzone({
    onFilesAccepted,
    accept = '.pdf',
    multiple = false,
    maxSize = 500 * 1024 * 1024, // 500MB default
    label = 'Select PDF file',
    hint = 'or drag and drop here',
    disabled = false,
    showSecurityScan = true,
}: DropzoneProps) {
    const [isDragActive, setIsDragActive] = useState(false);
    const [isScanning, setIsScanning] = useState(false);
    const [scanProgress, setScanProgress] = useState(0);
    const [scanResults, setScanResults] = useState<ScanResult[]>([]);
    const iconRef = useRef<HTMLDivElement>(null);
    const dropzoneRef = useRef<HTMLDivElement>(null);

    // Animation on mount
    useEffect(() => {
        if (iconRef.current && dropzoneRef.current) {
            gsap.fromTo(iconRef.current,
                { scale: 0, rotation: -10 },
                { scale: 1, rotation: 0, duration: 0.5, ease: 'back.out(1.7)' }
            );
            gsap.fromTo(dropzoneRef.current,
                { opacity: 0, y: 20 },
                { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' }
            );
        }
    }, []);

    // Icon is now static - no floating animation
    // The mount animation (lines 47-58) provides subtle entrance effect

    useEffect(() => {
        if (isScanning) {
            let progress = 0;
            const interval = setInterval(() => {
                progress += Math.random() * 20 + 10;
                if (progress > 95) progress = 95;
                setScanProgress(Math.round(progress));
            }, 150);
            return () => clearInterval(interval);
        } else {
            setScanProgress(0);
        }
    }, [isScanning]);

    const handleDragEnter = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!disabled) {
            setIsDragActive(true);
            if (iconRef.current) {
                gsap.to(iconRef.current, { scale: 1.1, duration: 0.2 });
            }
        }
    }, [disabled]);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragActive(false);
        if (iconRef.current) {
            gsap.to(iconRef.current, { scale: 1, duration: 0.2 });
        }
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    }, []);

    const validateAndScanFiles = useCallback(async (fileList: FileList) => {
        if (disabled) return;

        setIsScanning(true);
        setScanResults([]);

        const fileArray = Array.from(fileList);
        const results: ScanResult[] = [];

        for (const file of fileArray) {
            if (file.size > maxSize) {
                const sizeMB = Math.round(file.size / (1024 * 1024));
                const maxMB = Math.round(maxSize / (1024 * 1024));
                results.push({ file, isValid: false, error: `File too large (${sizeMB}MB, max ${maxMB}MB)` });
                continue;
            }

            const extension = file.name.toLowerCase().split('.').pop();
            const acceptedTypes = accept.split(',').map(t => t.trim().replace('.', ''));

            if (!acceptedTypes.includes(extension || '')) {
                results.push({ file, isValid: false, error: `Invalid file type` });
                continue;
            }

            if (showSecurityScan && extension === 'pdf') {
                const isValid = await pdfSecurityScanner.quickValidate(file);
                if (!isValid) {
                    results.push({ file, isValid: false, error: 'Invalid PDF' });
                    continue;
                }
            }

            results.push({ file, isValid: true });
        }

        setScanProgress(100);
        await new Promise(resolve => setTimeout(resolve, 200));

        setScanResults(results);
        setIsScanning(false);

        const validFiles = results.filter(r => r.isValid).map(r => r.file);
        if (validFiles.length > 0) {
            onFilesAccepted(multiple ? validFiles : [validFiles[0]]);
        }
    }, [accept, maxSize, multiple, onFilesAccepted, showSecurityScan, disabled]);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragActive(false);
        if (iconRef.current) {
            gsap.to(iconRef.current, { scale: 1, duration: 0.2 });
        }
        if (disabled) return;
        const { files } = e.dataTransfer;
        if (files?.length > 0) validateAndScanFiles(files);
    }, [disabled, validateAndScanFiles]);

    const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const { files } = e.target;
        if (files && files.length > 0) validateAndScanFiles(files);
        e.target.value = '';
    }, [validateAndScanFiles]);

    const handleClick = useCallback(() => {
        if (!disabled && !isScanning) {
            document.getElementById('dropzone-input')?.click();
        }
    }, [disabled, isScanning]);

    return (
        <div className="dropzone-wrapper">
            <div
                ref={dropzoneRef}
                className={`dropzone ${isDragActive ? 'dropzone-active' : ''} ${disabled ? 'dropzone-disabled' : ''} ${isScanning ? 'dropzone-scanning' : ''}`}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={handleClick}
            >
                <input
                    id="dropzone-input"
                    type="file"
                    accept={accept}
                    multiple={multiple}
                    onChange={handleFileInput}
                    className="dropzone-input"
                    disabled={disabled}
                />

                {isScanning ? (
                    <div className="dropzone-loading">
                        <div className="dropzone-scanning-icon">
                            <FileText size={40} />
                        </div>
                        <span className="loading-text">Processing your PDF...</span>
                        <div className="loading-bar">
                            <div className="loading-fill" style={{ width: `${scanProgress}%` }} />
                        </div>
                        <span className="loading-percent">{scanProgress}%</span>
                    </div>
                ) : (
                    <div className="dropzone-content">
                        {/* Animated PDF Icon */}
                        <div ref={iconRef} className="dropzone-pdf-icon">
                            <FileText size={48} strokeWidth={1.5} />
                        </div>

                        {/* Main Button */}
                        <button type="button" className="dropzone-button">
                            <Upload size={20} strokeWidth={2.5} />
                            <span style={{ color: '#ffffff', fontWeight: 600 }}>{label}</span>
                        </button>

                        {/* Hint Text */}
                        <p className="dropzone-hint">{hint}</p>
                    </div>
                )}
            </div>

            {/* Results */}
            {scanResults.length > 0 && (
                <div className="dropzone-results">
                    {scanResults.map((result, index) => (
                        <div key={index} className={`dropzone-result ${result.isValid ? 'valid' : 'invalid'}`}>
                            {result.isValid ? (
                                <CheckCircle size={16} />
                            ) : (
                                <FileWarning size={16} />
                            )}
                            <span>{result.file.name}</span>
                            {result.error && <span className="result-error">{result.error}</span>}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
