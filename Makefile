
BABEL = babel
BABEL_FLAGS = --presets es2015 --source-maps true

UGLIFY = node_modules/uglifyjs/bin/uglifyjs
UGLIFY_FLAGS = --mangle --compress

MOCHA = node_modules/mocha/bin/mocha

RM = rm

all: lib/region1d.js

debug: lib/region1d.debug.js lib/region2d.debug.js

clean:
	$(RM) -rf lib/* imd/*

test: debug
	$(MOCHA) test/region2d.tests.js

lib/region1d.js lib/region1d.js.map: imd/src/region1d.js imd/src/region1d.js.map
	$(UGLIFY) $(UGLIFY_FLAGS) --output lib/region1d.js --in-source-map imd/src/region1d.js.map --source-map lib/region1d.js.map -- $<

imd/src/region1d.js: src/region1d.js
	$(BABEL) $(BABEL_FLAGS) --out-dir imd -- $<

imd/src/region2d.js: src/region2d.js
	$(BABEL) $(BABEL_FLAGS) --out-dir imd -- $<

lib/region1d.debug.js lib/region1d.debug.js.map: imd/src/region1d.js imd/src/region1d.js.map
	sed -e 's/region1d\.js/region1d\.debug\.js/' imd/src/region1d.js > lib/region1d.debug.js
	cp imd/src/region1d.js.map lib/region1d.debug.js.map

lib/region2d.debug.js lib/region2d.debug.js.map: imd/src/region2d.js imd/src/region2d.js.map lib/region1d.js
	sed -e 's/region2d\.js/region2d\.debug\.js/' imd/src/region2d.js > lib/region2d.debug.js
	cp imd/src/region2d.js.map lib/region2d.debug.js.map

