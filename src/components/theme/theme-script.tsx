/**
 * Applies the stored theme before the browser paints.
 *
 * This has to run synchronously in <head>. Doing it in an effect would let the
 * page paint in the default theme first, producing the white flash every
 * dark-mode site is judged on. Storage access is wrapped because a private
 * window or blocked site data makes it throw.
 */
const script = `
(function () {
  try {
    var stored = localStorage.getItem('theme');
    if (stored === 'dark' || stored === 'light') {
      document.documentElement.setAttribute('data-theme', stored);
    }
  } catch (e) {}
})();
`;

export function ThemeScript() {
  return (
    <script
      // The content is a fixed literal above, never user input.
      dangerouslySetInnerHTML={{ __html: script }}
      suppressHydrationWarning
    />
  );
}
