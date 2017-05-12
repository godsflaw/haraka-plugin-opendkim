[![Build Status][ci-img]][ci-url]
[![Code Coverage][cov-img]][cov-url]
[![Code Climate][clim-img]][clim-url]
[![NPM][npm-img]][npm-url]
[![Greenkeeper badge](https://badges.greenkeeper.io/godsflaw/haraka-plugin-opendkim.svg)](https://greenkeeper.io/)

# haraka-plugin-opendkim

Adds DKIM support from the libopendkim library to Haraka.

# Enable

add `opendkim` to `config/plugins`, near the top of the file.

## Configuration

`config/opendkim.ini` is the configuration file for this plugin.

Sane defaults are chosen for you.

* `opendkim.general.debug` (default: 0)

  Enable debug logging for all opendkim.general flows.


* `opendkim.verify.debug` (default: 0)

  Enable debug logging for all opendkim.verify flows.  If general debug is set,
  this will fall back to that rather than the default.


* `opendkim.sign.debug` (default: 0)

  Enable debug logging for all opendkim.sign flows.


[ci-img]: https://travis-ci.org/godsflaw/haraka-plugin-opendkim.svg
[ci-url]: https://travis-ci.org/godsflaw/haraka-plugin-opendkim
[cov-img]: https://codecov.io/github/godsflaw/haraka-plugin-opendkim/coverage.svg
[cov-url]: https://codecov.io/github/godsflaw/haraka-plugin-opendkim
[clim-img]: https://codeclimate.com/github/godsflaw/haraka-plugin-opendkim/badges/gpa.svg
[clim-url]: https://codeclimate.com/github/godsflaw/haraka-plugin-opendkim
[npm-img]: https://nodei.co/npm/haraka-plugin-opendkim.png
[npm-url]: https://www.npmjs.com/package/haraka-plugin-opendkim
