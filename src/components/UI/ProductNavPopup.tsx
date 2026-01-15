/**
 * ProductNavPopup Component
 * Popup modal for navigating between Famral products
 */

import { X } from 'lucide-react';
import './ProductNavPopup.css';

interface ProductNavPopupProps {
    isOpen: boolean;
    onClose: () => void;
}

interface Product {
    name: string;
    image: string;
    url: string;
}

const products: Product[] = [
    {
        name: 'Writer',
        image: '/Writer.png',
        url: 'https://writer.famral.com',
    },
    {
        name: 'Sheets',
        image: '/Sheets.png',
        url: 'https://sheets.famral.com',
    },
    {
        name: 'Slides',
        image: '/Slides.png',
        url: 'https://slides.famral.com/',
    },
    {
        name: 'PDF Editor',
        image: '/PDF Editor-2.png',
        url: 'https://pdf.famral.com/',
    },
];

export function ProductNavPopup({ isOpen, onClose }: ProductNavPopupProps) {
    if (!isOpen) return null;

    const handleProductClick = (url: string) => {
        window.open(url, '_blank', 'noopener,noreferrer');
    };

    const handleOverlayClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    return (
        <div className="product-nav-overlay" onClick={handleOverlayClick}>
            <div className="product-nav-popup">
                <div className="product-nav-header">
                    <h2>Famral Products</h2>
                    <button className="product-nav-close" onClick={onClose} title="Close">
                        <X size={20} />
                    </button>
                </div>

                <div className="product-nav-grid">
                    {products.map((product) => (
                        <button
                            key={product.name}
                            className="product-card"
                            onClick={() => handleProductClick(product.url)}
                            title={`Go to ${product.name}`}
                        >
                            <div className="product-image">
                                <img src={product.image} alt={product.name} />
                            </div>
                            <span className="product-name">{product.name}</span>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
