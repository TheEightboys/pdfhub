/**
 * IndexedDB Storage Utility for PDF Documents
 * Saves and retrieves PDF documents for persistence across page reloads
 */

const DB_NAME = 'PDFHubStorage';
const DB_VERSION = 1;
const STORE_NAME = 'documents';

interface StoredDocument {
    id: string;
    name: string;
    arrayBuffer: ArrayBuffer;
    pageCount: number;
    savedAt: number;
}

/**
 * Open the IndexedDB database
 */
function openDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => {
            reject(new Error('Failed to open database'));
        };

        request.onsuccess = () => {
            resolve(request.result);
        };

        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'id' });
            }
        };
    });
}

/**
 * Save a PDF document to IndexedDB
 */
export async function saveDocumentToStorage(doc: {
    id: string;
    name: string;
    arrayBuffer: ArrayBuffer;
    pageCount: number;
}): Promise<void> {
    try {
        const db = await openDatabase();
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);

        const storedDoc: StoredDocument = {
            id: doc.id,
            name: doc.name,
            arrayBuffer: doc.arrayBuffer,
            pageCount: doc.pageCount,
            savedAt: Date.now(),
        };

        return new Promise((resolve, reject) => {
            const request = store.put(storedDoc);
            request.onsuccess = () => {
                db.close();
                resolve();
            };
            request.onerror = () => {
                db.close();
                reject(new Error('Failed to save document'));
            };
        });
    } catch (error) {
        console.error('Error saving document to storage:', error);
        throw error;
    }
}

/**
 * Get the most recently saved document from IndexedDB
 */
export async function getLastDocumentFromStorage(): Promise<StoredDocument | null> {
    try {
        const db = await openDatabase();
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);

        return new Promise((resolve, reject) => {
            const request = store.getAll();
            request.onsuccess = () => {
                db.close();
                const documents = request.result as StoredDocument[];
                if (documents.length === 0) {
                    resolve(null);
                } else {
                    // Return the most recently saved document
                    const sorted = documents.sort((a, b) => b.savedAt - a.savedAt);
                    resolve(sorted[0]);
                }
            };
            request.onerror = () => {
                db.close();
                reject(new Error('Failed to retrieve documents'));
            };
        });
    } catch (error) {
        console.error('Error getting document from storage:', error);
        return null;
    }
}

/**
 * Clear all saved documents from IndexedDB
 */
export async function clearDocumentStorage(): Promise<void> {
    try {
        const db = await openDatabase();
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);

        return new Promise((resolve, reject) => {
            const request = store.clear();
            request.onsuccess = () => {
                db.close();
                resolve();
            };
            request.onerror = () => {
                db.close();
                reject(new Error('Failed to clear storage'));
            };
        });
    } catch (error) {
        console.error('Error clearing document storage:', error);
        throw error;
    }
}

/**
 * Check if there's a saved document available
 */
export async function hasSavedDocument(): Promise<boolean> {
    try {
        const doc = await getLastDocumentFromStorage();
        return doc !== null;
    } catch {
        return false;
    }
}
