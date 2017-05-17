
var assert = require('assert');
var regionlib = require('../lib/region.js');

var Region1D = regionlib.Region1D;

describe('Region1D', function() {

	//---------------------------------------------------------------------------------------------
	// new()

	describe('new()', function() {
		it('should create regions from empty arrays', function() {
			var region = new Region1D([]);
			assert.deepEqual(region.getRawSpans(), []);
		});

		it('should create simple regions from two endpoints', function() {
			var region = new Region1D([5, 8]);
			assert.deepEqual(region.getRawSpans(), [5, 8]);
		});

		it('should create complex regions from many endpoints', function() {
			var region = new Region1D([5, 8, 10, 12, 20, 25, 30, 50]);
			assert.deepEqual(region.getRawSpans(), [5, 8, 10, 12, 20, 25, 30, 50]);
		});

		it('disallows nonascending values', function() {
			var okRegion = new Region1D([0, 1, 2, 3, 4, 5]);

			assert.throws(function() {
				var badRegion = new Region1D([1, 2, 3, 3, 4, 5]);
			});
			assert.throws(function() {
				var badRegion = new Region1D([1, 2, 3, 4, 0, -5]);
			});
			assert.throws(function() {
				var badRegion = new Region1D([5, 4, 3, 2, 1, 0]);
			});
		})
	});

	//---------------------------------------------------------------------------------------------
	// #union()

	describe('#union()', function() {
		it('produces an empty region when both input regions are empty', function() {
			var a = new Region1D([]);
			var b = new Region1D([]);
			var result = a.union(b);
			assert.deepEqual(result.getRawSpans(), []);
		});

		it('produces the first input when the second input is empty', function() {
			var a = new Region1D([5, 8]);
			var b = new Region1D([]);
			var result = a.union(b);
			assert.deepEqual(result.getRawSpans(), [5, 8]);

			var a = new Region1D([5, 8, 10, 12, 20, 25]);
			var b = new Region1D([]);
			var result = a.union(b);
			assert.deepEqual(result.getRawSpans(), [5, 8, 10, 12, 20, 25]);
		});

		it('produces the second input when the first input is empty', function() {
			var a = new Region1D([]);
			var b = new Region1D([5, 8]);
			var result = a.union(b);
			assert.deepEqual(result.getRawSpans(), [5, 8]);

			var a = new Region1D([]);
			var b = new Region1D([5, 8, 10, 12, 20, 25]);
			var result = a.union(b);
			assert.deepEqual(result.getRawSpans(), [5, 8, 10, 12, 20, 25]);
		});

		it('combines inputs when there is no overlap', function() {
			var a = new Region1D([3, 6, 10, 20]);
			var b = new Region1D([8, 9, 30, 40]);
			var result = a.union(b);
			assert.deepEqual(result.getRawSpans(), [3, 6, 8, 9, 10, 20, 30, 40]);

			var a = new Region1D([8, 9, 30, 40]);
			var b = new Region1D([3, 6, 10, 20]);
			var result = a.union(b);
			assert.deepEqual(result.getRawSpans(), [3, 6, 8, 9, 10, 20, 30, 40]);
		});

		it('unions spans when there is overlap', function() {
			var a = new Region1D([3, 10, 15, 20]);
			var b = new Region1D([8, 12, 13, 16, 18, 25]);
			var result = a.union(b);
			assert.deepEqual(result.getRawSpans(), [3, 12, 13, 25]);

			var a = new Region1D([8, 12, 13, 16, 18, 25]);
			var b = new Region1D([3, 10, 15, 20]);
			var result = a.union(b);
			assert.deepEqual(result.getRawSpans(), [3, 12, 13, 25]);
		});

		it('can handle infinities', function() {
			var a = new Region1D([Number.NEGATIVE_INFINITY, 10]);
			var b = new Region1D([20, Number.POSITIVE_INFINITY]);
			var result = a.union(b);
			assert.deepEqual(result.getRawSpans(), [Number.NEGATIVE_INFINITY, 10, 20, Number.POSITIVE_INFINITY]);

			var a = new Region1D([20, Number.POSITIVE_INFINITY]);
			var b = new Region1D([Number.NEGATIVE_INFINITY, 10]);
			var result = a.union(b);
			assert.deepEqual(result.getRawSpans(), [Number.NEGATIVE_INFINITY, 10, 20, Number.POSITIVE_INFINITY]);
		});
	});

	//---------------------------------------------------------------------------------------------
	// #intersect()

	describe('#intersect()', function() {
		it('produces an empty region when both input regions are empty', function() {
			var a = new Region1D([]);
			var b = new Region1D([]);
			var result = a.intersect(b);
			assert.deepEqual(result.getRawSpans(), []);
		});

		it('produces an empty region when either region is empty', function() {
			var a = new Region1D([5, 8]);
			var b = new Region1D([]);
			var result = a.intersect(b);
			assert.deepEqual(result.getRawSpans(), []);

			var a = new Region1D([5, 8, 10, 12, 20, 25]);
			var b = new Region1D([]);
			var result = a.intersect(b);
			assert.deepEqual(result.getRawSpans(), []);

			var a = new Region1D([]);
			var b = new Region1D([5, 8]);
			var result = a.intersect(b);
			assert.deepEqual(result.getRawSpans(), []);

			var a = new Region1D([]);
			var b = new Region1D([5, 8, 10, 12, 20, 25]);
			var result = a.intersect(b);
			assert.deepEqual(result.getRawSpans(), []);
		});

		it('produces an empty region when there is no overlap', function() {
			var a = new Region1D([3, 6, 10, 20]);
			var b = new Region1D([8, 9, 30, 40]);
			var result = a.intersect(b);
			assert.deepEqual(result.getRawSpans(), []);

			var a = new Region1D([8, 9, 30, 40]);
			var b = new Region1D([3, 6, 10, 20]);
			var result = a.intersect(b);
			assert.deepEqual(result.getRawSpans(), []);
		});

		it('results only in the overlap when there is overlap', function() {
			var a = new Region1D([3, 10, 15, 20]);
			var b = new Region1D([8, 12, 13, 16, 18, 25]);
			var result = a.intersect(b);
			assert.deepEqual(result.getRawSpans(), [8, 10, 15, 16, 18, 20]);

			var a = new Region1D([8, 12, 13, 16, 18, 25]);
			var b = new Region1D([3, 10, 15, 20]);
			var result = a.intersect(b);
			assert.deepEqual(result.getRawSpans(), [8, 10, 15, 16, 18, 20]);
		});

		it('can handle infinities', function() {
			var a = new Region1D([Number.NEGATIVE_INFINITY, 20]);
			var b = new Region1D([10, Number.POSITIVE_INFINITY]);
			var result = a.intersect(b);
			assert.deepEqual(result.getRawSpans(), [10, 20]);

			var a = new Region1D([10, Number.POSITIVE_INFINITY]);
			var b = new Region1D([Number.NEGATIVE_INFINITY, 20]);
			var result = a.intersect(b);
			assert.deepEqual(result.getRawSpans(), [10, 20]);
		});
	});

	//---------------------------------------------------------------------------------------------
	// #subtract()

	describe('#subtract()', function() {
		it('produces an empty region when both input regions are empty', function() {
			var a = new Region1D([]);
			var b = new Region1D([]);
			var result = a.subtract(b);
			assert.deepEqual(result.getRawSpans(), []);
		});

		it('produces the first input when the second input is empty', function() {
			var a = new Region1D([5, 8]);
			var b = new Region1D([]);
			var result = a.subtract(b);
			assert.deepEqual(result.getRawSpans(), [5, 8]);

			var a = new Region1D([5, 8, 10, 12, 20, 25]);
			var b = new Region1D([]);
			var result = a.subtract(b);
			assert.deepEqual(result.getRawSpans(), [5, 8, 10, 12, 20, 25]);
		});

		it('produces nothing when the first input is empty', function() {
			var a = new Region1D([]);
			var b = new Region1D([5, 8]);
			var result = a.subtract(b);
			assert.deepEqual(result.getRawSpans(), []);

			var a = new Region1D([]);
			var b = new Region1D([5, 8, 10, 12, 20, 25]);
			var result = a.subtract(b);
			assert.deepEqual(result.getRawSpans(), []);
		});

		it('leaves the first intact if there is no overlap', function() {
			var a = new Region1D([3, 6, 10, 20]);
			var b = new Region1D([8, 9, 30, 40]);
			var result = a.subtract(b);
			assert.deepEqual(result.getRawSpans(), [3, 6, 10, 20]);

			var a = new Region1D([8, 9, 30, 40]);
			var b = new Region1D([3, 6, 10, 20]);
			var result = a.subtract(b);
			assert.deepEqual(result.getRawSpans(), [8, 9, 30, 40]);
		});

		it('removes pieces of spans only where there is overlap', function() {
			var a = new Region1D([3, 10, 15, 20]);
			var b = new Region1D([8, 12, 13, 16, 18, 25]);
			var result = a.subtract(b);
			assert.deepEqual(result.getRawSpans(), [3, 8, 16, 18]);

			var a = new Region1D([8, 12, 13, 16, 18, 25]);
			var b = new Region1D([3, 10, 15, 20]);
			var result = a.subtract(b);
			assert.deepEqual(result.getRawSpans(), [10, 12, 13, 15, 20, 25]);
		});

		it('can handle infinities', function() {
			var a = new Region1D([Number.NEGATIVE_INFINITY, 20]);
			var b = new Region1D([10, Number.POSITIVE_INFINITY]);
			var result = a.subtract(b);
			assert.deepEqual(result.getRawSpans(), [Number.NEGATIVE_INFINITY, 10]);

			var a = new Region1D([10, Number.POSITIVE_INFINITY]);
			var b = new Region1D([Number.NEGATIVE_INFINITY, 20]);
			var result = a.subtract(b);
			assert.deepEqual(result.getRawSpans(), [20, Number.POSITIVE_INFINITY]);
		});
	});

	//---------------------------------------------------------------------------------------------
	// #xor()

	describe('#xor()', function() {
		it('produces an empty region when both input regions are empty', function() {
			var a = new Region1D([]);
			var b = new Region1D([]);
			var result = a.xor(b);
			assert.deepEqual(result.getRawSpans(), []);
		});

		it('produces the first input when the second input is empty', function() {
			var a = new Region1D([5, 8]);
			var b = new Region1D([]);
			var result = a.xor(b);
			assert.deepEqual(result.getRawSpans(), [5, 8]);

			var a = new Region1D([5, 8, 10, 12, 20, 25]);
			var b = new Region1D([]);
			var result = a.xor(b);
			assert.deepEqual(result.getRawSpans(), [5, 8, 10, 12, 20, 25]);
		});

		it('produces the second input when the first input is empty', function() {
			var a = new Region1D([]);
			var b = new Region1D([5, 8]);
			var result = a.xor(b);
			assert.deepEqual(result.getRawSpans(), [5, 8]);

			var a = new Region1D([]);
			var b = new Region1D([5, 8, 10, 12, 20, 25]);
			var result = a.xor(b);
			assert.deepEqual(result.getRawSpans(), [5, 8, 10, 12, 20, 25]);
		});

		it('combines inputs when there is no overlap', function() {
			var a = new Region1D([3, 6, 10, 20]);
			var b = new Region1D([8, 9, 30, 40]);
			var result = a.xor(b);
			assert.deepEqual(result.getRawSpans(), [3, 6, 8, 9, 10, 20, 30, 40]);

			var a = new Region1D([8, 9, 30, 40]);
			var b = new Region1D([3, 6, 10, 20]);
			var result = a.xor(b);
			assert.deepEqual(result.getRawSpans(), [3, 6, 8, 9, 10, 20, 30, 40]);
		});

		it('results in spans only where there is no overlap', function() {
			var a = new Region1D([3, 10, 15, 20]);
			var b = new Region1D([8, 12, 13, 16, 18, 25]);
			var result = a.xor(b);
			assert.deepEqual(result.getRawSpans(), [3, 8, 10, 12, 13, 15, 16, 18, 20, 25]);

			var a = new Region1D([8, 12, 13, 16, 18, 25]);
			var b = new Region1D([3, 10, 15, 20]);
			var result = a.xor(b);
			assert.deepEqual(result.getRawSpans(), [3, 8, 10, 12, 13, 15, 16, 18, 20, 25]);
		});

		it('can handle infinities', function() {
			var a = new Region1D([Number.NEGATIVE_INFINITY, 20]);
			var b = new Region1D([10, Number.POSITIVE_INFINITY]);
			var result = a.xor(b);
			assert.deepEqual(result.getRawSpans(), [Number.NEGATIVE_INFINITY, 10, 20, Number.POSITIVE_INFINITY]);

			var a = new Region1D([10, Number.POSITIVE_INFINITY]);
			var b = new Region1D([Number.NEGATIVE_INFINITY, 20]);
			var result = a.xor(b);
			assert.deepEqual(result.getRawSpans(), [Number.NEGATIVE_INFINITY, 10, 20, Number.POSITIVE_INFINITY]);
		});
	});

	//---------------------------------------------------------------------------------------------
	// #not()

	describe('#not()', function() {
		it('produces an infinite region when the input region is empty', function() {
			var a = new Region1D([]);
			var result = a.not();
			assert.deepEqual(result.getRawSpans(), [Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY]);
		});

		it('produces a complemented infinite region when the input region is finite', function() {
			var a = new Region1D([5, 8]);
			var result = a.not();
			assert.deepEqual(result.getRawSpans(), [Number.NEGATIVE_INFINITY, 5, 8, Number.POSITIVE_INFINITY]);

			var a = new Region1D([5, 8, 10, 12, 20, 25]);
			var result = a.not();
			assert.deepEqual(result.getRawSpans(), [Number.NEGATIVE_INFINITY, 5, 8, 10, 12, 20, 25, Number.POSITIVE_INFINITY]);
		});

		it('produces a complemented finite region when the input region is infinite', function() {
			var a = new Region1D([Number.NEGATIVE_INFINITY, 10, 15, Number.POSITIVE_INFINITY]);
			var result = a.not();
			assert.deepEqual(result.getRawSpans(), [10, 15]);

			var a = new Region1D([Number.NEGATIVE_INFINITY, 5, 8, 10, 12, 20]);
			var result = a.not();
			assert.deepEqual(result.getRawSpans(), [5, 8, 10, 12, 20, Number.POSITIVE_INFINITY]);

			var a = new Region1D([5, 8, 10, 12, 20, Number.POSITIVE_INFINITY]);
			var result = a.not();
			assert.deepEqual(result.getRawSpans(), [Number.NEGATIVE_INFINITY, 5, 8, 10, 12, 20]);
		});
	});

	//---------------------------------------------------------------------------------------------
	// #isEmpty()

	describe('#isEmpty()', function() {
		it('is true for an empty region', function() {
			var a = new Region1D([]);
			assert.equal(a.isEmpty(), true);
		});

		it('is false for a non-empty region', function() {
			var a = new Region1D([5, 8]);
			assert.equal(a.isEmpty(), false);
		});

		it('can handle infinities', function() {
			var a = new Region1D([Number.NEGATIVE_INFINITY, 10]);
			assert.equal(a.isEmpty(), false);

			var a = new Region1D([20, Number.POSITIVE_INFINITY]);
			assert.equal(a.isEmpty(), false);
		});
	});

	//---------------------------------------------------------------------------------------------
	// #isPointIn()

	describe('#isPointIn()', function() {
		it('is always false when the input region is empty', function() {
			var a = new Region1D([]);
			assert.equal(a.isPointIn(0), false);
			assert.equal(a.isPointIn(5), false);
			assert.equal(a.isPointIn(-5), false);
		});

		it('can test against a simple single-span region', function() {
			var a = new Region1D([5, 8]);
			assert.equal(a.isPointIn(-1), false);
			assert.equal(a.isPointIn(0), false);
			assert.equal(a.isPointIn(5), true);
			assert.equal(a.isPointIn(6), true);
			assert.equal(a.isPointIn(7), true);
			assert.equal(a.isPointIn(8), false);
			assert.equal(a.isPointIn(10), false);
		});

		it('can test against a region with several spans', function() {
			var a = new Region1D([3, 8, 10, 12, 13, 15, 16, 18, 20, 25]);
			assert.equal(a.isPointIn(-1), false);
			assert.equal(a.isPointIn(0), false);
			assert.equal(a.isPointIn(3), true);
			assert.equal(a.isPointIn(6), true);
			assert.equal(a.isPointIn(7), true);
			assert.equal(a.isPointIn(8), false);
			assert.equal(a.isPointIn(10), true);
			assert.equal(a.isPointIn(12), false);
			assert.equal(a.isPointIn(13), true);
			assert.equal(a.isPointIn(14), true);
			assert.equal(a.isPointIn(15), false);
			assert.equal(a.isPointIn(16), true);
			assert.equal(a.isPointIn(17), true);
			assert.equal(a.isPointIn(18), false);
			assert.equal(a.isPointIn(19), false);
			assert.equal(a.isPointIn(20), true);
			assert.equal(a.isPointIn(24), true);
			assert.equal(a.isPointIn(25), false);
			assert.equal(a.isPointIn(30), false);
		});

		it('can test against a region with enough spans to require a binary search', function() {
			var a = new Region1D([10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100, 105, 110, 115]);
			for (let i = 7; i <= 117; i += 0.5) {
				const isExpectedIn = (i % 10) < 5;
				const isActuallyIn = a.isPointIn(i);
				assert.equal(isActuallyIn, isExpectedIn, "failed at " + i);
			}
		});
	});

	//---------------------------------------------------------------------------------------------
	// #doesIntersect()

	describe('#doesIntersect()', function() {
		it('false when both input regions are empty', function() {
			var a = new Region1D([]);
			var b = new Region1D([]);
			assert.equal(a.doesIntersect(b), false);
		});

		it('false when either region is empty', function() {
			var a = new Region1D([5, 8]);
			var b = new Region1D([]);
			assert.equal(a.doesIntersect(b), false);

			var a = new Region1D([5, 8, 10, 12, 20, 25]);
			var b = new Region1D([]);
			assert.equal(a.doesIntersect(b), false);

			var a = new Region1D([]);
			var b = new Region1D([5, 8]);
			assert.equal(a.doesIntersect(b), false);

			var a = new Region1D([]);
			var b = new Region1D([5, 8, 10, 12, 20, 25]);
			assert.equal(a.doesIntersect(b), false);
		});

		it('false when there is no overlap', function() {
			var a = new Region1D([3, 6, 10, 20]);
			var b = new Region1D([8, 9, 30, 40]);
			assert.equal(a.doesIntersect(b), false);

			var a = new Region1D([8, 9, 30, 40]);
			var b = new Region1D([3, 6, 10, 20]);
			assert.equal(a.doesIntersect(b), false);
		});

		it('true when there is overlap', function() {
			var a = new Region1D([3, 10, 15, 20]);
			var b = new Region1D([8, 12, 13, 16, 18, 25]);
			assert.equal(a.doesIntersect(b), true);

			var a = new Region1D([8, 12, 13, 16, 18, 25]);
			var b = new Region1D([3, 10, 15, 20]);
			assert.equal(a.doesIntersect(b), true);
		});

		it('can handle infinities', function() {
			var a = new Region1D([Number.NEGATIVE_INFINITY, 10]);
			var b = new Region1D([20, Number.POSITIVE_INFINITY]);
			assert.equal(a.doesIntersect(b), false);

			var a = new Region1D([20, Number.POSITIVE_INFINITY]);
			var b = new Region1D([Number.NEGATIVE_INFINITY, 10]);
			assert.equal(a.doesIntersect(b), false);

			var a = new Region1D([Number.NEGATIVE_INFINITY, 20]);
			var b = new Region1D([10, Number.POSITIVE_INFINITY]);
			assert.equal(a.doesIntersect(b), true);

			var a = new Region1D([10, Number.POSITIVE_INFINITY]);
			var b = new Region1D([Number.NEGATIVE_INFINITY, 20]);
			assert.equal(a.doesIntersect(b), true);
		});
	});

	//---------------------------------------------------------------------------------------------
	// #equals()

	describe('#equals()', function() {
		it('equates an empty region only to an empty region', function() {
			var a = new Region1D([]);
			var b = new Region1D([]);
			assert.equal(a.equals(b), true);

			var a = new Region1D([5, 8]);
			var b = new Region1D([]);
			assert.equal(a.equals(b), false);

			var a = new Region1D([]);
			var b = new Region1D([5, 8]);
			assert.equal(a.equals(b), false);
		});

		it('equates regions only if they have the same values', function() {
			var a = new Region1D([5, 8]);
			var b = new Region1D([5, 8]);
			assert.equal(a.equals(b), true);

			var a = new Region1D([5, 10]);
			var b = new Region1D([5, 8]);
			assert.equal(a.equals(b), false);

			var a = new Region1D([6, 8]);
			var b = new Region1D([5, 8]);
			assert.equal(a.equals(b), false);

			var a = new Region1D([5, 8, 10, 12, 20, 25]);
			var b = new Region1D([5, 8, 10, 12, 20, 25]);
			assert.equal(a.equals(b), true);

			var a = new Region1D([5, 8, 10, 13, 20, 25]);
			var b = new Region1D([5, 8, 10, 12, 20, 25]);
			assert.equal(a.equals(b), false);
		});

		it('can handle infinities', function() {
			var a = new Region1D([Number.NEGATIVE_INFINITY, 8]);
			var b = new Region1D([Number.NEGATIVE_INFINITY, 8]);
			assert.equal(a.equals(b), true);

			var a = new Region1D([Number.NEGATIVE_INFINITY, 10]);
			var b = new Region1D([Number.NEGATIVE_INFINITY, 8]);
			assert.equal(a.equals(b), false);

			var a = new Region1D([0, 8]);
			var b = new Region1D([Number.NEGATIVE_INFINITY, 8]);
			assert.equal(a.equals(b), false);

			var a = new Region1D([8, Number.POSITIVE_INFINITY]);
			var b = new Region1D([8, Number.POSITIVE_INFINITY]);
			assert.equal(a.equals(b), true);

			var a = new Region1D([7, Number.POSITIVE_INFINITY]);
			var b = new Region1D([8, Number.POSITIVE_INFINITY]);
			assert.equal(a.equals(b), false);

			var a = new Region1D([0, 8]);
			var b = new Region1D([8, Number.POSITIVE_INFINITY]);
			assert.equal(a.equals(b), false);
		});
	});

	//---------------------------------------------------------------------------------------------
	// #getAsRects()

	describe('#getAsRects()', function() {
		it('should return nothing for an empty region', function() {
			var region = Region1D.empty;
			assert.deepEqual(region.getAsRects(), []);
		});

		it('should return a single rectangle for a region with two endpoints', function() {
			var region = new Region1D([5, 8]);
			assert.deepEqual(region.getAsRects(100, 150), [
				{ x: 5, y: 100, width: 3, height: 50, left: 5, top: 100, right: 8, bottom: 150 }
			]);
		});

		it('should return many rectangles for a region with many endpoints', function() {
			var region = new Region1D([5, 8, 10, 12, 20, 25, 30, 50]);
			assert.deepEqual(region.getAsRects(100, 150), [
				{ x:  5, y: 100, width:  3, height: 50, left:  5, top: 100, right:  8, bottom: 150 },
				{ x: 10, y: 100, width:  2, height: 50, left: 10, top: 100, right: 12, bottom: 150 },
				{ x: 20, y: 100, width:  5, height: 50, left: 20, top: 100, right: 25, bottom: 150 },
				{ x: 30, y: 100, width: 20, height: 50, left: 30, top: 100, right: 50, bottom: 150 }
			]);
		});

		it('can handle infinities', function() {
			var region = new Region1D([Number.NEGATIVE_INFINITY, 8, 10, 12, 20, 25, 30, 50]);
			assert.deepEqual(region.getAsRects(100, 150), [
				{ x: Number.NEGATIVE_INFINITY, y: 100, width: Number.POSITIVE_INFINITY, height: 50, left: Number.NEGATIVE_INFINITY, top: 100, right: 8, bottom: 150 },
				{ x: 10, y: 100, width:  2, height: 50, left: 10, top: 100, right: 12, bottom: 150 },
				{ x: 20, y: 100, width:  5, height: 50, left: 20, top: 100, right: 25, bottom: 150 },
				{ x: 30, y: 100, width: 20, height: 50, left: 30, top: 100, right: 50, bottom: 150 }
			]);

			var region = new Region1D([5, 8, 10, 12, 20, 25, 30, Number.POSITIVE_INFINITY]);
			assert.deepEqual(region.getAsRects(100, 150), [
				{ x:  5, y: 100, width:  3, height: 50, left:  5, top: 100, right:  8, bottom: 150 },
				{ x: 10, y: 100, width:  2, height: 50, left: 10, top: 100, right: 12, bottom: 150 },
				{ x: 20, y: 100, width:  5, height: 50, left: 20, top: 100, right: 25, bottom: 150 },
				{ x: 30, y: 100, width: Number.POSITIVE_INFINITY, height: 50, left: 30, top: 100, right: Number.POSITIVE_INFINITY, bottom: 150 }
			]);

			var region = new Region1D([Number.NEGATIVE_INFINITY, 8, 10, 12, 20, 25, 30, Number.POSITIVE_INFINITY]);
			assert.deepEqual(region.getAsRects(100, 150), [
				{ x: Number.NEGATIVE_INFINITY, y: 100, width: Number.POSITIVE_INFINITY, height: 50, left: Number.NEGATIVE_INFINITY, top: 100, right: 8, bottom: 150 },
				{ x: 10, y: 100, width:  2, height: 50, left: 10, top: 100, right: 12, bottom: 150 },
				{ x: 20, y: 100, width:  5, height: 50, left: 20, top: 100, right: 25, bottom: 150 },
				{ x: 30, y: 100, width: Number.POSITIVE_INFINITY, height: 50, left: 30, top: 100, right: Number.POSITIVE_INFINITY, bottom: 150 }
			]);
		});
	});

	//---------------------------------------------------------------------------------------------
	// #getBounds()

	describe('#getBounds()', function() {
		it('should return nonsensical infinities for an empty region', function() {
			var region = Region1D.empty;
			assert.deepEqual(region.getBounds(), { min: Number.POSITIVE_INFINITY, max: Number.NEGATIVE_INFINITY });
		});

		it('should return the endpoints of a region with two endpoints', function() {
			var region = new Region1D([5, 8]);
			assert.deepEqual(region.getBounds(), { min: 5, max: 8 });
		});

		it('should return the endpoints of a region with many endpoints', function() {
			var region = new Region1D([5, 8, 10, 12, 20, 25, 30, 50]);
			assert.deepEqual(region.getBounds(), { min: 5, max: 50 });
		});

		it('can handle infinities', function() {
			var region = new Region1D([Number.NEGATIVE_INFINITY, 8, 10, 12, 20, 25, 30, 50]);
			assert.deepEqual(region.getBounds(), { min: Number.NEGATIVE_INFINITY, max: 50 });

			var region = new Region1D([5, 8, 10, 12, 20, 25, 30, Number.POSITIVE_INFINITY]);
			assert.deepEqual(region.getBounds(), { min: 5, max: Number.POSITIVE_INFINITY });

			var region = new Region1D([Number.NEGATIVE_INFINITY, 8, 10, 12, 20, 25, 30, Number.POSITIVE_INFINITY]);
			assert.deepEqual(region.getBounds(), { min: Number.NEGATIVE_INFINITY, max: Number.POSITIVE_INFINITY });
		});
	});
});

