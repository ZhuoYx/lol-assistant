import { nextTick } from 'vue';
import type { Router, RouteLocationNormalized } from 'vue-router';

/** Fade fully rendered snapshots, so glass keeps sampling the wallpaper throughout. */
export function installRouteTransitions(router: Router): void {
  if (typeof document.startViewTransition !== 'function') return;

  let active: ViewTransition | undefined;
  type PendingNavigation = {
    finish: () => void;
    proceed: () => void;
    transition?: ViewTransition;
  };
  const pending = new Map<RouteLocationNormalized, PendingNavigation>();

  router.afterEach((to, _from, failure) => {
    const navigation = pending.get(to);
    if (!navigation) return;
    pending.delete(to);
    if (failure) navigation.transition?.skipTransition();
    // afterEach runs before Vue patches RouterView; capture only after that patch.
    void nextTick().then(navigation.finish);
  });

  router.onError((_error, to) => {
    const navigation = pending.get(to);
    if (!navigation) return;
    pending.delete(to);
    navigation.transition?.skipTransition();
    navigation.finish();
    navigation.proceed();
  });

  router.beforeResolve((to, from) => {
    // A later navigation should take over immediately, including Back/Forward.
    active?.skipTransition();
    if (
      from.matched.length === 0 ||
      to.path === from.path ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) return;

    return new Promise<void>((proceed) => {
      let finish!: () => void;
      const rendered = new Promise<void>((resolve) => { finish = resolve; });
      const navigation: PendingNavigation = { finish, proceed };
      pending.set(to, navigation);

      try {
        const transition = document.startViewTransition(() => {
          proceed();
          return rendered;
        });
        navigation.transition = transition;
        active = transition;
        // Hidden windows and superseded transitions may skip the animation normally.
        void transition.ready.catch(() => undefined);
        const clear = () => { if (active === transition) active = undefined; };
        void transition.finished.then(clear, clear);
      } catch {
        pending.delete(to);
        finish();
        proceed();
      }
    });
  });
}
