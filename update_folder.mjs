import puppeteer from 'puppeteer';
import 'dotenv/config';
import fs from 'fs';
// Or import puppeteer from 'puppeteer-core';

// Read UUIDs from product.json
const uuids = JSON.parse(fs.readFileSync('./product.json', 'utf-8'));

let browser;
try {
  // Launch the browser and open a new blank page
  browser = await puppeteer.launch({
    headless: false,
    userDataDir: '/Users/alfred/Library/Application Support/Google/Chrome/Profile 3'
  });
  const page = await browser.newPage();

  for (const uuid of uuids) {
    const url = `https://my.zettle.com/products/${uuid}`;
    await page.goto(url);
    await page.setViewport({ width: 1080, height: 1024 });

    // Wait for possible redirects to complete
    // await new Promise(resolve => setTimeout(resolve, 2500)); // Wait 4 seconds (adjust if needed)

    // --- CONDITIONAL LOGIN FLOW ---
    // Check if the email input is present (login required)
    const emailSelector = 'input#email[name="username"]';
    const emailInput = await page.$(emailSelector);
    if (emailInput) {
      // Fill in email
      await page.type(emailSelector, process.env.ZETTLE_EMAIL);
      // Click 'Nästa' button
      await page.click('button.collect-email#submitBtn');
      // Wait for password field
      await page.waitForSelector('input#password[name="password"]', { timeout: 10000 });
      // Fill in password
      await page.type('input#password[name="password"]', process.env.ZETTLE_PASSWORD);
      // Click 'Logga in' button
      await page.click('button.collect-password#submitBtn');
      // Wait for possible OTP (validation code) fields
      try {
        await page.waitForSelector('div.otp-boxes-container input.otp-input', { timeout: 5000 });
        // If OTP fields appear, pause for manual input
        console.log('\nManual action required: Please enter the validation code in the browser.');
        console.log('After entering the code and clicking "Bekräfta", press Enter in this terminal to continue...');
        // Wait for user to press Enter
        process.stdin.resume();
        await new Promise(resolve => process.stdin.once('data', resolve));
        process.stdin.pause();
      } catch (otpError) {
        // No OTP required, continue
      }
      // Optionally, wait for navigation or a selector unique to the logged-in state
      await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 15000 }).catch(() => { });
    } else {
      // No login required, continue
    }

    // 1. Find and fill the input field for "Mapp för kassasystem"
    await page.waitForSelector('input[name="folder"]:not([disabled])', { visible: true });
    const inputSelector = 'input[name="folder"]';

    // Click the input to activate the combo box
    await page.click(inputSelector);

    // Type the value (with delay to mimic user)
    await page.type(inputSelector, 'Vintage VMB', { delay: 100 });

    // Wait a bit after typing to ensure dropdown is interactive
    await new Promise(resolve => setTimeout(resolve, 500));

    const dropdownOptionSelector = 'ul[role="listbox"] p';
    const options = await page.$$(dropdownOptionSelector);
    for (const option of options) {
      const text = await (await option.getProperty('textContent')).jsonValue();
      if (text.trim() === 'Vintage VMB') {
        const parent = await option.evaluateHandle(el => el.closest('li,div'));
        const box = await parent.boundingBox();
        if (!box) continue;
        await parent.evaluate(el => {
          el.scrollIntoView({ behavior: 'auto', block: 'center' });
          el.click();
        });
        break;
      }
    }
    await new Promise(resolve => setTimeout(resolve, 500));

    // 3. Click the "Spara" button at the top of the page
    await page.click('button[aria-label="Spara"]');

    // Wait for the success message to appear (more generic selector)
    await page.waitForFunction(() => {
      return Array.from(document.querySelectorAll('p')).some(p => p.textContent && p.textContent.includes('Produkten uppdaterades'));
    }, { timeout: 10000 });

    console.log('Successfully updated product', uuid);
  }

} catch (error) {
  console.error('Script failed:', error);
  console.log('Browser will remain open for debugging.');
  // Do not close the browser here
} finally {
  // Only close the browser if there was no error
  // (or you can comment this out entirely to always keep it open)
  // if (browser && !error) await browser.close();
}
