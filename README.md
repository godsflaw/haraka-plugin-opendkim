[![Codefresh build status][cf-img]][cf-url]
[![NPM][npm-img]][npm-url]

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


[cf-img]: https://g.codefresh.io/api/badges/build?repoOwner=godsflaw&repoName=haraka-plugin-opendkim&branch=dev&pipelineName=haraka-plugin-opendkim&accountName=godsflaw&type=cf-1
[cf-url]: https://g.codefresh.io/repositories/godsflaw/haraka-plugin-opendkim/builds?filter=trigger:build;branch:dev;service:59d4f41489854200012ede9b~haraka-plugin-opendkim
[npm-img]: https://nodei.co/npm/haraka-plugin-opendkim.png
[npm-url]: https://www.npmjs.com/package/haraka-plugin-opendkim
