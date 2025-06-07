import puppeteer from 'puppeteer';

const productListUrl = 'https://my.zettle.com/products?from=1&pageSize=50&category=Vintage+VMB';

(async () => {
    const browser = await puppeteer.launch({
        headless: false,
        userDataDir: '/Users/alfred/Library/Application Support/Google/Chrome/Profile 3'
    });
    const page = await browser.newPage();
    await page.goto(productListUrl, { waitUntil: 'domcontentloaded' });

    const uuidSet = new Set();
    const nextBtnSelector = 'button[aria-label="Nästa sida"]';

    while (true) {
        // Wait for product links to be present
        await page.waitForSelector('a[href^="/products/"]');
        // Extract UUIDs from current page
        const uuids = await page.$$eval('a[href^="/products/"]', links => {
            const uuidRegex = /\/products\/([a-f0-9\-]{36})/;
            const found = [];
            links.forEach(link => {
                const match = link.getAttribute('href').match(uuidRegex);
                if (match) found.push(match[1]);
            });
            return found;
        });
        uuids.forEach(uuid => uuidSet.add(uuid));

        // Check if next page button is present and enabled
        const nextBtn = await page.$(nextBtnSelector);
        if (!nextBtn) break;
        const isDisabled = await nextBtn.evaluate(btn => btn.disabled);
        if (isDisabled) break;
        await Promise.all([
            nextBtn.click(),
            page.waitForNavigation({ waitUntil: 'domcontentloaded' })
        ]);
    }

    console.log(JSON.stringify(Array.from(uuidSet), null, 2));
    await browser.close();
})(); 
