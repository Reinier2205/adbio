# Vendor Website Template

This is a template for creating vendor websites based on the ADBio design. The template uses a configuration-based approach to make it easy to create new vendor sites with minimal changes.

## Structure

```
vendor_template/
├── index.html          # Main template file
├── config.json         # Configuration file with all customizable content
├── images/            # Directory for all images
└── README.md          # This file
```

## How to Use

1. Create a new directory for your vendor site
2. Copy all files from this template directory to your new directory
3. Update the `config.json` file with your vendor's information
4. Replace the images in the `images` directory with your vendor's images
5. The template will automatically use the new configuration

## Configuration

The `config.json` file contains all the customizable content for the site. Here's what you can modify:

### Company Information
- Company name
- Tagline
- Logo
- Favicon

### Hero Section
- Title
- Description
- Hero image
- Image alt text

### Packages
- Package names
- Prices
- Features
- Images
- Additional notes

### Benefits
- Vendor benefits
- Service benefits

### Timeline
- Step titles
- Step descriptions

### Testimonials
- Customer names
- Roles
- Content
- Statistics
- Avatar images

### CTA Section
- Title
- Description

### Facts
- Icons
- Titles
- Content

### Contact Information
- Phone
- Email
- Address
- Social media links

## Images Required

Make sure to provide the following images in the `images` directory:
- `logo.png` - Company logo
- `favicon.png` - Favicon
- `img_hero.png` - Hero section image
- `free_package.png` - Free package image
- `img_support.png` - Support package image
- `img_followup.png` - Follow-up package image
- Testimonial avatars (e.g., `testimonial1.png`)

## Customization

The template uses CSS variables for easy customization of colors and styling. You can modify these in the `<style>` section of `index.html`:

```css
:root {
  --primary: #4CAF50;
  --secondary: #FFEB3B;
  --accent1: #FF7043;
  --accent2: #03A9F4;
  --background: #FFF8E1;
  --text: #212121;
  /* ... other variables ... */
}
```

## Best Practices

1. Keep image sizes optimized for web
2. Use descriptive alt text for all images
3. Test the site on different devices and browsers
4. Ensure all links are working before deployment
5. Update the meta tags for SEO

## Support

For any questions or issues, please contact the template maintainer. 