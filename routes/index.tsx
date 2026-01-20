import { define } from "../utils.ts";
import ImageConvert from "../islands/ImageConvert.tsx";

export default define.page(async function Home() {
  return (
    <div class="bg-base-200 items-start justify-center">
      <div class="hero-content flex-col items-center w-full pt-10">
        <ImageConvert />
      </div>
    </div>
  );
});
