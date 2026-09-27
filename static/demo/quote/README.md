# quote — a VisualFries motion project

The project from the VisualFries homepage and Quickstart: a 4:5 quote card whose words appear when "nothing" is said, whose last word lights up on "silently" and whose credit fades in on "suggests".

```bash
npm install visualfries playwright
npx playwright install chromium   # or set VISUALFRIES_CHROMIUM_PATH to an installed Chromium
npx visualfries clips quote.vf.json
npx visualfries check quote.vf.json --determinism
npx visualfries still quote.vf.json --clip quote --output quote.png
npx visualfries render quote.vf.json --output out/
```

Font: Newsreader, SIL Open Font License 1.1 (fonts/OFL.txt).
