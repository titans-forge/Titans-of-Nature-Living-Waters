import { useState } from 'react';

export function PostcardDownload({ image, title, place, detail }: { image: string; title: string; place: string; detail: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function download() {
    setBusy(true); setError('');
    try {
      const picture = new Image(); picture.src = image; await picture.decode();
      const canvas = document.createElement('canvas'); canvas.width = 1200; canvas.height = 940;
      const ctx = canvas.getContext('2d'); if (!ctx) throw new Error('Canvas unavailable');
      ctx.fillStyle = '#0c2119'; ctx.fillRect(0, 0, 1200, 940);
      const scale = Math.min(1200 / picture.width, 640 / picture.height);
      const width = picture.width * scale, height = picture.height * scale;
      ctx.drawImage(picture, (1200-width)/2, (640-height)/2, width, height);
      ctx.fillStyle = '#9ed7c0'; ctx.font = '22px sans-serif'; ctx.fillText('LIVING WATERS · EXPEDITION RECORD', 44, 686);
      ctx.fillStyle = '#fff3d9'; ctx.font = 'bold 42px Georgia'; ctx.fillText(title, 44, 745, 1112);
      ctx.font = '23px sans-serif'; ctx.fillText(place, 44, 792, 1112); ctx.fillText(detail, 44, 833, 1112);
      ctx.fillStyle = '#adc8b7'; ctx.font = '18px sans-serif'; ctx.fillText('Titans Forge · Game illustration, not a real-world field record', 44, 902);
      const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(b => b ? resolve(b) : reject(new Error('Export failed')), 'image/png'));
      const url = URL.createObjectURL(blob), link = document.createElement('a');
      link.href = url; link.download = `living-waters-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.png`;
      document.body.append(link); link.click(); link.remove(); window.setTimeout(() => URL.revokeObjectURL(url), 30000);
    } catch { setError('The postcard could not be saved. Your journal is safe; please try again.'); }
    finally { setBusy(false); }
  }
  return <><button className="secondary" disabled={busy} onClick={() => void download()}>{busy ? 'Preparing postcard…' : 'Save expedition postcard'}</button>{error && <p role="status">{error}</p>}</>;
}
