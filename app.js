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

    // Trigger hero fade-ins immediately
    setTimeout(() => {
        document.querySelectorAll('.hero .fade-in, .hero-content > *').forEach(el => {
            el.classList.add('fade-in', 'visible');
        });
    }, 120);
});
