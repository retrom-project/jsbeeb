# Retrom browser candidate

`make pfb-core-build CORE=jsbeeb` calls `.github/rpg-runtime/build-candidate.sh`
with an empty output directory. The script uses Node 24 from the owning PFB,
builds jsbeeb, and emits deterministic `jsbeeb-site.tar.gz`, `source.tar.gz`,
`LICENSE`, and `retrom-core-candidate.json` files.

The site archive contains the browser program and its interface assets.
It deliberately excludes `public/roms`, `public/discs`, `public/tapes`,
`public/teletext`, and `public/econet`. The upstream ROM readme says the ROMs
are still copyrighted and are not under the project's GPL license. Retrom
must provide the user's BBC ROMs and selected disk through its content and
BIOS inputs. No included game or ROM should be published as a Provider asset.

The page exposes `window.RetromJsbeeb` only with `?retrom=1`. Its checkpoint
is jsbeeb's versioned snapshot compressed with gzip. Media from `blob:` URLs
is embedded in the checkpoint so a fresh instance can restore without a
stale object URL. The Provider adapter must bind the checkpoint to the same
game and reject empty or oversized data.
