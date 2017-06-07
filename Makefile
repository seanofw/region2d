
BABEL = babel

UGLIFY = node_modules/uglifyjs/bin/uglifyjs
UGLIFY_FLAGS = --mangle --compress

MOCHA = node_modules/mocha/bin/mocha

WEBPACK = webpack

RM = rm

all: lib plain demo

clean:
	$(RM) -rf lib/* imd/* plain/* demo/bundle/*

test: debug
	$(MOCHA) test/region1d.tests.js test/region2d.tests.js

coverage: lib
	istanbul cover node_modules/mocha/bin/_mocha -- -R spec

lib: lib/region1d.js lib/region1d.js.map \
	lib/region2d.js lib/region2d.js.map \
	lib/region1d.min.js lib/region1d.min.js.map \
	lib/region2d.min.js lib/region2d.min.js.map

plain: plain/region2d.js plain/region2d.min.js

plain/region2d.js:
	mkdir -p plain
	cat src/region1d.js src/region2d.js | sed -re 's/^\s*(export|import).*$$//' | $(BABEL) --presets stage-2,es2015 --out-file plain/region2d.js

plain/region2d.min.js: plain/region2d.js
	mkdir -p plain
	$(UGLIFY) $(UGLIFY_FLAGS) --output plain/region2d.min.js -- $<

lib/%.min.js lib/%.min.js.map: imd/src/%.js imd/src/%.js.map
	$(UGLIFY) $(UGLIFY_FLAGS) --output lib/$*.min.js --in-source-map imd/src/$*.js.map --source-map lib/$*.min.js.map -- $<

imd/%.js imd/%.js.map: %.js
	mkdir -p imd
	$(BABEL) --out-dir imd --source-maps -- $<

lib/%: imd/src/%
	mkdir -p lib
	cp $< $@

demo: demo/bundle/demo.js

demo/bundle/demo.js: demo/src/demo.js
	$(WEBPACK)

