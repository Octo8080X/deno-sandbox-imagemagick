import { useEffect, useState } from "preact/hooks";

interface ImageInputProps {
  onFileSelect: (file: File | null) => void;
  onUpload: () => void;
  onOptionsChange: (opts: string) => void;
  isUploading: boolean;
  hasFile: boolean;
  previewUrl: string;
  previewName: string;
  previewType: string;
  options: string;
}

function ImageInput(
  {
    onFileSelect,
    onUpload,
    onOptionsChange,
    isUploading,
    hasFile,
    previewUrl,
    previewName,
    previewType,
    options,
  }: ImageInputProps,
) {
  return (
    <div class="w-full max-w-xl space-y-4">
      <label class="form-control w-full">
        <div class="label">
          <span class="label-text">Upload an image</span>
          <span class="label-text-alt">PNG, JPG, WEBP</span>
        </div>
        <input
          type="file"
          accept="image/*"
          class="file-input file-input-bordered w-full"
          onChange={(event) => {
            const file = event.currentTarget.files?.[0] ?? null;
            onFileSelect(file);
          }}
          disabled={isUploading}
        />
      </label>

      {previewUrl && (
        <div class="alert bg-base-200 border border-dashed border-base-300">
          <div class="flex flex-col md:flex-row items-start md:items-center gap-4 w-full">
            <figure class="w-full md:w-48">
              <img
                src={previewUrl}
                alt={previewName || "Preview"}
                class="rounded-box border border-base-300"
              />
            </figure>
            <div class="flex-1 text-left space-y-1">
              <div class="font-semibold">アップロード予定の画像</div>
              <div class="text-sm text-base-content/70 break-all">
                {previewName}
              </div>
              <div class="badge badge-outline">{previewType || "image/*"}</div>
            </div>
          </div>
        </div>
      )}

      <label class="form-control w-full">
        <div class="label">
          <span class="label-text">ImageMagick options</span>
          <span class="label-text-alt">例: -resize 50% -sepia-tone 60%</span>
        </div>
        <input
          type="text"
          class="input input-bordered input-primary shadow-sm"
          placeholder="-resize 50%"
          value={options}
          onInput={(e) => onOptionsChange(e.currentTarget.value)}
          disabled={isUploading}
        />
        <div class="label">
          <span class="label-text-alt text-xs text-base-content/60">
            ImageMagick にそのまま渡す引数。複数指定可（例: -resize 50% -modulate 110,102,100）
          </span>
        </div>
      </label>

      <div class="card-actions justify-end">
        <button
          class="btn btn-primary"
          onClick={onUpload}
          disabled={isUploading || !hasFile}
        >
          {isUploading ? "Processing..." : "Convert"}
        </button>
      </div>
    </div>
  );
}

interface ImageResultProps {
  resultUrl: string;
  mimeType: string;
  onClear: () => void;
}

function ImageResult({ resultUrl, mimeType, onClear }: ImageResultProps) {
  const hasResult = Boolean(resultUrl);

  return (
    <div class="card bg-base-100 shadow-xl w-full max-w-2xl">
      <div class="card-body gap-6">
        <div class="space-y-1">
          <div class="card-title">Converted result</div>
          <p class="text-base-content/70">
            変換後の画像プレビューとダウンロード
          </p>
        </div>
        <figure class="rounded-box border border-dashed border-base-300 bg-base-200 p-3 min-h-40 flex items-center justify-center">
          {hasResult
            ? <img src={resultUrl} alt="Converted" class="w-full rounded-box" />
            : (
              <div class="text-base-content/60">
                変換結果がここに表示されます
              </div>
            )}
        </figure>
        <div class="card-actions justify-between items-center">
          <div class="badge badge-outline">{mimeType || "image/*"}</div>
          <div class="join">
            <a
              class={`btn btn-outline join-item ${
                hasResult ? "" : "btn-disabled"
              }`.trim()}
              href={hasResult ? resultUrl : undefined}
              download="converted-image"
              target="_blank"
              rel="noreferrer"
            >
              Download
            </a>
            <button
              class={`btn btn-ghost join-item ${
                hasResult ? "" : "btn-disabled"
              }`.trim()}
              onClick={hasResult ? onClear : undefined}
            >
              Clear
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ImageConvert() {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState("");
  const [resultType, setResultType] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [previewName, setPreviewName] = useState("");
  const [previewType, setPreviewType] = useState("");
  const [options, setOptions] = useState("-resize 50% -rotate +45");

  useEffect(() => {
    return () => {
      if (resultUrl) URL.revokeObjectURL(resultUrl);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [resultUrl, previewUrl]);

  const handleSelectFile = (nextFile: File | null) => {
    // Clean up previous preview URL before creating a new one
    if (previewUrl) URL.revokeObjectURL(previewUrl);

    setFile(nextFile);

    if (nextFile) {
      setPreviewUrl(URL.createObjectURL(nextFile));
      setPreviewName(nextFile.name);
      setPreviewType(nextFile.type);
    } else {
      setPreviewUrl("");
      setPreviewName("");
      setPreviewType("");
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError("ファイルを選択してください");
      return;
    }

    setIsUploading(true);
    setError(null);
    setStatus("アップロードしています...");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("options", options);

      const response = await fetch("/api/convert", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || "アップロードに失敗しました");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      setResultUrl(url);
      setResultType(blob.type);
      setStatus("変換が完了しました");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "不明なエラーが発生しました",
      );
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div class="w-full flex flex-col items-center gap-4">
      <div class="card bg-base-100 shadow-xl w-full max-w-2xl">
        <div class="card-body gap-6">
          <div class="space-y-1">
            <h2 class="card-title">Image Convert</h2>
            <p class="text-base-content/70">
            </p>
          </div>

          <ImageInput
            onFileSelect={handleSelectFile}
            onUpload={handleUpload}
            onOptionsChange={setOptions}
            isUploading={isUploading}
            hasFile={Boolean(file)}
            previewUrl={previewUrl}
            previewName={previewName}
            previewType={previewType}
            options={options}
          />
        </div>
      </div>

      <div class="card bg-base-100 shadow-xl w-full max-w-2xl">
        <div class="card-body gap-6">
          {status && !error && (
            <div class="alert alert-info">
              <span>{status}</span>
            </div>
          )}

          {error && (
            <div class="alert alert-error">
              <span>{error}</span>
            </div>
          )}
        </div>
      </div>

      <ImageResult
        resultUrl={resultUrl}
        mimeType={resultType}
        onClear={() => {
          if (resultUrl) URL.revokeObjectURL(resultUrl);
          setResultUrl("");
          setResultType("");
          setStatus(null);
        }}
      />
    </div>
  );
}
