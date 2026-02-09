import { Client, Sandbox, SandboxOptions, Volume } from "@deno/sandbox";
import { delay } from "@std/async/delay";

const IMAGEMAGICK_STORAGE_VOLUME_NAME = "imagemagick-storage-volume";
const SERVER_APP_STORAGE_VOLUME_NAME = "server-app-storage-volume";

async function getStorageVolume(slug: string) {
  const client = new Client();
  let volume: Volume | null = null;

  if (
    await (await client.volumes.list()).items.filter((v) => v.slug === slug)
      .length > 0
  ) {
    volume = await client.volumes.get(slug)!;
  } else {
    volume = await client.volumes.create({
      slug,
      region: "ord",
      capacity: "300MiB",
    });
  }
  return volume;
}

const createSandbox = async (options?: SandboxOptions) => {
  console.info("Creating sandbox...");
  const sandbox = await Sandbox.create({
    memory: "1GB",
    region: "ord",
    ...options
  });
  return sandbox;
};

const withSandbox = async <T>(
  fn: (sandbox: Sandbox) => Promise<T>,
  options?: SandboxOptions,
): Promise<T> => {
  console.info("Starting withSandbox...");
  await using sandbox = await createSandbox(options);
  console.info(`Sandbox ID: ${sandbox.id}`);
  return await fn(sandbox);
};

export const SERVER_APP_ENTRYPOINT = "/data/server_app/server.ts";
export const SERVER_APP_SANDBOX_OPTIONS: SandboxOptions = {
  volumes: {
    "/data/server_app": SERVER_APP_STORAGE_VOLUME_NAME,
    "/data/imagemagick": IMAGEMAGICK_STORAGE_VOLUME_NAME,
  },
  region: "ord",
  memory: "1GB",
  timeout: "10m",
};

export async function isRunningSandbox(sandboxId: string): Promise<boolean> {
  const client = new Client();

  const sandboxes = await client.sandboxes.list();
  console.log("////");
  console.log(sandboxes);
  console.log("////");

  for (const sandbox of sandboxes) {
    console.info(`sandboxe: ${JSON.stringify(sandbox)}`);
    if (
      //sandbox.id === sandboxId && 
      sandbox.status === "running") {
      console.info(`Sandbox ${sandboxId} is running.`);
      return true;
    }
  }
  console.info(`Sandbox ${sandboxId} is not running.`);
  return false;
  
}

export const startServerAppSandbox = async <T>(
  entrypoint: string,
  options?: SandboxOptions,
): Promise<{publicUrl: string, sandboxId: string}> => {
  console.info("Starting server app sandbox...");
  await using sandbox = await createSandbox(options);
  await sandbox.deno.run({ entrypoint });
  const publicUrl = await sandbox.exposeHttp({ port: 3000 });
  return {publicUrl, sandboxId: sandbox.id};
}

export async function initSandBoxStorage() {
  const imagemagickStorageVolume = await getStorageVolume(
    IMAGEMAGICK_STORAGE_VOLUME_NAME,
  );

  const imagemagickSandboxOptions: SandboxOptions = {
    volumes: {
      "/data/imagemagick": imagemagickStorageVolume!.id,
    },
    region: "ord",
  };

  // imagemagick 用の volume初期化
  await withSandbox(async (sandbox) => {
    console.info("apt update");
    await sandbox.sh`apt-get update > /dev/null 2>&1`.sudo();
  
    console.info("install curl + certs + font stack deps");
    await sandbox
      .sh`DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends ca-certificates curl fontconfig libfreetype6 libexpat1 libuuid1 libharfbuzz0b libglib2.0-0 libgraphite2-3 libfribidi0 libpcre2-8-0 libx11-6 libxext6 libxrender1 libxcb1 libxcb-render0 libxcb-shm0 libxau6 libxdmcp6`
      .sudo();
  
    console.info("download standalone magick AppImage");
    await sandbox
      .sh`curl -fsSL -o /tmp/magick.appimage https://download.imagemagick.org/ImageMagick/download/binaries/magick`
      .sudo();
    await sandbox.sh`chmod +x /tmp/magick.appimage`.sudo();
  
    console.info("extract AppImage payload (no FUSE available)");
    await sandbox.sh`sh -c 'cd /tmp && ./magick.appimage --appimage-extract'`
      .sudo();
    await sandbox.sh`mkdir -p /data/imagemagick`.sudo();
    await sandbox.sh`cp -a /tmp/squashfs-root/. /data/imagemagick/`.sudo();
    await sandbox.sh`mkdir -p /data/imagemagick/lib`.sudo();
    console.info("copying linked runtime libs into the volume");
    await sandbox.sh`sh -c 'set -e; ldd /data/imagemagick/usr/bin/magick | awk "/=>/ {print $3}" | grep -E "^/" | while read -r path; do echo "lib: $path"; cp -n "$path" /data/imagemagick/lib/; done'`
      .sudo();
    // imagemagick が依存しているフォント関連ライブラリを追加でコピー
    await sandbox.sh`cp -n /usr/lib/x86_64-linux-gnu/libharfbuzz.so.0 /data/imagemagick/lib/`.sudo();
    await sandbox.sh`cp -n /usr/lib/x86_64-linux-gnu/libgraphite2.so.3 /data/imagemagick/lib/`.sudo();
    await sandbox.sh`cp -n /usr/lib/x86_64-linux-gnu/libglib-2.0.so.0 /data/imagemagick/lib/`.sudo();
    await sandbox.sh`cp -n /usr/lib/x86_64-linux-gnu/libpcre2-8.so.0 /data/imagemagick/lib/`.sudo();
    await sandbox.sh`cp -n /usr/lib/x86_64-linux-gnu/libfribidi.so.0 /data/imagemagick/lib/`.sudo();
    await sandbox.sh`cp -n /usr/lib/x86_64-linux-gnu/libfontconfig.so.1 /data/imagemagick/lib/`.sudo();
    await sandbox.sh`cp -n /usr/lib/x86_64-linux-gnu/libfreetype.so.6 /data/imagemagick/lib/`.sudo();

    // 環境変数を含む情報を追加してmagickラッパースクリプトを作成
    await sandbox.sh`sh -c 'cat <<"EOF" > /data/imagemagick/magick
#!/bin/sh
export LD_LIBRARY_PATH=/data/imagemagick/lib:\${LD_LIBRARY_PATH}
export MAGICK_CONFIGURE_PATH=/data/imagemagick/usr/lib/ImageMagick-7.1.2/config-Q16HDRI
exec /data/imagemagick/usr/bin/magick "$@"
EOF'`.sudo();
    await sandbox.sh`chmod +x /data/imagemagick/magick`.sudo();
    await sandbox.sh`sync`.sudo();
  
    console.info("verify ImageMagick");
    await sandbox.sh`/data/imagemagick/magick -version`.sudo();

    // sandbox を落とす前にsyncしておかないと反映されないケースがある。
    await sandbox.sh`sync`.sudo();
  }, imagemagickSandboxOptions);

  // server app 用の volume初期化
  const serverAppStorageVolume = await getStorageVolume(SERVER_APP_STORAGE_VOLUME_NAME);
  const serverAppSandboxOptions: SandboxOptions = {
    volumes: {
      "/data/server_app": serverAppStorageVolume!.id,
    },
    region: "ord",
  };

  delay(20000); // wait for volume to be ready

  await withSandbox(async (sandbox) => {
    await sandbox.fs.writeTextFile("/data/server_app/server.ts", Deno.readTextFileSync("./sandboxServerApp/server.ts"));
    await sandbox.fs.writeTextFile("/data/server_app/deno.json", Deno.readTextFileSync("./sandboxServerApp/deno.json"));
    await sandbox.sh`cd /data/server_app && deno install`;
    await sandbox.sh`ls -la /data/server_app`.sudo();
    
    // sandbox を落とす前にsyncしておかないと反映されないケースがある。
    await sandbox.sh`sync`.sudo();
  }, serverAppSandboxOptions);
}

if (import.meta.main) {
  await initSandBoxStorage();
}
