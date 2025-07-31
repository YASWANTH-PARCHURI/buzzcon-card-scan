import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Camera, Upload, X, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Tesseract from 'tesseract.js';

interface ScannedData {
  name?: string;
  phone?: string;
  email?: string;
  company?: string;
  job_title?: string;
  website?: string;
  location?: string;
  raw_text: string;
}

interface CardScannerProps {
  onScanComplete: (data: ScannedData) => void;
  onClose: () => void;
}

const CardScanner = ({ onScanComplete, onClose }: CardScannerProps) => {
  const [scanning, setScanning] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const { toast } = useToast();

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      toast({
        title: "Camera Error",
        description: "Unable to access camera. Please use file upload instead.",
        variant: "destructive",
      });
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      const context = canvas.getContext('2d');
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      if (context) {
        context.drawImage(video, 0, 0);
        const imageData = canvas.toDataURL('image/jpeg');
        setCapturedImage(imageData);
        stopCamera();
      }
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setCapturedImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const extractContactInfo = (text: string): ScannedData => {
    const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/gi;
    const phoneRegex = /(\+?[\d\s\-\(\)\.]{10,})/g;
    const websiteRegex = /((?:https?:\/\/)?(?:www\.)?[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(?:\.[a-zA-Z]{2,})?)/gi;
    
    const emails = text.match(emailRegex);
    const phones = text.match(phoneRegex);
    const websites = text.match(websiteRegex);
    
    const lines = text.split('\n').filter(line => line.trim().length > 0);
    
    // Try to identify name (usually first line or line with title case)
    const nameCandidate = lines.find(line => 
      /^[A-Z][a-z]+ [A-Z][a-z]+/.test(line.trim()) && 
      !emails?.includes(line) && 
      !phones?.some(phone => line.includes(phone))
    );
    
    return {
      name: nameCandidate?.trim(),
      email: emails?.[0],
      phone: phones?.[0]?.replace(/\s+/g, ''),
      website: websites?.[0],
      company: lines.find(line => 
        line.toLowerCase().includes('inc') || 
        line.toLowerCase().includes('ltd') ||
        line.toLowerCase().includes('corp') ||
        line.toLowerCase().includes('company')
      )?.trim(),
      location: lines.find(line => 
        /\d+.*(?:street|st|avenue|ave|road|rd|drive|dr|lane|ln)/i.test(line) ||
        /[A-Z][a-z]+,\s*[A-Z]{2}\s*\d{5}/.test(line)
      )?.trim(),
      raw_text: text
    };
  };

  const processImage = async () => {
    if (!capturedImage) return;
    
    setScanning(true);
    try {
      const result = await Tesseract.recognize(
        capturedImage,
        'eng',
        {
          logger: (m) => console.log(m)
        }
      );
      
      const extractedData = extractContactInfo(result.data.text);
      onScanComplete(extractedData);
      
      toast({
        title: "Scan Complete",
        description: "Business card scanned successfully!",
      });
    } catch (error) {
      toast({
        title: "Scan Error",
        description: "Failed to process the image. Please try again.",
        variant: "destructive",
      });
    } finally {
      setScanning(false);
    }
  };

  const retakePhoto = () => {
    setCapturedImage(null);
    startCamera();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Scan Business Card</CardTitle>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {!capturedImage ? (
            <>
              <div className="space-y-4">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full rounded-lg bg-muted"
                  onLoadedMetadata={startCamera}
                />
                <canvas ref={canvasRef} className="hidden" />
                
                <div className="flex gap-2">
                  <Button onClick={capturePhoto} className="flex-1">
                    <Camera className="h-4 w-4 mr-2" />
                    Capture
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload
                  </Button>
                </div>
              </div>
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </>
          ) : (
            <div className="space-y-4">
              <img 
                src={capturedImage} 
                alt="Captured business card" 
                className="w-full rounded-lg"
              />
              
              <div className="flex gap-2">
                <Button 
                  onClick={processImage} 
                  disabled={scanning}
                  className="flex-1"
                >
                  {scanning ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    'Scan Card'
                  )}
                </Button>
                <Button variant="outline" onClick={retakePhoto}>
                  Retake
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CardScanner;