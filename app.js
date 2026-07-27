/* ================================================================
   TIGERDYNE NEXUS — App Script
   ================================================================ */

/* ===== LANGUAGE ===== */
let lang = localStorage.getItem('td_lang') || 'ko';

function toggleLang() {
    lang = lang === 'ko' ? 'en' : 'ko';
    localStorage.setItem('td_lang', lang);
    applyLang();
}

function applyLang() {
    const langBtn = document.getElementById('langBtn');
    langBtn.textContent = lang === 'ko' ? 'EN' : '한';
    langBtn.setAttribute('aria-pressed', String(lang === 'en'));
    langBtn.setAttribute('aria-label', lang === 'ko' ? 'Switch language to English' : '한국어로 전환');
    document.documentElement.lang = lang === 'ko' ? 'ko' : 'en';

    document.querySelectorAll('[data-ko][data-en]').forEach(el => {
        const val = el.getAttribute('data-' + lang);
        if (!val) return;
        const caret = el.querySelector('.caret');
        if (caret) {
            el.childNodes[0].textContent = val + ' ';
        } else if (val.includes('<br>')) {
            el.innerHTML = val;
        } else {
            el.textContent = val;
        }
    });

    // select options
    document.querySelectorAll('select option[data-ko][data-en]').forEach(opt => {
        const val = opt.getAttribute('data-' + lang);
        if (val) opt.textContent = val;
    });
}

/* ===== NAV SCROLL ===== */
function initNav() {
    const nav = document.getElementById('nav');
    window.addEventListener('scroll', () => {
        nav.classList.toggle('scrolled', window.scrollY > 50);
    }, { passive: true });

    // active link highlight
    const sections = document.querySelectorAll('section[id], div[id]');
    const links = document.querySelectorAll('.nav-links a[href^="#"]');
    window.addEventListener('scroll', () => {
        let current = '';
        sections.forEach(s => {
            if (window.scrollY >= s.offsetTop - 100) current = s.id;
        });
        links.forEach(a => {
            const href = a.getAttribute('href').slice(1);
            a.classList.toggle('active', href === current);
        });
    }, { passive: true });
}

/* ===== MOBILE MENU ===== */
function toggleMenu() {
    const links = document.getElementById('navLinks');
    const ham   = document.getElementById('hamburger');
    const isOpen = links.classList.toggle('open');
    ham.classList.toggle('open', isOpen);
    ham.setAttribute('aria-expanded', String(isOpen));
}

document.querySelectorAll('.nav-links a').forEach(a => {
    a.addEventListener('click', () => {
        document.getElementById('navLinks').classList.remove('open');
        const hamburger = document.getElementById('hamburger');
        hamburger.classList.remove('open');
        hamburger.setAttribute('aria-expanded', 'false');
    });
});

function closeDropdowns(except = null) {
    document.querySelectorAll('.nav-drop-toggle[aria-expanded="true"]').forEach(button => {
        if (button === except) return;
        button.setAttribute('aria-expanded', 'false');
        button.closest('.has-drop').classList.remove('is-open');
    });
}

document.querySelectorAll('.nav-drop-toggle').forEach(button => {
    button.addEventListener('click', () => {
        const willOpen = button.getAttribute('aria-expanded') !== 'true';
        closeDropdowns(button);
        button.setAttribute('aria-expanded', String(willOpen));
        button.closest('.has-drop').classList.toggle('is-open', willOpen);
    });
    button.addEventListener('keydown', event => {
        if (event.key === 'ArrowDown') {
            event.preventDefault();
            button.setAttribute('aria-expanded', 'true');
            button.closest('.has-drop').classList.add('is-open');
            button.closest('.has-drop').querySelector('.dropdown a')?.focus();
        }
        if (event.key === 'Escape') {
            closeDropdowns();
            button.focus();
        }
    });
});

document.addEventListener('click', event => {
    if (!event.target.closest('.has-drop')) closeDropdowns();
});

document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    closeDropdowns();
    const links = document.getElementById('navLinks');
    const hamburger = document.getElementById('hamburger');
    if (links.classList.contains('open')) {
        links.classList.remove('open');
        hamburger.classList.remove('open');
        hamburger.setAttribute('aria-expanded', 'false');
        hamburger.focus();
    }
});

/* ===== FADE-IN OBSERVER ===== */
function initFadeIn() {
    const obs = new IntersectionObserver(entries => {
        entries.forEach((e, i) => {
            if (!e.isIntersecting) return;
            setTimeout(() => e.target.classList.add('visible'), i * 80);
            obs.unobserve(e.target);
        });
    }, { threshold: 0.1 });

    // Stagger children inside grids
    document.querySelectorAll('.services-grid-3, .domains-grid, .vision-grid, .insights-grid').forEach(grid => {
        Array.from(grid.children).forEach(child => {
            child.classList.add('fade-in');
            obs.observe(child);
        });
    });

    document.querySelectorAll('.fade-in').forEach(el => obs.observe(el));
}

/* ===== HERO CAROUSEL ===== */
function initHeroCarousel() {
    const carousel = document.querySelector('.hero-carousel');
    if (!carousel) return;

    const slides = Array.from(carousel.querySelectorAll('.hero-carousel-slide'));
    const dots = Array.from(carousel.querySelectorAll('.hero-carousel-dot'));
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let current = 0;
    let timer;

    function showSlide(index) {
        current = (index + slides.length) % slides.length;
        slides.forEach((slide, slideIndex) => {
            const active = slideIndex === current;
            slide.classList.toggle('is-active', active);
            slide.setAttribute('aria-hidden', String(!active));
        });
        dots.forEach((dot, dotIndex) => {
            const active = dotIndex === current;
            dot.classList.toggle('is-active', active);
            dot.setAttribute('aria-selected', String(active));
        });
    }

    function stopAutoplay() {
        window.clearInterval(timer);
        timer = undefined;
    }

    function startAutoplay() {
        stopAutoplay();
        if (!reducedMotion.matches) timer = window.setInterval(() => showSlide(current + 1), 5500);
    }

    carousel.querySelector('[data-carousel-action="previous"]').addEventListener('click', () => {
        showSlide(current - 1);
        startAutoplay();
    });
    carousel.querySelector('[data-carousel-action="next"]').addEventListener('click', () => {
        showSlide(current + 1);
        startAutoplay();
    });
    dots.forEach((dot, index) => dot.addEventListener('click', () => {
        showSlide(index);
        startAutoplay();
    }));
    carousel.addEventListener('pointerenter', stopAutoplay);
    carousel.addEventListener('pointerleave', startAutoplay);
    carousel.addEventListener('focusin', stopAutoplay);
    carousel.addEventListener('focusout', event => {
        if (!carousel.contains(event.relatedTarget)) startAutoplay();
    });
    reducedMotion.addEventListener('change', startAutoplay);
    startAutoplay();
}

/* ===== CONTACT FORM (Formspree) ===== */
function initContactForm() {
    const form = document.getElementById('contactForm');
    if (!form) return;
    const status = document.getElementById('contactFormStatus');
    const submitBtn = document.getElementById('contactFormSubmit');

    form.addEventListener('submit', async event => {
        event.preventDefault();
        submitBtn.disabled = true;
        submitBtn.classList.add('is-loading');
        status.className = 'form-status';
        status.textContent = lang === 'ko' ? '전송 중...' : 'Sending...';

        try {
            const response = await fetch(form.action, {
                method: 'POST',
                body: new FormData(form),
                headers: { 'Accept': 'application/json' }
            });
            if (!response.ok) throw new Error('submit failed: ' + response.status);
            form.reset();
            status.className = 'form-status form-status-success';
            status.textContent = lang === 'ko'
                ? '문의가 정상적으로 접수되었습니다. 빠른 시일 내 연락드리겠습니다.'
                : 'Your enquiry has been received. We will respond as soon as possible.';
        } catch (_) {
            status.className = 'form-status form-status-error';
            status.textContent = lang === 'ko'
                ? '전송에 실패했습니다. ywkim@tigerdynenexus.com으로 직접 메일 부탁드립니다.'
                : 'Submission failed. Please email ywkim@tigerdynenexus.com directly.';
        } finally {
            submitBtn.disabled = false;
            submitBtn.classList.remove('is-loading');
        }
    });
}

/* ===== SMOOTH SCROLL OFFSET (for fixed nav) ===== */
document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', function(e) {
        const target = document.querySelector(this.getAttribute('href'));
        if (!target) return;
        e.preventDefault();
        const offset = 76;
        window.scrollTo({ top: target.offsetTop - offset, behavior: 'smooth' });
    });
});

/* ===== INIT ===== */
document.addEventListener('DOMContentLoaded', () => {
    applyLang();
    initNav();
    initFadeIn();
    initHeroCarousel();
    initContactForm();

    // Trigger hero fade-ins immediately
    setTimeout(() => {
        document.querySelectorAll('.hero .fade-in, .hero-content > *').forEach(el => {
            el.classList.add('fade-in', 'visible');
        });
    }, 120);
});
