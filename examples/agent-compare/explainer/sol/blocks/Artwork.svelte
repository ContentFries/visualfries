<script>
  let { phase = 1, compact = false } = $props();
</script>

<svg viewBox="0 0 320 180" aria-label="Yellow geometric motion artwork">
  <rect width="320" height="180" rx="10" fill="#ffe100" />
  <path d="M20 145H300M20 35H300M40 20V160M280 20V160" stroke="#171a17" stroke-opacity=".13" />
  <circle cx={88 + phase * 56} cy="91" r={44 + phase * 15} fill="#171a17" />
  <circle cx={88 + phase * 56} cy="91" r={20 + phase * 10} fill="#ffe100" />
  <path d="M220 42L274 42L274 96" fill="none" stroke="#171a17" stroke-width="13" />
  <path d="M272 44L206 110" stroke="#171a17" stroke-width="13" />
  {#if !compact}
    <text x="23" y="164" fill="#171a17" font-family="JetBrains Mono" font-size="12" font-weight="700">VISUAL / FRIES</text>
    <text x="267" y="164" fill="#171a17" font-family="JetBrains Mono" font-size="12">01</text>
  {/if}
</svg>
