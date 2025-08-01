import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Camera, Upload, X, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Tesseract from 'tesseract.js';
import { supabase } from '@/integrations/supabase/client';

interface ScannedData {
  name?: string;
  phone?: string;
  email?: string;
  company?: string;
  job_title?: string;
  website?: string;
  location?: string;
  raw_text: string;
  source: 'camera' | 'upload';
  confidence?: number;
}

interface CardScannerProps {
  onScanComplete: (data: ScannedData) => void;
  onClose: () => void;
}

const CardScanner = ({ onScanComplete, onClose }: CardScannerProps) => {
  const [scanning, setScanning] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [uploadSource, setUploadSource] = useState<'camera' | 'upload'>('camera');
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const { toast } = useToast();

  const startCamera = async () => {
    try {
      // Stop any existing stream first
      stopCamera();
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment',
          width: { ideal: 1920, min: 1280 },
          height: { ideal: 1080, min: 720 }
        }
      });
      
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraActive(true);
      }
    } catch (error) {
      console.error('Camera error:', error);
      setCameraActive(false);
      toast({
        title: "Camera Error",
        description: "Unable to access camera. Please use file upload instead.",
        variant: "destructive",
      });
    }
  };

  // Auto-start camera when component mounts
  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current && cameraActive) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      const context = canvas.getContext('2d');
      
      // Ensure video has loaded
      if (video.videoWidth === 0 || video.videoHeight === 0) {
        toast({
          title: "Camera Not Ready",
          description: "Please wait for camera to initialize.",
          variant: "destructive",
        });
        return;
      }
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      if (context) {
        context.drawImage(video, 0, 0);
        const imageData = canvas.toDataURL('image/jpeg', 0.9);
        setCapturedImage(imageData);
        setUploadSource('camera');
        stopCamera();
      }
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type and size
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid File",
          description: "Please select an image file.",
          variant: "destructive",
        });
        return;
      }
      
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        toast({
          title: "File Too Large",
          description: "Please select an image smaller than 10MB.",
          variant: "destructive",
        });
        return;
      }
      
      const reader = new FileReader();
      reader.onload = (e) => {
        setCapturedImage(e.target?.result as string);
        setUploadSource('upload');
        stopCamera();
      };
      reader.readAsDataURL(file);
    }
  };

  const extractContactInfo = (text: string, confidence?: number): ScannedData => {
    // Enhanced regex patterns for better extraction
    const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi;
    const phoneRegex = /(\+?91[\s-]?[6-9]\d{9}|\+?1[\s-]?\(?[2-9]\d{2}\)?[\s-]?[2-9]\d{2}[\s-]?\d{4}|\+?[1-9]\d{1,14})/g;
    const websiteRegex = /(?:https?:\/\/)?(?:www\.)?([a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,})/gi;
    
    // Clean and normalize text
    const cleanText = text.replace(/[^\w\s@.+\-()]/gi, ' ').replace(/\s+/g, ' ').trim();
    const lines = text.split(/[\n\r]+/).map(line => line.trim()).filter(line => line.length > 1);
    
    const emails = cleanText.match(emailRegex);
    const phones = cleanText.match(phoneRegex);
    const websites = cleanText.match(websiteRegex);
    
    // Enhanced name detection with better patterns
    const nameCandidate = lines.find((line, index) => {
      const trimmed = line.trim();
      
      // Name is typically first line or within first 3 lines
      if (index > 3) return false;
      
      // Check for proper name pattern
      const isValidName = /^[A-Z][a-zA-Z]{1,}\s+[A-Z][a-zA-Z]{1,}(\s+[A-Z][a-zA-Z]{1,})?$/.test(trimmed);
      const hasNoNumbers = !/\d/.test(trimmed);
      const hasNoEmail = !emails?.some(email => trimmed.toLowerCase().includes(email.toLowerCase()));
      const hasNoPhone = !phones?.some(phone => trimmed.includes(phone.replace(/\D/g, '')));
      const hasNoWebsite = !websites?.some(website => trimmed.toLowerCase().includes(website.toLowerCase()));
      
      return isValidName && hasNoNumbers && hasNoEmail && hasNoPhone && hasNoWebsite;
    });
    
    // Enhanced company detection
    const companyKeywords = [
      'inc', 'inc.', 'ltd', 'ltd.', 'llc', 'corp', 'corporation', 'company', 'co.', 'co', 
      'group', 'solutions', 'services', 'technologies', 'systems', 'enterprises', 'consulting',
      'pvt', 'private', 'limited', 'software', 'tech', 'digital', 'innovation'
    ];
    
    const companyCandidate = lines.find((line, index) => {
      const trimmed = line.trim().toLowerCase();
      
      // Skip lines that are likely names or contact info
      if (nameCandidate && line === nameCandidate) return false;
      if (emails?.some(email => trimmed.includes(email.toLowerCase()))) return false;
      if (phones?.some(phone => trimmed.includes(phone.replace(/\D/g, '')))) return false;
      
      // Check for company keywords
      const hasCompanyKeyword = companyKeywords.some(keyword => 
        trimmed.includes(keyword) || trimmed.endsWith(keyword)
      );
      
      // Check for proper company formatting
      const isProperCase = /^[A-Z][a-zA-Z\s&,.-]{2,}/.test(line.trim());
      
      return hasCompanyKeyword || (isProperCase && index < 5);
    });
    
    // Enhanced job title detection
    const titleKeywords = [
      'manager', 'director', 'ceo', 'cto', 'cfo', 'president', 'vice president', 'vp',
      'senior', 'lead', 'head', 'chief', 'engineer', 'developer', 'analyst', 'consultant',
      'specialist', 'coordinator', 'executive', 'officer', 'founder', 'partner', 'associate'
    ];
    
    const jobTitleCandidate = lines.find(line => {
      const trimmed = line.trim().toLowerCase();
      
      // Skip if it's the name or company
      if (nameCandidate && line === nameCandidate) return false;
      if (companyCandidate && line === companyCandidate) return false;
      
      return titleKeywords.some(keyword => trimmed.includes(keyword));
    });
    
    // Enhanced address detection
    const addressCandidate = lines.find(line => {
      const trimmed = line.trim();
      
      // Skip contact info lines
      if (emails?.some(email => trimmed.toLowerCase().includes(email.toLowerCase()))) return false;
      if (phones?.some(phone => trimmed.includes(phone.replace(/\D/g, '')))) return false;
      
      // Look for address patterns
      return (
        /\d+.*(?:street|st\.?|avenue|ave\.?|road|rd\.?|drive|dr\.?|lane|ln\.?|boulevard|blvd\.?)/i.test(trimmed) ||
        /[A-Z][a-z]+,\s*[A-Z]{2}\s*\d{5}/.test(trimmed) ||
        /\d{6}/.test(trimmed) || // Indian postal codes
        /\d{5}/.test(trimmed) // US ZIP codes
      );
    });
    
    // Clean phone number
    const cleanPhone = phones?.[0]?.replace(/[^\d+]/g, '');
    
    return {
      name: nameCandidate?.trim(),
      email: emails?.[0]?.toLowerCase(),
      phone: cleanPhone,
      website: websites?.[0]?.replace(/^(https?:\/\/)?/, ''),
      company: companyCandidate?.trim(),
      job_title: jobTitleCandidate?.trim(),
      location: addressCandidate?.trim(),
      raw_text: text,
      source: uploadSource,
      confidence
    };
  };

  const processImage = async () => {
    if (!capturedImage) return;
    
    setScanning(true);
    try {
      let extractedText = '';
      let confidence = 0;
      
      // Try Google Cloud Vision API first
      try {
        const response = await supabase.functions.invoke('vision-ocr', {
          body: { imageData: capturedImage }
        });
        
        if (response.data?.success) {
          extractedText = response.data.text;
          confidence = response.data.confidence || 0.8;
          console.log('OCR completed with Google Vision API, confidence:', confidence);
        } else {
          throw new Error(response.data?.error || 'Vision API failed');
        }
      } catch (visionError) {
        console.log('Vision API failed, using Tesseract fallback:', visionError);
        
        // Fallback to Tesseract with enhanced settings
        const result = await Tesseract.recognize(
          capturedImage,
          'eng',
          {
            logger: (m) => {
              if (m.status === 'recognizing text') {
                console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
              }
            }
          }
        );
        extractedText = result.data.text;
        confidence = result.data.confidence / 100; // Tesseract gives 0-100
        console.log('OCR completed with Tesseract, confidence:', confidence);
      }
      
      if (!extractedText || extractedText.trim().length < 3) {
        throw new Error('No text could be extracted from the image');
      }
      
      const extractedData = extractContactInfo(extractedText, confidence);
      onScanComplete(extractedData);
      
      toast({
        title: "Scan Complete",
        description: `Business card processed successfully! (${Math.round(confidence * 100)}% confidence)`,
      });
      
    } catch (error) {
      console.error('OCR Error:', error);
      toast({
        title: "Scan Failed",
        description: error instanceof Error ? error.message : "Failed to process the image. Please try again with better lighting.",
        variant: "destructive",
      });
    } finally {
      setScanning(false);
    }
  };

  const retakePhoto = () => {
    setCapturedImage(null);
    setUploadSource('camera');
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
                <div className="relative">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-64 rounded-lg bg-muted object-cover"
                  />
                  
                  {/* Card alignment guide overlay */}
                  {cameraActive && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-4/5 h-3/5 border-2 border-primary rounded-lg opacity-60">
                        <div className="absolute -top-1 -left-1 w-4 h-4 border-l-2 border-t-2 border-primary"></div>
                        <div className="absolute -top-1 -right-1 w-4 h-4 border-r-2 border-t-2 border-primary"></div>
                        <div className="absolute -bottom-1 -left-1 w-4 h-4 border-l-2 border-b-2 border-primary"></div>
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 border-r-2 border-b-2 border-primary"></div>
                      </div>
                      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/70 text-white px-2 py-1 rounded text-sm">
                        Align card within guide
                      </div>
                    </div>
                  )}
                  
                  {!cameraActive && (
                    <div className="absolute inset-0 flex items-center justify-center bg-muted rounded-lg">
                      <div className="text-center">
                        <Camera className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">Starting camera...</p>
                      </div>
                    </div>
                  )}
                </div>
                
                <canvas ref={canvasRef} className="hidden" />
                
                <div className="flex gap-2">
                  <Button 
                    onClick={capturePhoto} 
                    disabled={!cameraActive}
                    className="flex-1"
                  >
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
                capture="environment"
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