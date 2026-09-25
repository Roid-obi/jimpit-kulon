'use client';

import { Html5QrcodeScanner } from 'html5-qrcode';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { collection, getDocs, getFirestore, query, where } from 'firebase/firestore';
import { app } from '@/lib/firebase/client';
import Link from 'next/link';

const db = getFirestore(app);

export default function ScanQRPage() {
  const router = useRouter();
  const [status, setStatus] = useState<'scanning' | 'success' | 'error'>('scanning');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    let scanner: Html5QrcodeScanner;
    let isScanning = true;

    const handleScan = async (decodedText: string) => {
      if (!isScanning) return;
      isScanning = false;
      
      try {
        const q = query(collection(db, 'houses'), where('qrCode', '==', decodedText));
        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
          const houseDoc = snapshot.docs[0];
          setStatus('success');
          router.push(`/jimpitan/${houseDoc.id}`);
        } else {
          setStatus('error');
          setErrorMsg('QR tidak dikenali');
          isScanning = true; // allow scan again
        }
      } catch (err) {
        console.error(err);
        setStatus('error');
        setErrorMsg('Terjadi kesalahan saat mencari rumah');
        isScanning = true;
      }
    };

    scanner = new Html5QrcodeScanner(
      'qr-reader',
      { fps: 10, qrbox: { width: 250, height: 250 } },
      false
    );

    scanner.render(
      async (decodedText) => {
        await scanner.clear();
        handleScan(decodedText);
      },
      (error) => {
        // scan error, bisa diabaikan
      }
    );

    return () => {
      isScanning = false;
      scanner.clear().catch(console.error);
    };
  }, [router]);

  return (
    <div className="flex flex-col p-4 bg-background min-h-screen">
      <div className="flex items-center mb-6">
        <button onClick={() => router.push('/jimpitan')} className="text-gray-600 mr-4">
          &larr; Kembali
        </button>
        <h1 className="text-xl font-bold text-foreground">Scan QR Rumah</h1>
      </div>

      <div className="flex flex-col items-center flex-1">
        <p className="text-gray-600 mb-6 text-center">Arahkan kamera ke QR Code rumah</p>
        
        <div className="w-full max-w-sm bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-8">
          <div id="qr-reader" className="w-full overflow-hidden rounded-lg"></div>
        </div>

        {status === 'success' && (
          <div className="bg-green-100 text-green-700 p-4 rounded-lg w-full max-w-sm text-center mb-4">
            Rumah ditemukan! Mengalihkan...
          </div>
        )}

        {status === 'error' && (
          <div className="bg-red-100 text-red-700 p-4 rounded-lg w-full max-w-sm text-center mb-4">
            {errorMsg}
          </div>
        )}

        <Link 
          href="/jimpitan" 
          className="w-full max-w-sm bg-secondary text-[#f7f7f7] py-3 rounded-lg font-medium text-center mt-auto mb-8"
        >
          Cari Rumah Manual
        </Link>
      </div>
    </div>
  );
}
