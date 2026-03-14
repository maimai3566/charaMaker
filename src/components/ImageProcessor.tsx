"use client";

import { useEffect, useRef, useState } from "react";

interface ImageProcessorProps {
  imageSource: string;
  onProcessed?: (webpBase64: string) => void;
  isFromHistory?: boolean;
}

export default function ImageProcessor({ imageSource, onProcessed, isFromHistory }: ImageProcessorProps) {
  const finalCanvasRef = useRef<HTMLCanvasElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isProcessing, setIsProcessing] = useState(true);
  const [frameIndex, setFrameIndex] = useState(0);

  // Configuration for the sprite sheet
  const FRAME_WIDTH = 200;
  const FRAME_HEIGHT = 200;
  const TOTAL_FRAMES = 4;
  const FINAL_WIDTH = FRAME_WIDTH * TOTAL_FRAMES; // 800

  useEffect(() => {
    let animationFrameId: number;
    let lastTime = 0;
    const fps = 4; // 4 frames per second for preview
    const interval = 1000 / fps;

    const renderPreview = (time: number) => {
      if (time - lastTime > interval) {
        setFrameIndex((prev) => (prev + 1) % TOTAL_FRAMES);
        lastTime = time;
      }
      animationFrameId = requestAnimationFrame(renderPreview);
    };

    if (!isProcessing) {
      animationFrameId = requestAnimationFrame(renderPreview);
    }

    return () => cancelAnimationFrame(animationFrameId);
  }, [isProcessing]);

  useEffect(() => {
    const processImage = async () => {
      setIsProcessing(true);
      const img = new Image();
      if (!isFromHistory) {
        // Only require CORS if we need to process pixel data (base64 from API doesn't have CORS issues anyway)
        img.crossOrigin = "anonymous";
      }
      img.src = imageSource;

      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = (err) => {
          console.error("Failed to load image in ImageProcessor:", err);
          reject(err);
        };
      }).catch(console.error);

      const finalCanvas = finalCanvasRef.current;
      if (!finalCanvas) return;

      const ctx = finalCanvas.getContext("2d");
      if (!ctx) return;

      finalCanvas.width = FINAL_WIDTH;
      finalCanvas.height = FRAME_HEIGHT;

      if (isFromHistory) {
        ctx.clearRect(0, 0, FINAL_WIDTH, FRAME_HEIGHT);
        // Ensure even history images (1024x256) are drawn scaled into the 800x200 canvas
        ctx.drawImage(img, 0, 0, FINAL_WIDTH, FRAME_HEIGHT);
        
        // Ensure background transparency logic runs for history images too
        // (Though they should already be transparent, this enforces the same export path)
        const imageData = ctx.getImageData(0, 0, FINAL_WIDTH, FRAME_HEIGHT);
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          if (r >= 240 && g >= 240 && b >= 240) {
            data[i + 3] = 0;
          }
        }
        ctx.putImageData(imageData, 0, 0);

        setIsProcessing(false);
        return;
      }

      // The generated image is 16:9 (e.g., 1024x576 or 1536x864)
      const sectionWidth = img.width / TOTAL_FRAMES;
      const sectionHeight = img.height;

      // We want to extract a 200x300 region from the center of each section.
      // But instead of taking a 1:1 pixel scale (which crops too much if the image is 1536x864),
      // we need to scale the source section to fit in the 200x300 frame.
      ctx.clearRect(0, 0, FINAL_WIDTH, FRAME_HEIGHT);

      // A typical 16:9 GenAI output is 1536x864. 
      // 1 section is 384x864 (aspect ratio ~0.44). 
      // Our target is 200x300 (aspect ratio 0.66).
      // We map the section width/height to fit inside the 200x300 without cutting off the vertical.
      
      for (let i = 0; i < TOTAL_FRAMES; i++) {
        // Source crop: take the entire width of the section and the required height ratio
        // Actually, to get a full view, let's just draw the entire section scaled down to fit 200x300.
        // There might be some letterboxing/pillarboxing, but the character won't be cut off.
        const sourceX = sectionWidth * i;
        const sourceY = 0;
        
        // Calculate scale to fit.
        const scale = Math.min(FRAME_WIDTH / sectionWidth, FRAME_HEIGHT / sectionHeight);
        
        const drawWidth = sectionWidth * scale;
        const drawHeight = sectionHeight * scale;
        
        const dx = (i * FRAME_WIDTH) + (FRAME_WIDTH - drawWidth) / 2;
        const dy = (FRAME_HEIGHT - drawHeight) / 2;

        ctx.drawImage(
          img,
          sourceX,
          sourceY,
          sectionWidth,
          sectionHeight,
          dx,
          dy,
          drawWidth,
          drawHeight
        );
      }

      // 背景透過（白に近い色を透明にする）
      const imageData = ctx.getImageData(0, 0, FINAL_WIDTH, FRAME_HEIGHT);
      const data = imageData.data;
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        // 白に近い色（240以上）ならアルファ値を0（透明）にする
        if (r >= 240 && g >= 240 && b >= 240) {
          data[i + 3] = 0;
        }
      }
      ctx.putImageData(imageData, 0, 0);

      // 処理完了した画像をWebPとしてエクスポートし、親コンポーネントに返す
      if (onProcessed) {
        // "data:image/webp;base64,..." の形式で取得。容量削減のため品質を0.6に設定。
        const dataUrl = finalCanvas.toDataURL("image/webp", 0.6);
        // "data:image/webp;base64," の部分を取り除いて返す
        const base64 = dataUrl.split(",")[1];
        if (base64) {
          onProcessed(base64);
        }
      }

      setIsProcessing(false);
    };

    processImage();
  }, [imageSource, onProcessed, isFromHistory]);

  // Handle animation preview drawing
  useEffect(() => {
    const finalCanvas = finalCanvasRef.current;
    const previewCanvas = previewCanvasRef.current;
    
    if (!finalCanvas || !previewCanvas || isProcessing) return;

    const pCtx = previewCanvas.getContext("2d");
    if (!pCtx) return;

    previewCanvas.width = FRAME_WIDTH;
    previewCanvas.height = FRAME_HEIGHT;

    pCtx.clearRect(0, 0, FRAME_WIDTH, FRAME_HEIGHT);
    
    // Draw only the current frame from the final canvas
    pCtx.drawImage(
      finalCanvas,
      frameIndex * FRAME_WIDTH,
      0,
      FRAME_WIDTH,
      FRAME_HEIGHT,
      0,
      0,
      FRAME_WIDTH,
      FRAME_HEIGHT
    );

  }, [frameIndex, isProcessing]);

  const handleDownload = async () => {
    const canvas = finalCanvasRef.current;
    if (!canvas) return;

    try {
      // 履歴から読み込んだ画像（クロスドメイン汚染）であっても、一度Canvasに描画しているので
      // toDataURL を用いて直接WebPとしてエクスポート（品質0.6）
      const dataUrl = canvas.toDataURL("image/webp", 0.6);
      
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `character_sprite_${Date.now()}.webp`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error("Canvas export failed (possibly tainted)", e);
      // フォールバック: 元の画像を直接開く
      window.open(imageSource, '_blank');
    }
  };

  return (
    <div className="w-full flex flex-col items-center bg-gray-100 p-6 rounded-lg">
      <div className="flex flex-col md:flex-row gap-8 w-full justify-center items-start">
        
        {/* Sprite Sheet View */}
        <div className="flex flex-col items-center">
          <h3 className="text-md font-semibold mb-2">完成スプライトシート (800x200)</h3>
          <div className="border border-gray-300 bg-white p-2 rounded shadow-sm overflow-x-auto w-full max-w-[820px]">
            <canvas
              ref={finalCanvasRef}
              className="max-w-full h-auto block"
              style={{ width: "800px", height: "200px" }}
            />
          </div>
          <button
            onClick={handleDownload}
            disabled={isProcessing}
            className="mt-4 px-6 py-2 bg-green-600 text-white font-medium rounded hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            ダウンロード (WebP)
          </button>
        </div>

        {/* Animation Preview */}
        <div className="flex flex-col items-center">
          <h3 className="text-md font-semibold mb-2">アニメーションプレビュー</h3>
          <div className="border border-gray-300 bg-white p-2 rounded shadow-sm relative">
             <canvas
              ref={previewCanvasRef}
              className="block"
              style={{ width: "200px", height: "200px" }}
            />
            {/* Background is now automatically removed during processing */}
          </div>
          <p className="mt-2 text-sm text-gray-500 font-mono">Frame: {frameIndex + 1} / 4</p>
        </div>

      </div>
    </div>
  );
}
