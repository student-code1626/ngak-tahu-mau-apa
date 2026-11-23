with open('public/app.html', 'r', encoding='utf-8') as f:
    text = f.read()

import re
# check where financial-hero-banner is in public/app.html
banner_match = re.search(r'<section class="financial-hero-banner".*?</section>', text, re.DOTALL)
if banner_match:
    print("Found banner HTML:")
    print(banner_match.group(0)[:500])

# check topbar
topbar_match = re.search(r'<header class="topbar">.*?</header>', text, re.DOTALL)
if topbar_match:
    print("\nFound topbar HTML:")
    print(topbar_match.group(0))

