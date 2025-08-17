// src/scraper/selectors-config.ts
export const zidSelectors = {
  name: ['h2.product-title__title', 'h1'],
  variant: ['p.product-title__info--pdp span'],
  price: [
    '.price--pdp .ar-number',
    'span.product-price',
    'h2.product-formatted-price',
  ],
  description: [
    'p.text-short-description',
    'div.description',
    'div.productView-description',
  ],
  images: [
    '#product-images img.carousel-img',
    'div.lazyload-wrapper img.image--contain',
    'img.swiper-lazy',
  ],
  category: ['meta[itemprop="category"]'],
  lowQuantity: ['.low-quantity-section', '.low-quantity'],
  specsBlock: ['section p span'],
};
