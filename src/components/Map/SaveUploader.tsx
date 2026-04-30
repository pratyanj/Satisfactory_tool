import React, { useCallback, useRef, useState } from 'react';
import { parseSaveFile, ParseProgress } from '../../engine/saveParser';
import type { ParsedSave } from '../../types/save';

interface SaveUploaderProps {
  onParsed: (save: ParsedSave) => void;
}

export function SaveUploader({ onParsed }: SaveUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [progress, setProgress] = useState<ParseProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    if (!file.name.endsWith('.sav')) {
      setError('Please upload a valid Satisfactory save file (.sav)');
      return;
    }

    setError(null);
    setIsParsing(true);
    setProgress({ progress: 0, message: 'Reading file…' });

    try {
      const buffer = await file.arrayBuffer();
      const result = await parseSaveFile(file.name.replace('.sav', ''), buffer, (p) => {
        setProgress(p);
      });
      setProgress({ progress: 1, message: 'Done!' });
      setTimeout(() => {
        setIsParsing(false);
        setProgress(null);
        onParsed(result);
      }, 600);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to parse save file.');
      setIsParsing(false);
      setProgress(null);
    }
  }, [onParsed]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const onFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  return (
    <div className="map-uploader-root">
      <div className="map-uploader-hero">
        <div className="map-uploader-icon">🗺️</div>
        <h2 className="map-uploader-title">Interactive World Map</h2>
        <p className="map-uploader-subtitle">
          Upload your Satisfactory save file to visualize your entire factory on the world map.
        </p>
      </div>

      <div
        className={`map-drop-zone ${isDragging ? 'map-drop-zone--active' : ''} ${isParsing ? 'map-drop-zone--parsing' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        onClick={() => !isParsing && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".sav"
          className="hidden"
          onChange={onFileChange}
          style={{ display: 'none' }}
        />

        {isParsing && progress ? (
          <div className="map-parse-progress">
            <div className="map-parse-spinner" />
            <div className="map-parse-bar-wrap">
              <div
                className="map-parse-bar"
                style={{ width: `${Math.round(progress.progress * 100)}%` }}
              />
            </div>
            <span className="map-parse-msg">{progress.message}</span>
            <span className="map-parse-pct">{Math.round(progress.progress * 100)}%</span>
          </div>
        ) : (
          <>
            <div className="map-drop-icon">📂</div>
            <p className="map-drop-label">
              {isDragging ? 'Drop to load save…' : 'Drag & drop your .sav file here'}
            </p>
            <p className="map-drop-sublabel">or click to browse</p>
            <div className="map-drop-hint">
              Find your saves at:<br />
              <code>%LOCALAPPDATA%\FactoryGame\Saved\SaveGames</code>
            </div>
          </>
        )}
      </div>

      {error && (
        <div className="map-uploader-error">
          <span>⚠️</span> {error}
        </div>
      )}

      <div className="map-uploader-features">
        <div className="map-feature-chip">⛏️ Miners & Extractors</div>
        <div className="map-feature-chip">🏭 Production Buildings</div>
        <div className="map-feature-chip">⚡ Power Network</div>
        <div className="map-feature-chip">🔀 Conveyors & Pipes</div>
        <div className="map-feature-chip">🔗 Links to Calculator</div>
      </div>
    </div>
  );
}
