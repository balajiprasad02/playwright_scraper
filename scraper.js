const { chromium } = require('playwright');
const fs = require('fs');

const LOGIN_URL = 'https://yourwebsite.com/login';
const PRODUCT_CATALOG_URL = 'https://yourwebsite.com/product-catalog';
const SESSION_FILE = 'session.json';

const CREDENTIALS = {
    username: 'your_username',
    password: 'your_password'
};

async function saveSession(context) {
    const storage = await context.storageState();
    fs.writeFileSync(SESSION_FILE, JSON.stringify(storage));
}

async function loadSession(browser) {
    if (fs.existsSync(SESSION_FILE)) {
        return await browser.newContext({ storageState: SESSION_FILE });
    }
    return await browser.newContext();
}

async function loginIfNeeded(context, page) {
    await page.goto(LOGIN_URL);

    if (await page.$('input[name="username"]')) {
        console.log("Logging in...");
        await page.fill('input[name="username"]', CREDENTIALS.username);
        await page.fill('input[name="password"]', CREDENTIALS.password);
        await page.click('button[type="submit"]');
        await page.waitForNavigation();
        await saveSession(context);
    } else {
        console.log("Using existing session.");
    }
}

async function navigateToProductCatalog(page) {
    await page.click('#main-menu');  
    await page.hover('#data-tools');  
    await page.hover('#inventory-management');  
    await page.click('#product-catalog');
    await page.waitForSelector('.product-table');
}

async function extractProductData(page) {
    let products = [];
    let nextPageExists = true;

    while (nextPageExists) {
        const rows = await page.$$('.product-table tbody tr');

        for (const row of rows) {
            const name = await row.$eval('.name', el => el.textContent.trim());
            const price = await row.$eval('.price', el => el.textContent.trim());
            const stock = await row.$eval('.stock', el => el.textContent.trim());
            products.push({ name, price, stock });
        }

        nextPageExists = await page.$('.pagination-next:not([disabled])');
        if (nextPageExists) {
            await page.click('.pagination-next');
            await page.waitForTimeout(1000);
        }
    }

    fs.writeFileSync('products.json', JSON.stringify(products, null, 2));
    console.log("Product data saved!");
}

(async () => {
    const browser = await chromium.launch({ headless: false });
    const context = await loadSession(browser);
    const page = await context.newPage();

    await loginIfNeeded(context, page);
    await navigateToProductCatalog(page);
    await extractProductData(page);

    await browser.close();
})();
