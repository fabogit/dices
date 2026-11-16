<script lang="ts">
  interface Props {
    version: string;
    author: string;
    buildYear: string;
  }

  const { version, author, buildYear }: Props = $props();
</script>

<!-- Semantic Footer -->
<footer class="app-footer">
  <div class="footer-group">
    <a
      href="https://github.com/fabogit/dices"
      target="_blank"
      rel="noopener noreferrer"
      class="footer-link footer-version"
    >
      Dices v{version}
    </a>
    <span class="footer-sep" aria-hidden="true">·</span>
    <span>© {buildYear}</span>
    <a
      href="https://github.com/fabogit/dices/blob/main/LICENSE"
      target="_blank"
      rel="noopener noreferrer"
      class="footer-link"
    >
      MIT License
    </a>
  </div>

  <div class="footer-group">
    <span>
      Made with <span aria-hidden="true">❤️</span><span class="sr-only">love</span> &amp;
      <span aria-hidden="true">🤖</span><span class="sr-only">AI</span> by
      <a
        href="https://github.com/fabogit"
        target="_blank"
        rel="noopener noreferrer"
        class="footer-link"
      >
        {author}
      </a>
    </span>
  </div>
</footer>

<style>
  /* Semantic Footer */
  .app-footer {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem 1.5rem;
    padding: 0.85rem 1.5rem;
    background: var(--surface-footer);
    border-top: 1px solid var(--border-color);
    color: var(--text-secondary);
    font-size: 0.8rem;
  }

  .footer-group {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.4rem;
  }

  .footer-sep {
    color: var(--border-muted);
  }

  .footer-link {
    display: inline-flex;
    align-items: center;
    min-block-size: 24px;
    padding: 0.1rem 0.25rem;
    color: var(--accent-blue);
    font-weight: 600;
    text-decoration: none;
    border-radius: 0.25rem;
    transition:
      color 0.15s ease,
      text-decoration-color 0.15s ease;
  }

  .footer-link:hover {
    color: var(--accent-blue-light);
    text-decoration: underline;
    text-underline-offset: 3px;
  }

  .footer-version {
    color: var(--text-primary);
  }

  .footer-version:hover {
    color: var(--accent-blue);
  }

  @media (max-width: 920px) {
    .app-footer {
      justify-content: center;
      text-align: center;
    }
    .footer-group {
      justify-content: center;
    }
  }

  a:focus-visible {
    outline: 2px solid var(--accent-blue);
    outline-offset: 2px;
  }
</style>
