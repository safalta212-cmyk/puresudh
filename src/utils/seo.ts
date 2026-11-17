/**
 * PURE SUDH - Advanced SEO & Structured Data Manager
 * Handles dynamic titles, descriptions, canonical links, OpenGraph,
 * Twitter cards, and Schema.org JSON-LD structured data (Product, Store, Breadcrumbs).
 */

export interface SEOProps {
  title?: string;
  description?: string;
  canonicalUrl?: string;
  ogType?: 'website' | 'article' | 'product';
  ogImage?: string;
  productSchema?: {
    id: string;
    name: string;
    description: string;
    image: string;
    price: number;
    originalPrice?: number;
    category?: string;
    inStock: boolean;
    rating?: number;
    reviewCount?: number;
    sku?: string;
  };
  breadcrumbs?: Array<{
    name: string;
    path: string;
  }>;
}

const DEFAULT_TITLE = 'PURE SUDH - Pure Food • Pure Quality • Pure Trust | Fresh Indian Delicacies';
const DEFAULT_DESCRIPTION =
  'Authentic homemade snacks, festival sweets, pure desi ghee delicacies, fresh claypot dahi, and artisan paneer delivered fresh to your door in Patna & Bihar.';
const DEFAULT_IMAGE = '/images/homemade_thekua_special.jpg';

export function updateSEO({
  title,
  description,
  canonicalUrl,
  ogType = 'website',
  ogImage,
  productSchema,
  breadcrumbs,
}: SEOProps): void {
  if (typeof document === 'undefined') return;

  const currentOrigin =
    typeof window !== 'undefined' ? window.location.origin : 'https://puresudh.com';
  const fullTitle = title
    ? `${title} | PURE SUDH`
    : DEFAULT_TITLE;
  const fullDesc = description || DEFAULT_DESCRIPTION;
  const fullImage = ogImage
    ? ogImage.startsWith('http')
      ? ogImage
      : `${currentOrigin}${ogImage}`
    : `${currentOrigin}${DEFAULT_IMAGE}`;
  const fullCanonical = canonicalUrl
    ? canonicalUrl.startsWith('http')
      ? canonicalUrl
      : `${currentOrigin}${canonicalUrl}`
    : typeof window !== 'undefined'
    ? `${window.location.origin}${window.location.pathname}`
    : currentOrigin;

  // 1. Dynamic Title
  document.title = fullTitle;

  // 2. Helper to set or create meta tag
  const setMeta = (attr: 'name' | 'property', key: string, content: string) => {
    let el = document.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null;
    if (!el) {
      el = document.createElement('meta');
      el.setAttribute(attr, key);
      document.head.appendChild(el);
    }
    el.setAttribute('content', content);
  };

  // 3. Meta Description & Robots
  setMeta('name', 'description', fullDesc);
  setMeta('name', 'robots', 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1');

  // 4. Canonical Link
  let canonicalEl = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!canonicalEl) {
    canonicalEl = document.createElement('link');
    canonicalEl.setAttribute('rel', 'canonical');
    document.head.appendChild(canonicalEl);
  }
  canonicalEl.setAttribute('href', fullCanonical);

  // 5. OpenGraph Tags
  setMeta('property', 'og:title', fullTitle);
  setMeta('property', 'og:description', fullDesc);
  setMeta('property', 'og:url', fullCanonical);
  setMeta('property', 'og:type', ogType);
  setMeta('property', 'og:image', fullImage);
  setMeta('property', 'og:site_name', 'PURE SUDH');
  setMeta('property', 'og:locale', 'en_IN');

  // 6. Twitter Card Tags
  setMeta('name', 'twitter:card', 'summary_large_image');
  setMeta('name', 'twitter:title', fullTitle);
  setMeta('name', 'twitter:description', fullDesc);
  setMeta('name', 'twitter:image', fullImage);

  // 7. Schema.org JSON-LD Structured Data
  updateJsonLdSchemas({
    productSchema,
    breadcrumbs,
    currentUrl: fullCanonical,
    origin: currentOrigin,
  });
}

interface SchemaUpdateOptions {
  productSchema?: SEOProps['productSchema'];
  breadcrumbs?: SEOProps['breadcrumbs'];
  currentUrl: string;
  origin: string;
}

function updateJsonLdSchemas({
  productSchema,
  breadcrumbs,
  currentUrl,
  origin,
}: SchemaUpdateOptions): void {
  // A. Organization / Local Store Schema
  let orgScript = document.getElementById('pure-sudh-store-schema') as HTMLScriptElement | null;
  if (!orgScript) {
    orgScript = document.createElement('script');
    orgScript.id = 'pure-sudh-store-schema';
    orgScript.type = 'application/ld+json';
    document.head.appendChild(orgScript);
  }

  const storeJson = {
    '@context': 'https://schema.org',
    '@type': 'OnlineStore',
    '@id': `${origin}/#store`,
    name: 'PURE SUDH',
    url: origin,
    logo: `${origin}/logo.png`,
    image: `${origin}/images/pure_sudh_hero.jpg`,
    description:
      'Pure Food • Pure Quality • Pure Trust - Fresh Indian snacks, sweets, dairy products, and homemade specialties delivered fresh.',
    currenciesAccepted: 'INR',
    paymentAccepted: 'Cash, UPI, Credit Card, Debit Card, Net Banking',
    priceRange: '₹50 - ₹2000',
    telephone: '+919876543210',
    email: 'support@puresudh.com',
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'Bailey Road, Near Paras Hospital',
      addressLocality: 'Patna',
      addressRegion: 'Bihar',
      postalCode: '800014',
      addressCountry: 'IN',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: '25.6093',
      longitude: '85.1235',
    },
    openingHoursSpecification: [
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: [
          'Monday',
          'Tuesday',
          'Wednesday',
          'Thursday',
          'Friday',
          'Saturday',
          'Sunday',
        ],
        opens: '06:00',
        closes: '22:00',
      },
    ],
  };
  orgScript.textContent = JSON.stringify(storeJson);

  // B. Product Schema (if viewing a product)
  let prodScript = document.getElementById('pure-sudh-product-schema') as HTMLScriptElement | null;
  if (productSchema) {
    if (!prodScript) {
      prodScript = document.createElement('script');
      prodScript.id = 'pure-sudh-product-schema';
      prodScript.type = 'application/ld+json';
      document.head.appendChild(prodScript);
    }
    const productJson = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: productSchema.name,
      image: productSchema.image.startsWith('http')
        ? productSchema.image
        : `${origin}${productSchema.image}`,
      description: productSchema.description,
      sku: productSchema.sku || productSchema.id,
      brand: {
        '@type': 'Brand',
        name: 'PURE SUDH',
      },
      category: productSchema.category || 'Food & Grocery',
      offers: {
        '@type': 'Offer',
        url: currentUrl,
        priceCurrency: 'INR',
        price: productSchema.price,
        priceValidUntil: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
        itemCondition: 'https://schema.org/NewCondition',
        availability: productSchema.inStock
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock',
        seller: {
          '@type': 'Organization',
          name: 'PURE SUDH',
        },
      },
      ...(productSchema.rating && productSchema.reviewCount
        ? {
            aggregateRating: {
              '@type': 'AggregateRating',
              ratingValue: productSchema.rating,
              reviewCount: productSchema.reviewCount,
              bestRating: '5',
              worstRating: '1',
            },
          }
        : {}),
    };
    prodScript.textContent = JSON.stringify(productJson);
  } else if (prodScript) {
    prodScript.remove();
  }

  // C. Breadcrumb Schema
  let breadcrumbScript = document.getElementById('pure-sudh-breadcrumb-schema') as HTMLScriptElement | null;
  if (breadcrumbs && breadcrumbs.length > 0) {
    if (!breadcrumbScript) {
      breadcrumbScript = document.createElement('script');
      breadcrumbScript.id = 'pure-sudh-breadcrumb-schema';
      breadcrumbScript.type = 'application/ld+json';
      document.head.appendChild(breadcrumbScript);
    }
    const breadcrumbJson = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: breadcrumbs.map((b, idx) => ({
        '@type': 'ListItem',
        position: idx + 1,
        name: b.name,
        item: b.path.startsWith('http') ? b.path : `${origin}${b.path}`,
      })),
    };
    breadcrumbScript.textContent = JSON.stringify(breadcrumbJson);
  } else if (breadcrumbScript) {
    breadcrumbScript.remove();
  }
}
