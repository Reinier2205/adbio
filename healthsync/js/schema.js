/**
 * schema.js — JSON-LD schema injection helper
 * ES module. Requirements: 16.3, 16.4
 */

/**
 * Creates and appends a <script type="application/ld+json"> element to <head>.
 * @param {object} schemaObject
 */
export function injectSchema(schemaObject) {
  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.textContent = JSON.stringify(schemaObject, null, 2);
  document.head.appendChild(script);
}

// ── Schema objects ────────────────────────────────────────────────

/** MedicalBusiness schema for index.html (Req 16.3) */
export const MEDICAL_BUSINESS_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'MedicalBusiness',
  'name': 'Health Synchrony \u2013 Integrated Health Practitioners',
  'address': {
    '@type': 'PostalAddress',
    'streetAddress': 'Irene Security Estate',
    'addressLocality': 'Centurion',
    'addressRegion': 'Gauteng',
    'addressCountry': 'ZA'
  },
  'telephone': '+27XXXXXXXXXX',
  'url': 'https://healthsynchrony.co.za',
  'openingHoursSpecification': [
    {
      '@type': 'OpeningHoursSpecification',
      'dayOfWeek': ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      'opens': '08:00',
      'closes': '17:00'
    }
  ]
};

/** Physician schema for about.html (Req 16.4) */
export const PHYSICIAN_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'Physician',
  'name': 'Dr. van Dyk',
  'medicalSpecialty': 'https://schema.org/Dermatology',
  'worksFor': {
    '@type': 'MedicalBusiness',
    'name': 'Health Synchrony \u2013 Integrated Health Practitioners'
  }
};
