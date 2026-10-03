'use client';

import { Html5Qrcode } from 'html5-qrcode';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { collection, getDocs, getFirestore, query, where } from 'firebase/firestore';
import { app } from '@/lib/firebase/client';
import { ArrowLeft, CheckCircle2, Search, X, Flashlight, FlashlightOff, ImagePlus } from 'lucide-react';
import Link from 'next/link';
import type { House } from '@/types/jimpitan';

const db = getFirestore(app);

export default function ScanQRPage() {
  const router = useRouter();
  const [house, setHouse] = useState<House | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isTorchOn, setIsTorchOn] = useState(false);

  const handleNavigate = async (path: string) => {
    if (scannerRef.current) {
      try {
        const state = scannerRef.current.getState();
        if (state === 2 || state === 3) { // SCANNING or PAUSED
          await scannerRef.current.stop();
        }
      } catch (err) {
        console.error("Error stopping scanner during navigation", err);
      }
    }
    router.push(path);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      if (scannerRef.current && scannerRef.current.getState() === 2) {
        scannerRef.current.pause();
      }
      
      const fileScanner = new Html5Qrcode("qr-reader-file");
      const decodedText = await fileScanner.scanFile(file, false);
      processQRCode(decodedText);
      // Optional: clear fileScanner if needed, though scanFile cleans up mostly.
      fileScanner.clear();
    } catch (err) {
      console.error("Gagal membaca QR dari gambar", err);
      setErrorMsg("QR tidak ditemukan di gambar ini");
    }
    
    // reset input
    e.target.value = '';
  };

  const toggleFlashlight = () => {
    if (scannerRef.current && scannerRef.current.getState() === 2) {
      const currentTorchState = isTorchOn;
      scannerRef.current.applyVideoConstraints({ advanced: [{ torch: !currentTorchState } as any] })
        .then(() => setIsTorchOn(!currentTorchState))
        .catch(err => {
          console.error("Gagal menyalakan senter", err);
          alert("Senter tidak didukung pada perangkat ini.");
        });
    }
  };

  const processQRCode = async (decodedText: string) => {
    if (isProcessing) return;
    setIsProcessing(true);
    
    try {
      if (scannerRef.current && scannerRef.current.getState() === 2) { // 2 = scanning
        scannerRef.current.pause();
      }
      
      const q = query(collection(db, 'houses'), where('qrCode', '==', decodedText));
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        const houseDoc = snapshot.docs[0];
        setHouse({ id: houseDoc.id, ...houseDoc.data() } as House);
      } else {
        setErrorMsg('QR tidak dikenali');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Terjadi kesalahan saat mencari rumah');
    } finally {
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    // Create scanner instance
    const html5QrCode = new Html5Qrcode("qr-reader");
    scannerRef.current = html5QrCode;

    Html5Qrcode.getCameras().then(devices => {
      if (devices && devices.length) {
        html5QrCode.start(
          { facingMode: "environment" },
          { fps: 10 },
          (decodedText) => processQRCode(decodedText),
          (errorMessage) => {
            // parse error, ignore
          }
        ).catch(err => {
          console.error("Error starting scanner", err);
          setErrorMsg("Gagal mengakses kamera");
        });
      }
    }).catch(err => {
       console.error("Error getting cameras", err);
       setErrorMsg("Gagal mengakses kamera");
    });

    return () => {
      if (html5QrCode.isScanning) {
        html5QrCode.stop().catch(console.error);
      }
    };
  }, []);

  const handleScanAgain = () => {
    setHouse(null);
    setErrorMsg('');
    if (scannerRef.current && scannerRef.current.getState() === 3) { // 3 = paused
      scannerRef.current.resume();
    }
  };

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden flex flex-col">
      <style dangerouslySetInnerHTML={{__html: `
        #qr-reader { border: none !important; }
        #qr-reader video {
          object-fit: cover !important;
          width: 100% !important;
          height: 100vh !important;
        }
        @keyframes scan-anim {
          0% { top: 0; }
          50% { top: 100%; }
          100% { top: 0; }
        }
        .animate-scan-line {
          animation: scan-anim 2s ease-in-out infinite;
        }
        @keyframes slide-up-anim {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        .animate-slide-up-sheet {
          animation: slide-up-anim 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}} />

      {/* Video Container */}
      <div id="qr-reader" className="absolute inset-0 w-full h-full object-cover" />
      
      {/* Hidden container for file scanning */}
      <div id="qr-reader-file" className="hidden" />

      {/* Overlay with cutout */}
      <div className="absolute inset-0 pointer-events-none flex flex-col z-0">
        {/* Top dark area */}
        <div className="bg-black/60 flex-1 w-full" />
        
        {/* Middle row with cutout */}
        <div className="flex h-[250px] w-full">
          {/* Left dark area */}
          <div className="bg-black/60 flex-1 h-full" />
          
          {/* Cutout (transparent) */}
          <div className="w-[250px] h-[250px] relative">
            {/* Corners frame */}
            <div className="absolute top-0 left-0 w-10 h-10 border-t-4 border-l-4 border-primary rounded-tl-2xl" />
            <div className="absolute top-0 right-0 w-10 h-10 border-t-4 border-r-4 border-primary rounded-tr-2xl" />
            <div className="absolute bottom-0 left-0 w-10 h-10 border-b-4 border-l-4 border-primary rounded-bl-2xl" />
            <div className="absolute bottom-0 right-0 w-10 h-10 border-b-4 border-r-4 border-primary rounded-br-2xl" />
            
            {/* Scanning line animation */}
            {(!house && !errorMsg) && (
              <div className="w-full h-0.5 bg-primary absolute left-0 shadow-[0_0_8px_rgba(245,181,83,0.8)] animate-scan-line" />
            )}
          </div>
          
          {/* Right dark area */}
          <div className="bg-black/60 flex-1 h-full" />
        </div>
        
        {/* Bottom dark area */}
        <div className="bg-black/60 flex-1 w-full flex flex-col items-center pt-6">
          <p className="text-white font-medium text-sm drop-shadow-md">Arahkan kamera ke QR Code rumah</p>
        </div>
      </div>

      {/* Top Bar (Overlay) */}
      <div 
        className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 pb-4"
        style={{ paddingTop: 'max(env(safe-area-inset-top, 16px), 16px)' }}
      >
        <button 
          onClick={() => handleNavigate('/jimpitan')} 
          className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center active:scale-95 text-white"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <button 
          onClick={toggleFlashlight}
          className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center active:scale-95 text-white"
        >
          {isTorchOn ? <FlashlightOff className="w-5 h-5" /> : <Flashlight className="w-5 h-5" />}
        </button>
      </div>

      {/* Bottom Container (Cari Manual) */}
      {!house && !errorMsg && (
        <div 
          className="absolute bottom-0 left-0 right-0 bg-[#161616] rounded-t-3xl px-6 pt-6 z-10 flex flex-col items-center animate-slide-up-sheet border-t border-white/5"
          style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 32px), 32px)' }}
        >
          <div className="w-10 h-1 bg-white/20 rounded-full mb-6" />
          <div className="flex gap-3 w-full">
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 flex items-center justify-center gap-2 bg-[#2a2a2a] border border-white/10 text-white py-4 rounded-2xl font-semibold active:scale-[0.98] transition-transform shadow-lg"
            >
              <ImagePlus className="w-5 h-5 text-primary" />
              Upload
            </button>
            <button 
              onClick={() => handleNavigate('/jimpitan')}
              className="flex-1 flex items-center justify-center gap-2 bg-[#2a2a2a] border border-white/10 text-white py-4 rounded-2xl font-semibold active:scale-[0.98] transition-transform shadow-lg"
            >
              <Search className="w-5 h-5 text-primary" />
              Manual
            </button>
          </div>
          <input 
            type="file" 
            accept="image/*" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            className="hidden" 
          />
        </div>
      )}

      {/* Error Bottom Sheet */}
      {errorMsg && (
        <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl p-6 shadow-2xl z-20 animate-slide-up-sheet flex flex-col items-center" style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 24px), 24px)' }}>
          <div className="w-12 h-1.5 bg-gray-200 rounded-full mb-6" />
          <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mb-4">
            <X className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-1 text-center">Gagal Membaca QR</h2>
          <p className="text-foreground/60 text-center mb-8">{errorMsg}</p>
          
          <button 
            onClick={handleScanAgain}
            className="w-full bg-secondary text-[#f7f7f7] py-3.5 rounded-xl font-bold text-base active:scale-[0.98] transition-transform"
          >
            Coba Scan Ulang
          </button>
        </div>
      )}

      {/* Success Bottom Sheet */}
      {house && (
        <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl p-6 shadow-2xl z-20 animate-slide-up-sheet flex flex-col" style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 24px), 24px)' }}>
          <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-6" />
          
          <div className="flex items-start gap-4 mb-6">
            <div className="w-14 h-14 bg-green-100 text-green-600 rounded-2xl flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <div>
              <p className="text-sm text-foreground/50 font-medium mb-0.5">Rumah Ditemukan</p>
              <h2 className="text-xl font-bold text-foreground leading-tight">{house.headOfFamily}</h2>
              <p className="text-foreground/70 text-sm mt-1">Rumah {house.houseNumber}</p>
            </div>
          </div>
          
          <div className="flex flex-col gap-3">
            <button 
              onClick={() => handleNavigate(`/jimpitan/${house.id}`)}
              className="w-full bg-primary text-[#000000] py-3.5 rounded-xl font-bold text-base active:scale-[0.98] transition-transform shadow-[0_4px_14px_rgba(245,181,83,0.4)]"
            >
              Lanjutkan
            </button>
            <button 
              onClick={handleScanAgain}
              className="w-full bg-transparent text-foreground/60 py-3.5 rounded-xl font-semibold text-sm active:scale-[0.98] transition-transform"
            >
              Scan Rumah Lain
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
