# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.2] - 2026-06-30

- Refactor changelog update logic to build entry body without parameters and improve Unreleased section handling. Add syncPublicChangelogs function call to ensure public changelogs are updated.
- Update version to 1.2.1, enhance default source settings, add random archive option, improve detection for Cover blocks, and include German translation tooling.

## [1.2.1] - 2026-06-30

- Default archive image source is now **Disabled**
- Added **Random from entire archive**
- **First listed post** skips posts without a featured image
- Improved detection for Cover blocks inside **Post Template**
- Invalid source values fall back to **Disabled**
- Added PHPCS / Composer lint setup
- Added translation and release tooling with German (`de_DE`) catalog

## [1.2.0] - 2026-06-11

- Added **Disabled** image source option for covers with inner Query Loops
- Fixed global post timing so inner blocks inside a Cover are not affected
- Wrapped Cover render callback for safer featured image resolution

[1.2.0]: https://github.com/gbyat/we-cover-featured-everywhere/releases/tag/v1.2.0

[1.2.1]: https://github.com/gbyat/we-cover-featured-everywhere/releases/tag/v1.2.1

[1.2.2]: https://github.com/gbyat/we-cover-featured-everywhere/releases/tag/v1.2.2
