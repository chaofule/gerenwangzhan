(() => {
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const revealItems = document.querySelectorAll(".reveal");
  const heroTitle = document.querySelector(".hero-title");
  const sphere = document.querySelector(".art-sphere");

  if (reducedMotion) {
    document.documentElement.classList.add("motion-ready");
    return;
  }

  const animateWithMotion = window.Motion?.inView;
  if (animateWithMotion) {
    animateWithMotion(".reveal", (element) => {
      window.Motion.animate(
        element,
        { opacity: [0, 1], transform: ["translateY(24px)", "translateY(0px)"] },
        { duration: 0.7, easing: [0.22, 1, 0.36, 1] },
      );
      return () => {};
    }, { margin: "0px 0px -10% 0px" });
  } else {
    revealItems.forEach((item) => item.classList.add("is-visible"));
  }

  if (window.gsap) {
    gsap.from(".hero-eyebrow", { opacity: 0, y: 12, duration: 0.7, delay: 0.15 });
    gsap.from(".hero-title", { opacity: 0, y: 28, duration: 0.95, delay: 0.25, ease: "power3.out" });
    gsap.from(".hero-intro, .round-link", { opacity: 0, y: 12, duration: 0.7, delay: 0.55, stagger: 0.12 });

    if (window.ScrollTrigger) {
      gsap.registerPlugin(ScrollTrigger);
      gsap.to(".art-sphere", {
        yPercent: 14,
        rotate: 18,
        ease: "none",
        scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true },
      });
      gsap.from(".project-card", {
        y: 26,
        opacity: 0,
        duration: 0.75,
        stagger: 0.14,
        ease: "power2.out",
        scrollTrigger: { trigger: ".project-grid", start: "top 82%" },
      });
    }
  } else {
    heroTitle?.classList.add("is-visible");
  }

  if (!animateWithMotion) {
    revealItems.forEach((item) => {
      const observer = new IntersectionObserver(([entry], currentObserver) => {
        if (entry.isIntersecting) {
          item.style.opacity = "1";
          item.style.transform = "translateY(0)";
          item.style.transition = "opacity .7s ease, transform .7s ease";
          currentObserver.unobserve(item);
        }
      }, { threshold: 0.12 });
      observer.observe(item);
    });
  }

  if (sphere && window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
    const moveSphere = window.Motion?.spring
      ? window.Motion.spring(0, { stiffness: 90, damping: 18 })
      : null;
    const onPointerMove = (event) => {
      const bounds = sphere.getBoundingClientRect();
      const x = (event.clientX - bounds.left) / bounds.width - 0.5;
      const y = (event.clientY - bounds.top) / bounds.height - 0.5;
      if (moveSphere) {
        moveSphere.set(x * 12);
        sphere.style.translate = `${moveSphere.get()}px ${y * 12}px`;
      } else {
        sphere.style.translate = `${x * 12}px ${y * 12}px`;
      }
    };
    const resetSphere = () => { sphere.style.translate = "0 0"; };
    sphere.addEventListener("pointermove", onPointerMove);
    sphere.addEventListener("pointerleave", resetSphere);
  }
})();
