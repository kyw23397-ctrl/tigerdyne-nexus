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
    document.getElementById('langBtn').textContent = lang === 'ko' ? 'EN' : '한';
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
    links.classList.toggle('open');
    ham.classList.toggle('open');
}

document.querySelectorAll('.nav-links a').forEach(a => {
    a.addEventListener('click', () => {
        document.getElementById('navLinks').classList.remove('open');
        document.getElementById('hamburger').classList.remove('open');
    });
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

/* ===== COUNT-UP ANIMATION ===== */
function initCountUp() {
    const nums = document.querySelectorAll('.stat-num');
    const obs = new IntersectionObserver(entries => {
        entries.forEach(e => {
            if (!e.isIntersecting) return;
            const el = e.target;
            const em = el.querySelector('em');
            const suffix = em ? em.textContent : '';
            const raw = el.textContent.replace(/\D/g, '');
            const target = parseInt(raw) || 0;
            if (!target) return;
            let n = 0;
            const step = target / 45;
            const t = setInterval(() => {
                n = Math.min(n + step, target);
                el.innerHTML = Math.floor(n) + `<em>${suffix}</em>`;
                if (n >= target) { el.innerHTML = target + `<em>${suffix}</em>`; clearInterval(t); }
            }, 28);
            obs.unobserve(el);
        });
    }, { threshold: 0.6 });
    nums.forEach(n => obs.observe(n));
}

/* ===== FORM ===== */
function handleSubmit(e) {
    e.preventDefault();
    const btn = e.target.querySelector('[type=submit]');
    const orig = btn.textContent;
    btn.textContent = lang === 'ko' ? '전송 중...' : 'Sending...';
    btn.disabled = true;

    setTimeout(() => {
        btn.textContent = lang === 'ko' ? '✓ 접수 완료 — 곧 연락드리겠습니다' : '✓ Submitted — We will be in touch shortly';
        btn.style.background = '#2a6e4a';
        e.target.reset();
        setTimeout(() => {
            btn.textContent = orig;
            btn.style.background = '';
            btn.disabled = false;
        }, 5000);
    }, 1400);
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
    initCountUp();

    // Trigger hero fade-ins immediately
    setTimeout(() => {
        document.querySelectorAll('.hero .fade-in, .hero-content > *').forEach(el => {
            el.classList.add('fade-in', 'visible');
        });
    }, 120);
});
