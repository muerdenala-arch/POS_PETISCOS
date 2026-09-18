import { v2 as cloudinary } from 'cloudinary';

let configured = false;

function isConfigured(): boolean {
  if (configured) return true;
  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    return false;
  }
  cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
  });
  configured = true;
  return true;
}

export type ImageFolder = 'receipts' | 'qr-codes' | 'products';

/** Sube una imagen (data URL base64, ya comprimida en el navegador) a Cloudinary y
 *  devuelve su URL pública HTTPS permanente. */
export async function uploadImage(dataUrl: string, folder: ImageFolder): Promise<string> {
  if (!isConfigured()) {
    console.warn('Cloudinary no configurado. Se usará la imagen en base64 localmente.');
    return dataUrl;
  }
  const result = await cloudinary.uploader.upload(dataUrl, {
    folder: `pos-template/${folder}`,
    resource_type: 'image',
  });
  return result.secure_url;
}
