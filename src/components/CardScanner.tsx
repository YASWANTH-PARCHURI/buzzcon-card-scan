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
        video: { 
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (error) {
      console.error('Camera error:', error);
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
    const phoneRegex = /(\+?1?[-.\s]?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}|\+?[1-9]\d{1,14})/g;
    const websiteRegex = /((?:https?:\/\/)?(?:www\.)?[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,})/gi;
    
    const emails = text.match(emailRegex);
    const phones = text.match(phoneRegex);
    const websites = text.match(websiteRegex);
    
    const lines = text.split('\n').filter(line => line.trim().length > 1);
    
    // Enhanced name detection
    const nameCandidate = lines.find(line => {
      const trimmed = line.trim();
      return /^[A-Z][a-zA-Z\s]{2,30}$/.test(trimmed) && 
        !emails?.some(email => trimmed.includes(email)) && 
        !phones?.some(phone => trimmed.includes(phone.replace(/\D/g, ''))) &&
        !websiteRegex.test(trimmed) &&
        !/\d/.test(trimmed);
    });
    
    // Better company detection
    const companyKeywords = ['inc', 'ltd', 'llc', 'corp', 'company', 'co.', 'group', 'solutions', 'services', 'technologies', 'systems'];
    const companyCandidate = lines.find(line => 
      companyKeywords.some(keyword => line.toLowerCase().includes(keyword)) ||
      /^[A-Z][a-zA-Z\s&,.-]{3,50}$/.test(line.trim())
    );
    
    // Job title detection
    const titleKeywords = ['manager', 'director', 'ceo', 'cto', 'cfo', 'president', 'vice', 'senior', 'lead', 'head', 'engineer', 'developer', 'analyst', 'consultant', 'specialist', 'coordinator'];
    const jobTitleCandidate = lines.find(line => 
      titleKeywords.some(keyword => line.toLowerCase().includes(keyword))
    );
    
    // Address detection
    const addressCandidate = lines.find(line => 
      /\d+.*(?:street|st\.?|avenue|ave\.?|road|rd\.?|drive|dr\.?|lane|ln\.?|boulevard|blvd\.?)/i.test(line) ||
      /[A-Z][a-z]+,\s*[A-Z]{2}\s*\d{5}/.test(line) ||
      /\d{5}/.test(line)
    );
    
    return {
      name: nameCandidate?.trim(),
      email: emails?.[0],
      phone: phones?.[0]?.replace(/[^\d+]/g, ''),
      website: websites?.[0],
      company: companyCandidate?.trim(),
      job_title: jobTitleCandidate?.trim(),
      location: addressCandidate?.trim(),
      raw_text: text
    };
  };

  const processImage = async () => {
    if (!capturedImage) return;
    
    setScanning(true);
    try {
      // Try Google Cloud Vision API first, fallback to Tesseract
      let extractedText = '';
      
      try {
        const response = await fetch('https://zdcgdwsnooapdfejpmbg.supabase.co/functions/v1/vision-ocr', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ imageData: capturedImage }),
        });
        
        const result = await response.json();
        
        if (result.success) {
          extractedText = result.text;
        } else {
          throw new Error('Vision API failed');
        }
      } catch (visionError) {
        console.log('Vision API unavailable, using Tesseract fallback');
        // Fallback to Tesseract
        const result = await Tesseract.recognize(
          capturedImage,
          'eng',
          {
            logger: (m) => console.log(m)
          }
        );
        extractedText = result.data.text;
      }
      
      const extractedData = extractContactInfo(extractedText);
      onScanComplete(extractedData);
      
      toast({
        title: "Scan Complete",
        description: "Business card scanned successfully!",
      });
    } catch (error) {
      console.error('OCR Error:', error);
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
                  muted
                  className="w-full rounded-lg bg-muted"
                  onCanPlay={startCamera}
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