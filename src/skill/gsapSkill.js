import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { animate } from 'motion';

gsap.registerPlugin(ScrollTrigger);

const prefersReducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function initHomeMotion(root) {
  if (prefersReducedMotion()) return () => {};

  const listenerCleanups = [];
  const context = gsap.context(() => {
    const heroArt = root.querySelector('.hero-art');
    const artSphere = root.querySelector('.art-sphere');

    if (artSphere) {
      gsap.to(artSphere, {
        y: -18,
        rotate: 8,
        duration: 3.8,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
      });
    }
    if (heroArt) {
      gsap.to(heroArt, {
        yPercent: 12,
        ease: 'none',
        scrollTrigger: {
          trigger: '.hero',
          start: 'top top',
          end: 'bottom top',
          scrub: 0.7,
        },
      });
    }
    const cards = gsap.utils.toArray('.project-card');
    cards.forEach((card) => {
      const visual = card.querySelector('.project-visual');
      if (!visual || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
      let tiltAnimation;

      const onMove = (event) => {
        const bounds = card.getBoundingClientRect();
        const x = (event.clientX - bounds.left) / bounds.width - 0.5;
        const y = (event.clientY - bounds.top) / bounds.height - 0.5;
        tiltAnimation?.stop();
        tiltAnimation = animate(visual, {
          rotateY: x * 4,
          rotateX: y * -4,
          scale: 1.015,
        }, {
          type: 'spring',
          stiffness: 150,
          damping: 20,
        });
      };
      const onLeave = () => {
        tiltAnimation?.stop();
        tiltAnimation = animate(visual, {
          rotateX: 0,
          rotateY: 0,
          scale: 1,
        }, {
          type: 'spring',
          stiffness: 120,
          damping: 18,
        });
      };

      card.addEventListener('pointermove', onMove);
      card.addEventListener('pointerleave', onLeave);
      listenerCleanups.push(() => {
        card.removeEventListener('pointermove', onMove);
        card.removeEventListener('pointerleave', onLeave);
        tiltAnimation?.stop();
      });
    });
  }, root);

  return () => {
    listenerCleanups.forEach((cleanup) => cleanup());
    context.revert();
  };
}
