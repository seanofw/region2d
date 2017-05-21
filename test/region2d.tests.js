
var assert = require('assert');

var Region2D = require('../lib/region2d.debug.js').Region2D;

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
	};

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
	// #union()

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
});

