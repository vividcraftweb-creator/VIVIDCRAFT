'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, ZoomIn, ZoomOut, Download, RotateCw } from 'lucide-react';
import { useState } from 'react';

interface DocumentViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentUrl: string | null;
  documentType: string;
  userName: string;
}

export function DocumentViewerModal({
  isOpen,
  onClose,
  documentUrl,
  documentType,
  userName,
}: DocumentViewerModalProps) {
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 25, 200));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 25, 50));
  const handleRotate = () => setRotation((prev) => (prev + 90) % 360);
  const handleDownload = () => {
    if (documentUrl) {
      window.open(documentUrl, '_blank');
    }
  };

  const getDocumentTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'ID_FRONT': 'ID Front',
      'ID_BACK': 'ID Back',
      'SELFIE': 'Selfie with ID',
      'BUSINESS_REGISTRATION': 'Business Registration',
      'PROOF_OF_ADDRESS': 'Proof of Address',
      'TAX_DOCUMENT': 'Tax Document',
      'BUSINESS_LICENSE': 'Business License',
    };
    return labels[type] || type;
  };

  const isImage = documentUrl?.match(/\.(jpg|jpeg|png|gif|webp)$/i);
  const isPdf = documentUrl?.match(/\.pdf$/i);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl h-[90vh] p-0 bg-slate-900 border-white/10">
        <DialogHeader className="px-6 py-4 border-b border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-white text-xl">
                {getDocumentTypeLabel(documentType)}
              </DialogTitle>
              <p className="text-sm text-slate-400 mt-1">{userName}</p>
            </div>
            <div className="flex items-center gap-2">
              {isImage && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleZoomOut}
                    className="bg-white/5 border-white/10 hover:bg-white/10"
                  >
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-slate-400 min-w-[60px] text-center">
                    {zoom}%
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleZoomIn}
                    className="bg-white/5 border-white/10 hover:bg-white/10"
                  >
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRotate}
                    className="bg-white/5 border-white/10 hover:bg-white/10"
                  >
                    <RotateCw className="h-4 w-4" />
                  </Button>
                </>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
                className="bg-white/5 border-white/10 hover:bg-white/10"
              >
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="hover:bg-white/10"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>
        <div className="flex-1 overflow-auto p-6 bg-black/20">
          <div className="flex items-center justify-center min-h-full">
            {documentUrl ? (
              isImage ? (
                <img
                  src={documentUrl}
                  alt={documentType}
                  style={{
                    transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
                    transition: 'transform 0.2s ease',
                    maxWidth: '100%',
                    height: 'auto',
                  }}
                  className="rounded-lg"
                />
              ) : isPdf ? (
                <iframe
                  src={documentUrl}
                  className="w-full h-full min-h-[600px] rounded-lg"
                  title={documentType}
                />
              ) : (
                <div className="text-center">
                  <p className="text-slate-400 mb-4">
                    Preview not available for this file type
                  </p>
                  <Button onClick={handleDownload} className="bg-blue-600 hover:bg-blue-700">
                    <Download className="h-4 w-4 mr-2" />
                    Download File
                  </Button>
                </div>
              )
            ) : (
              <p className="text-slate-400">No document available</p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
