document.addEventListener('DOMContentLoaded', () => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(pointer: fine)').matches;

  document.body.classList.add('motion-rich');

  // A slim progress rail gives the long-form page a continuous sense of movement.
  const progressRail = document.createElement('div');
  progressRail.className = 'page-progress';
  progressRail.setAttribute('aria-hidden', 'true');
  document.body.prepend(progressRail);

  if (!reduceMotion) {
    const root = document.documentElement;
    const hero = document.querySelector('.hero-section');
    const sections = [...document.querySelectorAll('.section, .final-cta')];
    const kineticItems = [...document.querySelectorAll('.pillar-card, #como-funciona .step-item, #entrega .checklist-item')];
    const finalWords = [...document.querySelectorAll('.final-cta-title > span')];
    const stepsList = document.querySelector('#como-funciona .steps-list');
    const steps = [...document.querySelectorAll('#como-funciona .step-item')];
    let ticking = false;
    let previousY = window.scrollY;
    let velocity = 0;

    const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));

    const updateScrollMotion = () => {
      const viewportHeight = window.innerHeight;
      const currentY = window.scrollY;
      const scrollRange = Math.max(1, document.documentElement.scrollHeight - viewportHeight);
      velocity = (velocity * .72) + ((currentY - previousY) * .28);
      previousY = currentY;

      root.style.setProperty('--page-progress', clamp(currentY / scrollRange));
      root.style.setProperty('--scroll-velocity', clamp(velocity, -18, 18).toFixed(2));
      root.style.setProperty('--scroll-skew', `${(clamp(velocity, -18, 18) * .018).toFixed(3)}deg`);
      root.style.setProperty('--marquee-shift', `${(clamp(velocity, -18, 18) * -.7).toFixed(2)}px`);

      if (hero) {
        const heroProgress = clamp(currentY / Math.max(hero.offsetHeight, viewportHeight * .8));
        hero.style.setProperty('--hero-progress', heroProgress.toFixed(3));
        hero.style.setProperty('--hero-bg-shift', `${(heroProgress * 46).toFixed(2)}px`);
        hero.style.setProperty('--hero-content-shift', `${(heroProgress * -22).toFixed(2)}px`);
        hero.style.setProperty('--hero-title-shift', `${(heroProgress * -18).toFixed(2)}px`);
        hero.style.setProperty('--hero-stats-shift', `${(heroProgress * 16).toFixed(2)}px`);
        hero.style.setProperty('--hero-opacity', (1 - heroProgress * .48).toFixed(3));
      }

      sections.forEach(section => {
        const rect = section.getBoundingClientRect();
        const progress = clamp((viewportHeight - rect.top) / (viewportHeight + rect.height));
        const centered = clamp((viewportHeight * .5 - rect.top) / Math.max(rect.height, 1), -.5, 1.5);
        section.style.setProperty('--section-progress', progress.toFixed(3));
        section.style.setProperty('--section-centered', centered.toFixed(3));
        section.style.setProperty('--section-shift', `${((progress - .5) * -34).toFixed(2)}px`);
      });

      kineticItems.forEach((item, index) => {
        const rect = item.getBoundingClientRect();
        const progress = clamp((viewportHeight - rect.top) / (viewportHeight + rect.height));
        const distance = .5 - progress;
        const direction = index % 2 === 0 ? -1 : 1;
        item.style.setProperty('--kinetic-y', `${(distance * 72).toFixed(2)}px`);
        item.style.setProperty('--kinetic-x', `${(distance * direction * 18).toFixed(2)}px`);
        item.style.setProperty('--kinetic-r', `${(distance * direction * 2.4).toFixed(2)}deg`);
      });

      finalWords.forEach((word, index) => {
        const section = word.closest('.final-cta');
        if (!section) return;
        const rect = section.getBoundingClientRect();
        const progress = clamp((viewportHeight - rect.top) / (viewportHeight + rect.height));
        word.style.setProperty('--word-y', `${((.5 - progress) * (index + 1) * 22).toFixed(2)}px`);
        word.style.setProperty('--word-r', `${((.5 - progress) * (index - 1) * 4).toFixed(2)}deg`);
      });

      if (stepsList && steps.length) {
        const listRect = stepsList.getBoundingClientRect();
        const lineProgress = clamp((viewportHeight * .58 - listRect.top) / Math.max(listRect.height, 1));
        stepsList.style.setProperty('--steps-progress', lineProgress.toFixed(3));

        let closestStep = steps[0];
        let closestDistance = Infinity;
        steps.forEach(step => {
          const rect = step.getBoundingClientRect();
          const distance = Math.abs((rect.top + rect.height * .5) - viewportHeight * .56);
          if (distance < closestDistance) {
            closestDistance = distance;
            closestStep = step;
          }
        });
        steps.forEach(step => step.classList.toggle('is-current', step === closestStep));
      }

      ticking = false;
    };

    const requestScrollUpdate = () => {
      if (!ticking) {
        ticking = true;
        window.requestAnimationFrame(updateScrollMotion);
      }
    };

    updateScrollMotion();
    window.addEventListener('scroll', requestScrollUpdate, { passive: true });
    window.addEventListener('resize', requestScrollUpdate, { passive: true });
  }

  // Perspective and cursor light: richer on desktop, deliberately calm on touch screens.
  if (!reduceMotion && finePointer) {
    const interactiveSurfaces = document.querySelectorAll('.pillar-card, .diagnostic-card');

    interactiveSurfaces.forEach(surface => {
      surface.addEventListener('pointermove', event => {
        const bounds = surface.getBoundingClientRect();
        const x = event.clientX - bounds.left;
        const y = event.clientY - bounds.top;
        const xRatio = x / bounds.width - .5;
        const yRatio = y / bounds.height - .5;
        surface.style.setProperty('--spot-x', `${x}px`);
        surface.style.setProperty('--spot-y', `${y}px`);
        surface.style.setProperty('--tilt-x', `${(-yRatio * 5).toFixed(2)}deg`);
        surface.style.setProperty('--tilt-y', `${(xRatio * 6).toFixed(2)}deg`);
        surface.style.setProperty('--tilt-x-soft', `${(-yRatio * 2.1).toFixed(2)}deg`);
        surface.style.setProperty('--tilt-y-soft', `${(xRatio * 2.52).toFixed(2)}deg`);
      });

      surface.addEventListener('pointerleave', () => {
        surface.style.setProperty('--tilt-x', '0deg');
        surface.style.setProperty('--tilt-y', '0deg');
        surface.style.setProperty('--tilt-x-soft', '0deg');
        surface.style.setProperty('--tilt-y-soft', '0deg');
      });
    });

    document.querySelectorAll('.step-item, .checklist-item, .accordion-item').forEach(surface => {
      surface.addEventListener('pointermove', event => {
        const bounds = surface.getBoundingClientRect();
        surface.style.setProperty('--spot-x', `${event.clientX - bounds.left}px`);
        surface.style.setProperty('--spot-y', `${event.clientY - bounds.top}px`);
      });
    });

    document.querySelectorAll('.dark-continuum, .closing-continuum').forEach(surface => {
      const ambient = document.createElement('div');
      ambient.className = 'cursor-ambient';
      ambient.setAttribute('aria-hidden', 'true');
      surface.prepend(ambient);
      surface.style.setProperty('--ambient-x', '50%');
      surface.style.setProperty('--ambient-y', '35%');

      surface.addEventListener('pointermove', event => {
        const bounds = surface.getBoundingClientRect();
        surface.style.setProperty('--ambient-x', `${event.clientX - bounds.left}px`);
        surface.style.setProperty('--ambient-y', `${event.clientY - bounds.top}px`);
      });
    });

    document.querySelectorAll('.btn').forEach(button => {
      button.addEventListener('pointermove', event => {
        const bounds = button.getBoundingClientRect();
        const x = event.clientX - bounds.left - bounds.width / 2;
        const y = event.clientY - bounds.top - bounds.height / 2;
        button.style.setProperty('--magnetic-x', `${(x * .08).toFixed(2)}px`);
        button.style.setProperty('--magnetic-y', `${(y * .12).toFixed(2)}px`);
      });
      button.addEventListener('pointerleave', () => {
        button.style.setProperty('--magnetic-x', '0px');
        button.style.setProperty('--magnetic-y', '0px');
      });
    });
  }

  // Keep the marquee dense and seamless at every viewport width.
  const marqueeGroups = document.querySelectorAll('.marquee-group');
  if (marqueeGroups.length === 2) {
    const baseMarkup = marqueeGroups[0].innerHTML;

    const fillMarquee = () => {
      marqueeGroups[0].innerHTML = baseMarkup;
      while (marqueeGroups[0].scrollWidth < window.innerWidth * 1.15) {
        marqueeGroups[0].insertAdjacentHTML('beforeend', baseMarkup);
      }
      marqueeGroups[1].innerHTML = marqueeGroups[0].innerHTML;
    };

    fillMarquee();
    let marqueeResizeTimer;
    window.addEventListener('resize', () => {
      window.clearTimeout(marqueeResizeTimer);
      marqueeResizeTimer = window.setTimeout(fillMarquee, 160);
    }, { passive: true });
  }

  // Pointer-responsive glow used by the Saulo-inspired buttons.
  if (window.matchMedia('(pointer: fine)').matches) {
    document.querySelectorAll('.btn').forEach(button => {
      button.addEventListener('pointermove', event => {
        const bounds = button.getBoundingClientRect();
        button.style.setProperty('--button-x', `${event.clientX - bounds.left}px`);
        button.style.setProperty('--button-y', `${event.clientY - bounds.top}px`);
      });
    });
  }

  // 1. FAQ Accordion
  const accordionItems = document.querySelectorAll('.accordion-item');

  accordionItems.forEach(item => {
    const trigger = item.querySelector('.accordion-trigger');
    const content = item.querySelector('.accordion-content');

    trigger.addEventListener('click', () => {
      const isActive = item.classList.contains('active');

      // Close all other accordion items
      accordionItems.forEach(otherItem => {
        otherItem.classList.remove('active');
        const otherContent = otherItem.querySelector('.accordion-content');
        if (otherContent) {
          otherContent.style.maxHeight = null;
        }
      });

      // Toggle current item
      if (!isActive) {
        item.classList.add('active');
        content.style.maxHeight = content.scrollHeight + 'px';
      } else {
        item.classList.remove('active');
        content.style.maxHeight = null;
      }
    });
  });

  // 2. Scroll Reveal Animations (IntersectionObserver)
  const revealElements = document.querySelectorAll('.reveal');

  // Build an editorial stagger for the important content inside every section.
  revealElements.forEach(container => {
    let motionOrder = 0;
    const motionTargets = container.querySelectorAll([
      '.eyebrow',
      '.eyebrow-badge',
      '.section-title',
      '.hero-desc',
      '.section-desc',
      '.hero-actions',
      '.hero-stats',
      '.highlight-badge',
      '.privacy-notice',
      '.diagnostic-card',
      '.accordion-item',
      '.cta-logo',
      '.final-cta-desc',
      '.final-cta .btn'
    ].join(','));

    motionTargets.forEach(target => {
      target.classList.add('motion-item');
      target.style.setProperty('--motion-order', motionOrder);
      motionOrder += 1;
    });
  });
  
  if ('IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('reveal-visible');
          observer.unobserve(entry.target);
        }
      });
    }, {
      rootMargin: '0px 0px -8% 0px',
      threshold: 0.12
    });

    revealElements.forEach(el => revealObserver.observe(el));
  } else {
    // Fallback if IntersectionObserver is not supported
    revealElements.forEach(el => el.classList.add('reveal-visible'));
  }

  // 3. Smooth Anchor Scrolling
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      const targetId = this.getAttribute('href');
      if (targetId === '#') return;

      const targetElement = document.querySelector(targetId);
      if (targetElement) {
        e.preventDefault();
        targetElement.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }
    });
  });

});
