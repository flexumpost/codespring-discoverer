import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Camera } from 'lucide-react';
import { useTranslation } from 'react-i18next';
export function ReturnEnvelopeCamera({ onPhoto }: { onPhoto: (file: File) => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState('');
  const { t } = useTranslation();
  useEffect(() => {
    let stream: MediaStream | undefined;
    let cancelled = false;
    navigator.mediaDevices?.getUserMedia({ video: { facingMode: 'environment' } }).then(value => {
      if (cancelled) { value.getTracks().forEach(track => track.stop()); return; }
      stream = value;
      if (video.current) video.current.srcObject = value;
    }).catch(() => setError(t('returns.cameraError')));
    if (!navigator.mediaDevices) setError(t('returns.cameraError'));
    return () => { cancelled = true; stream?.getTracks().forEach(track => track.stop()); };
  }, [t]);
  const capture = () => {
    const source = video.current;
    if (!source?.videoWidth) return;
    const canvas = document.createElement('canvas');
    canvas.width = source.videoWidth; canvas.height = source.videoHeight;
    canvas.getContext('2d')?.drawImage(source, 0, 0);
    canvas.toBlob(blob => { if (blob) onPhoto(new File([blob], 'kuvert.jpg', { type: 'image/jpeg' })); }, 'image/jpeg', .9);
  };
  return <div className="space-y-3">{error ? <p className="text-destructive">{error}</p> : <video ref={video} autoPlay playsInline muted className="w-full aspect-video object-contain bg-muted" />}<Button onClick={capture} disabled={!!error}><Camera className="mr-2 h-4 w-4" />{t('returns.takePhoto')}</Button></div>;
}