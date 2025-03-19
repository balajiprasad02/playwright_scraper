const { chromium } = require('playwright');
const fs = require('fs');

const BASE_URL = 'https://hiring.idenhq.com';  
const AUTH_FILE = 'auth.json';  
const OUTPUT_FILE = 'products.json';

async function main() {
    const browser = await chromium.launch({ headless: false });
    let context;

    if (fs.existsSync(AUTH_FILE)) {
        context = await browser.newContext({ storageState: AUTH_FILE });
        console.log('Loaded existing session');
    } else {
        context = await browser.newContext();
        const page = await context.newPage();
        
        await page.goto(`${BASE_URL}`);

        await page.fill('#email', 'balaji.prasad@cmr.edu.in');  
        await page.fill('#password', 'ln1Ths3A');
        await page.wait(5000);
        await page.locator('text="Sign in"').click();

        await page.waitForSelector('#logout-button', { timeout: 10000 });

        await context.storageState({ path: AUTH_FILE });
        console.log('Session saved');

        await page.close();
    }

    const page = await context.newPage();
    await page.goto(BASE_URL);

    await page.click('#main-menu');
    await page.hover('text=Data Tools');
    await page.hover('text=Inventory Management');
    await page.click('text=Product Catalog');

    await page.waitForSelector('.product-table', { timeout: 10000 });

    let allProducts = [];

    while (true) {
        const products = await page.$$eval('.product-row', rows => {
            return rows.map(row => ({
                name: row.querySelector('.product-name').innerText,
                price: row.querySelector('.product-price').innerText,
                stock: row.querySelector('.product-stock').innerText
            }));
        });

        allProducts.push(...products);

        const nextButton = await page.$('.pagination-next:not(.disabled)');
        if (!nextButton) break;
        await nextButton.click();
        await page.waitForTimeout(2000);
    }

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(allProducts, null, 2));
    console.log(`Scraped ${allProducts.length} products and saved to ${OUTPUT_FILE}`);

    await browser.close();
}

main().catch(console.error);
