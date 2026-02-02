'use client';

import QRCode from 'react-qr-code';

export function TotpQr({ uri }: { uri: string }) {
  return (
    <div className="max-w-full">
      <QRCode value={uri} size={196} />
    </div>
  );
}
