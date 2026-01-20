export default function ShareButton() {
  const handleShare = () => {
    const text = encodeURIComponent("ImageConvert by ImageMagick on Deno Sandbox!\n");
    const url = encodeURIComponent(
      "https://deno-sandbox-imagemagick.octo8080x.deno.net/",
    );
    const hashtags = encodeURIComponent("Deno,sandbox,ImageMagick");
    globalThis.open(
      `https://twitter.com/intent/tweet?text=${text}&url=${url}&hashtags=${hashtags}`,
      "_blank",
    );
  };

  return (
    <button
      type="button"
      onClick={handleShare}
      class="btn btn-neutral shadow-lg hover:scale-105 transition-transform"
    >
      Share on 𝕏
    </button>
  );
}
