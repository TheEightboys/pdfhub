
import { useEffect, useRef } from 'react';
import { useApp } from '../store/appStore';
import { saveDocumentToStorage } from '../utils/documentStorage';
import { savePDFWithAnnotations } from '../utils/pdfHelpers';

export function useAutoSave() {
    const { state, setSaveStatus } = useApp();
    const { activeDocument } = state;
    // const { addToast } = useToast(); // Unused
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const lastSavedStateRef = useRef<string>('');

    useEffect(() => {
        if (!activeDocument) return;

        // Create a signature of the current state to check for changes
        // checking annotations count or specific update timestamps would be better,
        // but simple JSON stringify of pages (excluding heavy data) works for MVP
        const currentSignature = JSON.stringify(activeDocument.pages.map(p => ({
            p: p.pageNumber,
            a: p.annotations
        })));

        if (currentSignature === lastSavedStateRef.current) return;

        // Clear previous timeout
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }

        // Set new timeout (debounce)
        saveTimeoutRef.current = setTimeout(async () => {
            // We need to save the FULL PDF with modifications to storage
            // This is expensive (serializing PDF), so we do it debounced (e.g. 5 sec)

            try {
                setSaveStatus('saving');

                // 1. Burn annotations into a new PDF byte array
                const bytes = await savePDFWithAnnotations(activeDocument);

                // 2. Save detailed object to indexedDB
                await saveDocumentToStorage({
                    id: activeDocument.id,
                    name: activeDocument.name,
                    arrayBuffer: bytes.buffer as ArrayBuffer,
                    pageCount: activeDocument.pageCount
                });

                lastSavedStateRef.current = currentSignature;
                setSaveStatus('saved');

            } catch (err) {
                console.error('Auto-save failed', err);
                // Keep visible as unsaved/error? For now just log.
            }

        }, 5000); // 5 seconds debounce

        return () => {
            if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        };

    }, [activeDocument]); // Dependency on activeDocument structure
}
