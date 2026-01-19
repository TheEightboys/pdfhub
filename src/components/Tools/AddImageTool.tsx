/**
 * Add Image Tool
 * Insert images into PDF pages
 */

import React, { useCallback, useRef } from 'react';
import { useApp, useToast } from '../../store/appStore';
import { ImagePlus, Upload } from 'lucide-react';
import './Tools.css';

export function AddImageTool() {
    const { state, setToolOptions, setActiveTool } = useApp();
    const { addToast } = useToast();
    const { activeDocument } = state;
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        const file = files[0];
        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const preview = event.target?.result as string;
                setToolOptions({
                     pendingImage: { file, preview }
                });
                setActiveTool('add-image');
                addToast({
                     type: 'info',
                     title: 'Click on page',
                     message: 'Click anywhere on the PDF to place the image.'
                });
            };
            reader.readAsDataURL(file);
        }
        e.target.value = '';
    }, [setToolOptions, setActiveTool, addToast]);

    if (!activeDocument) {
        return (
             <div className="tool-panel">
                <div className="tool-empty">
                    <ImagePlus size={48} />
                    <p>Open a PDF to add images</p>
                </div>
            </div>
        );
    }

    return (
        <div className="tool-panel">
            <div className="tool-header">
                <h2 className="tool-title">Add Image</h2>
                <p className="tool-description">Insert images into your PDF pages</p>
            </div>

            <div className="tool-content">
                <div className="upload-section">
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/jpg"
                        onChange={handleFileSelect}
                        style={{ display: 'none' }}
                    />
                    <button
                        className="btn btn-secondary w-full"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <Upload size={18} />
                        <span>Select Image</span>
                    </button>
                    <p className="text-sm text-gray-500 mt-2 text-center">
                        Select an image, then click on the document to place it.
                    </p>
                </div>
            </div>
        </div>
    );
}
