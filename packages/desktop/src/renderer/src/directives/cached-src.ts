import type { ObjectDirective } from 'vue';

const requests = new Map<string, Promise<string>>();
const pending = new WeakMap<HTMLImageElement, object>();
let version: Promise<string | null> | undefined;

export function cachedImageSource(src: string): Promise<string> {
  if (
    !/^https:\/\/(raw\.communitydragon\.org|ddragon\.leagueoflegends\.com|arammayhem\.com)\//.test(
      src,
    )
  ) {
    return Promise.resolve(src);
  }
  const existing = requests.get(src);
  if (existing) return existing;
  const task = (async () => {
    version ??= window.electronAPI.getGameVersion().catch(() => null);
    const patch = await version;
    let url = src;
    if (patch) {
      url = url
        .replace(
          /(raw\.communitydragon\.org\/)latest\//,
          `$1${patch.split('.').slice(0, 2).join('.')}/`,
        )
        .replace(/(ddragon\.leagueoflegends\.com\/cdn\/)\d+\.\d+\.\d+\//, `$1${patch}/`);
    }
    return (await window.electronAPI.getCachedAsset(url, 'icons', url)) || url;
  })()
    .then((result) => {
      if (result.startsWith('https://')) requests.delete(src);
      return result;
    })
    .catch(() => {
      requests.delete(src);
      return src;
    });
  requests.set(src, task);
  // Bound renderer memory; disk caching remains available after eviction.
  if (requests.size > 600) requests.delete(requests.keys().next().value!);
  return task;
}

async function update(el: HTMLImageElement, value: string | undefined) {
  const request = {};
  pending.set(el, request);
  el.removeAttribute('src');
  if (!value) return;
  const source = await cachedImageSource(value);
  if (pending.get(el) === request) {
    el.style.removeProperty('display');
    el.src = source;
  }
}

export const cachedSrc: ObjectDirective<HTMLImageElement, string | undefined> = {
  beforeMount: (el, binding) => {
    void update(el, binding.value);
  },
  updated: (el, binding) => {
    if (binding.value !== binding.oldValue) void update(el, binding.value);
  },
  unmounted: (el) => {
    pending.delete(el);
  },
};
