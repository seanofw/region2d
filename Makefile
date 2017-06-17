
BABEL = babel

UGLIFY = node_modules/uglifyjs/bin/uglifyjs
UGLIFY_FLAGS = --mangle --compress

MOCHA = node_modules/mocha/bin/mocha

WEBPACK = webpack

RM = rm

all: lib plain demo

clean:
	$(RM) -rf lib/* plain/* demo/bundle/* coverage

test: lib
	pushd test; ../$(MOCHA) *.tests.js; popd

coverage: lib
	istanbul cover node_modules/mocha/bin/_mocha -- test/*.tests.js

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

lib/%.min.js lib/%.min.js.map: lib/%.js lib/%.js.map
	$(UGLIFY) $(UGLIFY_FLAGS) --output lib/$*.min.js --in-source-map lib/$*.js.map --source-map lib/$*.min.js.map -- $<

lib/%.js lib/%.js.map: src/%.js
	mkdir -p lib; pushd src; $(BABEL) --sourceRoot . --out-dir ../lib --source-maps -- $*.js; popd

demo: demo/bundle/demo.js

demo/bundle/demo.js: demo/src/demo.js
	$(WEBPACK)

