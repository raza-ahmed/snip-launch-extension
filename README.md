# SnipLaunch

SnipLaunch is a Chrome extension that opens random bookmarks from selected folders, filtered by selected domains.

## Features

- Select which bookmark domains are allowed.
- Select which bookmark folders are searched.
- Open 1 to 100 random matching links at once.
- Keeps your domain, folder, and tab-count choices in synced extension storage.
- Avoids duplicate URLs in each random batch.

## How It Works

1. SnipLaunch reads your bookmark tree.
2. It builds:
   - a list of unique domains from bookmark URLs
   - a list of bookmark folders
3. You choose allowed domains and folders in the popup.
4. On click, it picks random unique links that match both filters.
5. It opens the selected number of tabs.

## Installation (Developer Mode)

1. Download or clone this project.
2. Open `chrome://extensions/` in Chrome.
3. Enable **Developer mode**.
4. Click **Load unpacked**.
5. Select the project folder: `snip-launch-extension`.

## Usage

1. Click the SnipLaunch extension icon.
2. In **Domains**, keep checked domains you want to allow.
3. In **Folders**, keep checked folders you want to search.
4. Set **Number of tabs to open**.
5. Click **Open random bookmarks**.

If no results match your filters, the popup shows a message.

## Project Structure

- `manifest.json` - Extension manifest (MV3), permissions, and popup entry.
- `popup.html` - Popup UI structure.
- `popup.js` - Bookmark loading, filtering, random selection, and tab opening logic.
- `style.css` - Popup styling.
- `icon.png` - Extension icon.

## Permissions Used

- `bookmarks` - Read bookmark folders and links.
- `tabs` - Open selected random links in new tabs.
- `storage` - Persist selected filters and open-count value.