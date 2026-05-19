<?php
/**
 * Plugin Name:       WPSeoHub Connector
 * Plugin URI:        https://github.com/konkomaji/wp-seo-hub
 * Description:       Connects your WordPress site to WPSeoHub. Exposes rich SEO metadata from Yoast SEO, RankMath, The SEO Framework, and Google Site Kit via a secure REST API — enabling accurate auditing, one-click meta fixes, GSC performance data, and post creation directly from the hub.
 * Version:           1.0.0
 * Author:            Konko Maji
 * Author URI:        https://github.com/konkomaji
 * License:           GPL v2 or later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       wp-seo-hub-connector
 * Requires at least: 5.8
 * Requires PHP:      7.4
 */

if ( ! defined( 'ABSPATH' ) ) exit;

define( 'WPSEO_HUB_VERSION',     '1.0.0' );
define( 'WPSEO_HUB_NS',          'wp-seo-hub/v1' );
define( 'WPSEO_HUB_PLUGIN_FILE', __FILE__ );

// ─── CORS ─────────────────────────────────────────────────────────────────────

add_action( 'rest_api_init', function() {
    remove_filter( 'rest_pre_serve_request', 'rest_send_cors_headers' );
    add_filter( 'rest_pre_serve_request', function( $served, $result, $request, $server ) {
        // Only allow localhost origins (the hub always runs locally)
        $origin  = isset( $_SERVER['HTTP_ORIGIN'] ) ? $_SERVER['HTTP_ORIGIN'] : '';
        $allowed = preg_match( '/^https?:\/\/(localhost|127\.0\.0\.1)(:[0-9]+)?$/', $origin );
        if ( $allowed ) {
            header( 'Access-Control-Allow-Origin: ' . esc_url_raw( $origin ) );
        }
        header( 'Access-Control-Allow-Methods: OPTIONS, GET, POST' );
        header( 'Access-Control-Allow-Headers: Content-Type, X-WPSeoHub-Token' );
        header( 'Access-Control-Expose-Headers: X-WP-Total, X-WP-TotalPages' );
        if ( 'OPTIONS' === $_SERVER['REQUEST_METHOD'] ) {
            status_header( 200 );
            exit();
        }
        return $served;
    }, 10, 4 );
}, 15 );

// ─── ROUTES ───────────────────────────────────────────────────────────────────

add_action( 'rest_api_init', 'wpseo_hub_register_routes' );

function wpseo_hub_register_routes() {

    register_rest_route( WPSEO_HUB_NS, '/ping', [
        'methods'             => 'GET',
        'callback'            => 'wpseo_hub_ping',
        'permission_callback' => '__return_true',
    ]);

    register_rest_route( WPSEO_HUB_NS, '/info', [
        'methods'             => 'GET',
        'callback'            => 'wpseo_hub_get_info',
        'permission_callback' => 'wpseo_hub_auth',
    ]);

    register_rest_route( WPSEO_HUB_NS, '/audit', [
        'methods'             => 'GET',
        'callback'            => 'wpseo_hub_get_audit',
        'permission_callback' => 'wpseo_hub_auth',
        'args'                => [
            'status' => [ 'default' => 'any', 'sanitize_callback' => 'sanitize_text_field' ],
        ],
    ]);

    register_rest_route( WPSEO_HUB_NS, '/posts', [
        'methods'             => 'GET',
        'callback'            => function( $r ) { return wpseo_hub_get_content( 'post', $r ); },
        'permission_callback' => 'wpseo_hub_auth',
        'args'                => wpseo_hub_pagination_args(),
    ]);

    register_rest_route( WPSEO_HUB_NS, '/pages', [
        'methods'             => 'GET',
        'callback'            => function( $r ) { return wpseo_hub_get_content( 'page', $r ); },
        'permission_callback' => 'wpseo_hub_auth',
        'args'                => wpseo_hub_pagination_args(),
    ]);

    register_rest_route( WPSEO_HUB_NS, '/update-meta', [
        'methods'             => 'POST',
        'callback'            => 'wpseo_hub_update_meta',
        'permission_callback' => 'wpseo_hub_auth',
        'args'                => [
            'post_id'       => [ 'required' => true, 'sanitize_callback' => 'absint' ],
            'meta_title'    => [ 'default'  => '', 'sanitize_callback' => 'sanitize_text_field' ],
            'meta_desc'     => [ 'default'  => '', 'sanitize_callback' => 'sanitize_textarea_field' ],
            'focus_keyword' => [ 'default'  => '', 'sanitize_callback' => 'sanitize_text_field' ],
        ],
    ]);

    register_rest_route( WPSEO_HUB_NS, '/gsc-data', [
        'methods'             => 'GET',
        'callback'            => 'wpseo_hub_get_gsc_data',
        'permission_callback' => 'wpseo_hub_auth',
        'args'                => [
            'days' => [ 'default' => 28, 'sanitize_callback' => 'absint' ],
        ],
    ]);

    register_rest_route( WPSEO_HUB_NS, '/gsc-status', [
        'methods'             => 'GET',
        'callback'            => 'wpseo_hub_gsc_status',
        'permission_callback' => 'wpseo_hub_auth',
    ]);

    register_rest_route( WPSEO_HUB_NS, '/create-post', [
        'methods'             => 'POST',
        'callback'            => 'wpseo_hub_create_post',
        'permission_callback' => 'wpseo_hub_auth',
        'args'                => [
            'title'          => [ 'required' => true, 'sanitize_callback' => 'sanitize_text_field' ],
            'content'        => [ 'default'  => '', 'sanitize_callback' => 'wp_kses_post' ],
            'excerpt'        => [ 'default'  => '', 'sanitize_callback' => 'sanitize_textarea_field' ],
            'slug'           => [ 'default'  => '', 'sanitize_callback' => 'sanitize_title' ],
            'status'         => [ 'default'  => 'draft', 'sanitize_callback' => 'sanitize_text_field' ],
            'category_ids'   => [ 'default'  => [] ],
            'tag_ids'        => [ 'default'  => [] ],
            'featured_media' => [ 'default'  => 0, 'sanitize_callback' => 'absint' ],
            'focus_keyword'  => [ 'default'  => '', 'sanitize_callback' => 'sanitize_text_field' ],
            'meta_title'     => [ 'default'  => '', 'sanitize_callback' => 'sanitize_text_field' ],
            'meta_desc'      => [ 'default'  => '', 'sanitize_callback' => 'sanitize_textarea_field' ],
            'scheduled_date' => [ 'default'  => '', 'sanitize_callback' => 'sanitize_text_field' ],
            'noindex'        => [ 'default'  => false, 'sanitize_callback' => 'rest_sanitize_boolean' ],
            'nofollow'       => [ 'default'  => false, 'sanitize_callback' => 'rest_sanitize_boolean' ],
            'canonical_url'  => [ 'default'  => '', 'sanitize_callback' => 'esc_url_raw' ],
            'og_title'       => [ 'default'  => '', 'sanitize_callback' => 'sanitize_text_field' ],
            'og_description' => [ 'default'  => '', 'sanitize_callback' => 'sanitize_textarea_field' ],
            'schema_type'    => [ 'default'  => '', 'sanitize_callback' => 'sanitize_text_field' ],
            'twitter_title'  => [ 'default'  => '', 'sanitize_callback' => 'sanitize_text_field' ],
            'post_password'  => [ 'default'  => '', 'sanitize_callback' => 'sanitize_text_field' ],
            'comment_status' => [ 'default'  => 'open', 'sanitize_callback' => 'sanitize_text_field' ],
        ],
    ]);

    register_rest_route( WPSEO_HUB_NS, '/upload-media', [
        'methods'             => 'POST',
        'callback'            => 'wpseo_hub_upload_media',
        'permission_callback' => 'wpseo_hub_auth',
    ]);

    register_rest_route( WPSEO_HUB_NS, '/create-category', [
        'methods'             => 'POST',
        'callback'            => 'wpseo_hub_create_category',
        'permission_callback' => 'wpseo_hub_auth',
        'args'                => [
            'name'        => [ 'required' => true, 'sanitize_callback' => 'sanitize_text_field' ],
            'slug'        => [ 'default'  => '', 'sanitize_callback' => 'sanitize_title' ],
            'description' => [ 'default'  => '', 'sanitize_callback' => 'sanitize_textarea_field' ],
        ],
    ]);

    register_rest_route( WPSEO_HUB_NS, '/update-category', [
        'methods'             => 'POST',
        'callback'            => 'wpseo_hub_update_category',
        'permission_callback' => 'wpseo_hub_auth',
        'args'                => [
            'category_id' => [ 'required' => true, 'sanitize_callback' => 'absint' ],
            'name'        => [ 'default'  => '', 'sanitize_callback' => 'sanitize_text_field' ],
            'slug'        => [ 'default'  => '', 'sanitize_callback' => 'sanitize_title' ],
            'description' => [ 'default'  => '', 'sanitize_callback' => 'sanitize_textarea_field' ],
        ],
    ]);

    register_rest_route( WPSEO_HUB_NS, '/plugins-status', [
        'methods'             => 'GET',
        'callback'            => 'wpseo_hub_plugins_status',
        'permission_callback' => 'wpseo_hub_auth',
    ]);
}

function wpseo_hub_pagination_args() {
    return [
        'page'     => [ 'default' => 1,  'sanitize_callback' => 'absint' ],
        'per_page' => [ 'default' => 30, 'sanitize_callback' => 'absint' ],
        'status'   => [ 'default' => 'publish', 'sanitize_callback' => 'sanitize_text_field' ],
    ];
}

// ─── AUTH ──────────────────────────────────────────────────────────────────────

function wpseo_hub_get_api_token() {
    $token = get_option( 'wpseo_hub_api_token' );
    if ( ! $token ) {
        $token = bin2hex( random_bytes( 24 ) );
        update_option( 'wpseo_hub_api_token', $token );
    }
    return $token;
}

function wpseo_hub_auth( WP_REST_Request $request ) {
    $ip = sanitize_text_field( $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0' );

    // Check lockout: 10 failed attempts per IP per 15 minutes
    $lock_key  = 'wpseo_hub_fail_' . md5( $ip );
    $fails     = (int) get_transient( $lock_key );
    if ( $fails >= 10 ) {
        return new WP_Error( 'too_many_attempts', 'Too many failed auth attempts. Try again in 15 minutes.', [ 'status' => 429 ] );
    }

    // Accept token from Authorization header (Bearer) or query param
    $auth_header = $request->get_header( 'X-WPSeoHub-Token' );
    $token       = $auth_header ?: $request->get_param( '_wpseo_hub_token' );

    if ( $token && hash_equals( (string) wpseo_hub_get_api_token(), (string) $token ) ) {
        // Clear fail counter on success
        delete_transient( $lock_key );
        return true;
    }

    // Log failure
    if ( $token ) {
        set_transient( $lock_key, $fails + 1, 15 * MINUTE_IN_SECONDS );
    }

    return current_user_can( 'edit_posts' );
}

// ─── PLUGIN / ANALYTICS DETECTION ─────────────────────────────────────────────

function wpseo_hub_detect_seo_plugin() {
    if ( defined( 'WPSEO_VERSION' ) )                                       return 'yoast';
    if ( defined( 'RANK_MATH_VERSION' ) )                                   return 'rankmath';
    if ( defined( 'THE_SEO_FRAMEWORK_VERSION' ) )                           return 'tsf';
    if ( class_exists( 'AIOSEOP_Core' ) || defined( 'AIOSEO_VERSION' ) )   return 'aioseo';
    if ( defined( 'SQ_VERSION' ) )                                          return 'squirrly';
    return 'none';
}

function wpseo_hub_detect_analytics() {
    $data = [
        'ga_id'        => null, 'ga_version'   => null,
        'site_kit'     => false, 'site_kit_ver' => null,
        'gsc_property' => null, 'gsc_verified'  => false,
        'gtm_id'       => null,
    ];

    if ( defined( 'GOOGLESITEKIT_VERSION' ) || class_exists( 'Google\\Site_Kit\\Plugin' ) ) {
        $data['site_kit']     = true;
        $data['site_kit_ver'] = defined( 'GOOGLESITEKIT_VERSION' ) ? GOOGLESITEKIT_VERSION : 'unknown';

        $ga4 = get_option( 'googlesitekit_analytics-4_settings', [] );
        if ( ! empty( $ga4['measurementID'] ) ) {
            $data['ga_id'] = $ga4['measurementID']; $data['ga_version'] = 'GA4';
        }
        if ( empty( $data['ga_id'] ) ) {
            $ua = get_option( 'googlesitekit_analytics_settings', [] );
            if ( ! empty( $ua['propertyID'] ) ) {
                $data['ga_id'] = $ua['propertyID']; $data['ga_version'] = 'UA';
            }
        }
        $sc = get_option( 'googlesitekit_search-console_settings', [] );
        if ( ! empty( $sc['propertyID'] ) ) {
            $data['gsc_property'] = $sc['propertyID'];
            $data['gsc_verified'] = true;
        }
    }

    if ( defined( 'MONSTERINSIGHTS_VERSION' ) ) {
        $mi = get_option( 'monsterinsights_settings', [] );
        if ( empty( $data['ga_id'] ) ) {
            if ( ! empty( $mi['v4_id'] ) )  { $data['ga_id'] = $mi['v4_id'];  $data['ga_version'] = 'GA4'; }
            elseif ( ! empty( $mi['ua'] ) ) { $data['ga_id'] = $mi['ua'];     $data['ga_version'] = 'UA'; }
        }
    }

    if ( defined( 'EXACTMETRICS_VERSION' ) && empty( $data['ga_id'] ) ) {
        $em = get_option( 'exactmetrics_settings', [] );
        if ( ! empty( $em['ua_code'] ) ) { $data['ga_id'] = $em['ua_code']; $data['ga_version'] = 'UA'; }
    }

    foreach ( [ 'gtm4wp_options', 'duracell_twig_gtm_id', 'gtm_code' ] as $k ) {
        $v = get_option( $k );
        if ( is_array($v) ) $v = reset($v);
        if ( $v && preg_match( '/GTM-[A-Z0-9]+/', $v, $m ) ) { $data['gtm_id'] = $m[0]; break; }
    }

    return $data;
}

// ─── SEO META EXTRACTION ──────────────────────────────────────────────────────

function wpseo_hub_get_seo_meta( $post_id ) {
    $plugin = wpseo_hub_detect_seo_plugin();
    $m      = [];

    if ( $plugin === 'yoast' ) {
        $m['meta_title']        = get_post_meta( $post_id, '_yoast_wpseo_title',          true );
        $m['meta_desc']         = get_post_meta( $post_id, '_yoast_wpseo_metadesc',        true );
        $m['focus_keyword']     = get_post_meta( $post_id, '_yoast_wpseo_focuskw',         true );
        $m['seo_score']         = (int) get_post_meta( $post_id, '_yoast_wpseo_linkdex',   true );
        $m['readability_score'] = (int) get_post_meta( $post_id, '_yoast_wpseo_content_score', true );
        $m['canonical']         = get_post_meta( $post_id, '_yoast_wpseo_canonical',       true );
        $m['is_noindex']        = (bool) get_post_meta( $post_id, '_yoast_wpseo_meta-robots-noindex', true );
        $m['og_image_id']       = get_post_meta( $post_id, '_yoast_wpseo_opengraph-image-id', true );
        $m['og_title']          = get_post_meta( $post_id, '_yoast_wpseo_opengraph-title',  true );
        $m['og_desc']           = get_post_meta( $post_id, '_yoast_wpseo_opengraph-description', true );
        $m['twitter_title']     = get_post_meta( $post_id, '_yoast_wpseo_twitter-title',   true );
        $m['schema_type']       = get_post_meta( $post_id, '_yoast_wpseo_schema_page_type', true );
        $m['robots_follow']     = get_post_meta( $post_id, '_yoast_wpseo_meta-robots-nofollow', true ) ? 'nofollow' : 'follow';
        $m['breadcrumb_title']  = get_post_meta( $post_id, '_yoast_wpseo_bctitle',         true );

    } elseif ( $plugin === 'rankmath' ) {
        $m['meta_title']    = get_post_meta( $post_id, 'rank_math_title',           true );
        $m['meta_desc']     = get_post_meta( $post_id, 'rank_math_description',     true );
        $m['focus_keyword'] = get_post_meta( $post_id, 'rank_math_focus_keyword',   true );
        $m['seo_score']     = (int) get_post_meta( $post_id, 'rank_math_seo_score', true );
        $m['canonical']     = get_post_meta( $post_id, 'rank_math_canonical_url',   true );
        $robots_raw         = get_post_meta( $post_id, 'rank_math_robots',          true );
        $robots_arr         = is_array( $robots_raw ) ? $robots_raw : explode( ',', (string) $robots_raw );
        $m['is_noindex']    = in_array( 'noindex', $robots_arr, true );
        $m['og_image_id']   = get_post_meta( $post_id, 'rank_math_facebook_image_id', true );
        $m['og_title']      = get_post_meta( $post_id, 'rank_math_facebook_title',    true );
        $m['schema_type']   = get_post_meta( $post_id, 'rank_math_rich_snippet',      true );
        $m['robots_follow'] = in_array( 'nofollow', $robots_arr, true ) ? 'nofollow' : 'follow';

    } elseif ( $plugin === 'tsf' ) {
        $m['meta_title']  = get_post_meta( $post_id, '_genesis_title',       true );
        $m['meta_desc']   = get_post_meta( $post_id, '_genesis_description', true );
        $m['canonical']   = get_post_meta( $post_id, '_genesis_canonical_uri', true );
        $m['is_noindex']  = (bool) get_post_meta( $post_id, '_genesis_noindex',  true );
    }

    $post_title          = get_the_title( $post_id );
    $m['meta_title_set'] = ! empty( $m['meta_title'] ) && $m['meta_title'] !== $post_title;
    $m['has_og_image']   = ! empty( $m['og_image_id'] ) || has_post_thumbnail( $post_id );
    $m['featured_image'] = has_post_thumbnail( $post_id ) ? wp_get_attachment_url( get_post_thumbnail_id( $post_id ) ) : null;

    foreach ( $m as $k => $v ) {
        if ( $v === '' ) $m[$k] = null;
    }

    return array_merge( [
        'seo_plugin' => $plugin, 'meta_title' => null, 'meta_desc' => null,
        'focus_keyword' => null, 'seo_score' => 0, 'readability_score' => 0,
        'canonical' => null, 'is_noindex' => false, 'has_og_image' => false, 'schema_type' => null,
    ], $m );
}

// ─── CONTENT ITEM BUILDER ─────────────────────────────────────────────────────

function wpseo_hub_build_item( WP_Post $post ) {
    $content      = $post->post_content;
    $text         = wp_strip_all_tags( $content );
    $word_count   = str_word_count( $text );
    $reading_time = max( 1, round( $word_count / 200 ) );

    $site_host    = parse_url( get_site_url(), PHP_URL_HOST );
    preg_match_all( '/<a[^>]+href=["\']([^"\']+)["\'][^>]*>/i', $content, $lm );
    $internal_links = 0; $external_links = 0;
    foreach ( $lm[1] as $href ) {
        if ( strpos( $href, $site_host ) !== false || ( strpos( $href, '/' ) === 0 && strpos( $href, '//' ) !== 0 ) ) $internal_links++;
        elseif ( preg_match( '/^https?:\/\//', $href ) ) $external_links++;
    }

    preg_match_all( '/<img[^>]+>/i', $content, $imgs );
    preg_match_all( '/<h2[^>]*>/i', $content, $h2 );
    preg_match_all( '/<h3[^>]*>/i', $content, $h3 );

    $seo_meta = wpseo_hub_get_seo_meta( $post->ID );

    return array_merge( [
        'id'               => $post->ID,
        'title'            => get_the_title( $post->ID ),
        'type'             => $post->post_type,
        'status'           => $post->post_status,
        'link'             => get_permalink( $post->ID ),
        'slug'             => $post->post_name,
        'date'             => $post->post_date,
        'modified'         => $post->post_modified,
        'word_count'       => $word_count,
        'reading_time_min' => $reading_time,
        'h2_count'         => count( $h2[0] ),
        'h3_count'         => count( $h3[0] ),
        'image_count'      => count( $imgs[0] ),
        'internal_links'   => $internal_links,
        'external_links'   => $external_links,
        'has_featured_img' => has_post_thumbnail( $post->ID ),
        'categories'       => $post->post_type === 'post' ? wp_get_post_categories( $post->ID, [ 'fields' => 'names' ] ) : [],
        'tags'             => $post->post_type === 'post' ? wp_get_post_tags( $post->ID, [ 'fields' => 'names' ] ) : [],
        'author'           => get_the_author_meta( 'display_name', $post->post_author ),
        'comment_count'    => (int) $post->comment_count,
    ], $seo_meta );
}

// ─── ROUTE CALLBACKS ──────────────────────────────────────────────────────────

function wpseo_hub_ping() {
    return [
        'status'     => 'ok',
        'plugin'     => 'wp-seo-hub-connector',
        'version'    => WPSEO_HUB_VERSION,
        'seo_plugin' => wpseo_hub_detect_seo_plugin(),
        'site_url'   => get_site_url(),
    ];
}

function wpseo_hub_get_info() {
    $analytics = wpseo_hub_detect_analytics();
    return [
        'plugin_version'      => WPSEO_HUB_VERSION,
        'site_name'           => get_bloginfo( 'name' ),
        'site_tagline'        => get_bloginfo( 'description' ),
        'site_url'            => get_site_url(),
        'wp_version'          => get_bloginfo( 'version' ),
        'language'            => get_locale(),
        'timezone'            => get_option( 'timezone_string' ) ?: get_option( 'gmt_offset' ),
        'permalink_structure' => get_option( 'permalink_structure' ),
        'seo_plugin'          => wpseo_hub_detect_seo_plugin(),
        'analytics'           => $analytics,
        'total_posts'         => (int) wp_count_posts( 'post' )->publish,
        'total_pages'         => (int) wp_count_posts( 'page' )->publish,
        'total_drafts'        => (int) wp_count_posts( 'post' )->draft + (int) wp_count_posts( 'page' )->draft,
        'generated_at'        => current_time( 'c' ),
    ];
}

function wpseo_hub_get_audit( WP_REST_Request $request ) {
    $status   = $request->get_param( 'status' ) ?: 'any';
    $allowed  = [ 'publish', 'draft', 'private' ];
    $statuses = ( $status === 'any' ) ? $allowed : array_intersect( explode( ',', $status ), $allowed );

    $posts = get_posts([
        'post_type'      => [ 'post', 'page' ],
        'post_status'    => array_values( $statuses ),
        'posts_per_page' => 300,
        'orderby'        => 'modified',
        'order'          => 'DESC',
    ]);

    $items      = array_map( 'wpseo_hub_build_item', $posts );
    $post_items = array_values( array_filter( $items, fn($i) => $i['type'] === 'post' ) );
    $page_items = array_values( array_filter( $items, fn($i) => $i['type'] === 'page' ) );

    return [
        'generated_at' => current_time( 'c' ),
        'seo_plugin'   => wpseo_hub_detect_seo_plugin(),
        'analytics'    => wpseo_hub_detect_analytics(),
        'total'        => count( $items ),
        'posts'        => $post_items,
        'pages'        => $page_items,
        'items'        => $items,
    ];
}

function wpseo_hub_get_content( string $type, WP_REST_Request $request ) {
    $page     = max( 1, $request->get_param( 'page' ) );
    $per_page = min( 100, max( 1, $request->get_param( 'per_page' ) ) );
    $status   = $request->get_param( 'status' );
    $statuses = ( $status === 'any' ) ? [ 'publish', 'draft', 'private' ] : [ $status ];

    $query = new WP_Query([
        'post_type'      => $type,
        'post_status'    => $statuses,
        'posts_per_page' => $per_page,
        'paged'          => $page,
        'orderby'        => 'modified',
        'order'          => 'DESC',
    ]);

    return [
        'total'    => (int) $query->found_posts,
        'pages'    => (int) $query->max_num_pages,
        'page'     => $page,
        'per_page' => $per_page,
        'items'    => array_map( 'wpseo_hub_build_item', $query->posts ),
    ];
}

function wpseo_hub_update_meta( WP_REST_Request $request ) {
    $post_id = $request->get_param( 'post_id' );
    $title   = $request->get_param( 'meta_title' );
    $desc    = $request->get_param( 'meta_desc' );
    $keyword = $request->get_param( 'focus_keyword' );

    if ( ! get_post( $post_id ) )
        return new WP_Error( 'not_found', 'Post not found', [ 'status' => 404 ] );

    $plugin  = wpseo_hub_detect_seo_plugin();
    $updated = [];

    if ( $plugin === 'yoast' || defined( 'WPSEO_VERSION' ) ) {
        if ( $title )   { update_post_meta( $post_id, '_yoast_wpseo_title',    $title );   $updated[] = 'yoast_title'; }
        if ( $desc )    { update_post_meta( $post_id, '_yoast_wpseo_metadesc', $desc );    $updated[] = 'yoast_desc'; }
        if ( $keyword ) { update_post_meta( $post_id, '_yoast_wpseo_focuskw',  $keyword ); $updated[] = 'yoast_kw'; }
    }
    if ( $plugin === 'rankmath' || defined( 'RANK_MATH_VERSION' ) ) {
        if ( $title )   { update_post_meta( $post_id, 'rank_math_title',         $title );   $updated[] = 'rm_title'; }
        if ( $desc )    { update_post_meta( $post_id, 'rank_math_description',   $desc );    $updated[] = 'rm_desc'; }
        if ( $keyword ) { update_post_meta( $post_id, 'rank_math_focus_keyword', $keyword ); $updated[] = 'rm_kw'; }
    }
    if ( $plugin === 'tsf' || defined( 'THE_SEO_FRAMEWORK_VERSION' ) ) {
        if ( $title ) { update_post_meta( $post_id, '_genesis_title',       $title ); $updated[] = 'tsf_title'; }
        if ( $desc )  { update_post_meta( $post_id, '_genesis_description', $desc );  $updated[] = 'tsf_desc'; }
    }

    return [
        'success'       => true,
        'post_id'       => $post_id,
        'plugin'        => $plugin,
        'fields_set'    => $updated,
        'meta_title'    => $title ?: null,
        'meta_desc'     => $desc  ?: null,
        'focus_keyword' => $keyword ?: null,
        'updated_at'    => current_time( 'c' ),
    ];
}

// ─── GSC DATA ────────────────────────────────────────────────────────────────

function wpseo_hub_get_gsc_data( WP_REST_Request $request ) {
    $days      = max( 7, min( 90, (int) ( $request->get_param('days') ?: 28 ) ) );
    $analytics = wpseo_hub_detect_analytics();

    if ( ! $analytics['site_kit'] ) {
        return rest_ensure_response([
            'notAvailable' => true,
            'message'      => 'Google Site Kit is not active on this site. Install and connect it to enable GSC data.',
        ]);
    }
    if ( ! $analytics['gsc_property'] ) {
        return rest_ensure_response([
            'notAvailable' => true,
            'message'      => 'Search Console not connected in Site Kit. Go to Site Kit → Search Console to connect.',
        ]);
    }

    $end_date   = gmdate( 'Y-m-d', strtotime( '-2 days' ) );
    $start_date = gmdate( 'Y-m-d', strtotime( "-{$days} days" ) );

    $result = wpseo_hub_sitekit_http_gsc( $start_date, $end_date );
    if ( ! $result ) $result = wpseo_hub_sitekit_internal_gsc( $start_date, $end_date );
    if ( ! $result ) $result = wpseo_hub_direct_gsc_api( $analytics['gsc_property'], $start_date, $end_date );

    if ( ! $result ) {
        return rest_ensure_response([
            'notAvailable' => true,
            'reason'       => 'auth_failed',
            'message'      => 'GSC data unavailable. Site Kit needs a connected admin user with Search Console auth. Open WP Admin → Site Kit and verify Search Console shows "Connected".',
            'steps'        => [
                'Ensure an admin account is connected to Site Kit (not just installed)',
                'In WP Admin → Site Kit, click "Connect more services" and connect Search Console',
                'If Search Console was recently connected, wait 24h for data to appear',
                'Check WP Admin → Site Kit → Search Console shows data in the dashboard',
            ],
        ]);
    }

    $result['days'] = $days;
    return rest_ensure_response( $result );
}

function wpseo_hub_gsc_status( WP_REST_Request $request ) {
    $analytics = wpseo_hub_detect_analytics();
    $status    = [
        'site_kit_active'   => $analytics['site_kit'],
        'site_kit_version'  => $analytics['site_kit_ver'],
        'gsc_connected'     => ! empty( $analytics['gsc_property'] ),
        'gsc_property'      => $analytics['gsc_property'],
        'ga_id'             => $analytics['ga_id'],
        'admin_users'       => [],
        'can_fetch'         => false,
        'test_result'       => null,
    ];

    if ( ! $analytics['site_kit'] ) {
        $status['issue'] = 'site_kit_not_installed';
        $status['fix']   = 'Install "Site Kit by Google" from wordpress.org/plugins/google-site-kit/';
        return rest_ensure_response( $status );
    }

    if ( ! $analytics['gsc_property'] ) {
        $status['issue'] = 'search_console_not_connected';
        $status['fix']   = 'Go to WP Admin → Site Kit → Connect more services → Search Console';
        return rest_ensure_response( $status );
    }

    $admins = get_users([ 'role' => 'administrator', 'number' => 10, 'fields' => [ 'ID', 'user_login', 'user_email' ] ]);
    foreach ( $admins as $u ) {
        $has_token = false;
        foreach ( [ 'googlesitekit_auth', 'googlesitekit-auth', 'googlesitekit_auth_token' ] as $key ) {
            $raw  = get_user_meta( $u->ID, $key, true );
            $auth = $raw ? ( is_string( $raw ) ? json_decode( $raw, true ) : (array) $raw ) : [];
            if ( ! empty( $auth['access_token'] ) ) { $has_token = true; break; }
        }
        $status['admin_users'][] = [
            'id'        => $u->ID,
            'login'     => $u->user_login,
            'has_token' => $has_token,
        ];
    }

    $end   = gmdate( 'Y-m-d', strtotime( '-2 days' ) );
    $start = gmdate( 'Y-m-d', strtotime( '-9 days' ) );
    $test  = wpseo_hub_sitekit_http_gsc( $start, $end );
    if ( ! $test ) $test = wpseo_hub_sitekit_internal_gsc( $start, $end );

    $status['can_fetch']   = ! empty( $test );
    $status['test_result'] = $test
        ? sprintf( '%d queries fetched', count( $test['topQueries'] ?? [] ) )
        : 'fetch_failed — admin user may not have completed Site Kit auth';

    if ( ! $status['can_fetch'] ) {
        $status['issue'] = 'auth_not_completed';
        $status['fix']   = 'Open WP Admin → Site Kit with an administrator account and complete Google authentication';
    }

    return rest_ensure_response( $status );
}

function wpseo_hub_sitekit_http_gsc( $start_date, $end_date ) {
    if ( ! ( defined( 'GOOGLESITEKIT_VERSION' ) || class_exists( 'Google\\Site_Kit\\Plugin' ) ) ) {
        return null;
    }

    $admin_users = get_users([ 'role' => 'administrator', 'number' => 10, 'orderby' => 'ID', 'order' => 'ASC', 'fields' => [ 'ID' ] ]);
    $original    = get_current_user_id();

    foreach ( $admin_users as $user ) {
        wp_set_current_user( $user->ID );

        if ( ! user_can( $user->ID, 'manage_options' ) ) continue;

        $nonce    = wp_create_nonce( 'wp_rest' );
        $base_url = home_url( '/wp-json/google-site-kit/v1/modules/search-console/data/searchanalytics' );
        $headers  = [ 'X-WP-Nonce' => $nonce, 'Content-Type' => 'application/json' ];

        $query_url = add_query_arg([ 'startDate' => $start_date, 'endDate' => $end_date, 'dimensions' => 'query', 'rowLimit' => 100 ], $base_url );
        $r1 = wp_safe_remote_get( $query_url, [ 'headers' => $headers, 'timeout' => 20, 'sslverify' => apply_filters( 'https_local_ssl_verify', false ) ]);

        if ( is_wp_error( $r1 ) || wp_remote_retrieve_response_code( $r1 ) !== 200 ) continue;

        $query_rows = json_decode( wp_remote_retrieve_body( $r1 ), true );
        if ( ! is_array( $query_rows ) || empty( $query_rows ) ) continue;

        $query_rows = array_map( fn( $row ) => [
            'query'       => $row['keys'][0] ?? $row['query'] ?? '',
            'clicks'      => (int) ( $row['clicks'] ?? 0 ),
            'impressions' => (int) ( $row['impressions'] ?? 0 ),
            'ctr'         => (float) ( $row['ctr'] ?? 0 ),
            'position'    => (float) ( $row['position'] ?? 0 ),
        ], $query_rows );

        $page_url = add_query_arg([ 'startDate' => $start_date, 'endDate' => $end_date, 'dimensions' => 'page', 'rowLimit' => 50 ], $base_url );
        $r2       = wp_safe_remote_get( $page_url, [ 'headers' => $headers, 'timeout' => 20, 'sslverify' => apply_filters( 'https_local_ssl_verify', false ) ]);
        $page_rows = ( ! is_wp_error( $r2 ) && wp_remote_retrieve_response_code( $r2 ) === 200 )
            ? array_map( fn( $row ) => [
                'page'        => $row['keys'][0] ?? $row['page'] ?? '',
                'clicks'      => (int) ( $row['clicks'] ?? 0 ),
                'impressions' => (int) ( $row['impressions'] ?? 0 ),
                'ctr'         => (float) ( $row['ctr'] ?? 0 ),
                'position'    => (float) ( $row['position'] ?? 0 ),
            ], json_decode( wp_remote_retrieve_body( $r2 ), true ) ?? [] )
            : [];

        wp_set_current_user( $original );
        return wpseo_hub_format_gsc_rows( $query_rows, $page_rows, 'site-kit-http' );
    }

    wp_set_current_user( $original );
    return null;
}

function wpseo_hub_sitekit_internal_gsc( $start_date, $end_date ) {
    if ( ! ( defined( 'GOOGLESITEKIT_VERSION' ) || class_exists( 'Google\\Site_Kit\\Plugin' ) ) ) {
        return null;
    }

    $admin_users = get_users([
        'role'    => 'administrator',
        'number'  => 10,
        'orderby' => 'ID',
        'order'   => 'ASC',
        'fields'  => ['ID'],
    ]);

    $original_user = get_current_user_id();
    $query_rows    = null;
    $page_rows     = null;

    foreach ( $admin_users as $user ) {
        wp_set_current_user( $user->ID );

        $req = new WP_REST_Request( 'GET', '/google-site-kit/v1/modules/search-console/data/searchanalytics' );
        $req->set_query_params([
            'startDate'  => $start_date,
            'endDate'    => $end_date,
            'dimensions' => 'query',
            'rowLimit'   => 100,
        ]);

        $res = rest_do_request( $req );

        if ( ! is_wp_error( $res ) && $res->get_status() === 200 ) {
            $data = $res->get_data();
            if ( is_array( $data ) && ! empty( $data ) ) {
                $query_rows = $data;

                $req2 = new WP_REST_Request( 'GET', '/google-site-kit/v1/modules/search-console/data/searchanalytics' );
                $req2->set_query_params([
                    'startDate'  => $start_date,
                    'endDate'    => $end_date,
                    'dimensions' => 'page',
                    'rowLimit'   => 50,
                ]);
                $res2 = rest_do_request( $req2 );
                if ( ! is_wp_error( $res2 ) && $res2->get_status() === 200 ) {
                    $page_rows = $res2->get_data();
                }
                break;
            }
        }
    }

    wp_set_current_user( $original_user );

    if ( ! $query_rows ) return null;

    return wpseo_hub_format_gsc_rows( $query_rows, $page_rows, 'site-kit' );
}

function wpseo_hub_direct_gsc_api( $property, $start_date, $end_date ) {
    $token = null;

    $meta_keys   = [ 'googlesitekit_auth', 'googlesitekit-auth', 'googlesitekit_auth_token' ];
    $admin_users = get_users([ 'role' => 'administrator', 'number' => 10, 'fields' => ['ID'] ]);

    foreach ( $admin_users as $user ) {
        foreach ( $meta_keys as $key ) {
            $raw = get_user_meta( $user->ID, $key, true );
            if ( ! $raw ) continue;
            $auth = is_string( $raw ) ? json_decode( $raw, true ) : (array) $raw;
            if ( empty( $auth['access_token'] ) ) continue;
            $expiry = $auth['token_expiry'] ?? $auth['expires_in'] ?? PHP_INT_MAX;
            if ( (int) $expiry > time() ) {
                $token = $auth['access_token'];
                break 2;
            }
        }
    }

    if ( ! $token ) return null;

    $base_url = 'https://searchconsole.googleapis.com/webmasters/v3/sites/' . rawurlencode( $property ) . '/searchAnalytics/query';
    $headers  = [ 'Authorization' => "Bearer {$token}", 'Content-Type' => 'application/json' ];

    $r1 = wp_remote_post( $base_url, [
        'headers' => $headers,
        'body'    => wp_json_encode([
            'startDate'  => $start_date,
            'endDate'    => $end_date,
            'dimensions' => ['query'],
            'rowLimit'   => 100,
        ]),
        'timeout' => 30,
    ]);
    if ( is_wp_error( $r1 ) || wp_remote_retrieve_response_code( $r1 ) !== 200 ) return null;
    $d1 = json_decode( wp_remote_retrieve_body( $r1 ), true );
    if ( empty( $d1['rows'] ) ) return null;

    $r2 = wp_remote_post( $base_url, [
        'headers' => $headers,
        'body'    => wp_json_encode([
            'startDate'  => $start_date,
            'endDate'    => $end_date,
            'dimensions' => ['page'],
            'rowLimit'   => 50,
        ]),
        'timeout' => 30,
    ]);
    $d2 = ( ! is_wp_error( $r2 ) && wp_remote_retrieve_response_code( $r2 ) === 200 )
        ? json_decode( wp_remote_retrieve_body( $r2 ), true )
        : null;

    $query_rows = array_map( fn($row) => [
        'query'       => $row['keys'][0] ?? '',
        'clicks'      => $row['clicks']      ?? 0,
        'impressions' => $row['impressions']  ?? 0,
        'ctr'         => $row['ctr']          ?? 0,
        'position'    => $row['position']     ?? 0,
    ], $d1['rows'] );

    $page_rows = $d2 ? array_map( fn($row) => [
        'page'        => $row['keys'][0] ?? '',
        'clicks'      => $row['clicks']      ?? 0,
        'impressions' => $row['impressions']  ?? 0,
        'ctr'         => $row['ctr']          ?? 0,
        'position'    => $row['position']     ?? 0,
    ], $d2['rows'] ?? [] ) : [];

    return wpseo_hub_format_gsc_rows( $query_rows, $page_rows, 'direct-api' );
}

function wpseo_hub_format_gsc_rows( $query_rows, $page_rows, $source ) {
    $total_clicks      = 0;
    $total_impressions = 0;
    $sum_ctr           = 0.0;
    $sum_pos           = 0.0;
    $count             = count( $query_rows );

    $top_queries = [];
    foreach ( $query_rows as $row ) {
        $query  = $row['query'] ?? ( isset($row['keys']) ? $row['keys'][0] : '' );
        $clicks = (int)   ( $row['clicks']      ?? 0 );
        $imps   = (int)   ( $row['impressions'] ?? 0 );
        $ctr    = (float) ( $row['ctr']         ?? 0 );
        $pos    = (float) ( $row['position']    ?? 0 );

        $total_clicks      += $clicks;
        $total_impressions += $imps;
        $sum_ctr           += $ctr;
        $sum_pos           += $pos;

        $top_queries[] = [
            'query'       => $query,
            'clicks'      => $clicks,
            'impressions' => $imps,
            'ctr'         => round( $ctr, 4 ),
            'position'    => round( $pos, 1 ),
        ];
    }

    $top_pages = [];
    foreach ( (array) $page_rows as $row ) {
        $raw_page  = $row['page'] ?? ( isset($row['keys']) ? $row['keys'][0] : '' );
        $page_path = parse_url( $raw_page, PHP_URL_PATH ) ?: $raw_page;
        $top_pages[] = [
            'page'        => $page_path,
            'clicks'      => (int)   ( $row['clicks']      ?? 0 ),
            'impressions' => (int)   ( $row['impressions'] ?? 0 ),
            'ctr'         => round( (float) ( $row['ctr']      ?? 0 ), 4 ),
            'position'    => round( (float) ( $row['position'] ?? 0 ), 1 ),
        ];
    }

    return [
        'totalClicks'      => $total_clicks,
        'totalImpressions' => $total_impressions,
        'avgCtr'           => $count > 0 ? round( $sum_ctr / $count, 4 ) : 0,
        'avgPosition'      => $count > 0 ? round( $sum_pos / $count,  1 ) : 0,
        'topQueries'       => $top_queries,
        'topPages'         => $top_pages,
        'source'           => $source,
    ];
}

// ─── CREATE POST ──────────────────────────────────────────────────────────────

function wpseo_hub_create_post( WP_REST_Request $request ) {
    $title   = $request->get_param('title');
    $content = $request->get_param('content');
    $excerpt = $request->get_param('excerpt');
    $slug    = $request->get_param('slug');
    // Restrict to safe statuses — never allow immediate publish via API
    $status  = in_array( $request->get_param('status'), ['draft','future'], true )
               ? $request->get_param('status') : 'draft';

    $post_password  = $request->get_param('post_password') ?: '';
    $comment_status = in_array( $request->get_param('comment_status'), ['open','closed'], true )
                      ? $request->get_param('comment_status') : 'open';

    $args = [
        'post_title'     => $title,
        'post_content'   => $content,
        'post_excerpt'   => $excerpt,
        'post_name'      => $slug,
        'post_status'    => $status,
        'post_type'      => 'post',
        'post_author'    => get_current_user_id() ?: 1,
        'post_password'  => $post_password,
        'comment_status' => $comment_status,
    ];

    $scheduled_iso = $request->get_param('scheduled_date');
    if ( $scheduled_iso ) {
        $ts = strtotime( $scheduled_iso );
        if ( $ts && $ts > time() ) {
            $args['post_date']     = get_date_from_gmt( gmdate( 'Y-m-d H:i:s', $ts ) );
            $args['post_date_gmt'] = gmdate( 'Y-m-d H:i:s', $ts );
            $args['post_status']   = 'future';
        }
    }

    $post_id = wp_insert_post( $args, true );
    if ( is_wp_error( $post_id ) ) {
        return new WP_Error( 'insert_failed', $post_id->get_error_message(), [ 'status' => 500 ] );
    }

    $cat_ids = $request->get_param('category_ids');
    if ( ! empty( $cat_ids ) ) {
        wp_set_post_categories( $post_id, array_map( 'absint', (array) $cat_ids ) );
    }
    $tag_ids = $request->get_param('tag_ids');
    if ( ! empty( $tag_ids ) ) {
        wp_set_post_tags( $post_id, array_map( 'absint', (array) $tag_ids ) );
    }

    $media_id = (int) $request->get_param('featured_media');
    if ( $media_id ) set_post_thumbnail( $post_id, $media_id );

    $meta_title  = $request->get_param('meta_title');
    $meta_desc   = $request->get_param('meta_desc');
    $focus_kw    = $request->get_param('focus_keyword');
    $noindex     = (bool) $request->get_param('noindex');
    $nofollow    = (bool) $request->get_param('nofollow');
    $canonical   = $request->get_param('canonical_url');
    $og_title    = $request->get_param('og_title');
    $og_desc     = $request->get_param('og_description');
    $schema      = $request->get_param('schema_type');
    $tw_title    = $request->get_param('twitter_title');
    $plugin      = wpseo_hub_detect_seo_plugin();

    if ( $plugin === 'yoast' || defined('WPSEO_VERSION') ) {
        if ( $meta_title ) update_post_meta( $post_id, '_yoast_wpseo_title',    $meta_title );
        if ( $meta_desc )  update_post_meta( $post_id, '_yoast_wpseo_metadesc', $meta_desc );
        if ( $focus_kw )   update_post_meta( $post_id, '_yoast_wpseo_focuskw',  $focus_kw );
        update_post_meta( $post_id, '_yoast_wpseo_meta-robots-noindex',  $noindex  ? 1 : 0 );
        update_post_meta( $post_id, '_yoast_wpseo_meta-robots-nofollow', $nofollow ? 1 : 0 );
        if ( $canonical ) update_post_meta( $post_id, '_yoast_wpseo_canonical',              $canonical );
        if ( $og_title )  update_post_meta( $post_id, '_yoast_wpseo_opengraph-title',        $og_title );
        if ( $og_desc )   update_post_meta( $post_id, '_yoast_wpseo_opengraph-description',  $og_desc );
        if ( $tw_title )  update_post_meta( $post_id, '_yoast_wpseo_twitter-title',          $tw_title );
        if ( $schema )    update_post_meta( $post_id, '_yoast_wpseo_schema_page_type',       $schema );
    }
    if ( $plugin === 'rankmath' || defined('RANK_MATH_VERSION') ) {
        if ( $meta_title ) update_post_meta( $post_id, 'rank_math_title',           $meta_title );
        if ( $meta_desc )  update_post_meta( $post_id, 'rank_math_description',     $meta_desc );
        if ( $focus_kw )   update_post_meta( $post_id, 'rank_math_focus_keyword',   $focus_kw );
        if ( $canonical )  update_post_meta( $post_id, 'rank_math_canonical_url',   $canonical );
        if ( $og_title )   update_post_meta( $post_id, 'rank_math_facebook_title',  $og_title );
        if ( $og_desc )    update_post_meta( $post_id, 'rank_math_facebook_description', $og_desc );
        if ( $schema )     update_post_meta( $post_id, 'rank_math_rich_snippet',    $schema );
        $robots = get_post_meta( $post_id, 'rank_math_robots', true ) ?: [];
        if ( ! is_array( $robots ) ) $robots = explode( ',', $robots );
        if ( $noindex )  { if ( ! in_array('noindex',  $robots) ) $robots[] = 'noindex'; }
        else             { $robots = array_diff( $robots, ['noindex'] ); }
        if ( $nofollow ) { if ( ! in_array('nofollow', $robots) ) $robots[] = 'nofollow'; }
        else             { $robots = array_diff( $robots, ['nofollow'] ); }
        update_post_meta( $post_id, 'rank_math_robots', array_values( $robots ) );
    }
    if ( $plugin === 'tsf' || defined('THE_SEO_FRAMEWORK_VERSION') ) {
        if ( $meta_title ) update_post_meta( $post_id, '_genesis_title',         $meta_title );
        if ( $meta_desc )  update_post_meta( $post_id, '_genesis_description',   $meta_desc );
        if ( $canonical )  update_post_meta( $post_id, '_genesis_canonical_uri', $canonical );
        if ( $noindex )    update_post_meta( $post_id, '_genesis_noindex',        1 );
    }

    return [
        'id'         => $post_id,
        'link'       => get_permalink( $post_id ),
        'edit_link'  => get_edit_post_link( $post_id, 'raw' ),
        'status'     => get_post_status( $post_id ),
        'created_at' => current_time( 'c' ),
    ];
}

// ─── CREATE CATEGORY ──────────────────────────────────────────────────────────

function wpseo_hub_create_category( WP_REST_Request $request ) {
    $name = $request->get_param( 'name' );
    $slug = $request->get_param( 'slug' ) ?: sanitize_title( $name );
    $desc = $request->get_param( 'description' );

    $existing = term_exists( $slug, 'category' );
    if ( $existing ) {
        $term = get_term( $existing['term_id'], 'category' );
        return new WP_Error( 'category_exists', 'Category with this slug already exists.', [ 'status' => 409, 'existing' => [ 'id' => $term->term_id, 'name' => $term->name, 'slug' => $term->slug ] ] );
    }

    $result = wp_insert_term( $name, 'category', [
        'slug'        => $slug,
        'description' => $desc,
    ]);

    if ( is_wp_error( $result ) ) {
        return new WP_Error( 'create_failed', $result->get_error_message(), [ 'status' => 500 ] );
    }

    $term = get_term( $result['term_id'], 'category' );
    return rest_ensure_response([
        'id'          => $term->term_id,
        'name'        => $term->name,
        'slug'        => $term->slug,
        'description' => $term->description,
        'link'        => get_category_link( $term->term_id ),
    ]);
}

// ─── UPLOAD MEDIA ─────────────────────────────────────────────────────────────

function wpseo_hub_upload_media( WP_REST_Request $request ) {
    require_once ABSPATH . 'wp-admin/includes/image.php';
    require_once ABSPATH . 'wp-admin/includes/file.php';
    require_once ABSPATH . 'wp-admin/includes/media.php';

    $files = $request->get_file_params();
    if ( empty( $files['file'] ) ) {
        return new WP_Error( 'no_file', 'No file in request. Send as multipart/form-data with field name "file".', [ 'status' => 400 ] );
    }

    $file = $files['file'];

    // Restrict to safe image MIME types only
    $allowed_types = [ 'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/avif', 'image/svg+xml' ];
    $finfo         = finfo_open( FILEINFO_MIME_TYPE );
    $detected_type = finfo_file( $finfo, $file['tmp_name'] );
    finfo_close( $finfo );

    if ( ! in_array( $detected_type, $allowed_types, true ) ) {
        return new WP_Error( 'invalid_type', 'Only image files are allowed (JPEG, PNG, GIF, WebP, AVIF, SVG).', [ 'status' => 415 ] );
    }

    $uploaded = wp_handle_upload( $file, [ 'test_form' => false, 'mimes' => array_fill_keys( $allowed_types, true ) ] );

    if ( isset( $uploaded['error'] ) ) {
        return new WP_Error( 'upload_failed', $uploaded['error'], [ 'status' => 500 ] );
    }

    $attachment = [
        'post_mime_type' => $uploaded['type'],
        'post_title'     => sanitize_file_name( pathinfo( $uploaded['file'], PATHINFO_FILENAME ) ),
        'post_content'   => '',
        'post_status'    => 'inherit',
    ];

    $attach_id = wp_insert_attachment( $attachment, $uploaded['file'] );
    if ( is_wp_error( $attach_id ) ) {
        return new WP_Error( 'attach_failed', $attach_id->get_error_message(), [ 'status' => 500 ] );
    }

    $meta = wp_generate_attachment_metadata( $attach_id, $uploaded['file'] );
    wp_update_attachment_metadata( $attach_id, $meta );

    return [
        'id'   => $attach_id,
        'url'  => $uploaded['url'],
        'type' => $uploaded['type'],
        'file' => basename( $uploaded['file'] ),
    ];
}

// ─── UPDATE CATEGORY ──────────────────────────────────────────────────────────

function wpseo_hub_update_category( WP_REST_Request $request ) {
    $id   = $request->get_param( 'category_id' );
    $term = get_term( $id, 'category' );

    if ( ! $term || is_wp_error( $term ) )
        return new WP_Error( 'not_found', 'Category not found', [ 'status' => 404 ] );

    $args = [];
    $name = $request->get_param( 'name' );
    $slug = $request->get_param( 'slug' );
    $desc = $request->get_param( 'description' );

    if ( $name ) $args['name']        = $name;
    if ( $slug ) $args['slug']        = $slug;
    if ( $desc ) $args['description'] = $desc;

    if ( empty( $args ) )
        return new WP_Error( 'no_changes', 'No fields to update', [ 'status' => 400 ] );

    $result = wp_update_term( $id, 'category', $args );

    if ( is_wp_error( $result ) )
        return new WP_Error( 'update_failed', $result->get_error_message(), [ 'status' => 500 ] );

    $updated = get_term( $result['term_id'], 'category' );
    return rest_ensure_response([
        'id'          => $updated->term_id,
        'name'        => $updated->name,
        'slug'        => $updated->slug,
        'description' => $updated->description,
        'updated_at'  => current_time( 'c' ),
    ]);
}

// ─── PLUGINS STATUS ───────────────────────────────────────────────────────────

function wpseo_hub_plugins_status() {
    return rest_ensure_response([
        'yoast'               => defined( 'WPSEO_VERSION' ),
        'rankmath'            => defined( 'RANK_MATH_VERSION' ),
        'tsf'                 => defined( 'THE_SEO_FRAMEWORK_VERSION' ),
        'aioseo'              => defined( 'AIOSEO_VERSION' ),
        'site-kit'            => defined( 'GOOGLESITEKIT_VERSION' ) || class_exists( 'Google\\Site_Kit\\Plugin' ),
        'wp-rocket'           => defined( 'WP_ROCKET_VERSION' ),
        'w3-total-cache'      => defined( 'W3TC' ),
        'smush'               => class_exists( 'WP_Smush' ) || class_exists( 'Smush\\Core\\Core' ),
        'schema-pro'          => class_exists( 'BSF_AIOSRS_Pro' ) || class_exists( 'Schema_Pro' ),
        'redirection'         => class_exists( 'Redirection' ) || class_exists( 'Red_Plugin' ),
        'broken-link-checker' => class_exists( 'BLC_Core' ) || function_exists( 'blc_load_modules' ),
        'monsterinsights'     => defined( 'MONSTERINSIGHTS_VERSION' ),
        'woocommerce'         => defined( 'WC_VERSION' ),
        'elementor'           => defined( 'ELEMENTOR_VERSION' ),
        'wpforms'             => defined( 'WPFORMS_VERSION' ),
        'contact-form-7'      => defined( 'WPCF7_VERSION' ),
        'ithemes-security'    => defined( 'ITSEC_CORE_VERSION' ),
        'wordfence'           => class_exists( 'wordfence' ),
    ]);
}

// ─── ADMIN PAGE ───────────────────────────────────────────────────────────────

add_action( 'admin_menu', function() {
    add_options_page( 'WPSeoHub Connector', 'WPSeoHub Connector', 'manage_options', 'wp-seo-hub-connector', 'wpseo_hub_admin_page' );
});

function wpseo_hub_admin_page() {
    $plugin    = wpseo_hub_detect_seo_plugin();
    $analytics = wpseo_hub_detect_analytics();
    $api_base  = get_site_url() . '/wp-json/' . WPSEO_HUB_NS;
    $api_token = wpseo_hub_get_api_token();

    $plugin_labels = [
        'yoast'    => 'Yoast SEO'         . ( defined('WPSEO_VERSION')              ? ' v' . WPSEO_VERSION           : '' ),
        'rankmath' => 'RankMath'           . ( defined('RANK_MATH_VERSION')          ? ' v' . RANK_MATH_VERSION        : '' ),
        'tsf'      => 'The SEO Framework'  . ( defined('THE_SEO_FRAMEWORK_VERSION')  ? ' v' . THE_SEO_FRAMEWORK_VERSION : '' ),
        'aioseo'   => 'All in One SEO'     . ( defined('AIOSEO_VERSION')             ? ' v' . AIOSEO_VERSION           : '' ),
        'none'     => 'None detected',
    ];
    ?>
    <style>
        .hub-wrap{max-width:780px;padding:20px 0}
        .hub-header{display:flex;align-items:center;gap:14px;margin-bottom:24px;padding-bottom:16px;border-bottom:2px solid #2563EB}
        .hub-logo{width:44px;height:44px;background:linear-gradient(135deg,#2563EB,#1D4ED8);border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
        .hub-status{display:inline-block;padding:3px 10px;border-radius:20px;font-size:12px;font-weight:600}
        .hub-ok{background:#EFF6FF;color:#1D4ED8}
        .hub-warn{background:#FFFBEB;color:#D48A00}
        .hub-none{background:#f5f5f5;color:#888}
        .hub-endpoint{background:#F8FAFC;border:1px solid #E2E8F0;border-radius:6px;padding:12px 16px;font-family:monospace;font-size:12px;color:#0F172A;word-break:break-all;margin-bottom:8px}
        .hub-table th{width:180px;font-weight:500;vertical-align:top;padding-top:12px}
        code{background:#EFF6FF;padding:2px 6px;border-radius:4px;font-size:12px;color:#1D4ED8}
        .new-badge{background:#EFF6FF;color:#1D4ED8;border:1px solid #BFDBFE;border-radius:10px;padding:1px 7px;font-size:10px;vertical-align:middle;margin-left:4px}
    </style>
    <div class="hub-wrap">
        <div class="hub-header">
            <div class="hub-logo">
                <svg width="22" height="22" viewBox="0 0 20 20" fill="none">
                    <path d="M3 5h14M3 10h9M3 15h12" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/>
                </svg>
            </div>
            <div>
                <h1 style="margin:0;font-size:20px;color:#0F172A">WPSeoHub Connector</h1>
                <p style="margin:2px 0 0;color:#64748B;font-size:13px">by <a href="https://github.com/konkomaji" target="_blank" style="color:#2563EB">Konko Maji</a> — v<?php echo WPSEO_HUB_VERSION ?></p>
            </div>
            <span class="hub-status hub-ok" style="margin-left:auto">✓ Active</span>
        </div>

        <h2 style="font-size:15px;margin-bottom:12px;color:#0F172A">Connection Status</h2>
        <table class="hub-table" style="width:100%;border-collapse:collapse">
            <tr style="border-bottom:1px solid #F0F4F8">
                <th>SEO Plugin</th>
                <td style="padding:10px 0">
                    <?php if ($plugin !== 'none'): ?>
                        <span class="hub-status hub-ok">✓ <?php echo esc_html($plugin_labels[$plugin]) ?></span>
                    <?php else: ?>
                        <span class="hub-status hub-warn">⚠ No SEO plugin detected</span>
                        <div style="margin-top:6px;font-size:12px;color:#64748B">Install Yoast SEO or RankMath for full meta data in the hub.</div>
                    <?php endif ?>
                </td>
            </tr>
            <tr style="border-bottom:1px solid #F0F4F8">
                <th>Google Site Kit</th>
                <td style="padding:10px 0">
                    <?php if ($analytics['site_kit']): ?>
                        <span class="hub-status hub-ok">✓ Active <?php echo $analytics['site_kit_ver'] ? 'v'.$analytics['site_kit_ver'] : '' ?></span>
                        <?php if ($analytics['ga_id']): ?> &nbsp;<code><?php echo esc_html($analytics['ga_id']) ?></code><?php endif ?>
                        <?php if ($analytics['gsc_property']): ?>
                            &nbsp;<code>GSC: <?php echo esc_html($analytics['gsc_property']) ?></code>
                            <span class="hub-status hub-ok" style="margin-left:6px">GSC data endpoint ready</span>
                        <?php else: ?>
                            <div style="margin-top:6px;font-size:12px;color:#DC2626">Search Console not connected in Site Kit — go to Site Kit → Search Console to connect.</div>
                        <?php endif ?>
                    <?php else: ?>
                        <span class="hub-status hub-none">Not installed</span>
                        <div style="margin-top:6px;font-size:12px;color:#64748B">
                            <a href="https://wordpress.org/plugins/google-site-kit/" target="_blank" style="color:#2563EB">Install Site Kit</a> and connect Search Console to enable GSC performance data in WPSeoHub.
                        </div>
                    <?php endif ?>
                </td>
            </tr>
            <?php if ($analytics['gtm_id']): ?>
            <tr style="border-bottom:1px solid #F0F4F8">
                <th>Google Tag Manager</th>
                <td style="padding:10px 0">
                    <span class="hub-status hub-ok">✓ Detected</span> &nbsp;<code><?php echo esc_html($analytics['gtm_id']) ?></code>
                </td>
            </tr>
            <?php endif ?>
            <tr>
                <th style="vertical-align:middle">Site URL</th>
                <td style="padding:10px 0"><code><?php echo esc_html(get_site_url()) ?></code></td>
            </tr>
        </table>

        <?php if ( isset($_GET['regenerated']) ): ?>
        <div class="notice notice-success inline" style="padding:8px 14px;margin-bottom:16px"><p>Token regenerated. Update the token in WPSeoHub → Clients.</p></div>
        <?php endif ?>

        <h2 style="font-size:15px;margin:24px 0 12px;color:#0F172A">API Token</h2>
        <p style="font-size:13px;color:#475569;margin-bottom:8px">Paste this token into <strong>WPSeoHub → Clients → Edit → API Token</strong>. No WordPress username or password needed.</p>
        <div style="display:flex;gap:8px;align-items:center;margin-bottom:12px">
            <div class="hub-endpoint" style="flex:1;margin:0;font-size:13px;letter-spacing:0.04em"><?php echo esc_html($api_token) ?></div>
            <button onclick="navigator.clipboard.writeText('<?php echo esc_js($api_token) ?>');this.textContent='Copied!';setTimeout(()=>this.textContent='Copy Token',1500)"
                style="padding:9px 14px;background:#2563EB;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:12px;white-space:nowrap;font-weight:600">Copy Token</button>
        </div>
        <form method="post" action="<?php echo esc_url(admin_url('admin-post.php')) ?>" style="margin-bottom:24px">
            <input type="hidden" name="action" value="wpseo_hub_regenerate_token">
            <?php wp_nonce_field('wpseo_hub_regen_token') ?>
            <button type="submit" style="font-size:12px;color:#DC2626;background:none;border:1px solid #FECACA;padding:6px 12px;border-radius:6px;cursor:pointer" onclick="return confirm('Regenerate token? Update it in all hub client settings.')">
                Regenerate Token
            </button>
        </form>

        <h2 style="font-size:15px;margin:24px 0 12px;color:#0F172A">API Base URL</h2>
        <div class="hub-endpoint"><?php echo esc_html($api_base) ?></div>

        <h2 style="font-size:15px;margin:24px 0 12px;color:#0F172A">Endpoints</h2>
        <table class="widefat striped" style="font-size:13px">
            <thead><tr><th>Method</th><th>Path</th><th>Auth</th><th>Description</th></tr></thead>
            <tbody>
                <tr><td>GET</td><td><code>/ping</code></td><td>Public</td><td>Health check, plugin detection</td></tr>
                <tr><td>GET</td><td><code>/info</code></td><td>Token</td><td>Site info, plugin versions, GA / GSC IDs</td></tr>
                <tr><td>GET</td><td><code>/audit</code></td><td>Token</td><td>Full SEO audit — all posts &amp; pages with rich meta</td></tr>
                <tr><td>GET</td><td><code>/posts</code></td><td>Token</td><td>Posts with full SEO meta (paginated)</td></tr>
                <tr><td>GET</td><td><code>/pages</code></td><td>Token</td><td>Pages with full SEO meta</td></tr>
                <tr><td>POST</td><td><code>/update-meta</code></td><td>Token</td><td>Push meta title, description &amp; keyword from hub</td></tr>
                <tr><td>GET</td><td><code>/gsc-data</code></td><td>Token</td><td>GSC performance data via Site Kit (clicks, impressions, CTR, positions)</td></tr>
                <tr><td>POST</td><td><code>/create-post</code></td><td>Token</td><td>Create a WordPress post/draft with full SEO meta. Supports scheduled publishing.</td></tr>
                <tr><td>POST</td><td><code>/upload-media</code></td><td>Token</td><td>Upload image to media library. Send as <code>multipart/form-data</code> with field <code>file</code>.</td></tr>
                <tr><td>POST</td><td><code>/create-category</code></td><td>Token</td><td>Create a new post category</td></tr>
                <tr><td>POST</td><td><code>/update-category</code></td><td>Token</td><td>Update an existing category name, slug, or description</td></tr>
                <tr><td>GET</td><td><code>/plugins-status</code></td><td>Token</td><td>Detect which SEO / analytics / utility plugins are active</td></tr>
            </tbody>
        </table>

        <h2 style="font-size:15px;margin:24px 0 12px;color:#0F172A">Quick Setup</h2>
        <ol style="line-height:2;font-size:13px;color:#475569">
            <li>Copy the API token above</li>
            <li>Open WPSeoHub → Clients → Add Client</li>
            <li>Enter site URL: <code><?php echo esc_html(get_site_url()) ?></code></li>
            <li>Paste the token into the <strong>API Token</strong> field</li>
            <li>Click "Test Connection" — hub auto-detects this plugin</li>
            <li>SEO Auditor → Run Audit → Analyse with Claude for AI-powered recommendations</li>
        </ol>

        <p style="margin-top:24px;font-size:12px;color:#94A3B8">
            WPSeoHub is open-source software created by <a href="https://github.com/konkomaji" target="_blank" style="color:#2563EB">Konko Maji</a> and Claude.
            <a href="https://github.com/konkomaji/wp-seo-hub" target="_blank" style="color:#2563EB">GitHub</a> · MIT License
        </p>
    </div>
    <?php
}

add_action( 'admin_post_wpseo_hub_regenerate_token', function() {
    check_admin_referer( 'wpseo_hub_regen_token' );
    if ( ! current_user_can( 'manage_options' ) ) wp_die( 'Unauthorized' );
    update_option( 'wpseo_hub_api_token', bin2hex( random_bytes( 24 ) ) );
    wp_redirect( admin_url( 'options-general.php?page=wp-seo-hub-connector&regenerated=1' ) );
    exit;
});

add_filter( 'plugin_action_links_' . plugin_basename( WPSEO_HUB_PLUGIN_FILE ), function( $links ) {
    $links[] = '<a href="' . esc_url( admin_url('options-general.php?page=wp-seo-hub-connector') ) . '">Settings</a>';
    return $links;
});

register_activation_hook( WPSEO_HUB_PLUGIN_FILE, function() {
    set_transient( 'wpseo_hub_activated', true, 30 );
});

add_action( 'admin_notices', function() {
    if ( ! get_transient( 'wpseo_hub_activated' ) ) return;
    delete_transient( 'wpseo_hub_activated' );
    $url = admin_url( 'options-general.php?page=wp-seo-hub-connector' );
    echo '<div class="notice notice-success is-dismissible"><p>
        <strong>WPSeoHub Connector activated!</strong>
        <a href="' . esc_url($url) . '">View connection details &rarr;</a>
    </p></div>';
});
