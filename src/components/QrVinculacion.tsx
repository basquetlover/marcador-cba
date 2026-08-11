import { QRCodeSVG } from "qrcode.react";

interface QrVinculacionProps {
  partidoId: string;
  size?: number;
}

export default function QrVinculacion({
  partidoId,
  size = 240,
}: QrVinculacionProps) {
  const urlControl = new URL(
    `/control/${partidoId}`,
    window.location.origin,
  ).toString();

  const tamanoEscudo = Math.round(size * 0.22);

  return (
    <QRCodeSVG
      value={urlControl}
      size={size}
      level="H"
      marginSize={1}
      bgColor="#ffffff"
      fgColor="#002450"
      imageSettings={{
        src: "/favicon.png",
        width: tamanoEscudo,
        height: tamanoEscudo,
        excavate: true,
      }}
    />
  );
}