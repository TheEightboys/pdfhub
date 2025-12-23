# PDF Editor Pro

A free, web-based PDF editor that processes all files locally in your browser. No uploads, no sign-ups, 100% private.

## Features

### Core PDF Tools
- **Merge PDF** - Combine multiple PDFs into one document
- **Split PDF** - Extract specific pages into a new PDF
- **Rotate Pages** - Rotate pages individually or in bulk
- **Delete Pages** - Remove unwanted pages
- **Reorder Pages** - Drag-and-drop page reordering
- **Compress PDF** - Reduce file size

### Conversion Tools
- **PDF to Images** - Export pages as PNG/JPEG/WebP
- **Images to PDF** - Create PDF from multiple images

### Annotation Tools (Coming Soon)
- Add text overlays
- Highlight, underline, strikethrough
- Draw shapes (rectangles, circles, arrows)
- Freehand drawing
- Signature placement
- Sticky notes

### Security Features
- **Malware Protection** - Scans PDFs for JavaScript, embedded files, and suspicious actions
- **100% Client-Side** - Files never leave your browser
- **No Upload** - All processing happens locally

## Technology Stack

- **Frontend**: React 18 + TypeScript
- **Build Tool**: Vite
- **PDF Rendering**: PDF.js
- **PDF Manipulation**: pdf-lib
- **Image Conversion**: jsPDF, Canvas API
- **Icons**: Lucide React
- **Styling**: Pure CSS with custom properties

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Development

The application will start at `http://localhost:5173`

## Project Structure

```
src/
├── components/
│   ├── Layout/
│   │   ├── Header.tsx         # Top navigation bar
│   │   └── Sidebar.tsx        # Tool categories sidebar
│   ├── PDFViewer/
│   │   └── PDFViewer.tsx      # PDF rendering and navigation
│   ├── Tools/
│   │   ├── MergePDF.tsx       # Merge tool
│   │   ├── SplitPDF.tsx       # Split tool
│   │   ├── RotatePages.tsx    # Rotate tool
│   │   ├── CompressPDF.tsx    # Compress tool
│   │   ├── PDFToImages.tsx    # PDF to images converter
│   │   └── ImagesToPDF.tsx    # Images to PDF converter
│   ├── UI/
│   │   ├── Dropzone.tsx       # Drag-and-drop file upload
│   │   ├── Modal.tsx          # Modal dialogs
│   │   └── Toast.tsx          # Toast notifications
│   └── WelcomeScreen/
│       └── WelcomeScreen.tsx  # Landing screen with tools grid
├── store/
│   └── appStore.tsx           # React Context state management
├── utils/
│   ├── pdfHelpers.ts          # PDF manipulation functions
│   ├── imageHelpers.ts        # Image conversion functions
│   └── securityScanner.ts     # PDF security scanner
├── styles/
│   ├── variables.css          # CSS custom properties
│   ├── global.css             # Global styles and resets
│   └── components.css         # Component styles
├── types/
│   └── index.ts               # TypeScript type definitions
├── App.tsx                    # Main application component
└── main.tsx                   # Entry point
```

## Deployment

### Vercel (Recommended)
```bash
npm run build
# Deploy the 'dist' folder
```

### Netlify
```bash
npm run build
# Deploy the 'dist' folder
# Set publish directory to 'dist'
```

### GitHub Pages
```bash
# Add base path to vite.config.ts if needed
npm run build
# Deploy the 'dist' folder
```

## Privacy & Security

- **No Server Upload**: All PDF processing happens in your browser using JavaScript
- **No Cookies**: Only theme preference is stored in localStorage
- **No Analytics**: No third-party tracking scripts
- **No Authentication**: Direct access to all tools
- **Security Scanning**: PDFs are scanned for potentially malicious content before opening

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## License

MIT License - Free for personal and commercial use.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
