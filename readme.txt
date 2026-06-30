=== WE Cover Featured Everywhere ===
Contributors: gbyat
Tags: cover, featured image, block, fse, full site editing, archive, query loop
Requires at least: 6.0
Tested up to: 7.0
Requires PHP: 7.4
Stable tag: 1.2.1
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Resolves Cover block "Use featured image" on list views with Disabled (default), first/random from the current page, or random from the entire archive.

== Description ==

The WordPress **Cover** block can use a post's featured image as its background (**Use featured image**). That works on single posts and pages because WordPress knows which post is being displayed.

On **list views** — blog index, category/tag/date/author archives, and search results — a Cover in the **header** or another template part often sits **outside the post loop**. There is no post context, so the featured image may not appear or may behave inconsistently.

**WE Cover Featured Everywhere** picks a post for the Cover background on the front end and supplies the correct post context.

= Features =

* Works with the core Cover block and **Use featured image**
* Per-block setting in the editor: **Archive featured image**
* **Disabled** (default) — do not apply on list views
* **First listed post** — first post on the current page that has a featured image
* **Random from current page** — random featured image from the current page
* **Random from entire archive** — random featured image from the full current archive/blog/search query
* Skips Cover blocks inside **Post Template** blocks automatically
* Does not affect singular posts or pages
* Developer filter: `we_cover_featured_everywhere_picked_post`

= Typical use cases =

* Dynamic archive header background from listed posts
* Blog index hero Cover with a featured image from the current page
* Random featured image from an entire category or archive

= When to choose Disabled =

If your Cover contains a **Query Loop** or **Post Template** (for example showing the latest post with title, image, and link in the header), keep **Image source on list views** on **Disabled** so the plugin does not interfere with your inner blocks.

= Covers inside the post list =

Cover blocks inside a Post Template (one per listed post) are **not** modified by this plugin. Each post keeps its own featured image.

== Installation ==

1. Upload the plugin folder to `/wp-content/plugins/we-cover-featured-everywhere/`
2. Activate the plugin through the **Plugins** menu in WordPress
3. Make sure the `build/` folder is included (`build/editor.js` and `build/editor.asset.php`)

For development from source, run `npm install`, `composer install`, `npm run build:assets`, and `npm run i18n` in the plugin directory before activating.

Release ZIPs are built by GitHub Actions when you push a version tag (`npm run release:patch|minor|major`).

== Usage ==

1. Edit a template or template part that appears on list views (often the header on archive or blog templates).
2. Select a **Cover** block and enable **Use featured image**.
3. In the block sidebar, open **Archive featured image**.
4. Choose **Image source on list views**:
   * **Disabled** (default)
   * **First listed post**
   * **Random from current page**
   * **Random from entire archive**
5. Save the template and view a blog index, archive, or search page on the front end.

The editor preview still shows the template's own context. Archive behavior applies on the front end only.

== Frequently Asked Questions ==

= Does this work on single posts or pages? =

No. The plugin only runs on blog home, archives, and search results, and only for Cover blocks outside the loop.

= Does random pick from all posts in the archive? =

Yes, if you choose **Random from entire archive**. **Random from current page** only uses posts on the current paginated page.

= Is random from the entire archive performant? =

For typical blogs and category archives, yes. The plugin runs one additional lightweight random query with a featured-image check. On very large archives, database random ordering can become slower.

= Why does random sometimes show the same image for a while? =

Full-page caching (hosting, plugin, or CDN) stores HTML per request. Random is chosen when the page is generated, not on every visitor hit, until the cache expires.

= Do I need to rebuild anything after installing? =

No, if you install a release that includes the `build/` folder. Developers changing `src/editor.js` must run `npm run build`.

== Developer notes ==

= Filter: we_cover_featured_everywhere_picked_post =

Modify the post used for the Cover featured image.

`apply_filters( 'we_cover_featured_everywhere_picked_post', $post, $source, $query );`

* `$post` — WP_Post object
* `$source` — `first`, `random`, or `random_archive`
* `$query` — main WP_Query

= Block attribute =

* Name: `weArchiveFeaturedSource`
* Type: string
* Default: `off`
* Allowed values: `off`, `first`, `random`, `random_archive`

== Changelog ==

= 1.2.1 =
* Default source is now **Disabled**
* Added **Random from entire archive**
* **First listed post** skips posts without a featured image
* Improved detection for Cover blocks inside **Post Template**
* Invalid source values fall back to **Disabled**
* Added PHPCS / Composer lint setup
* Added translation and release tooling with German (`de_DE`) catalog

= 1.2.0 =
* Added **Disabled** image source option for covers with inner Query Loops
* Fixed global post timing so inner blocks inside a Cover are not affected
* Wrapped Cover render callback for safer featured image resolution

= 1.1.2 =
* Safer block attribute access and post state restoration
* Fixed critical error on some PHP 8 setups

= 1.1.1 =
* Fixed random mode on the front end
* Refactored post selection helper

= 1.1.0 =
* Added editor setting: First listed post / Random from current page
* Added block attribute and editor script build

= 1.0.1 =
* Initial release: resolve featured image from first main-query post on list views

== Upgrade Notice ==

= 1.2.1 =
Adds Disabled default, random-from-archive mode, German translations, and release tooling. Recommended update for archive header covers.

= 1.2.0 =
Adds Disabled mode and fixes conflicts with Query Loops inside Cover blocks. Recommended for header covers with custom loops.
