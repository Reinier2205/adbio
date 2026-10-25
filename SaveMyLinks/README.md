# SaveMyLinks - Landing Page

A beautiful, modern landing page for the SaveMyLinks application - your personal link manager for a more organized digital life.

## 🚀 Features #

- **Modern Design**: Clean, responsive design with beautiful animations
- **Mobile Friendly**: Fully responsive layout that works on all devices
- **Interactive Elements**: Smooth scrolling, hover effects, and dynamic content
- **Performance Optimized**: Fast loading with optimized assets
- **Accessibility**: Built with accessibility best practices

## 📁 Project Structure

```
SaveMyLinks/
├── index.html          # Main landing page
├── styles.css          # CSS styles and animations
├── script.js           # JavaScript functionality
└── README.md           # Project documentation
```

## 🛠️ Technologies Used

- **HTML5**: Semantic markup structure
- **CSS3**: Modern styling with Flexbox and Grid
- **JavaScript**: Interactive functionality and animations
- **Font Awesome**: Icons and visual elements
- **Google Fonts**: Inter font family for typography

## 🎨 Design Features

- **Gradient Backgrounds**: Beautiful color gradients throughout
- **Card-based Layout**: Modern card design for features and content
- **Smooth Animations**: CSS transitions and JavaScript animations
- **Mockup Display**: Interactive app mockup in the hero section
- **Statistics Counter**: Animated statistics display
- **Contact Form**: Functional contact form with validation

## 📱 Responsive Design

The landing page is fully responsive and optimized for:
- Desktop computers (1200px+)
- Tablets (768px - 1199px)
- Mobile devices (up to 767px)

## 🚀 Getting Started

1. **Clone or Download**: Get the project files
2. **Open in Browser**: Simply open `index.html` in your web browser
3. **No Build Process**: This is a static site - no compilation needed

## 📋 Sections

1. **Hero Section**: Main introduction with call-to-action buttons
2. **Features**: Six key features with icons and descriptions
3. **How It Works**: Three-step process explanation
4. **Call-to-Action**: Secondary CTA section
5. **About**: Project information and statistics
6. **Contact**: Contact form and information
7. **Footer**: Links and social media

## 🎯 Key Features Highlighted

- **Cloud Sync**: Access links from any device
- **Smart Organization**: Tags and categories
- **Security**: Encrypted and private
- **Speed**: Lightning-fast performance
- **Mobile Friendly**: Responsive design
- **Easy Sharing**: Share links with others

## 🔧 Customization

### Colors
The main color scheme uses:
- Primary: `#6366f1` (Indigo)
- Secondary: `#8b5cf6` (Purple)
- Background: `#f8f9fa` (Light Gray)

### Fonts
- Primary: Inter (Google Fonts)
- Icons: Font Awesome 6

### Animations
- Fade-in animations on scroll
- Hover effects on cards and buttons
- Smooth scrolling navigation
- Typing effect on hero title

## 📞 Contact Information

The landing page includes placeholder contact information:
- Email: reinier.olivier@gmail.com
- Location: Digital World
- Support: 24/7 Available

## 🔗 Integration

This landing page is designed to integrate with your SaveMyLinks application. The "Launch App" buttons are ready to be connected to your actual application URL once deployed.

## 📄 License

This project is open source and available under the MIT License.

## 🤝 Contributing

Feel free to contribute to this project by:
- Reporting bugs
- Suggesting new features
- Submitting pull requests
- Improving documentation

---

**Built with ❤️ for SaveMyLinks** 
// Cosmetic change: Triggering redeploy 🚀 

# SaveMyLinks Style System Reference

## Style System Overview

This project uses a **dark mode only** design system, built with Tailwind CSS and a set of custom utilities/components defined in `src/index.css`.

### Key Principles
- **Tailwind utilities** are used for all layout, spacing, and most styling.
- **Custom utilities/components** (e.g., `.card`, `.welcome-gradient-bg`, `.text-main`, `.bg-input`, `.btn`, `.btn-primary`, `.btn-secondary`, `.text-muted`, `.text-primary`, `.bg-chip`, `.text-chip`) are defined in `index.css` for project-wide patterns.
- **No light mode**: Do not use light mode classes or `dark:` prefixes. All styles are for dark backgrounds only.
- **No legacy classes**: All legacy classes (e.g., `card-dark`, `bg-white`, `text-gray`, etc.) have been removed from the codebase.
- **No unjustified `!important`**: `!important` is only used where technically required and is always commented and documented in `index.css`.
- **Specificity and order**: If a style isn’t applying, check specificity and the order of your classes and CSS.

## How to Use
- Reference the `StyleDemo` page (`/style-demo`) for live examples of all approved styles and components. This is the **single source of truth** for all style decisions.
- Add new styles to `index.css` and document them in the StyleDemo page.
- Use only the classes and patterns shown in the StyleDemo page for new UI work.

## Contributing New Styles
- **Before adding a new style**, check the StyleDemo page and `index.css` to avoid duplication.
- Add new utilities or component classes to `index.css` following the established naming conventions.
- Update the StyleDemo page with a live example and documentation for any new style.
- All new UI work must be reviewed for consistency with the style system and checked against the StyleDemo page.

## Best Practice Notes
- Use Tailwind utilities for all layout, spacing, and most styling.
- Use custom utilities/components from `index.css` for project-wide patterns.
- Never use `!important` in your styles unless technically required and documented.
- Do not use light mode classes or `dark:` prefixes. This app is dark mode only.
- If a style isn’t applying, check specificity and order in your CSS and JSX.
- Add new styles to `index.css` and document them in the StyleDemo page.
- Reference the StyleDemo page before creating new styles or utilities.

## Style Review Checklist
- [x] Are only dark mode classes/utilities used?
- [x] Are all custom utilities/components from `index.css`?
- [x] Is there any use of `!important`? (Should be **none** except where documented in `index.css`)
- [x] Are all headings, buttons, cards, and inputs consistent with the StyleDemo reference?
- [x] Are all new styles documented in the StyleDemo page?
- [x] Is the style cascade and specificity correct?
- [x] Is the UI visually consistent across all pages and modals?

---

For more, see the `src/index.css` file and the `/style-demo` page in the app. 