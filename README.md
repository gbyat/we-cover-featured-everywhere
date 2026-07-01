# WE Cover Featured Everywhere

Resolves the WordPress Cover block **Use featured image** setting on blog home, archives, and search results — where the block usually has no post context outside the main loop.

**Version:** 1.2.2  
**Author:** [webentwicklerin, Gabriele Laesser](https://webentwicklerin.at)  
**License:** GPL-2.0-or-later  
**Requires WordPress:** 6.0+  
**Requires PHP:** 7.4+

---

## The problem

On singular posts and pages, a Cover block with **Use featured image** works as expected: WordPress knows which post is being displayed and loads its featured image.

On **list views** (blog index, category archives, tag archives, date archives, author archives, search results), a Cover block is often placed in a **template part** such as the header — **outside** the post loop. In that situation:

- Block context often has no `postId`
- The Cover block cannot resolve a featured image reliably
- You may see no background image, or inconsistent results depending on theme and WordPress version

This plugin fills that gap by picking a post from the **main query** (the same posts listed on the current page) and supplying the Cover block with the correct post context and global post data for rendering.

---

## Features

- Works with the core **Cover** block (`core/cover`) and its **Use featured image** option
- Per-block setting in the block editor sidebar: **Archive featured image**
- Four image source modes on list views (default: **Disabled**):
  - **Disabled** — plugin does not alter this Cover on list views (use for covers that contain their own Query Loops)
  - **First listed post** — first post on the current page that has a featured image (respects pagination)
  - **Random from current page** — random featured image from posts on the current page that have a thumbnail
  - **Random from entire archive** — random featured image from the full current archive/blog/search query (cached per archive context, default 15 minutes)
- Automatically skips Cover blocks inside **Post Template** blocks
- Does **not** affect singular posts, pages, or other non-list views
- Developer filter to override the picked post
- Backward compatible: existing Cover blocks with a saved source keep their setting; blocks without the attribute default to **Disabled**

---

## Requirements

- WordPress 6.0 or later
- PHP 7.4 or later
- Block theme or site editor / FSE setup using the Cover block
- Built editor assets included in `build/` (see [Development](#development))

---

## Installation

### From ZIP / folder

1. Upload the `we-cover-featured-everywhere` folder to `/wp-content/plugins/`
2. Activate the plugin through **Plugins** in the WordPress admin
3. Ensure the `build/` folder is present (`build/editor.js` and `build/editor.asset.php`)

### From source (developers)

```bash
cd we-cover-featured-everywhere
npm install
composer install
npm run build:assets
```

German (`de_DE`) strings live in `scripts/translations/de_DE.json`. After changing translatable text:

```bash
npm run i18n
```

Then activate the plugin as above.

---

## Usage

### 1. Add or edit a Cover block

Place a Cover block in a template part or template that appears on list views — commonly the **header** on archive or blog templates.

### 2. Enable Use featured image

In the Cover block settings, turn on **Use featured image** (featured image as background).

### 3. Choose the archive image source

When **Use featured image** is enabled, a new panel appears in the block sidebar:

**Archive featured image → Image source on list views**

| Option | Behavior on list views |
|--------|------------------------|
| Disabled | Plugin does not modify this Cover; WordPress handles it as usual (default) |
| First listed post | First post on the current page that has a featured image |
| Random from current page | Random post with a featured image from the current page; same image per page load |
| Random from entire archive | Random post with a featured image from the full archive/blog/search query |

Save the template.

### 4. View on the front end

Visit a blog index, category archive, or search results page. The Cover background should show the selected featured image source.

---

## Typical setups

### Archive header with a dynamic background

- Cover in header template part
- **Use featured image:** on
- **Image source:** First listed post or Random from current page

### Header with its own Query Loop (e.g. latest post)

If the Cover contains a **Query Loop** or **Post Template** showing a specific post (title, image, link):

- Set **Image source on list views** to **Disabled**
- The plugin will not override post data for that Cover
- Your inner Query Loop blocks use their own post context

### Cover inside the post list

If each post in a Query Loop / Post Template has its own Cover with **Use featured image**:

- No configuration needed
- The plugin **does not run** inside the loop (`in_the_loop()`)
- Each Cover shows that post's own featured image

---

## How it works

### When the plugin runs

All of the following must be true:

1. Front end (not admin)
2. Block is `core/cover` with **Use featured image** enabled
3. Block is **outside** the main loop (`in_the_loop()` is false)
4. Current view is blog home, an archive, or search results
5. Image source is not **Disabled**

### Post selection

Posts are taken from the **main query** (`$wp_query->posts`) — the same set of posts displayed on the current page, including pagination.

- **First:** `$wp_query->posts[0]`
- **Random (current page):** random choice among posts that have `has_post_thumbnail()`; one pick cached per request
- **Random (entire archive):** count + offset query (no `ORDER BY RAND()`); result cached per archive context (default 15 minutes, filterable)

### Rendering

WordPress core Cover block resolves featured images via `get_the_post_thumbnail()` without an explicit post ID. The plugin:

1. Wraps the Cover `render_callback` to temporarily set the global `$post` **only while the Cover background is rendered** (after inner blocks have rendered, so nested Query Loops are not affected)
2. Filters `render_block_context` to supply `postId` and `postType` where needed

### Editor preview

The block editor preview still shows the featured image of the **template or post you are editing**. Archive logic (first / random) applies on the **front end only**. This is normal for WordPress block extensions.

---

## Block attribute

The plugin adds this attribute to `core/cover`:

| Attribute | Type | Default | Values |
|-----------|------|---------|--------|
| `weArchiveFeaturedSource` | string | `off` | `off`, `first`, `random`, `random_archive` |

Stored in block markup when not default (depending on editor serialization).

---

## Developer hooks

### Filter: `we_cover_featured_everywhere_picked_post`

Modify the post used for the Cover featured image on list views.

```php
add_filter( 'we_cover_featured_everywhere_picked_post', function ( $post, $source, $query ) {
	// Example: always use the second post on category archives.
	if ( 'first' === $source && is_category() && ! empty( $query->posts[1] ) ) {
		return $query->posts[1];
	}
	return $post;
}, 10, 3 );
```

### Filter: `we_cover_featured_everywhere_random_archive_cache_ttl`

Cache duration in seconds for **Random from entire archive** picks (default `15 * MINUTE_IN_SECONDS`). Set to `0` to disable transient caching.

```php
add_filter( 'we_cover_featured_everywhere_random_archive_cache_ttl', function () {
	return 10 * MINUTE_IN_SECONDS;
} );
```

**Parameters:**

- `$post` (`WP_Post`) — picked post
- `$source` (`string`) — `first`, `random`, or `random_archive`
- `$query` (`WP_Query`) — main query

---

## Caching note

If **Random from current page** or **Random from entire archive** appears to show the same image for a long time, your site may use **full-page caching** (hosting, plugin, or CDN). Random selection happens per PHP request; cached HTML freezes the result until the cache expires or is purged.

**Random from entire archive** uses a count + offset query instead of `ORDER BY RAND()`, and caches the picked post ID per archive context (default **15 minutes**). Filter with `we_cover_featured_everywhere_random_archive_cache_ttl` (seconds; `0` disables caching). Full-page caching can still freeze the rendered HTML until the page cache expires.

---

## File structure

```
we-cover-featured-everywhere/
├── we-cover-featured-everywhere.php   Main plugin file
├── src/
│   └── editor.js                      Block editor extension (source)
├── build/
│   ├── editor.js                      Compiled editor script
│   └── editor.asset.php               Script dependencies and version
├── composer.json                      PHPCS dev dependencies
├── package.json                       npm build scripts
├── README.md                          This file
└── readme.txt                         WordPress.org-style readme
```

---

## Development

### Scripts

```bash
npm install          # Dev dependencies
npm run build:assets # Production build → build/
npm run start        # Watch mode for development
npm run i18n         # POT/PO/MO/JSON from source + locale catalogs
npm run pack         # build:assets + release ZIP
npm run release:patch  # tag + push (GitHub Actions builds release ZIP)
composer install
composer run lint
composer run lint:fix
```

Uses [@wordpress/scripts](https://www.npmjs.com/package/@wordpress/scripts) and [WPCS](https://github.com/WordPress/WordPress-Coding-Standards).

**Translations:** edit `scripts/translations/de_DE.json`, then run `npm run i18n` (or `npm run i18n:translate` if POT/PO are already current).

**Releases:** bump version and push a git tag with `npm run release:patch|minor|major`. The workflow in `.github/workflows/release.yml` creates the GitHub release asset.

### What the editor script does

- Registers `weArchiveFeaturedSource` on `core/cover`
- Adds **Archive featured image** panel to the block inspector when **Use featured image** is on

---

## FAQ

**Does this replace the featured image on single posts?**  
No. Only list views outside the loop.

**Why does the first post's image sometimes appear even without this plugin?**  
On many setups, WordPress already sets the global `$post` to the first main-query post during template rendering. This plugin adds reliable control, random mode, and explicit per-block settings.

**Can I use random from all posts in an archive, not just the current page?**  
Yes. Choose **Random from entire archive**. It mirrors the current list view query (category, tag, blog home, search, etc.) and picks one random post with a featured image.

**Why Disabled by default?**  
Covers with their own Query Loops stay safe. Enable **First** or a **Random** mode only on archive header covers that should be dynamic.

**Why Disabled?**  
For Covers that contain Query Loops or other blocks that depend on their own post context in the header.

---

## Changelog

### 1.2.2

- Refactor changelog update logic to build entry body without parameters and improve Unreleased section handling. Add syncPublicChangelogs function call to ensure public changelogs are updated.
- Update version to 1.2.1, enhance default source settings, add random archive option, improve detection for Cover blocks, and include German translation tooling.

### 1.2.1

- Default source is now **Disabled**
- Added **Random from entire archive**
- **First listed post** skips posts without a featured image
- Improved detection for Cover blocks inside **Post Template**
- Invalid source values fall back to **Disabled**
- Added PHPCS / Composer lint setup
- Added translation and release tooling with German (`de_DE`) catalog

### 1.2.0

- Added **Disabled** image source option
- Fixed global `$post` timing so inner blocks (Query Loops) inside a Cover are not affected
- Wrapped Cover render callback instead of using `render_block_data` for post swapping

### 1.1.2

- Safer attribute access and post restoration
- Fixed critical error from missing `attrs` and unsafe query state

### 1.1.1

- Fixed random mode by setting global post during Cover render
- Refactored post picker helper

### 1.1.0

- Added block editor setting: First listed post / Random from current page
- Added `weArchiveFeaturedSource` block attribute
- Added npm build for editor script

### 1.0.1

- Initial release: first listed post on list views via `render_block_context`

---

## Credits

Developed by [webentwicklerin, Gabriele Laesser](https://webentwicklerin.at).
