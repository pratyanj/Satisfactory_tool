import html2canvas from 'html2canvas';

function decoratePng(baseCanvas: HTMLCanvasElement): HTMLCanvasElement {
  const frameSize = 26;
  const footerHeight = 52;
  const text = 'Satisfactory Tool made by Pratyanj';

  const canvas = document.createElement('canvas');
  canvas.width = baseCanvas.width + frameSize * 2;
  canvas.height = baseCanvas.height + frameSize * 2 + footerHeight;

  const ctx = canvas.getContext('2d');
  if (!ctx) return baseCanvas;

  ctx.fillStyle = '#0a0b0d';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#101114';
  ctx.fillRect(frameSize, frameSize, baseCanvas.width, baseCanvas.height);

  ctx.strokeStyle = '#3d424a';
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, canvas.width - 2, canvas.height - 2);

  ctx.strokeStyle = '#242a31';
  ctx.strokeRect(frameSize, frameSize, baseCanvas.width, baseCanvas.height);

  ctx.drawImage(baseCanvas, frameSize, frameSize);

  const fontSize = Math.max(14, Math.round(canvas.width * 0.014));
  ctx.font = `600 ${fontSize}px "Segoe UI", Arial, sans-serif`;
  ctx.fillStyle = '#d3d8df';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, canvas.width - frameSize, baseCanvas.height + frameSize + 26);

  return canvas;
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Failed to encode PNG'));
        return;
      }
      resolve(blob);
    }, 'image/png');
  });
}

export async function exportGraphAsImage(exportRootElement: HTMLElement) {
  const commonConfig = {
    backgroundColor: '#101114',
    useCORS: true,
    allowTaint: false,
    logging: false,
    scale: Math.min(2, window.devicePixelRatio || 1),
    imageTimeout: 15000,
    // Keep canvas origin-clean by skipping external images that may taint export.
    ignoreElements: (element: Element) => element.tagName === 'IMG',
  };

  let captured: HTMLCanvasElement;
  try {
    // Preferred path for modern CSS (oklch/color-mix/etc) used by Tailwind 4.
    captured = await html2canvas(exportRootElement, {
      ...commonConfig,
      foreignObjectRendering: true,
    });
  } catch {
    // Fallback for environments where foreignObject rendering is blocked.
    captured = await html2canvas(exportRootElement, {
      ...commonConfig,
      foreignObjectRendering: false,
    });
  }

  try {
    const finalCanvas = decoratePng(captured);
    const blob = await canvasToBlob(finalCanvas);
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.download = 'factory-plan.png';
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    link.remove();

    // Fallback for webviews that ignore `download` and navigate instead.
    if (document.hasFocus()) {
      setTimeout(() => {
        if (document.hasFocus()) {
          window.open(url, '_blank', 'noopener,noreferrer');
        }
      }, 250);
    }

    setTimeout(() => URL.revokeObjectURL(url), 3000);
  } catch (error) {
    console.error('PNG export failed during blob/download stage:', error);
    throw error;
  }
}
