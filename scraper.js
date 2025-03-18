const { chromium } = require('playwright');
const fs = require('fs');

const BASE_URL = 'https://your-correct-application-url.com'; // Replace with the actual application URL
const LOGIN_URL = `${BASE_URL}/login`; // Update if needed
const PRODUCT_PAGE_URL = `${BASE_URL}/products`; // Update if needed
const SESSION_FILE = 'auth.json';

(async () => {
    let browser;
    let context;

    try {
        // Launch browser
        browser = await chromium.launch({ headless: false }); // Set to true for headless mode

        // Check if a session exists
        if (fs.existsSync(SESSION_FILE)) {
            const storageState = JSON.parse(fs.readFileSync(SESSION_FILE, 'utf-8'));
            context = await browser.newContext({ storageState });
            console.log('Loaded existing session.');
        } else {
            context = await browser.newContext();
            const page = await context.newPage();

            // Open login page
            await page.goto(LOGIN_URL);
            console.log('Navigating to login page...');

            // Perform login (Update selectors based on your login page)
            await page.fill('#username', 'your-username');
            await page.fill('#password', 'your-password');
            await page.click('#login-button');

            // Wait for successful login confirmation
            await page.waitForNavigation();
            console.log('Login successful.');

            // Save session for future use
            await context.storageState({ path: SESSION_FILE });
        }

        // Open new page using the stored session
        const page = await context.newPage();
        await page.goto(BASE_URL);
        console.log('Navigated to main page.');

        // Navigate through hidden menu to reach 'Product Catalog'
        await page.hover('text=Data Tools');
        await page.hover('text=Inventory Management');
        await page.click('text=Product Catalog');
        console.log('Opened Product Catalog.');

        // Wait for the product table to appear
        await page.waitForSelector('.product-table');

        // Extract product data with pagination handling
        let products = [];
        let nextButtonExists = true;

        while (nextButtonExists) {
            const rows = await page.$$('.product-table tbody tr');

            for (const row of rows) {
                const data = await row.$$eval('td', (cells) => cells.map(cell => cell.innerText.trim()));
                products.push({
                    id: data[0],
                    name: data[1],
                    price: data[2],
                    stock: data[3]
                });
            }

            // Check if "Next" button exists and is enabled
            const nextButton = await page.$('button.next-page:not([disabled])');
            if (nextButton) {
                await nextButton.click();
                await page.waitForTimeout(2000); // Wait for new data to load
            } else {
                nextButtonExists = false;
            }
        }

        // Save data to JSON file
        fs.writeFileSync('products.json', JSON.stringify(products, null, 2));
        console.log('Product data saved to products.json.');

    } catch (error) {
        console.error('Error during script execution:', error);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
})();
