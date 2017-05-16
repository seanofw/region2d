
var assert = require('assert');
var regionlib = require('../lib/region.debug.js');

var Region1D = regionlib.Region1D;

describe('Region1D', function() {
	describe('new()', function() {
		it('should create regions from empty arrays', function() {
			var region = new Region1D([]);
			assert.deepEqual(region.getRects(0, 1), []);
		});

		it('should create simple regions from two endpoints', function() {
			var region = new Region1D([5, 8]);
			assert.deepEqual(region.getRects(0, 1), [
				{ x:5, width:3, y:0, height: 1 }
			]);
		});

		it('should create complex regions from many endpoints', function() {
			var region = new Region1D([5, 8, 10, 12, 20, 25, 30, 50]);
			assert.deepEqual(region.getRects(0, 1), [
				{ x:5, width:3, y:0, height: 1 },
				{ x:10, width:2, y:0, height: 1 },
				{ x:20, width:5, y:0, height: 1 },
				{ x:30, width:20, y:0, height: 1 }
			]);
		});
	});

	describe('#union()', function() {
		it('produces an empty region when both input regions are empty', function() {
			var a = new Region1D([]);
			var b = new Region1D([]);
			var result = a.union(b);
			assert.deepEqual(result.getRects(0, 1), []);
		});

		it('produces the first input when the second input is empty', function() {
			var a = new Region1D([5, 8]);
			var b = new Region1D([]);
			var result = a.union(b);
			assert.deepEqual(result.getRects(0, 1), [
				{ x:5, width:3, y:0, height: 1 },
			]);

			var a = new Region1D([5, 8, 10, 12, 20, 25]);
			var b = new Region1D([]);
			var result = a.union(b);
			assert.deepEqual(result.getRects(0, 1), [
				{ x:5, width:3, y:0, height: 1 },
				{ x:10, width:2, y:0, height: 1 },
				{ x:20, width:5, y:0, height: 1 },
			]);
		});

		it('produces the second input when the first input is empty', function() {
			var a = new Region1D([]);
			var b = new Region1D([5, 8]);
			var result = a.union(b);
			assert.deepEqual(result.getRects(0, 1), [
				{ x:5, width:3, y:0, height: 1 }
			]);

			var a = new Region1D([]);
			var b = new Region1D([5, 8, 10, 12, 20, 25]);
			var result = a.union(b);
			assert.deepEqual(result.getRects(0, 1), [
				{ x:5, width:3, y:0, height: 1 },
				{ x:10, width:2, y:0, height: 1 },
				{ x:20, width:5, y:0, height: 1 },
			]);
		});

		it('combines inputs when there is no overlap', function() {
			var a = new Region1D([3, 6, 10, 20]);
			var b = new Region1D([8, 9, 30, 40]);
			var result = a.union(b);
			assert.deepEqual(result.getRects(0, 1), [
				{ x:3, width:3, y:0, height: 1 },
				{ x:8, width:1, y:0, height: 1 },
				{ x:10, width:10, y:0, height: 1 },
				{ x:30, width:10, y:0, height: 1 }
			]);

			var a = new Region1D([8, 9, 30, 40]);
			var b = new Region1D([3, 6, 10, 20]);
			var result = a.union(b);
			assert.deepEqual(result.getRects(0, 1), [
				{ x:3, width:3, y:0, height: 1 },
				{ x:8, width:1, y:0, height: 1 },
				{ x:10, width:10, y:0, height: 1 },
				{ x:30, width:10, y:0, height: 1 }
			]);
		});

		it('unions spans when there is overlap', function() {
			var a = new Region1D([3, 10, 15, 20]);
			var b = new Region1D([8, 12, 13, 16, 18, 25]);
			var result = a.union(b);
			assert.deepEqual(result.getRects(0, 1), [
				{ x:3, width:9, y:0, height: 1 },
				{ x:13, width:12, y:0, height: 1 }
			]);

			var a = new Region1D([8, 12, 13, 16, 18, 25]);
			var b = new Region1D([3, 10, 15, 20]);
			var result = a.union(b);
			assert.deepEqual(result.getRects(0, 1), [
				{ x:3, width:9, y:0, height: 1 },
				{ x:13, width:12, y:0, height: 1 }
			]);
		});

		it('can handle infinities', function() {
			var a = new Region1D([Number.NEGATIVE_INFINITY, 10]);
			var b = new Region1D([20, Number.POSITIVE_INFINITY]);
			var result = a.union(b);
			assert.deepEqual(result.getRects(0, 1), [
				{ x:Number.NEGATIVE_INFINITY, width:Number.POSITIVE_INFINITY, y:0, height: 1 },
				{ x:20, width:Number.POSITIVE_INFINITY, y:0, height: 1 }
			]);

			var a = new Region1D([20, Number.POSITIVE_INFINITY]);
			var b = new Region1D([Number.NEGATIVE_INFINITY, 10]);
			var result = a.union(b);
			assert.deepEqual(result.getRects(0, 1), [
				{ x:Number.NEGATIVE_INFINITY, width:Number.POSITIVE_INFINITY, y:0, height: 1 },
				{ x:20, width:Number.POSITIVE_INFINITY, y:0, height: 1 }
			]);
		});
	});

	describe('#intersect()', function() {
		it('produces an empty region when both input regions are empty', function() {
			var a = new Region1D([]);
			var b = new Region1D([]);
			var result = a.intersect(b);
			assert.deepEqual(result.getRects(0, 1), []);
		});

		it('produces an empty region when either region is empty', function() {
			var a = new Region1D([5, 8]);
			var b = new Region1D([]);
			var result = a.intersect(b);
			assert.deepEqual(result.getRects(0, 1), []);

			var a = new Region1D([5, 8, 10, 12, 20, 25]);
			var b = new Region1D([]);
			var result = a.intersect(b);
			assert.deepEqual(result.getRects(0, 1), []);

			var a = new Region1D([]);
			var b = new Region1D([5, 8]);
			var result = a.intersect(b);
			assert.deepEqual(result.getRects(0, 1), []);

			var a = new Region1D([]);
			var b = new Region1D([5, 8, 10, 12, 20, 25]);
			var result = a.intersect(b);
			assert.deepEqual(result.getRects(0, 1), []);
		});

		it('produces an empty region when there is no overlap', function() {
			var a = new Region1D([3, 6, 10, 20]);
			var b = new Region1D([8, 9, 30, 40]);
			var result = a.intersect(b);
			assert.deepEqual(result.getRects(0, 1), []);

			var a = new Region1D([8, 9, 30, 40]);
			var b = new Region1D([3, 6, 10, 20]);
			var result = a.intersect(b);
			assert.deepEqual(result.getRects(0, 1), []);
		});

		it('results only in the overlap when there is overlap', function() {
			var a = new Region1D([3, 10, 15, 20]);
			var b = new Region1D([8, 12, 13, 16, 18, 25]);
			var result = a.intersect(b);
			assert.deepEqual(result.getRects(0, 1), [
				{ x:8, width:2, y:0, height: 1 },
				{ x:15, width:1, y:0, height: 1 },
				{ x:18, width:2, y:0, height: 1 }
			]);

			var a = new Region1D([8, 12, 13, 16, 18, 25]);
			var b = new Region1D([3, 10, 15, 20]);
			var result = a.intersect(b);
			assert.deepEqual(result.getRects(0, 1), [
				{ x:8, width:2, y:0, height: 1 },
				{ x:15, width:1, y:0, height: 1 },
				{ x:18, width:2, y:0, height: 1 }
			]);
		});

		it('can handle infinities', function() {
			var a = new Region1D([Number.NEGATIVE_INFINITY, 20]);
			var b = new Region1D([10, Number.POSITIVE_INFINITY]);
			var result = a.intersect(b);
			assert.deepEqual(result.getRects(0, 1), [
				{ x:10, width:10, y:0, height: 1 }
			]);

			var a = new Region1D([10, Number.POSITIVE_INFINITY]);
			var b = new Region1D([Number.NEGATIVE_INFINITY, 20]);
			var result = a.intersect(b);
			assert.deepEqual(result.getRects(0, 1), [
				{ x:10, width:10, y:0, height: 1 }
			]);
		});
	});

	describe('#xor()', function() {
		it('produces an empty region when both input regions are empty', function() {
			var a = new Region1D([]);
			var b = new Region1D([]);
			var result = a.xor(b);
			assert.deepEqual(result.getRects(0, 1), []);
		});

		it('produces the first input when the second input is empty', function() {
			var a = new Region1D([5, 8]);
			var b = new Region1D([]);
			var result = a.xor(b);
			assert.deepEqual(result.getRects(0, 1), [
				{ x:5, width:3, y:0, height: 1 },
			]);

			var a = new Region1D([5, 8, 10, 12, 20, 25]);
			var b = new Region1D([]);
			var result = a.xor(b);
			assert.deepEqual(result.getRects(0, 1), [
				{ x:5, width:3, y:0, height: 1 },
				{ x:10, width:2, y:0, height: 1 },
				{ x:20, width:5, y:0, height: 1 },
			]);
		});

		it('produces the second input when the first input is empty', function() {
			var a = new Region1D([]);
			var b = new Region1D([5, 8]);
			var result = a.xor(b);
			assert.deepEqual(result.getRects(0, 1), [
				{ x:5, width:3, y:0, height: 1 }
			]);

			var a = new Region1D([]);
			var b = new Region1D([5, 8, 10, 12, 20, 25]);
			var result = a.xor(b);
			assert.deepEqual(result.getRects(0, 1), [
				{ x:5, width:3, y:0, height: 1 },
				{ x:10, width:2, y:0, height: 1 },
				{ x:20, width:5, y:0, height: 1 },
			]);
		});

		it('combines inputs when there is no overlap', function() {
			var a = new Region1D([3, 6, 10, 20]);
			var b = new Region1D([8, 9, 30, 40]);
			var result = a.xor(b);
			assert.deepEqual(result.getRects(0, 1), [
				{ x:3, width:3, y:0, height: 1 },
				{ x:8, width:1, y:0, height: 1 },
				{ x:10, width:10, y:0, height: 1 },
				{ x:30, width:10, y:0, height: 1 }
			]);

			var a = new Region1D([8, 9, 30, 40]);
			var b = new Region1D([3, 6, 10, 20]);
			var result = a.xor(b);
			assert.deepEqual(result.getRects(0, 1), [
				{ x:3, width:3, y:0, height: 1 },
				{ x:8, width:1, y:0, height: 1 },
				{ x:10, width:10, y:0, height: 1 },
				{ x:30, width:10, y:0, height: 1 }
			]);
		});

		it('results in spans only where there is no overlap', function() {
			var a = new Region1D([3, 10, 15, 20]);
			var b = new Region1D([8, 12, 13, 16, 18, 25]);
			var result = a.xor(b);
			assert.deepEqual(result.getRects(0, 1), [
				{ x:3, width:5, y:0, height: 1 },
				{ x:10, width:2, y:0, height: 1 },
				{ x:13, width:2, y:0, height: 1 },
				{ x:16, width:2, y:0, height: 1 },
				{ x:20, width:5, y:0, height: 1 }
			]);

			var a = new Region1D([8, 12, 13, 16, 18, 25]);
			var b = new Region1D([3, 10, 15, 20]);
			var result = a.xor(b);
			assert.deepEqual(result.getRects(0, 1), [
				{ x:3, width:5, y:0, height: 1 },
				{ x:10, width:2, y:0, height: 1 },
				{ x:13, width:2, y:0, height: 1 },
				{ x:16, width:2, y:0, height: 1 },
				{ x:20, width:5, y:0, height: 1 }
			]);
		});

		it('can handle infinities', function() {
			var a = new Region1D([Number.NEGATIVE_INFINITY, 20]);
			var b = new Region1D([10, Number.POSITIVE_INFINITY]);
			var result = a.xor(b);
			assert.deepEqual(result.getRects(0, 1), [
				{ x:Number.NEGATIVE_INFINITY, width:Number.POSITIVE_INFINITY, y:0, height: 1 },
				{ x:20, width:Number.POSITIVE_INFINITY, y:0, height: 1 }
			]);

			var a = new Region1D([10, Number.POSITIVE_INFINITY]);
			var b = new Region1D([Number.NEGATIVE_INFINITY, 20]);
			var result = a.xor(b);
			assert.deepEqual(result.getRects(0, 1), [
				{ x:Number.NEGATIVE_INFINITY, width:Number.POSITIVE_INFINITY, y:0, height: 1 },
				{ x:20, width:Number.POSITIVE_INFINITY, y:0, height: 1 }
			]);
		});
	});

	describe('#subtract()', function() {
		it('produces an empty region when both input regions are empty', function() {
			var a = new Region1D([]);
			var b = new Region1D([]);
			var result = a.subtract(b);
			assert.deepEqual(result.getRects(0, 1), []);
		});

		it('produces the first input when the second input is empty', function() {
			var a = new Region1D([5, 8]);
			var b = new Region1D([]);
			var result = a.subtract(b);
			assert.deepEqual(result.getRects(0, 1), [
				{ x:5, width:3, y:0, height: 1 },
			]);

			var a = new Region1D([5, 8, 10, 12, 20, 25]);
			var b = new Region1D([]);
			var result = a.subtract(b);
			assert.deepEqual(result.getRects(0, 1), [
				{ x:5, width:3, y:0, height: 1 },
				{ x:10, width:2, y:0, height: 1 },
				{ x:20, width:5, y:0, height: 1 },
			]);
		});

		it('produces nothing when the first input is empty', function() {
			var a = new Region1D([]);
			var b = new Region1D([5, 8]);
			var result = a.subtract(b);
			assert.deepEqual(result.getRects(0, 1), []);

			var a = new Region1D([]);
			var b = new Region1D([5, 8, 10, 12, 20, 25]);
			var result = a.subtract(b);
			assert.deepEqual(result.getRects(0, 1), []);
		});

		it('leaves the first intact if there is no overlap', function() {
			var a = new Region1D([3, 6, 10, 20]);
			var b = new Region1D([8, 9, 30, 40]);
			var result = a.subtract(b);
			assert.deepEqual(result.getRects(0, 1), [
				{ x:3, width:3, y:0, height: 1 },
				{ x:10, width:10, y:0, height: 1 }
			]);

			var a = new Region1D([8, 9, 30, 40]);
			var b = new Region1D([3, 6, 10, 20]);
			var result = a.subtract(b);
			assert.deepEqual(result.getRects(0, 1), [
				{ x:8, width:1, y:0, height: 1 },
				{ x:30, width:10, y:0, height: 1 }
			]);
		});

		it('removes pieces of spans only where there is overlap', function() {
			var a = new Region1D([3, 10, 15, 20]);
			var b = new Region1D([8, 12, 13, 16, 18, 25]);
			var result = a.subtract(b);
			assert.deepEqual(result.getRects(0, 1), [
				{ x:3, width:5, y:0, height: 1 },
				{ x:16, width:2, y:0, height: 1 }
			]);

			var a = new Region1D([8, 12, 13, 16, 18, 25]);
			var b = new Region1D([3, 10, 15, 20]);
			var result = a.subtract(b);
			assert.deepEqual(result.getRects(0, 1), [
				{ x:10, width:2, y:0, height: 1 },
				{ x:13, width:2, y:0, height: 1 },
				{ x:20, width:5, y:0, height: 1 }
			]);
		});

		it('can handle infinities', function() {
			var a = new Region1D([Number.NEGATIVE_INFINITY, 20]);
			var b = new Region1D([10, Number.POSITIVE_INFINITY]);
			var result = a.subtract(b);
			assert.deepEqual(result.getRects(0, 1), [
				{ x:Number.NEGATIVE_INFINITY, width:Number.POSITIVE_INFINITY, y:0, height: 1 }
			]);

			var a = new Region1D([10, Number.POSITIVE_INFINITY]);
			var b = new Region1D([Number.NEGATIVE_INFINITY, 20]);
			var result = a.subtract(b);
			assert.deepEqual(result.getRects(0, 1), [
				{ x:20, width:Number.POSITIVE_INFINITY, y:0, height: 1 }
			]);
		});
	});

	describe('#not()', function() {
		it('produces an infinite region when the input region is empty', function() {
			var a = new Region1D([]);
			var result = a.not();
			assert.deepEqual(result.getRects(0, 1), [
				{ x:Number.NEGATIVE_INFINITY, width:Number.POSITIVE_INFINITY, y:0, height: 1 }
			]);
		});

		it('produces a complemented infinite region when the input region is finite', function() {
			var a = new Region1D([5, 8]);
			var result = a.not();
			assert.deepEqual(result.getRects(0, 1), [
				{ x:Number.NEGATIVE_INFINITY, width:Number.POSITIVE_INFINITY, y:0, height: 1 },
				{ x:8, width:Number.POSITIVE_INFINITY, y:0, height: 1 }
			]);

			var a = new Region1D([5, 8, 10, 12, 20, 25]);
			var result = a.not();
			assert.deepEqual(result.getRects(0, 1), [
				{ x:Number.NEGATIVE_INFINITY, width:Number.POSITIVE_INFINITY, y:0, height: 1 },
				{ x:8, width:2, y:0, height: 1 },
				{ x:12, width:8, y:0, height: 1 },
				{ x:25, width:Number.POSITIVE_INFINITY, y:0, height: 1 },
			]);
		});

		it('produces a complemented finite region when the input region is infinite', function() {
			var a = new Region1D([Number.NEGATIVE_INFINITY, 10, 15, Number.POSITIVE_INFINITY]);
			var result = a.not();
			assert.deepEqual(result.getRects(0, 1), [
				{ x:10, width:5, y:0, height: 1 }
			]);

			var a = new Region1D([Number.NEGATIVE_INFINITY, 5, 8, 10, 12, 20]);
			var result = a.not();
			assert.deepEqual(result.getRects(0, 1), [
				{ x:5, width:3, y:0, height: 1 },
				{ x:10, width:2, y:0, height: 1 },
				{ x:20, width:Number.POSITIVE_INFINITY, y:0, height: 1 },
			]);

			var a = new Region1D([5, 8, 10, 12, 20, Number.POSITIVE_INFINITY]);
			var result = a.not();
			assert.deepEqual(result.getRects(0, 1), [
				{ x:Number.NEGATIVE_INFINITY, width:Number.POSITIVE_INFINITY, y:0, height: 1 },
				{ x:8, width:2, y:0, height: 1 },
				{ x:12, width:8, y:0, height: 1 },
			]);
		});
	});
});

