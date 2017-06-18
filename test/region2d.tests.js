
var assert = require('assert');

var Region2D = require('../lib/region2d.js').default;

var
	/**
	 * Construct a rectangle object from an array of minima/maxima, where
	 * the array consists of sequences of four values, minX, minY, maxX, and maxY,
	 * starting at the optional array index i.  Returns the new rectangle object.
	 */
	makeRect = function(array, i) {
		i = i || 0;
		return {
			x: array[i], y: array[i+1],
			width: array[i+2]-array[i], height: array[i+3]-array[i+1],
			left: array[i], top: array[i+1],
			right: array[i+2], bottom: array[i+3],
		};
	},

	/**
	 * Construct a series of rectangle objects from an array of minima/maxima, where
	 * the array consists of sequences of four values, minX, minY, maxX, and maxY.
	 * Returns a new array of rectangle objects.
	 */
	makeRects = function(array) {
		var result = [];
		for (var i = 0, l = array.length; i < l; i += 4) {
			result.push(makeRect(array, i));
		}
		return result;
	},
	
	nInf = Number.NEGATIVE_INFINITY,
	pInf = Number.POSITIVE_INFINITY;

describe('Region2D', function() {

	//---------------------------------------------------------------------------------------------
	// new()

	describe('new()', function() {
		it('can create empty regions', function() {
			var region = new Region2D();
			assert.deepEqual(region.getRects(), []);
		});
		it('can create rectangular regions from a four-valued array', function() {
			var region = new Region2D([5, 6, 20, 30]);
			assert.deepEqual(region.getRects(), makeRects([5, 6, 20, 30]));
			assert.deepEqual(region.getBounds(), makeRect([5, 6, 20, 30]));
		});
		it('can create rectangular regions from an object with x/y/width/height', function() {
			var region = new Region2D({ x: 5, y: 6, width: 15, height: 24 });
			assert.deepEqual(region.getRects(), makeRects([5, 6, 20, 30]));
			assert.deepEqual(region.getBounds(), makeRect([5, 6, 20, 30]));
		});
		it('can create rectangular regions from an object with left/top/right/bottom', function() {
			var region = new Region2D({ left: 5, top: 6, right: 20, bottom: 30 });
			assert.deepEqual(region.getRects(), makeRects([5, 6, 20, 30]));
			assert.deepEqual(region.getBounds(), makeRect([5, 6, 20, 30]));
		});

		it('can create rectangular regions from an HTMLElement', function() {
			// Make a fake HTMLElement prototype we can instantiate.
			HTMLElement = function(x, y, width, height) {
				this.x = x, this.y = y, this.width = width, this.height = height;
			};
			HTMLElement.prototype = {
				getBoundingClientRect: function() {
					return { left: this.x, top: this.y, right: this.x + this.width, bottom: this.y + this.height };
				}
			};

			// Make a fake Window object.
			window = {
				scrollX: 0,
				scrollY: 0
			};

			// Now create a region from an "HTMLElement".
			var region = new Region2D(new HTMLElement(5, 6, 15, 24));

			assert.deepEqual(region.getRects(), makeRects([5, 6, 20, 30]));
			assert.deepEqual(region.getBounds(), makeRect([5, 6, 20, 30]));
		});

		it('will not create regions from arrays of the wrong length', function() {
			assert.throws(function() { new Region2D([]); });
			assert.throws(function() { new Region2D([1]); });
			assert.throws(function() { new Region2D([1, 2]); });
			assert.throws(function() { new Region2D([1, 2, 3]); });
			//assert.throws(function() { new Region2D([1, 2, 3, 4]); });  // Four is the only one that's okay.
			assert.throws(function() { new Region2D([1, 2, 3, 4, 5]); });
			assert.throws(function() { new Region2D([1, 2, 3, 4, 5, 6]); });
		});

		it('will not create regions from rectangles of negative width', function() {
			assert.throws(function() { new Region2D([3, 2, 1, 4]); });
			assert.throws(function() { new Region2D({ left: 3, top: 2, right: 1, bottom: 4 }); });
			assert.throws(function() { new Region2D({ x: 3, y: 2, width: -2, height: 2 }); });
		});

		it('will not create regions from rectangles of negative height', function() {
			assert.throws(function() { new Region2D([1, 4, 3, 2]); });
			assert.throws(function() { new Region2D({ left: 1, top: 3, right: 4, bottom: 2 }); });
			assert.throws(function() { new Region2D({ x: 1, y: 4, width: 2, height: -2 }); });
		});

		it('will not create regions from objects that don\'t look like rectangles', function() {
			assert.throws(function() { new Region2D({ glorp: 1, gleep: 3, frop: 4, boo: 2 }); });
		});
	});

	//---------------------------------------------------------------------------------------------
	// #union()

	describe('#union()', function() {
		it('can combine two rectangular regions, with an above/below relationship', function() {
			//   1234567
			// 1
			// 2 BBBB
			// 3 BBBB
			// 4 ****
			// 5 ****
			// 6 AAAA
			// 7 AAAA
			// 8
			var a = new Region2D([1, 4, 5, 8]);
			var b = new Region2D([1, 2, 5, 6]);
			var result = a.union(b);
			assert.deepEqual(result.getRects(), makeRects([
				1, 2, 5, 8,
			]));

			// Invert them.
			var b = new Region2D([1, 2, 5, 6]);
			var a = new Region2D([1, 4, 5, 8]);
			var result = a.union(b);
			assert.deepEqual(result.getRects(), makeRects([
				1, 2, 5, 8,
			]));
		});

		it('can combine two rectangular regions, with a left/right relationship', function() {
			//   1234567
			// 1
			// 2 AA**BB
			// 3 AA**BB
			// 4 AA**BB
			// 5 AA**BB
			// 6
			// 7
			// 8
			var a = new Region2D([1, 2, 5, 6]);
			var b = new Region2D([3, 2, 7, 6]);
			var result = a.union(b);
			assert.deepEqual(result.getRects(), makeRects([
				1, 2, 7, 6,
			]));

			// Invert them.
			var a = new Region2D([3, 2, 7, 6]);
			var b = new Region2D([1, 2, 5, 6]);
			var result = a.union(b);
			assert.deepEqual(result.getRects(), makeRects([
				1, 2, 7, 6,
			]));
		});

		it('can combine two rectangular regions, with an above-left relationship', function() {
			//   1234567
			// 1
			// 2 BBBB
			// 3 BBBB
			// 4 BB**AA
			// 5 BB**AA
			// 6   AAAA
			// 7   AAAA
			// 8
			var a = new Region2D([3, 4, 7, 8]);
			var b = new Region2D([1, 2, 5, 6]);
			var result = a.union(b);
			assert.deepEqual(result.getRects(), makeRects([
				1, 2, 5, 4,
				1, 4, 7, 6,
				3, 6, 7, 8
			]));

			// Invert them.
			var a = new Region2D([1, 2, 5, 6]);
			var b = new Region2D([3, 4, 7, 8]);
			var result = a.union(b);
			assert.deepEqual(result.getRects(), makeRects([
				1, 2, 5, 4,
				1, 4, 7, 6,
				3, 6, 7, 8
			]));
		});

		it('can combine two rectangular regions, with an above-right relationship', function() {
			//   1234567
			// 1
			// 2   BBBB
			// 3   BBBB
			// 4 AA**BB
			// 5 AA**BB
			// 6 AAAA
			// 7 AAAA
			// 8
			var a = new Region2D([1, 4, 5, 8]);
			var b = new Region2D([3, 2, 7, 6]);
			var result = a.union(b);
			assert.deepEqual(result.getRects(), makeRects([
				3, 2, 7, 4,
				1, 4, 7, 6,
				1, 6, 5, 8
			]));

			// Invert them.
			var a = new Region2D([3, 2, 7, 6]);
			var b = new Region2D([1, 4, 5, 8]);
			var result = a.union(b);
			assert.deepEqual(result.getRects(), makeRects([
				3, 2, 7, 4,
				1, 4, 7, 6,
				1, 6, 5, 8
			]));
		});

		it('can combine two disconnected rectangular regions', function() {
			//   12345678
			// 1
			// 2 BBB
			// 3 BBB
			// 4 BBB AAA
			// 5 BBB AAA
			// 6     AAA
			// 7     AAA
			// 8
			var a = new Region2D([5, 4, 8, 8]);
			var b = new Region2D([1, 2, 4, 6]);
			var result = a.union(b);
			assert.deepEqual(result.getRects(), makeRects([
				1, 2, 4, 4,
				1, 4, 4, 6,
				5, 4, 8, 6,
				5, 6, 8, 8,
			]));

			// Invert them.
			var b = new Region2D([5, 4, 8, 8]);
			var a = new Region2D([1, 2, 4, 6]);
			var result = a.union(b);
			assert.deepEqual(result.getRects(), makeRects([
				1, 2, 4, 4,
				1, 4, 4, 6,
				5, 4, 8, 6,
				5, 6, 8, 8,
			]));
		});

		it('can create and then fill in a rectangular donut', function() {
			//   1234567
			// 1
			// 2  A*BBBB
			// 3  A*BB**
			// 4  AA  CC
			// 5  AA  CC
			// 6  **DD*C
			// 7  DDDD*C
			// 8
			var a = new Region2D([2, 2, 4, 7]);
			var b = new Region2D([3, 2, 8, 4]);
			var c = new Region2D([6, 3, 8, 8]);
			var d = new Region2D([2, 6, 7, 8]);

			// Make sure we can create the top-left corner.
			var topLeft = a.union(b);
			assert.deepEqual(topLeft.getRects(), makeRects([
				2, 2, 8, 4,
				2, 4, 4, 7
			]));

			// Adding the right edge should produce an "n" shape.
			var nShape = topLeft.union(c);
			assert.deepEqual(nShape.getRects(), makeRects([
				2, 2, 8, 4,
				2, 4, 4, 7,
				6, 4, 8, 7,
				6, 7, 8, 8
			]));

			// Adding the bottom edge should produce a banded "donut" shape.
			var donut = nShape.union(d);
			assert.deepEqual(donut.getRects(), makeRects([
				2, 2, 8, 4,
				2, 4, 4, 6,
				6, 4, 8, 6,
				2, 6, 8, 8
			]));

			// Now plug the hole.  The result should be a single rectangle.
			var fill = new Region2D([4, 4, 6, 6]);
			var result = donut.union(fill);
			assert.deepEqual(result.getRects(), makeRects([
				2, 2, 8, 8,
			]));
		});
	});

	//---------------------------------------------------------------------------------------------
	// #intersect()

	describe('#intersect()', function() {
		it('can combine two rectangular regions, with an above/below relationship', function() {
			//   1234567
			// 1
			// 2 BBBB
			// 3 BBBB
			// 4 ****
			// 5 ****
			// 6 AAAA
			// 7 AAAA
			// 8
			var a = new Region2D([1, 4, 5, 8]);
			var b = new Region2D([1, 2, 5, 6]);
			var result = a.intersect(b);
			assert.deepEqual(result.getRects(), makeRects([
				1, 4, 5, 6,
			]));

			// Inverted case.
			var a = new Region2D([1, 2, 5, 6]);
			var b = new Region2D([1, 4, 5, 8]);
			var result = a.intersect(b);
			assert.deepEqual(result.getRects(), makeRects([
				1, 4, 5, 6,
			]));
		});

		it('can combine two rectangular regions, with a left/right relationship', function() {
			//   1234567
			// 1
			// 2 AA**BB
			// 3 AA**BB
			// 4 AA**BB
			// 5 AA**BB
			// 6
			// 7
			// 8
			var a = new Region2D([1, 2, 5, 6]);
			var b = new Region2D([3, 2, 7, 6]);
			var result = a.intersect(b);
			assert.deepEqual(result.getRects(), makeRects([
				3, 2, 5, 6,
			]));

			// Invert them.
			var a = new Region2D([3, 2, 7, 6]);
			var b = new Region2D([1, 2, 5, 6]);
			var result = a.intersect(b);
			assert.deepEqual(result.getRects(), makeRects([
				3, 2, 5, 6,
			]));
		});

		it('can combine two rectangular regions, with an above-left relationship', function() {
			//   1234567
			// 1
			// 2 BBBB
			// 3 BBBB
			// 4 BB**AA
			// 5 BB**AA
			// 6   AAAA
			// 7   AAAA
			// 8
			var a = new Region2D([3, 4, 7, 8]);
			var b = new Region2D([1, 2, 5, 6]);
			var result = a.intersect(b);
			assert.deepEqual(result.getRects(), makeRects([
				3, 4, 5, 6
			]));

			// Invert them.
			var a = new Region2D([1, 2, 5, 6]);
			var b = new Region2D([3, 4, 7, 8]);
			var result = a.intersect(b);
			assert.deepEqual(result.getRects(), makeRects([
				3, 4, 5, 6
			]));
		});

		it('can combine two rectangular regions, with an above-right relationship', function() {
			//   1234567
			// 1
			// 2   BBBB
			// 3   BBBB
			// 4 AA**BB
			// 5 AA**BB
			// 6 AAAA
			// 7 AAAA
			// 8
			var a = new Region2D([1, 4, 5, 8]);
			var b = new Region2D([3, 2, 7, 6]);
			var result = a.intersect(b);
			assert.deepEqual(result.getRects(), makeRects([
				3, 4, 5, 6
			]));

			// Invert them.
			var a = new Region2D([3, 2, 7, 6]);
			var b = new Region2D([1, 4, 5, 8]);
			var result = a.intersect(b);
			assert.deepEqual(result.getRects(), makeRects([
				3, 4, 5, 6
			]));
		});

		it('should delete two disconnected rectangular regions', function() {
			//   12345678
			// 1
			// 2 BBB
			// 3 BBB
			// 4 BBB AAA
			// 5 BBB AAA
			// 6     AAA
			// 7     AAA
			// 8
			var a = new Region2D([5, 4, 8, 8]);
			var b = new Region2D([1, 2, 4, 6]);
			var result = a.intersect(b);
			assert.deepEqual(result.getRects(), [ ]);

			// Invert them.
			var b = new Region2D([5, 4, 8, 8]);
			var a = new Region2D([1, 2, 4, 6]);
			var result = a.intersect(b);
			assert.deepEqual(result.getRects(), [ ]);
		});

		it('can turn a rectangular donut into an L and then a bar', function() {
			//   1234567
			// 1
			// 2  A*BBBB
			// 3  A*BB**
			// 4 yAA  CC
			// 5 yAAx CC
			// 6 y**DD*C
			// 7 yDDDD*C
			// 8 yyxx
			var a = new Region2D([2, 2, 4, 7]);
			var b = new Region2D([3, 2, 8, 4]);
			var c = new Region2D([6, 3, 8, 8]);
			var d = new Region2D([2, 6, 7, 8]);

			var donut = a.union(b).union(c).union(d);
			assert.deepEqual(donut.getRects(), makeRects([
				2, 2, 8, 4,
				2, 4, 4, 6,
				6, 4, 8, 6,
				2, 6, 8, 8
			]));

			var x = new Region2D([1, 5, 5, 9]);
			var lShape = donut.intersect(x);
			assert.deepEqual(lShape.getRects(), makeRects([
				2, 5, 4, 6,
				2, 6, 5, 8
			]));

			var y = new Region2D([1, 4, 3, 9]);
			var bar = lShape.intersect(y);
			assert.deepEqual(bar.getRects(), makeRects([
				2, 5, 3, 8
			]));
		});
	});

	//---------------------------------------------------------------------------------------------
	// #subtract()

	describe('#subtract()', function() {
		it('can combine two rectangular regions, with an above/below relationship', function() {
			//   1234567
			// 1
			// 2 BBBB
			// 3 BBBB
			// 4 ****
			// 5 ****
			// 6 AAAA
			// 7 AAAA
			// 8
			var a = new Region2D([1, 4, 5, 8]);
			var b = new Region2D([1, 2, 5, 6]);
			var result = a.subtract(b);
			assert.deepEqual(result.getRects(), makeRects([
				1, 6, 5, 8
			]));

			// Inverted case.
			var result = b.subtract(a);
			assert.deepEqual(result.getRects(), makeRects([
				1, 2, 5, 4
			]));
		});

		it('can combine two rectangular regions, with a left/right relationship', function() {
			//   1234567
			// 1
			// 2 AA**BB
			// 3 AA**BB
			// 4 AA**BB
			// 5 AA**BB
			// 6
			// 7
			// 8
			var a = new Region2D([1, 2, 5, 6]);
			var b = new Region2D([3, 2, 7, 6]);
			var result = a.subtract(b);
			assert.deepEqual(result.getRects(), makeRects([
				1, 2, 3, 6
			]));

			// Invert them.
			var a = new Region2D([3, 2, 7, 6]);
			var b = new Region2D([1, 2, 5, 6]);
			var result = a.subtract(b);
			assert.deepEqual(result.getRects(), makeRects([
				5, 2, 7, 6
			]));
		});

		it('can combine two rectangular regions, with an above-left relationship', function() {
			//   1234567
			// 1
			// 2 BBBB
			// 3 BBBB
			// 4 BB**AA
			// 5 BB**AA
			// 6   AAAA
			// 7   AAAA
			// 8
			var a = new Region2D([3, 4, 7, 8]);
			var b = new Region2D([1, 2, 5, 6]);
			var result = a.subtract(b);
			assert.deepEqual(result.getRects(), makeRects([
				5, 4, 7, 6,
				3, 6, 7, 8
			]));

			// Invert them.
			var a = new Region2D([1, 2, 5, 6]);
			var b = new Region2D([3, 4, 7, 8]);
			var result = a.subtract(b);
			assert.deepEqual(result.getRects(), makeRects([
				1, 2, 5, 4,
				1, 4, 3, 6
			]));
		});

		it('can combine two rectangular regions, with an above-right relationship', function() {
			//   1234567
			// 1
			// 2   BBBB
			// 3   BBBB
			// 4 AA**BB
			// 5 AA**BB
			// 6 AAAA
			// 7 AAAA
			// 8
			var a = new Region2D([1, 4, 5, 8]);
			var b = new Region2D([3, 2, 7, 6]);
			var result = a.subtract(b);
			assert.deepEqual(result.getRects(), makeRects([
				1, 4, 3, 6,
				1, 6, 5, 8
			]));

			// Invert them.
			var a = new Region2D([3, 2, 7, 6]);
			var b = new Region2D([1, 4, 5, 8]);
			var result = a.subtract(b);
			assert.deepEqual(result.getRects(), makeRects([
				3, 2, 7, 4,
				5, 4, 7, 6,
			]));
		});

		it('should remove one of a pair of disconnected rectangular regions', function() {
			//   12345678
			// 1
			// 2 BBB
			// 3 BBB
			// 4 BBB AAA
			// 5 BBB AAA
			// 6     AAA
			// 7     AAA
			// 8
			var a = new Region2D([5, 4, 8, 8]);
			var b = new Region2D([1, 2, 4, 6]);
			var result = a.subtract(b);
			assert.deepEqual(result.getRects(), makeRects([
				5, 4, 8, 8
			]));

			// Invert them.
			var result = b.subtract(a);
			assert.deepEqual(result.getRects(), makeRects([
				1, 2, 4, 6
			]));
		});

		it('can turn a rectangle into a donut, then a C, then an L', function() {
			//   1234567
			// 1
			// 2  AAAAAA
			// 3  AAABBB*
			// 4  AA *BB*
			// 5  AA *BB*
			// 6  AAABBB*
			// 7  AAAAAA
			// 8 
			var rectangle = new Region2D([2, 2, 8, 8]);
			var hole = new Region2D([4, 4, 6, 6]);
			var donut = rectangle.subtract(hole);
			assert.deepEqual(donut.getRects(), makeRects([
				2, 2, 8, 4,
				2, 4, 4, 6,
				6, 4, 8, 6,
				2, 6, 8, 8
			]));

			var b = new Region2D([5, 3, 9, 7]);
			var cShape = donut.subtract(b);
			assert.deepEqual(cShape.getRects(), makeRects([
				2, 2, 8, 3,
				2, 3, 5, 4,
				2, 4, 4, 6,
				2, 6, 5, 7,
				2, 7, 8, 8,
			]));
		});
	});

	//---------------------------------------------------------------------------------------------
	// #xor()

	describe('#xor()', function() {
		it('can combine two rectangular regions, with an above/below relationship', function() {
			//   1234567
			// 1
			// 2 BBBB
			// 3 BBBB
			// 4 ****
			// 5 ****
			// 6 AAAA
			// 7 AAAA
			// 8
			var a = new Region2D([1, 4, 5, 8]);
			var b = new Region2D([1, 2, 5, 6]);
			var result = a.xor(b);
			assert.deepEqual(result.getRects(), makeRects([
				1, 2, 5, 4,
				1, 6, 5, 8
			]));

			// Inverted case.
			var result = b.xor(a);
			assert.deepEqual(result.getRects(), makeRects([
				1, 2, 5, 4,
				1, 6, 5, 8
			]));
		});

		it('can combine two rectangular regions, with a left/right relationship', function() {
			//   1234567
			// 1
			// 2 AA**BB
			// 3 AA**BB
			// 4 AA**BB
			// 5 AA**BB
			// 6
			// 7
			// 8
			var a = new Region2D([1, 2, 5, 6]);
			var b = new Region2D([3, 2, 7, 6]);
			var result = a.xor(b);
			assert.deepEqual(result.getRects(), makeRects([
				1, 2, 3, 6,
				5, 2, 7, 6
			]));

			// Invert them.
			var a = new Region2D([3, 2, 7, 6]);
			var b = new Region2D([1, 2, 5, 6]);
			var result = a.xor(b);
			assert.deepEqual(result.getRects(), makeRects([
				1, 2, 3, 6,
				5, 2, 7, 6
			]));
		});

		it('can combine two rectangular regions, with an above-left relationship', function() {
			//   1234567
			// 1
			// 2 BBBB
			// 3 BBBB
			// 4 BB**AA
			// 5 BB**AA
			// 6   AAAA
			// 7   AAAA
			// 8
			var a = new Region2D([3, 4, 7, 8]);
			var b = new Region2D([1, 2, 5, 6]);
			var result = a.xor(b);
			assert.deepEqual(result.getRects(), makeRects([
				1, 2, 5, 4,
				1, 4, 3, 6,
				5, 4, 7, 6,
				3, 6, 7, 8
			]));

			// Invert them.
			var a = new Region2D([1, 2, 5, 6]);
			var b = new Region2D([3, 4, 7, 8]);
			var result = a.xor(b);
			assert.deepEqual(result.getRects(), makeRects([
				1, 2, 5, 4,
				1, 4, 3, 6,
				5, 4, 7, 6,
				3, 6, 7, 8
			]));
		});

		it('can combine two rectangular regions, with an above-right relationship', function() {
			//   1234567
			// 1
			// 2   BBBB
			// 3   BBBB
			// 4 AA**BB
			// 5 AA**BB
			// 6 AAAA
			// 7 AAAA
			// 8
			var a = new Region2D([1, 4, 5, 8]);
			var b = new Region2D([3, 2, 7, 6]);
			var result = a.xor(b);
			assert.deepEqual(result.getRects(), makeRects([
				3, 2, 7, 4,
				1, 4, 3, 6,
				5, 4, 7, 6,
				1, 6, 5, 8
			]));

			// Invert them.
			var a = new Region2D([3, 2, 7, 6]);
			var b = new Region2D([1, 4, 5, 8]);
			var result = a.xor(b);
			assert.deepEqual(result.getRects(), makeRects([
				3, 2, 7, 4,
				1, 4, 3, 6,
				5, 4, 7, 6,
				1, 6, 5, 8
			]));
		});

		it('should act like union for disconnected rectangular regions', function() {
			//   12345678
			// 1
			// 2 BBB
			// 3 BBB
			// 4 BBB AAA
			// 5 BBB AAA
			// 6     AAA
			// 7     AAA
			// 8
			var a = new Region2D([5, 4, 8, 8]);
			var b = new Region2D([1, 2, 4, 6]);
			var result = a.xor(b);
			assert.deepEqual(result.getRects(), makeRects([
				1, 2, 4, 4,
				1, 4, 4, 6,
				5, 4, 8, 6,
				5, 6, 8, 8,
			]));

			// Invert them.
			var b = new Region2D([5, 4, 8, 8]);
			var a = new Region2D([1, 2, 4, 6]);
			var result = a.xor(b);
			assert.deepEqual(result.getRects(), makeRects([
				1, 2, 4, 4,
				1, 4, 4, 6,
				5, 4, 8, 6,
				5, 6, 8, 8,
			]));
		});

		it('can turn a rectangle into a donut into a bullseye', function() {
			//   1234567
			// 1
			// 2  AAAAAA
			// 3  A****A
			// 4  A*BB*A
			// 5  A*BB*A
			// 6  A****A
			// 7  AAAAAA
			// 8 
			var rectangle = new Region2D([2, 2, 8, 8]);
			var hole = new Region2D([4, 4, 6, 6]);
			var donut = rectangle.xor(hole);
			assert.deepEqual(donut.getRects(), makeRects([
				2, 2, 8, 4,
				2, 4, 4, 6,
				6, 4, 8, 6,
				2, 6, 8, 8
			]));

			var fill = new Region2D([3, 3, 7, 7]);
			var bullseye = donut.xor(fill);
			assert.deepEqual(bullseye.getRects(), makeRects([
				2, 2, 8, 3,
				2, 3, 3, 4,
				7, 3, 8, 4,
				2, 4, 3, 6,
				4, 4, 6, 6,
				7, 4, 8, 6,
				2, 6, 3, 7,
				7, 6, 8, 7,
				2, 7, 8, 8,
			]));
		});
	});

	//---------------------------------------------------------------------------------------------
	// #not()

	describe('#not()', function() {
		it('turns the empty set into the infinite set', function() {
			assert.deepEqual(Region2D.empty.not().getRects(), makeRects([
				Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY,
			]));
		});

		it('turns the infinite set into the empty set', function() {
			assert.deepEqual(Region2D.infinite.not().getRects(), []);
		});

		it('produces the opposite of a given finite region', function() {
			//   1234567
			// 1
			// 2 BBBB
			// 3 BBBB
			// 4 BB**AA
			// 5 BB**AA
			// 6   AAAA
			// 7   AAAA
			// 8
			var a = new Region2D([3, 4, 7, 8]);
			var b = new Region2D([1, 2, 5, 6]);
			var region = a.union(b);
			var result = region.not();
			assert.deepEqual(result.getRects(), makeRects([
				nInf, nInf, pInf, 2,	// Top infinite row
				nInf, 2, 1, 4,   5, 2, pInf, 4,
				nInf, 4, 1, 6,   7, 4, pInf, 6,
				nInf, 6, 3, 8,   7, 6, pInf, 8,
				nInf, 8, pInf, pInf		// Bottom infinite row
			]));
		});

		it('produces the opposite of a given infinite region', function() {
			//   1234567
			// 1
			// 2 BBBB
			// 3 BBBB
			// 4 BB**AA
			// 5 BB**AA
			// 6   AAAA
			// 7   AAAA
			// 8
			var region = Region2D.fromRects([
				[ nInf, nInf, pInf, 2 ],	// Top infinite row
				[ nInf, 2, 1, 4 ], [ 5, 2, pInf, 4 ],
				[ nInf, 4, 1, 6 ], [ 7, 4, pInf, 6 ],
				[ nInf, 6, 3, 8 ], [ 7, 6, pInf, 8 ],
				[ nInf, 8, pInf, pInf ]		// Bottom infinite row
			]);
			var result = region.not();
			assert.deepEqual(result.getRects(), makeRects([
				1, 2, 5, 4,
				1, 4, 7, 6,
				3, 6, 7, 8
			]));
		});
	});


	//---------------------------------------------------------------------------------------------
	// Region2D.transform()

	describe('Region2D.transform()', function() {
		it('does nothing to an empty region', function() {
			assert.deepEqual(Region2D.empty.transform(10, 20, 30, 40).getRects(), Region2D.empty.getRects());
		});

		it('can grow and move a simple rectangle', function() {
			var region = new Region2D([1, 2, 3, 4]);
			assert.deepEqual(region.transform(10, 20, 30, 40).getRects(), makeRects([40, 80, 60, 120]));
		});

		it('can shrink and move a simple rectangle', function() {
			var region = new Region2D([1, 2, 3, 4]);
			assert.deepEqual(region.transform(0.5, 0.25, -1, -1).getRects(), makeRects([-0.5, -0.5, 0.5, 0]));
		});

		it('fails with negative scaling numbers or zero', function() {
			var region = new Region2D([1, 2, 3, 4]);
			assert.throws(function() { region.transform(-2, 1, 2, 3); });
			assert.throws(function() { region.transform(-10, 1, 2, 3); });
			assert.throws(function() { region.transform(0, 1, 2, 3); });
			assert.throws(function() { region.transform(1, -2, 2, 3); });
			assert.throws(function() { region.transform(1, -10, 2, 3); });
			assert.throws(function() { region.transform(1, 0, 2, 3); });
		});

		it('can move and resize a complex region made from multiple rectangles', function() {
			//   1234567
			// 1
			// 2 BBBB
			// 3 BBBB
			// 4 BB**AA
			// 5 BB**AA
			// 6   AAAA
			// 7   AAAA
			// 8
			var region = Region2D.fromRects([
				[ 3, 4, 7, 8 ],
				[ 1, 2, 5, 6 ],
			]);
			assert.deepEqual(region.transform(10, 20, 5, 15).getRects(), makeRects([
				15, 55, 55, 95,
				15, 95, 75, 135,
				35, 135, 75, 175
			]));
		});

		it('fails if the new region\'s points overlap or reach infinity', function() {
			var region = new Region2D([1, 2, 3, 4]);
			assert.throws(function() { region.transform(pInf, 1, 2, 3); });
			assert.throws(function() { region.transform(1, pInf, 2, 3); });
			assert.throws(function() { region.transform(nInf, 1, 2, 3); });
			assert.throws(function() { region.transform(1, nInf, 2, 3); });
			assert.throws(function() { region.transform(10e+308, 1, 2, 3); });
			assert.throws(function() { region.transform(1, 10e+308, 2, 3); });

			assert.throws(function() { region.transform(1, 2, pInf, 0); });
			assert.throws(function() { region.transform(1, 2, 0, pInf); });
			assert.throws(function() { region.transform(1, 2, nInf, 0); });
			assert.throws(function() { region.transform(1, 2, 0, nInf); });
			assert.throws(function() { region.transform(1, 2, 10e+53, 0); });
			assert.throws(function() { region.transform(1, 2, 0, 10e+53); });
		});
	});

	//---------------------------------------------------------------------------------------------
	// Region2D.translate()

	describe('Region2D.translate()', function() {
		it('does nothing to an empty region', function() {
			assert.deepEqual(Region2D.empty.translate(10, 10).getRects(), Region2D.empty.getRects());
		});

		it('can move a simple rectangle', function() {
			var region = new Region2D([1, 2, 3, 4]);
			assert.deepEqual(region.translate(10, 20).getRects(), makeRects([11, 22, 13, 24]));
		});

		it('can negatively move a simple rectangle', function() {
			var region = new Region2D([1, 2, 3, 4]);
			assert.deepEqual(region.translate(-10, -20).getRects(), makeRects([-9, -18, -7, -16]));
		});

		it('can move a complex region made from multiple rectangles', function() {
			//   1234567
			// 1
			// 2 BBBB
			// 3 BBBB
			// 4 BB**AA
			// 5 BB**AA
			// 6   AAAA
			// 7   AAAA
			// 8
			var region = Region2D.fromRects([
				[ 3, 4, 7, 8 ],
				[ 1, 2, 5, 6 ],
			]);
			assert.deepEqual(region.translate(10, 20).getRects(), makeRects([
				11, 22, 15, 24,
				11, 24, 17, 26,
				13, 26, 17, 28
			]));
		});

		it('fails if the new region\'s points overlap or reach infinity', function() {
			var region = new Region2D([1, 2, 3, 4]);
			assert.throws(function() { region.translate(pInf, 0); });
			assert.throws(function() { region.translate(0, pInf); });
			assert.throws(function() { region.translate(nInf, 0); });
			assert.throws(function() { region.translate(0, nInf); });
			assert.throws(function() { region.translate(10e+53, 0); });
			assert.throws(function() { region.translate(0, 10e+53); });
		});
	});

	//---------------------------------------------------------------------------------------------
	// Region2D.scale()

	describe('Region2D.scale()', function() {
		it('does nothing to an empty region', function() {
			assert.deepEqual(Region2D.empty.scale(10, 10).getRects(), Region2D.empty.getRects());
		});

		it('can grow a simple rectangle', function() {
			var region = new Region2D([1, 2, 3, 4]);
			assert.deepEqual(region.scale(2, 3).getRects(), makeRects([2, 6, 6, 12]));
		});

		it('can shrink a simple rectangle', function() {
			var region = new Region2D([1, 2, 3, 4]);
			assert.deepEqual(region.scale(0.5, 0.25).getRects(), makeRects([0.5, 0.5, 1.5, 1]));
		});

		it('fails with negative numbers or zero', function() {
			var region = new Region2D([1, 2, 3, 4]);
			assert.throws(function() { region.scale(-2, 1); });
			assert.throws(function() { region.scale(-10, 1); });
			assert.throws(function() { region.scale(0, 1); });
			assert.throws(function() { region.scale(1, -2); });
			assert.throws(function() { region.scale(1, -10); });
			assert.throws(function() { region.scale(1, 0); });
		});

		it('can resize a complex region made from multiple rectangles', function() {
			//   1234567
			// 1
			// 2 BBBB
			// 3 BBBB
			// 4 BB**AA
			// 5 BB**AA
			// 6   AAAA
			// 7   AAAA
			// 8
			var region = Region2D.fromRects([
				[ 3, 4, 7, 8 ],
				[ 1, 2, 5, 6 ],
			]);
			assert.deepEqual(region.scale(10, 20).getRects(), makeRects([
				10, 40, 50, 80,
				10, 80, 70, 120,
				30, 120, 70, 160
			]));
		});

		it('fails if the new region\'s points overlap or reach infinity', function() {
			var region = new Region2D([1, 2, 3, 4]);
			assert.throws(function() { region.scale(pInf, 1); });
			assert.throws(function() { region.scale(1, pInf); });
			assert.throws(function() { region.scale(nInf, 1); });
			assert.throws(function() { region.scale(1, nInf); });
			assert.throws(function() { region.scale(10e+308, 1); });
			assert.throws(function() { region.scale(1, 10e+308); });
		});
	});

	//---------------------------------------------------------------------------------------------
	// Region2D.getPath()

	describe('Region2D.getPath()', function() {
		it('generates no output for an empty region', function() {
			assert.deepEqual(Region2D.empty.getPath(), []);
		});

		it('generates a four-edge polygon for a rectangle', function() {
			var region = new Region2D([1, 2, 3, 4]);
			assert.deepEqual(region.getPath(), [ [
				{ x:1, y:2 },
				{ x:3, y:2 },
				{ x:3, y:4 },
				{ x:1, y:4 }
			] ]);
		});

		it('can render a polygon for a region of multiple rectangles', function() {
			//   1234567
			// 1
			// 2 BBBB
			// 3 BBBB
			// 4 BB**AA
			// 5 BB**AA
			// 6   AAAA
			// 7   AAAA
			// 8
			var region = Region2D.fromRects([
				[ 3, 4, 7, 8 ],
				[ 1, 2, 5, 6 ],
			]);
			assert.deepEqual(region.getPath(), [ [
				{ x:1, y:2 },
				{ x:5, y:2 },
				{ x:5, y:4 },
				{ x:7, y:4 },
				{ x:7, y:8 },
				{ x:3, y:8 },
				{ x:3, y:6 },
				{ x:1, y:6 }
			] ]);
		});

		it('can render a polygon for a horizontally-disjoint region', function() {
			//   12345678901234
			// 1
			// 2 BBBB
			// 3 BBBB
			// 4 BB**AA  CCCCC
			// 5 BB**AA  **C**
			// 6   AAAA  DD EE
			// 7   AAAA
			// 8
			var region = Region2D.fromRects([
				[ 3, 4, 7, 8 ],
				[ 1, 2, 5, 6 ],
				[ 9, 14, 14, 16 ],
				[ 9, 15, 11, 17 ],
				[ 12, 15, 14, 17 ],
			]);
			assert.deepEqual(region.getPath(), [
				[
					{ x:1, y:2 },
					{ x:5, y:2 },
					{ x:5, y:4 },
					{ x:7, y:4 },
					{ x:7, y:8 },
					{ x:3, y:8 },
					{ x:3, y:6 },
					{ x:1, y:6 }
				],
				[
					{ x:9, y:14 },
					{ x:14, y:14 },
					{ x:14, y:17 },
					{ x:12, y:17 },
					{ x:12, y:16 },
					{ x:11, y:16 },
					{ x:11, y:17 },
					{ x:9, y:17 }
				]
			]);
		});

		it('can render a polygon with a hole in it', function() {
			//   12345678901234
			// 1
			// 2 BBBBBB
			// 3 BBBBBB
			// 4 CC  DD
			// 5 CC  DD
			// 6 AAAAAA
			// 7 AAAAAA
			// 8
			var region = Region2D.fromRects([
				[ 1, 6, 7, 8 ],
				[ 1, 2, 7, 4 ],
				[ 1, 4, 3, 6 ],
				[ 5, 4, 7, 6 ]
			]);
			assert.deepEqual(region.getPath(), [
				[
					{ x:1, y:2 },
					{ x:7, y:2 },
					{ x:7, y:8 },
					{ x:1, y:8 }
				],
				[
					{ x:3, y:6 },
					{ x:5, y:6 },
					{ x:5, y:4 },
					{ x:3, y:4 }
				]
			]);
		});

		it('can render separate polygons when points adjoin', function() {
			//   12345678901234
			// 1
			// 2 AAAA    CCCC
			// 3 AAAA    CCCC
			// 4 AAAA    CCCC
			// 5     BBBB
			// 6     BBBB
			// 7     BBBB
			// 8 DDDD    EEEE
			// 9 DDDD    EEEE
			// 0 DDDD    EEEE
			// 1
			var region = Region2D.fromRects([
				[ 1, 2, 5, 5 ],
				[ 5, 5, 9, 8 ],
				[ 9, 2, 13, 5 ],
				[ 1, 8, 5, 11 ],
				[ 9, 8, 13, 11 ]
			]);
			assert.deepEqual(region.getPath(), [
				[
					{ x:1, y:2 },
					{ x:5, y:2 },
					{ x:5, y:5 },
					{ x:1, y:5 }
				],
				[
					{ x:9, y:2 },
					{ x:13, y:2 },
					{ x:13, y:5 },
					{ x:9, y:5 }
				],
				[
					{ x:5, y:5 },
					{ x:9, y:5 },
					{ x:9, y:8 },
					{ x:5, y:8 }
				],
				[
					{ x:1, y:8 },
					{ x:5, y:8 },
					{ x:5, y:11 },
					{ x:1, y:11 }
				],
				[
					{ x:9, y:8 },
					{ x:13, y:8 },
					{ x:13, y:11 },
					{ x:9, y:11 }
				]
			]);
		});
	});

	//---------------------------------------------------------------------------------------------
	// Region2D.isPointIn()

	describe('Region2D.isPointIn()', function() {
		it('always returns false for the empty set', function() {
			assert.equal(Region2D.empty.isPointIn(0, 0), false);
			assert.equal(Region2D.empty.isPointIn(1, 1), false);
			assert.equal(Region2D.empty.isPointIn(pInf, pInf), false);
			assert.equal(Region2D.empty.isPointIn(nInf, nInf), false);
		});

		it('detects point intersection for one rectangle', function() {
			var region = Region2D.fromRects([[1, 2, 3, 4]]);
			assert.equal(region.isPointIn(0, 0), false);
			assert.equal(region.isPointIn(1, 0), false);
			assert.equal(region.isPointIn(2, 0), false);
			assert.equal(region.isPointIn(3, 0), false);
			assert.equal(region.isPointIn(4, 0), false);

			assert.equal(region.isPointIn(0, 2), false);
			assert.equal(region.isPointIn(1, 2), true);
			assert.equal(region.isPointIn(2, 2), true);
			assert.equal(region.isPointIn(3, 2), false);
			assert.equal(region.isPointIn(4, 2), false);

			assert.equal(region.isPointIn(0, 3), false);
			assert.equal(region.isPointIn(1, 3), true);
			assert.equal(region.isPointIn(2, 3), true);
			assert.equal(region.isPointIn(3, 3), false);
			assert.equal(region.isPointIn(4, 3), false);

			assert.equal(region.isPointIn(0, 4), false);
			assert.equal(region.isPointIn(1, 4), false);
			assert.equal(region.isPointIn(2, 4), false);
			assert.equal(region.isPointIn(3, 4), false);
			assert.equal(region.isPointIn(4, 4), false);
		});

		it('detects point intersection for a complex disjoint region', function() {
			//   1234567890
			// 1
			// 2 BBBB
			// 3 BBBB
			// 4 BB**AA
			// 5 BB**AA
			// 6   AAAA
			// 7   AAAA
			// 8
			// 9       CCC
			// 0       CCC
			var region = Region2D.fromRects([
				[ 3, 4, 7, 8 ],
				[ 1, 2, 5, 6 ],
				[ 7, 9, 10, 11 ]
			]);

			// Test above the first band.
			assert.equal(region.isPointIn(3, 0), false);

			// Test the first band.
			assert.equal(region.isPointIn(0, 2), false);
			assert.equal(region.isPointIn(1, 2), true);
			assert.equal(region.isPointIn(4, 2), true);
			assert.equal(region.isPointIn(5, 2), false);

			// Test the second band.
			assert.equal(region.isPointIn(0, 4), false);
			assert.equal(region.isPointIn(1, 4), true);
			assert.equal(region.isPointIn(4, 4), true);
			assert.equal(region.isPointIn(6, 4), true);
			assert.equal(region.isPointIn(7, 4), false);

			// Test the third band.
			assert.equal(region.isPointIn(0, 6), false);
			assert.equal(region.isPointIn(2, 6), false);
			assert.equal(region.isPointIn(3, 6), true);
			assert.equal(region.isPointIn(6, 6), true);
			assert.equal(region.isPointIn(7, 6), false);

			// Test between the third and fourth bands.
			assert.equal(region.isPointIn(5, 8), false);
			assert.equal(region.isPointIn(8, 8), false);

			// Test the fourth band.
			assert.equal(region.isPointIn(6, 9), false);
			assert.equal(region.isPointIn(7, 9), true);
			assert.equal(region.isPointIn(9, 9), true);
			assert.equal(region.isPointIn(10, 9), false);

			// Test below the fourth band.
			assert.equal(region.isPointIn(7, 11), false);
			assert.equal(region.isPointIn(9, 11), false);
		});

		it('detects point intersection a region with a lot of rows', function() {
			// Make a region with 21 disjoint rows of individual rectangles
			// that go in sets of threes:  0-1-2, 6-7-8, 12-13-14, etc.
			var rects = [];
			for (var i = 0; i <= 20; i++) {
				rects.push([1, i * 6, 5, i * 6 + 3]);
			}
			var region = Region2D.fromRects(rects);

			// Now test every Y coordinate from -1 to 125 to make sure they all
			// come out as expected.
			for (var y = -1; y <= 125; y++) {
				var expectedIn = (y >= 0 && y % 6 < 3);
				var actualIn = region.isPointIn(3, y);
				assert.equal(actualIn, expectedIn, `failed at ${y}`);
			}
		});

		it('detects point intersection a region with a lot of columns', function() {
			// Make a region with 21 disjoint columns of individual rectangles
			// that go in sets of threes:  0-1-2, 6-7-8, 12-13-14, etc.
			var rects = [];
			for (var i = 0; i <= 20; i++) {
				rects.push([i * 6, 1, i * 6 + 3, 5]);
			}
			var region = Region2D.fromRects(rects);

			// Now test every X coordinate from -1 to 125 to make sure they all
			// come out as expected.
			for (var x = -1; x <= 125; x++) {
				var expectedIn = (x >= 0 && x % 6 < 3);
				var actualIn = region.isPointIn(x, 3);
				assert.equal(actualIn, expectedIn, `failed at ${x}`);
			}
		});
	});

	//---------------------------------------------------------------------------------------------
	// Region2D.fromRects()

	describe('Region2D.fromRects()', function() {
		it('can create a region from the empty set', function() {
			assert.deepEqual(Region2D.fromRects([]).getRects(), Region2D.empty.getRects());
		});

		it('can create a region from one rectangle', function() {
			assert.deepEqual(Region2D.fromRects([[1, 2, 3, 4]]).getRects(), makeRects([1, 2, 3, 4]));
		});

		it('can create a region from multiple rectangles, including overlapping', function() {
			//   1234567
			// 1
			// 2 BBBB
			// 3 BBBB
			// 4 BB**AA
			// 5 BB**AA
			// 6   AAAA
			// 7   AAAA
			// 8
			var region = Region2D.fromRects([
				[ 3, 4, 7, 8 ],
				[ 1, 2, 5, 6 ],
			]);
			assert.deepEqual(region.getRects(), makeRects([
				1, 2, 5, 4,
				1, 4, 7, 6,
				3, 6, 7, 8
			]));
		});
	});

	//---------------------------------------------------------------------------------------------
	// #_opaque()

	describe('#_opaque()', function() {
		it('disallows any attempts to use it for anything', function() {
			var data = [5, 8, 10, 12];
			var a = new Region2D(data);
			assert.throws(function() { a._opaque(); });
			assert.throws(function() { a._opaque("key"); });
			assert.throws(function() { a._opaque(a._opaque); });
			assert.throws(function() { a._opaque(data); });
		});
	});
});

