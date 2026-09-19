import QRCode from "qrcode";
export function trackingUrl(reference:string){const base=process.env.APP_URL??"http://localhost:3000";return new URL("/tracking?ref="+encodeURIComponent(reference),base).toString()}
export async function generateTrackingQr(reference:string){return QRCode.toDataURL(trackingUrl(reference),{errorCorrectionLevel:"M",margin:2,width:320})}