<?php

/**
 * Plugin Name: WE Cover Featured Everywhere
 * Description: Resolves Cover block "Use featured image" on list views with Disabled (default), first/random from the current page, or random from the entire archive.
 * Version: 1.2.1
 * Author: webentwicklerin, Gabriele Laesser
 * Author URI: https://webentwicklerin.at
 * Text Domain: we-cover-featured-everywhere
 * Domain Path: /languages
 * Tested up to: 7.0
 * Requires at least: 6.0
 * Requires PHP: 7.4
 *
 * @package WE_Cover_Featured_Everywhere
 */

if (! defined('ABSPATH')) {
	exit;
}

define( 'WE_COVER_FEATURED_EVERYWHERE_VERSION', '1.2.1' );

/**
 * Loads plugin translations.
 *
 * @return void
 */
function we_cover_featured_everywhere_load_textdomain()
{
	load_plugin_textdomain(
		'we-cover-featured-everywhere',
		false,
		dirname(plugin_basename(__FILE__)) . '/languages'
	);
}
add_action('plugins_loaded', 'we_cover_featured_everywhere_load_textdomain');

/**
 * Returns allowed archive featured image source values.
 *
 * @return string[]
 */
function we_cover_featured_everywhere_get_valid_sources()
{
	return array('off', 'first', 'random', 'random_archive');
}

/**
 * Returns block attributes as an array.
 *
 * @param array $parsed_block Parsed block data.
 *
 * @return array
 */
function we_cover_featured_everywhere_get_block_attrs($parsed_block)
{
	if (! is_array($parsed_block) || empty($parsed_block['attrs']) || ! is_array($parsed_block['attrs'])) {
		return array();
	}

	return $parsed_block['attrs'];
}

/**
 * Registers the archive featured image source attribute on the Cover block.
 *
 * @param array  $args       Block type registration arguments.
 * @param string $block_type Block type name.
 *
 * @return array
 */
function we_cover_featured_everywhere_register_block_attributes($args, $block_type)
{
	if ('core/cover' !== $block_type) {
		return $args;
	}

	if (! isset($args['attributes']) || ! is_array($args['attributes'])) {
		$args['attributes'] = array();
	}

	$args['attributes']['weArchiveFeaturedSource'] = array(
		'type'    => 'string',
		'default' => 'off',
		'enum'    => we_cover_featured_everywhere_get_valid_sources(),
	);

	return $args;
}
add_filter('register_block_type_args', 'we_cover_featured_everywhere_register_block_attributes', 10, 2);

/**
 * Increments post-template depth before inner blocks render.
 *
 * @param array $parsed_block Parsed block data.
 *
 * @return array
 */
function we_cover_featured_everywhere_track_post_template_start($parsed_block)
{
	if (! is_array($parsed_block) || empty($parsed_block['blockName']) || 'core/post-template' !== $parsed_block['blockName']) {
		return $parsed_block;
	}

	if (! isset($GLOBALS['we_cover_featured_everywhere_post_template_depth'])) {
		$GLOBALS['we_cover_featured_everywhere_post_template_depth'] = 0;
	}

	++$GLOBALS['we_cover_featured_everywhere_post_template_depth'];

	add_filter('render_block_core/post-template', 'we_cover_featured_everywhere_track_post_template_end', 999, 1);

	return $parsed_block;
}
add_filter('render_block_data', 'we_cover_featured_everywhere_track_post_template_start', 10, 1);

/**
 * Decrements post-template depth after the block has rendered.
 *
 * @param string $block_content Rendered block content.
 *
 * @return string
 */
function we_cover_featured_everywhere_track_post_template_end($block_content)
{
	if (isset($GLOBALS['we_cover_featured_everywhere_post_template_depth'])) {
		--$GLOBALS['we_cover_featured_everywhere_post_template_depth'];
	}

	remove_filter('render_block_core/post-template', 'we_cover_featured_everywhere_track_post_template_end', 999);

	return $block_content;
}

/**
 * Whether a Cover block is currently rendering inside a post template.
 *
 * @return bool
 */
function we_cover_featured_everywhere_is_inside_post_template()
{
	return ! empty($GLOBALS['we_cover_featured_everywhere_post_template_depth']);
}

/**
 * Wraps the Cover render callback so the global post is only swapped while the
 * featured image is resolved (after inner blocks have rendered).
 *
 * @param array  $args       Block type registration arguments.
 * @param string $block_type Block type name.
 *
 * @return array
 */
function we_cover_featured_everywhere_wrap_cover_render_callback($args, $block_type)
{
	if ('core/cover' !== $block_type) {
		return $args;
	}

	if (empty($args['render_callback']) || ! is_callable($args['render_callback'])) {
		return $args;
	}

	static $wrapped = false;

	if ($wrapped) {
		return $args;
	}

	$wrapped           = true;
	$original_callback = $args['render_callback'];

	$args['render_callback'] = function ($attributes, $content, $block) use ($original_callback) {
		$parsed_block = array(
			'blockName' => 'core/cover',
			'attrs'     => is_array($attributes) ? $attributes : array(),
			'context'   => array(),
		);

		if (is_object($block) && isset($block->context) && is_array($block->context)) {
			$parsed_block['context'] = $block->context;
		}

		if (! we_cover_featured_everywhere_should_resolve($parsed_block)) {
			return call_user_func($original_callback, $attributes, $content, $block);
		}

		global $post, $wp_query;

		$picked_post = we_cover_featured_everywhere_pick_post(
			we_cover_featured_everywhere_get_source($parsed_block),
			$wp_query
		);

		if (! $picked_post instanceof WP_Post) {
			return call_user_func($original_callback, $attributes, $content, $block);
		}

		$previous_post = $post;
		$post          = $picked_post; // phpcs:ignore WordPress.WP.GlobalVariablesOverride.Prohibited

		$result = call_user_func($original_callback, $attributes, $content, $block);

		$post = $previous_post; // phpcs:ignore WordPress.WP.GlobalVariablesOverride.Prohibited

		return $result;
	};

	return $args;
}
add_filter('register_block_type_args', 'we_cover_featured_everywhere_wrap_cover_render_callback', 20, 2);

/**
 * Enqueues the block editor script.
 *
 * @return void
 */
function we_cover_featured_everywhere_enqueue_editor_assets()
{
	$asset_file = plugin_dir_path(__FILE__) . 'build/editor.asset.php';

	if (! file_exists($asset_file)) {
		return;
	}

	$asset = include $asset_file;

	if (! is_array($asset)) {
		return;
	}

	wp_enqueue_script(
		'we-cover-featured-everywhere-editor',
		plugins_url('build/editor.js', __FILE__),
		isset($asset['dependencies']) ? $asset['dependencies'] : array(),
		isset($asset['version']) ? $asset['version'] : '1.2.0',
		true
	);

	wp_set_script_translations(
		'we-cover-featured-everywhere-editor',
		'we-cover-featured-everywhere',
		plugin_dir_path(__FILE__) . 'languages'
	);
}
add_action('enqueue_block_editor_assets', 'we_cover_featured_everywhere_enqueue_editor_assets');

/**
 * Whether a Cover block is on a list view that can use archive featured images.
 *
 * @param array $parsed_block Parsed block data.
 *
 * @return bool
 */
function we_cover_featured_everywhere_is_list_cover_target($parsed_block)
{
	if (is_admin() || ! is_array($parsed_block) || ! did_action('wp')) {
		return false;
	}

	if (empty($parsed_block['blockName']) || 'core/cover' !== $parsed_block['blockName']) {
		return false;
	}

	$attrs = we_cover_featured_everywhere_get_block_attrs($parsed_block);

	if (empty($attrs['useFeaturedImage'])) {
		return false;
	}

	if (we_cover_featured_everywhere_is_inside_post_template()) {
		return false;
	}

	if (! empty($parsed_block['context']['queryId'])) {
		return false;
	}

	if (in_the_loop()) {
		return false;
	}

	if (! is_home() && ! is_archive() && ! is_search()) {
		return false;
	}

	return true;
}

/**
 * Whether this Cover block should resolve an archive featured image.
 *
 * @param array $parsed_block Parsed block data.
 *
 * @return bool
 */
function we_cover_featured_everywhere_should_resolve($parsed_block)
{
	if (! we_cover_featured_everywhere_is_list_cover_target($parsed_block)) {
		return false;
	}

	return 'off' !== we_cover_featured_everywhere_get_source($parsed_block);
}

/**
 * Returns the configured archive featured image source.
 *
 * @param array $parsed_block Parsed block data.
 *
 * @return string
 */
function we_cover_featured_everywhere_get_source($parsed_block)
{
	$attrs  = we_cover_featured_everywhere_get_block_attrs($parsed_block);
	$source = isset($attrs['weArchiveFeaturedSource']) ? $attrs['weArchiveFeaturedSource'] : 'off';

	if (! in_array($source, we_cover_featured_everywhere_get_valid_sources(), true)) {
		return 'off';
	}

	return $source;
}

/**
 * Picks the first post with a featured image from the main query page.
 *
 * @param WP_Query $query Main query.
 *
 * @return WP_Post|null
 */
function we_cover_featured_everywhere_pick_first_post_with_thumbnail($query)
{
	if (! $query instanceof WP_Query || empty($query->posts) || ! is_array($query->posts)) {
		return null;
	}

	foreach ($query->posts as $post) {
		if ($post instanceof WP_Post && has_post_thumbnail($post->ID)) {
			return $post;
		}
	}

	return null;
}

/**
 * Picks a random post with a featured image from the current main-query page.
 *
 * @param WP_Query $query Main query.
 *
 * @return WP_Post|null
 */
function we_cover_featured_everywhere_pick_random_from_page($query)
{
	static $random_pick = null;

	if (null !== $random_pick) {
		return $random_pick;
	}

	if (! $query instanceof WP_Query || empty($query->posts) || ! is_array($query->posts)) {
		return null;
	}

	$candidates = array();

	foreach ($query->posts as $post) {
		if ($post instanceof WP_Post && has_post_thumbnail($post->ID)) {
			$candidates[] = $post;
		}
	}

	if (empty($candidates)) {
		return null;
	}

	$random_pick = $candidates[wp_rand(0, count($candidates) - 1)];

	return $random_pick;
}

/**
 * Picks a random post with a featured image from the entire current archive query.
 *
 * Uses one lightweight random query that mirrors the main query context.
 *
 * @param WP_Query $query Main query.
 *
 * @return WP_Post|null
 */
function we_cover_featured_everywhere_pick_random_from_archive($query)
{
	static $random_archive_pick = null;

	if (null !== $random_archive_pick) {
		return $random_archive_pick;
	}

	if (! $query instanceof WP_Query) {
		return null;
	}

	$args = $query->query_vars;

	$args['posts_per_page']         = 1;
	$args['paged']                  = 1;
	$args['orderby']                = 'rand';
	$args['no_found_rows']          = true;
	$args['ignore_sticky_posts']    = true;
	$args['update_post_meta_cache'] = false;
	$args['update_post_term_cache'] = false;

	unset($args['offset']);

	$meta_query   = isset($args['meta_query']) && is_array($args['meta_query']) ? $args['meta_query'] : array();
	$meta_query[] = array(
		'key'     => '_thumbnail_id',
		'compare' => 'EXISTS',
	);
	$args['meta_query'] = $meta_query;

	$random_query = new WP_Query($args);

	if (empty($random_query->posts[0]) || ! ($random_query->posts[0] instanceof WP_Post)) {
		return null;
	}

	$random_archive_pick = $random_query->posts[0];

	return $random_archive_pick;
}

/**
 * Picks a post from the main query for archive featured image resolution.
 *
 * @param string   $source Pick strategy.
 * @param WP_Query $query  Main query.
 *
 * @return WP_Post|null
 */
function we_cover_featured_everywhere_pick_post($source, $query)
{
	$post = null;

	if ('random' === $source) {
		$post = we_cover_featured_everywhere_pick_random_from_page($query);
	} elseif ('random_archive' === $source) {
		$post = we_cover_featured_everywhere_pick_random_from_archive($query);
	} else {
		$post = we_cover_featured_everywhere_pick_first_post_with_thumbnail($query);
	}

	if (! $post instanceof WP_Post) {
		return null;
	}

	/**
	 * Filters the post picked for an archive featured image.
	 *
	 * @param WP_Post  $post   Picked post.
	 * @param string   $source Pick strategy.
	 * @param WP_Query $query  Main query.
	 */
	return apply_filters('we_cover_featured_everywhere_picked_post', $post, $source, $query);
}

/**
 * Supplies post context for Cover blocks with "Use featured image" on list views.
 *
 * @param array $context      Block context.
 * @param array $parsed_block Parsed block data.
 *
 * @return array
 */
function we_cover_featured_everywhere_block_context($context, $parsed_block)
{
	if (! we_cover_featured_everywhere_should_resolve($parsed_block)) {
		return $context;
	}

	global $wp_query;

	$picked_post = we_cover_featured_everywhere_pick_post(
		we_cover_featured_everywhere_get_source($parsed_block),
		$wp_query
	);

	if (! $picked_post instanceof WP_Post) {
		return $context;
	}

	$context['postId']   = $picked_post->ID;
	$context['postType'] = $picked_post->post_type;

	return $context;
}
add_filter('render_block_context', 'we_cover_featured_everywhere_block_context', 10, 2);
