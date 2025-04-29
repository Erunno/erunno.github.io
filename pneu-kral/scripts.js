document.addEventListener('DOMContentLoaded', function() {
    // Add Font Awesome tire icon
    addTireIcon();
    
    // Initialize animations
    initAnimations();
    
    // Reveal elements on scroll
    window.addEventListener('scroll', revealOnScroll);
    revealOnScroll(); // Initial check
    
    // Add smooth scrolling for anchor links
    addSmoothScrolling();
    
    // Navbar scroll effect
    const navbar = document.querySelector('.navbar');
    
    window.addEventListener('scroll', function() {
        if (window.scrollY > 100) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });
    
    // Remove the mouse effect but keep the floating tire animations
    setupFloatingTires();
});

// Setup floating tires without mouse interaction
function setupFloatingTires() {
    const floatingTires = document.querySelectorAll('.floating-tire');
    
    // Clear any existing inline styles that might interfere with animations
    floatingTires.forEach(tire => {
        tire.style.transform = '';
    });
    
    // No need to add mouse event listeners
}

// Replace the old initHeroParallax function
function initHeroParallax() {
    // This function is kept empty to prevent any previous code from breaking
    // The floating tire animations are now handled entirely by CSS
}

// Other existing functions remain the same
function addTireIcon() {
    // Check if Font Awesome is loaded
    if (typeof FontAwesome !== 'undefined' || document.querySelector('link[href*="font-awesome"]')) {
        // Create a custom tire icon style if not officially available in Font Awesome
        const customCSS = `
            .fa-tire:before {
                content: "〇";
                display: block;
                font-size: 0.8em;
                position: relative;
            }
            .fa-tire:after {
                content: "";
                position: absolute;
                width: 70%;
                height: 70%;
                border: 5px solid currentColor;
                border-radius: 50%;
                top: 15%;
                left: 15%;
            }
        `;
        
        const style = document.createElement('style');
        style.textContent = customCSS;
        document.head.appendChild(style);
    }
}

function initAnimations() {
    // Setup initial animations with delays
    setTimeout(() => {
        document.querySelector('.reveal-slide-down')?.classList.add('animated', 'fadeIn');
    }, 300);
    
    setTimeout(() => {
        document.querySelector('.reveal-slide-right')?.classList.add('animated', 'slideInRight');
    }, 600);
    
    setTimeout(() => {
        document.querySelector('.reveal-slide-left')?.classList.add('animated', 'slideInLeft');
    }, 900);
    
    // Animate service cards
    const serviceCards = document.querySelectorAll('.service-card');
    serviceCards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        card.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
        card.style.transitionDelay = `${index * 0.1}s`;
    });
}

function revealOnScroll() {
    const revealPoint = 150; // how many pixels from the viewport bottom to start the animation
    const windowHeight = window.innerHeight;
    const scrollY = window.scrollY || window.pageYOffset;
    
    // Animate elements with reveal classes
    document.querySelectorAll('.reveal-slide-left').forEach(element => {
        const elementTop = element.getBoundingClientRect().top + scrollY;
        if (scrollY + windowHeight - revealPoint > elementTop) {
            element.style.animation = 'slideInLeft 0.8s forwards';
        }
    });
    
    document.querySelectorAll('.reveal-slide-right').forEach(element => {
        const elementTop = element.getBoundingClientRect().top + scrollY;
        if (scrollY + windowHeight - revealPoint > elementTop) {
            element.style.animation = 'slideInRight 0.8s forwards';
        }
    });
    
    // Animate service cards
    document.querySelectorAll('.service-card').forEach(card => {
        const cardTop = card.getBoundingClientRect().top + scrollY;
        if (scrollY + windowHeight - revealPoint > cardTop) {
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }
    });
}

function addSmoothScrolling() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                targetElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
}

// Add some interaction to the service cards
document.addEventListener('mouseover', function(e) {
    const target = e.target.closest('.service-card');
    if (target) {
        const icon = target.querySelector('.service-icon');
        if (icon) {
            // Add a little bounce animation
            icon.style.animation = 'bounce 0.5s';
            
            // Remove the animation after it completes
            setTimeout(() => {
                icon.style.animation = '';
            }, 500);
        }
    }
});

// Add a custom bounce animation
document.addEventListener('DOMContentLoaded', function() {
    const style = document.createElement('style');
    style.textContent = `
        @keyframes bounce {
            0%, 20%, 50%, 80%, 100% {
                transform: translateY(0);
            }
            40% {
                transform: translateY(-15px);
            }
            60% {
                transform: translateY(-7px);
            }
        }
        
        :root {
            --road-speed: 3s;
            --tracks-speed: 2s;
        }
        
        .road-marks::before {
            animation: roadMovement var(--road-speed) linear infinite;
        }
        
        .tire-tracks::before {
            animation: trackMovement var(--tracks-speed) linear infinite;
        }
    `;
    document.head.appendChild(style);
});

// Add smooth scroll effect when window is loaded
window.addEventListener('load', function() {
    // Smooth scroll to anchor if URL contains hash
    if (window.location.hash) {
        setTimeout(function() {
            const element = document.querySelector(window.location.hash);
            if (element) {
                const navbarHeight = document.querySelector('.navbar')?.offsetHeight || 0;
                const targetPosition = element.getBoundingClientRect().top + window.pageYOffset - navbarHeight;
                
                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        }, 100);
    }
});
