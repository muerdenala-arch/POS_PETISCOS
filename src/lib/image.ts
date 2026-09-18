/**
 * Convierte un archivo de imagen (foto de cámara o captura de pantalla) a un data URL
 * JPEG comprimido y redimensionado. Las fotos de cámara sin comprimir pueden pesar varios
 * MB — evitamos saturar el `localStorage` (donde vive el historial de ventas) recortando a
 * un ancho máximo razonable para verificar un comprobante.
 */
export function fileToCompressedDataUrl(
  file: File,
  { maxWidth = 900, quality = 0.72 }: { maxWidth?: number; quality?: number } = {},
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('No se pudo leer el archivo.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('No se pudo procesar la imagen.'));
      img.onload = () => {
        const scale = Math.min(1, maxWidth / img.width);
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('No se pudo procesar la imagen.'));
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}
