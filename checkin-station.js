const os = require('os')
const path = require('path')
const _ = require('lodash')
const puppeteer = require('puppeteer')
const secrets = require('./secrets.json')

class PrintingStation {
  constructor(config={}) {
    const {
      name = 'NURSERY',
      url = secrets.url,
      passcode = secrets.passcode,
    } = config
    this.name = name
    this.url = url
    this.passcode = passcode
  }
  async start() {
    await this._init({ setup: false })
    await this._login()
    await this._startStation()
  }
  async stop() {
    if (this.browser) {
      await this.browser.close()
    }
    this.browser = null
    this.page = null
  }
  async setup() {
    await this._init({ setup: true })
    await this._login()
    await this._startStation()
  }
  async _login() {
    const { page } = this
    const pwsel = 'input[type="password" i]'
    await page.waitForSelector(pwsel)
    await page.type(pwsel, this.passcode)
    // submit
    await page.keyboard.press('Enter')
  }
  async _startStation() {
    await this.page.waitForSelector(`input[name="LabelPrinterOption"]`)
    await this.page.evaluate((name) => {
      $(`input[name="LabelPrinterOption"][value="ShareLabelPrinter"]`).click()
      $(`input[name="CheckInPrinter"]`).val(name)
      $(`input[name="AllowTextToCheckIn"]`).prop('checked', true)
      $('a:contains("OK")').get(0).click()
    }, this.name)
  }
  async _init(config = {}) {
    if (this.browser || this.page) return
    const { setup = false, width = 1920, height = 1080 } = config
    const browser = await puppeteer.launch({
      headless: !setup,
      args: _.compact(['--no-sandbox', '--disable-setuid-sandbox', /*!setup && */'--kiosk-printing']),
      userDataDir: path.join(os.tmpdir(), this.name),
      defaultViewport: { width, height },
    });
    console.log('browser', browser)

    const page = await browser.newPage();
    // set the viewport to be the same as in the browser
    await page.setViewport({ width, height });
    await page.goto(this.url, { waitUntil: 'networkidle2' });
    this.browser = browser
    this.page = page
    return page
  }
}

const ps1 = new PrintingStation({ name: 'NURSERY' })
ps1.setup()
const ps2 = new PrintingStation({ name: 'PRESCHOOL' })
ps2.setup()

module.exports = PrintingStation
