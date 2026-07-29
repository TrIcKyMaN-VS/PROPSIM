# PROPSIM NinjaTrader 8 Sync Add-On

This is a custom C# NinjaScript Add-On designed to automatically sync trades from NinjaTrader 8 to your PROPSIM journal in real-time.

## Installation

1. Create a ZIP file containing the `PropSim` folder (or all `.cs` files).
2. Open NinjaTrader 8.
3. Go to **Tools** → **Import** → **NinjaScript Add-On...**
4. Select the `.zip` file you created.
5. Restart NinjaTrader 8.

## Configuration

1. Log into your PROPSIM web application.
2. Navigate to **Settings** → **Integrations** from the sidebar.
3. Click **Generate Sync Token** under the NinjaTrader card.
4. Copy the generated API token.
5. On your local machine, open `Documents\NinjaTrader 8\` and create a text file named `propsim_token.txt`.
6. Paste the API token into `propsim_token.txt` and save it.
7. (Optional) By default, the Add-On syncs to `https://propsim.vercel.app`. If you want to use a different URL (e.g. a local server or custom domain), create a file named `propsim_url.txt` in the same directory and paste your URL there.
8. Restart NinjaTrader 8.

*Note: In the final production build, a custom WPF UI menu will be added to the NinjaTrader Control Center to manage the token and URL without needing to create text files manually.*

## How It Works

- The Add-On runs automatically in the background.
- It hooks into the `OnExecutionUpdate` and `OnPositionUpdate` events.
- Once a position opens and fully closes (flattens), it aggregates the fills into a single "Trade".
- It sends the final Trade (Entry, Exit, Contracts, PnL) directly to the PROPSIM web API over HTTPS.
- The trade instantly appears in your PROPSIM journal, dashboard, and analytics.
