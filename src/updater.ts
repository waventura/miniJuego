declare const __APP_VERSION__: string;
declare const __APP_VERSION_CODE__: number;

export const CURRENT_VERSION =
  typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '1.0.1';
export const CURRENT_VERSION_CODE =
  typeof __APP_VERSION_CODE__ !== 'undefined' ? __APP_VERSION_CODE__ : 1;

export interface UpdateInfo {
  version: string;
  versionCode: number;
  downloadUrl: string;
}

const REPO = 'waventura/miniJuego';

class AppUpdater {
  public availableUpdate: UpdateInfo | null = null;
  private checked = false;

  public checkInBackground(): void {
    if (this.checked) return;
    this.checked = true;

    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 5000);

    fetch(`https://api.github.com/repos/${REPO}/releases/latest`, {
      headers: { Accept: 'application/vnd.github+json' },
      signal: controller.signal,
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data || !data.tag_name) return;
        const tag = String(data.tag_name); // e.g. "v1.0.12"
        const match = tag.match(/(\d+)$/);
        const remoteCode = match ? Number(match[1]) : 0;

        if (remoteCode > CURRENT_VERSION_CODE) {
          const assets: Array<{ name?: string; browser_download_url?: string }> =
            Array.isArray(data.assets) ? data.assets : [];
          const apkAsset = assets.find((a) =>
            String(a.name || '').toLowerCase().endsWith('.apk')
          );
          const downloadUrl =
            apkAsset?.browser_download_url || String(data.html_url || '');

          if (downloadUrl) {
            this.availableUpdate = {
              version: tag.replace(/^v/, ''),
              versionCode: remoteCode,
              downloadUrl,
            };
          }
        }
      })
      .catch(() => {
        // Offline or network unavailable — stay completely silent!
      })
      .finally(() => {
        window.clearTimeout(timeout);
      });
  }

  public openUpdateDownload(): void {
    if (!this.availableUpdate) return;
    const url = this.availableUpdate.downloadUrl;
    const win = window.open(url, '_blank');
    if (!win) {
      window.location.href = url;
    }
  }
}

export const updater = new AppUpdater();
