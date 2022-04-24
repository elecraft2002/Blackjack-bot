const puppeteer = require('puppeteer');
const strategy = require("./blackjack-strategy/Suggestion.js");


const settings = require("./settings.json");

let game = {
    balance: 0,
    bet: 0,
    betAmount: 0,
    dealerCard: 0,
    playerCards: 0,
    bets: [],
};

(async () => {
    const browser = await puppeteer.launch({ headless: false, args: ['--disable-web-security', '--disable-features=IsolateOrigins,site-per-process'] });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });

    const link = settings.realMoney ? "https://www.tipsport.cz/vegas/hra/multi-blackjack/3480/realMode" : "https://www.tipsport.cz/vegas/hra/multi-blackjack/3480"
    console.log(link);
    await page.goto(link);
    console.log("Page loaded");
    await page.waitForSelector("iframe")
    const iframeUrl = await page.evaluate(() => {
        const iframe = document.querySelector('iframe');
        return iframe.src;
    });
    const cookies = await page.cookies()
    page.on("console", msg => {
        gameLoop(msg.text());
    });
    //page.close();
    await page.setCookie(...cookies);
    await page.goto(iframeUrl);

    /* await page.evaluate(() => {
        document.addEventListener("mousemove", (e) => {
            const x = e.clientX;
            const y = e.clientY;
            console.log(x, y);
        })

    }) */

    console.log(page.cookies())
    //await browser.close();
    //Controlls game
    async function click(selector) {
        if (selector == "5") {
            page.mouse.click(480, 520)
        }
        if (selector == "20") {
            page.mouse.click(560, 530)
        }
        if (selector == "100") {
            page.mouse.click(640, 530)
        }
        if (selector == "500") {
            page.mouse.click(720, 530)
        }
        if (selector == "1000") {
            page.mouse.click(800, 520)
        }
        if (selector == "ok") {
            console.log("ok")
            page.mouse.click(640, 600)
        }
        if (selector == "addCard") {
            console.log("addCard")
            page.mouse.click(475, 600)
        }
        if (selector == "dontInsure") {
            page.mouse.click(550, 600)
        }
    }
    async function gameLoop(log) {

        if (log.includes("updateCounterByApi")) {
            // await page.screenshot({ path: `./screenshots/${log}.png` });
        }

        console.log(log)
        //Start
        if (log.includes("App state: create")) {
            screenshot = true
            return
            await page.waitForSelector(".table-box")
            page.evaluate(() => {
                const table = document.querySelector(".tables-log")
                console.log("1")
                document.querySelectorAll(".table-box")[3].click()
                console.log("2")
                document.querySelector("div.tables-footer > div").click()
            }, [])
            return
        }
        if (log.includes("update balance")) {
            game.balance = parseInt(log.split(" ")[2])
            return
        }
        if (log.includes("updateCounterByClient")) {
            //updateCounterByClient -1 0 10
            log = log.replace("  ", " ")
            game.dealerCard = parseInt(log.split(" ")[3])
            return
        }
        if (log.includes("updateCounterByApi")) {
            //updateCounterByApi -1 0 10
            log = log.replace("  ", " ")
            game.playerCards = parseInt(log.split(" ")[3])
            console.log(game.dealerCard)
            return
        }
        //Rozhodnutí o sázce
        if (log.includes("player actions")) {
            await page.waitForTimeout(settings.timeout+500)

            if (game.dealerCard === 1 && !game.bets[game.bets.length - 1].notInsured) {
                game.bets[game.bets.length - 1].notInsured = true
                click("dontInsure")
                await page.waitForTimeout(settings.timeout)

            }
            const options = {
                hitSoft17: true,             // Does dealer hit soft 17
                surrender: "none",           // Surrender offered - none, late, or early
                double: "9or10or11",         // Double rules - none, 10or11, 9or10or11, any
                doubleRange: [0, 21],         // Range of values you can double, 
                // if set supercedes double (v1.1 or higher)
                doubleAfterSplit: true,      // Can double after split
                resplitAces: false,          // Can you resplit aces
                offerInsurance: true,        // Is insurance offered
                numberOfDecks: 6,            // Number of decks in play
                maxSplitHands: 4,            // Max number of hands you can have due to splits
                count: {                    // Structure defining the count (v1.3 or higher)
                    system: null,           // The count system - only "HiLo" is supported
                    trueCount: null
                },     // The TrueCount (count / number of decks left)
                strategyComplexity: "simple" // easy (v1.2 or higher), simple, advanced,
                // exactComposition, bjc-supereasy (v1.4 or higher),
                // bjc-simple (v1.4 or higher), or bjc-great
                // (v1.4 or higer) - see below for details
            }
            const result = strategy.GetRecommendedPlayerAction([game.playerCards], game.dealerCard, 1, false, options)
            console.log("------------------------ " + result)
            if (result == "hit") {
                await click("addCard")
            }
            if (result == "stand") {
                await click("ok")
            }
            return
        }
        //Nová hra
        if (log.includes("Transaction - game started")) {
            //Spočítá, kolik se má vsadit
            async function calculateBet() {
                let sum = settings.startBet
                if (game.bets.length > 20) {
                    game.bets = game.bets.slice(1)
                }
                for (let i = 0; i < game.bets.length; i++) {
                    const bet = game.bets[game.bets.length - i - 1];
                    if (bet.win)
                        return sum
                    if (bet.win !== undefined)
                        sum = sum * 2
                }
                return sum
            }
            const bet = await calculateBet()
            let betClicking = bet
            //Rozprostře částku
            await page.waitForTimeout(settings.timeout)
            async function placeBet() {
                let placed = false
                if (betClicking >= 1000 && !placed) {
                    console.log(1000)
                    betClicking -= 1000
                    click("1000")
                    placed = true
                }
                if (betClicking >= 500 && !placed) {
                    console.log(500)
                    betClicking -= 500
                    click("500")
                    placed = true
                }
                if (betClicking >= 100 && !placed) {
                    console.log(100)
                    betClicking -= 100
                    click("100")
                    placed = true
                }
                if (betClicking >= 20 && !placed) {
                    console.log(20)
                    betClicking -= 20
                    click("20")
                    placed = true
                }
                if (betClicking >= 5 && !placed) {
                    console.log(5)
                    betClicking -= 5
                    click("5")
                    placed = true
                }
                await page.waitForTimeout(settings.timeout)
                if (betClicking > 0) {
                    await placeBet()
                    return
                }
            }

            await placeBet()
            await page.waitForTimeout(settings.timeout)
            click("ok")

            game.betAmount = bet

            console.log(game.bets)
            game.bets.push({ bet, balance: game.balance, win: undefined, winBalance: undefined, id: game.bets.length == 0 ? 0 : game.bets[game.bets.length - 1].id + 1, notInsured: false })
            return
        }
        //Tohle se musí doladit
        if (log.includes("result")) {
            if (game.bets.length > 0) {
                if (log.includes("Loss")) {
                    game.bets[game.bets.length - 1].win = false
                    game.bets[game.bets.length - 1].winBalance = -game.bets[game.bets.length - 1].bet
                }
                if (log.includes("Win")) {
                    game.bets[game.bets.length - 1].win = true
                    game.bets[game.bets.length - 1].winBalance = game.bets[game.bets.length - 1].bet
                }
                if (log.includes("StayOff")) {
                    game.bets[game.bets.length - 1].win = undefined
                    game.bets[game.bets.length - 1].winBalance = game.bets[game.bets.length - 1].bet
                }
                if (log.includes("BlackJack")) {
                    game.bets[game.bets.length - 1].win = true
                    game.bets[game.bets.length - 1].winBalance = game.bets[game.bets.length - 1].bet * 1.5
                } return
                /*  }
                 if (game.balance > game.bets[game.bets.length - 2].balance) {
                     game.bets[game.bets.length - 1].win = true
                     game.bets[game.bets.length - 1].winBalance = game.balance - game.bets[game.bets.length - 1].balance
                     return
                 }
                 if (game.balance < game.bets[game.bets.length - 2].balance) {
                     game.bets[game.bets.length - 1].win = false
                     game.bets[game.bets.length - 1].winBalance = -game.balance + game.bets[game.bets.length - 1].balance
                     return
                 }
                 if (game.balance == game.bets[game.bets.length - 2].balance) {
                     game.bets[game.bets.length - 1].win = undefined
                     game.bets[game.bets.length - 1].winBalance = game.balance - game.bets[game.bets.length - 1].balance
                     return
                 } */
            }
        }
        if (log.includes("card dealed")) {

        }
        return
    }
})();
