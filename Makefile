
BABEL = babel
BABEL_FLAGS = --presets es2015 --source-maps true

UGLIFY = node_modules/uglifyjs/bin/uglifyjs
UGLIFY_FLAGS = --mangle --compress

MOCHA = node_modules/mocha/bin/mocha

RM = rm

all: lib/region.js

debug: lib/region.debug.js

clean:
	$(RM) -rf lib/* imd/*

test: debug
	$(MOCHA) test/region1d.tests.js

lib/region.js lib/region.js.map: imd/src/region1d.js imd/src/region1d.js.map
	$(UGLIFY) $(UGLIFY_FLAGS) --output lib/region.js --in-source-map imd/src/region1d.js.map --source-map lib/region1d.js.map -- $<

imd/src/region1d.js: src/region1d.js
	$(BABEL) $(BABEL_FLAGS) --out-dir imd -- $<

lib/region.debug.js lib/region.debug.js.map: imd/src/region1d.js imd/src/region1d.js.map
	cp imd/src/region1d.js lib/region.debug.js
	cp imd/src/region1d.js.map lib/region.debug.js.map


