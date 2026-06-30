/**
 * Generate a URL-friendly slug from a string.
 */
function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

/**
 * Generate a unique slug by appending a suffix if needed.
 * @param {string} text
 * @param {function} existsFn - async function that returns true if slug already exists
 * @returns {Promise<string>}
 */
async function uniqueSlug(text, existsFn) {
  let slug = slugify(text);
  if (!slug) slug = 'untitled';
  let candidate = slug;
  let counter = 1;
  while (await existsFn(candidate)) {
    candidate = `${slug}-${counter}`;
    counter++;
  }
  return candidate;
}

module.exports = { slugify, uniqueSlug };
