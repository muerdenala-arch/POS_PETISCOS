import type { VercelRequest, VercelResponse } from '@vercel/node';
import { uploadImage, type ImageFolder } from './_lib/cloudinary.js';
import { methodNotAllowed, requireBody, withErrorHandling } from './_lib/http.js';

const ALLOWED_FOLDERS: ImageFolder[] = ['receipts', 'qr-codes'];

async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    methodNotAllowed(res, ['POST']);
    return;
  }

  const body = requireBody<{ image?: string; folder?: string }>(req);
  if (!body.image || !body.image.startsWith('data:image/')) {
    res.status(400).json({ error: 'Falta la imagen (se espera un data URL image/*).' });
    return;
  }
  if (!body.folder || !ALLOWED_FOLDERS.includes(body.folder as ImageFolder)) {
    res.status(400).json({ error: `folder debe ser uno de: ${ALLOWED_FOLDERS.join(', ')}` });
    return;
  }

  const url = await uploadImage(body.image, body.folder as ImageFolder);
  res.status(201).json({ url });
}

export const config = {
  api: {
    // Comprobantes de pago comprimidos como data URL en base64 pueden pesar más que el
    // límite default de 1mb del body parser de Vercel.
    bodyParser: { sizeLimit: '8mb' },
  },
};

export default withErrorHandling(handler);
