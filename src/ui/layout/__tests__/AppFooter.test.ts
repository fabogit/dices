import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import AppFooter from '../AppFooter.svelte';

describe('AppFooter', () => {
  it('renders semantic contentinfo landmark with version, year, license, and author links', () => {
    const { getByRole, getByText } = render(AppFooter, {
      props: {
        version: '2.4.0',
        author: 'alice',
        buildYear: '2026',
      },
    });

    const footer = getByRole('contentinfo');
    expect(footer).toBeTruthy();

    const versionLink = getByRole('link', { name: 'Dices v2.4.0' });
    expect(versionLink.getAttribute('href')).toBe('https://github.com/fabogit/dices');
    expect(versionLink.getAttribute('target')).toBe('_blank');
    expect(versionLink.getAttribute('rel')).toBe('noopener noreferrer');

    expect(getByText('© 2026')).toBeTruthy();

    const licenseLink = getByRole('link', { name: 'MIT License' });
    expect(licenseLink.getAttribute('href')).toBe(
      'https://github.com/fabogit/dices/blob/main/LICENSE',
    );
    expect(licenseLink.getAttribute('target')).toBe('_blank');

    const authorLink = getByRole('link', { name: 'alice' });
    expect(authorLink.getAttribute('href')).toBe('https://github.com/fabogit');
    expect(authorLink.getAttribute('rel')).toBe('noopener noreferrer');
  });
});
