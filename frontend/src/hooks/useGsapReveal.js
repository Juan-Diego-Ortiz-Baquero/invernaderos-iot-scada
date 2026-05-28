import { useLayoutEffect, useRef } from 'react';
import { gsap } from 'gsap';

export function useGsapReveal(dependencies = []) {
  const scopeRef = useRef(null);

  useLayoutEffect(() => {
    const root = scopeRef.current;
    if (!root) return undefined;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) return undefined;

    const context = gsap.context(() => {
      gsap.fromTo(
        root.querySelectorAll('[data-reveal]'),
        { autoAlpha: 0, y: 14 },
        {
          autoAlpha: 1,
          y: 0,
          clearProps: 'transform,visibility,opacity',
          duration: 0.52,
          ease: 'power3.out',
          stagger: 0.045,
        },
      );
    }, root);

    return () => context.revert();
  }, dependencies);

  return scopeRef;
}
