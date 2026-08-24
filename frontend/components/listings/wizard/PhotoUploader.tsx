"use client";

import { useRef } from "react";

export function PhotoUploader({
  files,
  onFilesChange,
}: {
  files: File[];
  onFilesChange: (files: File[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  function handleAdd(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []);
    if (picked.length > 0) onFilesChange([...files, ...picked]);
    e.target.value = ""; // allow picking the same file again after removing it
  }

  function handleRemove(index: number) {
    onFilesChange(files.filter((_, i) => i !== index));
  }

  function handleReorder(from: number, to: number) {
    const next = [...files];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onFilesChange(next);
  }

  return (
    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
      {files.map((file, i) => (
        <div
          key={`${file.name}-${i}`}
          draggable
          onDragStart={(e) => e.dataTransfer.setData("text/plain", String(i))}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const from = Number(e.dataTransfer.getData("text/plain"));
            handleReorder(from, i);
          }}
          style={{
            width: 78, height: 78, borderRadius: 11, border: "1.5px solid var(--line)",
            position: "relative", overflow: "hidden", cursor: "grab",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={URL.createObjectURL(file)}
            alt={`Photo ${i + 1}`}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
          <button
            type="button"
            onClick={() => handleRemove(i)}
            aria-label={`Remove photo ${i + 1}`}
            style={{
              position: "absolute", top: -6, right: -6, background: "var(--ink)", color: "var(--paper)",
              width: 19, height: 19, borderRadius: "50%", fontSize: 10, border: "none", cursor: "pointer",
            }}
          >
            ✕
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        style={{
          width: 78, height: 78, borderRadius: 11, border: "1.5px dashed var(--line)",
          background: "none", cursor: "pointer", fontSize: 11, color: "hsl(var(--muted-foreground))",
        }}
      >
        + Add
      </button>
      <input ref={inputRef} type="file" accept="image/*" multiple onChange={handleAdd} style={{ display: "none" }} />
    </div>
  );
}
