/**
 * Simple Router for Page Navigation
 */

class Router {
    constructor() {
        this.pages = {};
        this.currentPage = null;
        this.container = null;
    }

    init(container) {
        this.container = container;
        this.setupNavigation();
    }

    registerPage(name, renderFn) {
        this.pages[name] = renderFn;
    }

    setupNavigation() {
        // Handle sidebar nav link clicks
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = link.dataset.page;
                this.navigate(page);
                
                // Update active state
                document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
                link.classList.add('active');
            });
        });

        // Handle data-navigate buttons/links anywhere in the page
        document.addEventListener('click', (e) => {
            const target = e.target.closest('[data-navigate]');
            if (!target) return;
            e.preventDefault();
            const page = target.dataset.navigate;
            this.navigate(page);

            // Sync sidebar active state
            document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
            const navLink = document.querySelector('.nav-link[data-page=' + page + ']');
            if (navLink) navLink.classList.add('active');
        });
    }

    async navigate(pageName) {
        if (!this.pages[pageName]) {
            console.error(`Page '${pageName}' not found`);
            return;
        }

        this.currentPage = pageName;
        
        try {
            const content = await this.pages[pageName]();
            // Only set innerHTML if the page function returned a string.
            // Some page functions set innerHTML directly and return undefined.
            if (typeof content === 'string') {
                this.container.innerHTML = content;
            }
            
            // Call post-render hook if it exists
            const hookName = `${pageName}PostRender`;
            if (window[hookName]) {
                window[hookName]();
            }
        } catch (error) {
            console.error('Error rendering page:', error);
            const container = document.getElementById('page-container');
            if (container) {
                container.innerHTML = `
                    <div class="error-message">
                        <h2>Error loading page</h2>
                        <p>${error.message}</p>
                    </div>
                `;
            }
        }
    }

    getCurrentPage() {
        return this.currentPage;
    }
}

// Global router instance
const router = new Router();
