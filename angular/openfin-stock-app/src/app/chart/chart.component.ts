import { AfterViewInit, Component, ViewChild } from "@angular/core";

// required import for initalizing Fdc3DataAdapter:
import * as openfinFdc3 from "openfin-fdc3";

// required imports for working with FDC3 data adapter:
import { Fdc3DataAdapter } from "igniteui-angular-fdc3";
// for sending ViewChart with single stock symbol:
import { Fdc3Instrument } from "igniteui-angular-fdc3";
// for sending ViewChart with multiple stock symbols:
import { Fdc3InstrumentList } from "igniteui-angular-fdc3";
// for receiving ViewChart message:
import { Fdc3Message } from "igniteui-angular-fdc3";

// required imports for working with FinancialChart
import { IgxFinancialChartComponent } from "igniteui-angular-charts";
import { IgxNavigationDrawerComponent } from "igniteui-angular";

// optional imports for overriding auto-generated data by FDC3 data adapter
import { StockPricePoint } from "igniteui-angular-core";
import { StockPriceHistory } from "igniteui-angular-core";

@Component({
    selector: "app-root",
    templateUrl: "./chart.component.html",
    styleUrls:  ["./chart.component.scss"]
})
export class ChartComponent implements AfterViewInit {

    public title = "Openfin-FDC3 - Chart App";
    public dataSource: any[];
    public FDC3adapter: Fdc3DataAdapter;

    @ViewChild("chart", { static: true })
    public chart: IgxFinancialChartComponent;

    @ViewChild(IgxNavigationDrawerComponent, { static: true })
    public drawer: IgxNavigationDrawerComponent;

    public selected = "TSLA";

    public viewSingleCharts: any[] = [
        { text: "UBER", symbol: "UBER" },
        { text: "GOOG", symbol: "GOOG" },
        { text: "AMZN", symbol: "AMZN" },
        { text: "NVDA", symbol: "NVDA" },
        { text: "TSLA", symbol: "TSLA" },
    ];
    public viewMultipleCharts: any[] = [
        { text: "TSLA + UBER", symbols: ["TSLA", "UBER"] },
        // { text: "AMZN + GOOG", symbols: ["AMZN", "GOOG"] },
    ];

    constructor() {
        document.title = this.title;
    }

    public async InitializeFDC3(): Promise<void> {

        // creating FDC3 data adapter with reference to openfin
        this.FDC3adapter = new Fdc3DataAdapter(openfinFdc3);

        // subscribing to FDC3 "ViewChart" intent
        this.FDC3adapter.subscribe("ViewChart");

        // handling FDC3 intents sent via OpenFin's FDC3 service
        this.FDC3adapter.messageReceived = (msg: Fdc3Message) => {
            // at this point, FDC3 data adapter has already processed FDC3 intent
            // and generated data for tickers embedded in context of FDC3 message
            // so we can just update the FinancialChart
            this.UpdateChart(this.FDC3adapter.stockPrices);

            console.log("message received JSON: \n" + msg.json);

            // Optional access to properties of FDC3 message that can be used
            // for custom processing of FDC3 intent and its context:
            // let intentType: string = msg.intentType;         // FDC3 intent type, e.g. "ViewChart"
            // let contextType: string = msg.contextType;       // FDC3 context type, e.g. "fdc3.instrument"
            // let contextObject: Fdc3Context = msg.context;    // FDC3 context object
            // let contextJson: string = msg.json;              // string representation of FDC3 context object
            // let tickerSymbols: string[] = msg.tickerSymbols; // array of ticker symbol(s) embedded in FDC3 context
            // let tickerNames: string[] = msg.tickerNames;     // array of ticker name(s) embedded in FDC3 context
        };

        // optional, initalizing adapter with some popular stocks
        this.FDC3adapter.stockSymbols = ["TSLA"];

        this.UpdateChart(this.FDC3adapter.stockPrices);
    }

    public View(item) {
        this.selected = item.text;

        if (item.symbol) {
            this.ViewChart(item.symbol);
        } else if (item.symbols) {
            this.ViewMultiple(item.symbols);
        }
    }

    public ViewChart(symbol: string): void {

        if (window.hasOwnProperty("fin")) {
            // creating context for FDC3 message
            const context = new Fdc3Instrument();
            context.ticker = symbol;
            // sending FDC3 message with instrument as context to IgStockCharts app
            this.FDC3adapter.sendInstrument("ViewChart", context, "IgStockDashboardAppID");

        } else {
            // by-passing OpenFin service since it is not running
            this.FDC3adapter.clearData();
            this.FDC3adapter.stockSymbols = [symbol];

            this.UpdateChart(this.FDC3adapter.stockPrices);
        }
    }

    public ViewMultiple(symbols: string[]): void {
        // const symbols: string[] = ["MSFT", "TSLA"];

        if (window.hasOwnProperty("fin")) {
            // creating context for FDC3 message
            const context = new Fdc3InstrumentList();
            for (const ticker of symbols) {
                const instrument = new Fdc3Instrument();
                instrument.ticker = ticker;
                context.instruments.push(instrument);
            }
            // sending FDC3 message with multiple instruments as context to IgStockCharts app
            this.FDC3adapter.sendInstrumentList("ViewChart", context, "IgStockDashboardAppID");

        } else {
            // by-passing OpenFin service since it is not running
            this.FDC3adapter.clearData();
            this.FDC3adapter.stockSymbols = symbols;
            this.UpdateChart(this.FDC3adapter.stockPrices);
        }
    }

    public UpdateChart(stockPrices: any[]) {
        const dataSource: any[] = [];
        const symbols = [];
        for (const prices of stockPrices) {
            const items = [];
            for (const price of prices.toArray()) {
                const item = {
                    date: price.date,
                    open: price.open,
                    high: price.high,
                    low: price.low,
                    close: price.close,
                    volume: price.volume
                };
                items.push(item);
            }
            // adding annotations for SeriesTitle
            const symbol = (prices as any).symbol.toString();
            symbols.push(symbol);
            (items as any).__dataIntents = {
                close: ["SeriesTitle/Symbol: " + symbol]
            };

            console.log("items.length " + items.length);
            dataSource.push(items);
        }
        console.log("stock.length " + dataSource.length);

        if (this.chart === undefined) { return; }

        // bind and show only OHLC values in the chart
        this.chart.includedProperties = ["*.open", "*.high", "*.low", "*.close", "*.volume", "*.date"];
        this.chart.dataSource = dataSource;
        this.chart.chartTitle = symbols.join(" and ");
    }

    public ngAfterViewInit(): void {
        console.log("app loaded");

        this.drawer.width = "240px";

        if (openfinFdc3 === undefined) {
            console.log("openfinFdc3 is undefined"); return;
        } else {
            this.InitializeFDC3();
        }
    }

    public drawerToggle(): void {
        // this.drawer.width = "180px";
        this.drawer.pin = true;
        this.drawer.toggle();
    }

}