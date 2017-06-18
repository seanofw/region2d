/**
 * First, a custom error type for regions, to make tracking and logging errors easier.
 */
function RegionError(message) {
	this.message = (this.name = "RegionError") + ": " + message;
	const stackPieces = String((new Error()).stack).split('\n');
	stackPieces.shift();
	stackPieces.shift();
	this.stack = stackPieces.join('\n');
};
RegionError.prototype = Object.create ? Object.create(Error.prototype) : new Error;

/**
 * Region1D objects are semi-opaque data structures that represent a 1-dimensional
 * set on the number line, described using "spans" of included points.
 *
 * ------------------------------------------------------------------------------------------------
 *
 * Each span in the region has an inclusive start and an exclusive end.  Spans may
 * not overlap, and always must appear in sorted order.  So, for example, consider
 * this set:
 *
 *           #####  ####      ###########       ####     #
 *        |----+----|----+----|----+----|----+----|----+----|
 *       0     5   10   15   20   25   30   35   40   45   50
 *
 * This set (inclusively) contains the numbers 3-7, 10-13, 20-30, 38-41, and 47.
 * Its Region1D representation (using only integer values) would therefore
 * consist of these ranges:
 *
 *   [3,8); [10,14); [20,31); [38,42); [47,48)
 *
 * And thus the resulting data array stored by the Region1D object would be:
 *
 *   [3, 8, 10, 14, 20, 31, 38, 42, 47, 48]
 *
 * Note that when you construct a Region1D, you *must* provide the data array
 * in sorted order, or the Region1D's constraints will be violated.
 *
 * ------------------------------------------------------------------------------------------------
 *
 * Region1Ds provide many operations that can be used to manipulate their
 * data as formal sets, including:
 *
 *   result = a.union(b);           // Return a new set that is the logical union of the two sets.
 *   result = a.intersect(b);       // Return a new set that is the logical intersection of the two sets.
 *   result = a.subtract(b);        // Return the logical subtraction of the two sets, i.e., the
 *                                  //   equivalent of a.union(b.not()), but computed more efficiently.
 *   result = a.xor(b);             // Return the exclusive-or of the two sets, i.e., those ranges
 *                                  //   which exist in one set or the other but not both.
 *   result = a.not();              // Return the logical complement of the set (which may include infinity).
 *   result = a.isEmpty();          // Return true/false if the set is empty.
 *   result = a.isPointIn(x);       // Return true if the given coordinate is contained within the set.
 *   result = a.doesIntersect(b);   // Return true if the logical intersection of the two sets is nonempty.  This is
 *                                  //   more efficient than performing "!a.intersect(b).isEmpty()".
 *   result = a.equals(b);          // Return true if the sets are identical.
 *   result = a.getBounds(b);       // Return { min:, max: } of the Region1D.
 *   result = a.getAsRects(minY, maxY); // Return an array of { x:, y:, width:, height: } rectangles describing the Region1D.
 *   result = a.getRawSpans();      // Return a raw array of numbers, the same kind that was used to construct the Region1D.
 *
 * All Region1D operations are carefully written to be bounded in both time and
 * space, and all will run in no worse than O(n) or O(n+m) time.
 */
const Region1D = (function() {
	
	const

	//---------------------------------------------------------------------------------------------
	// Global constants.
	
	// Precache positive/negative infinity locally.
	pInf = Number.POSITIVE_INFINITY,
	nInf = Number.NEGATIVE_INFINITY,

	regionError = RegionError,

	//---------------------------------------------------------------------------------------------
	// Helper functions.

	/**
	 * Construct a wrapper around the given private data that makes it opaque except for 
	 * those with access to the 'expectedKey'.
	 */
	makeProtectedData = function(protectedData, expectedKey) {
		return function(actualKey) {
			if (actualKey === expectedKey) return protectedData;
			else throw new regionError("Illegal access");
		};
	},

	/**
	 * Determine if the given object is an array. This is provided in newer JavaScript environs,
	 * but is notably lacking in older ones.  We avoid a dependency on a huge package like CoreJS
	 * by just defining the shim here.
	 */
	isArray = function(o) {
		return Array.isArray ? Array.isArray(o) : o instanceof Array;
	},
	
	//---------------------------------------------------------------------------------------------
	// 1-D raw-data-manipulation functions.

	/**
	 * Make a function that generates successive lowest values from each of the two given arrays.
	 */
	makeCoordinateGenerator = function(array1, array2) {
		let i1 = 0, i2 = 0;
		
		// Get the next coordinate with the lowest value from either array, keeping
		// track of whether it is a begin (+1) or end (-1) coordinate of its span.  O(1).
		return function() {
			if (i1 >= array1.length && i2 >= array2.length)
				return null;
			else if (i1 >= array1.length)
				return { x: array2[i2], kind: i2++ & 1 ? -1 : +1, src: 2 };
			else if (i2 >= array2.length || array1[i1] < array2[i2])
				return { x: array1[i1], kind: i1++ & 1 ? -1 : +1, src: 1 };
			else
				return { x: array2[i2], kind: i2++ & 1 ? -1 : +1, src: 2 };
		};
	},

	/**
	 * Calculate the combination of the given (sorted!) arrays of 1-D region data.
	 * Returns a new array that contains the 1-D combination.
	 */
	combineData = function(array1, array2, op) {

		// Special case: Nothin' from nothin' gives nothin'.
		if (!array1.length && !array2.length)
			return [];

		// Get the next coordinate with the lowest value from either array, keeping
		// track of whether it is a begin (+1) or end (-1) coordinate of its span.  O(1).
		const getNext = makeCoordinateGenerator(array1, array2);
		
		let depth1 = 0, depth2 = 0;
		let state = 0, lastState = 0;

		// Do whatever needs to happen at the very first coordinate.
		let coord = getNext();
		
		// Process all of the coordinates until both arrays are empty, collecting
		// new spans in the 'result' array.  O(n+m).
		const result = [];
		do {
			// Do whatever happens at this coordinate.
			if (coord.src === 1) depth1 += coord.kind;
			else depth2 += coord.kind;

			// Process any subsequent coordinates at the same 'x' offset,
			// also collecting the one after it.
			let nextCoord;
			while ((nextCoord = getNext()) && nextCoord.x === coord.x) {
				if (nextCoord.src === 1) depth1 += nextCoord.kind;
				else depth2 += nextCoord.kind;
			}
			
			// Change the state to match whatever happened here.
			lastState = state;
			state = op(depth1, depth2);

			// If we entered/exited a new span, emit a start/end X value.
			if (state !== lastState) {
				result.push(coord.x);
			}

			coord = nextCoord;
		} while (coord);

		return result;
	},

	/**
	 * Calculate the union of the given arrays of 1-D region data.
	 * Returns a new array that contains the 1-D union.
	 */
	unionData = (array1, array2) => combineData(array1, array2,
		(depth1, depth2) => (depth1 | depth2)
	),

	/**
	 * Calculate the intersection of the given arrays of 1-D region data.
	 * Returns a new array that contains the 1-D intersection.
	 */
	intersectData = (array1, array2) => combineData(array1, array2,
		(depth1, depth2) => (depth1 & depth2)
	),

	/**
	 * Calculate the exclusive-or of the given arrays of 1-D region data.
	 * Returns a new array that contains the 1-D exclusive-or.
	 */
	xorData = (array1, array2) => combineData(array1, array2,
		(depth1, depth2) => (depth1 ^ depth2)
	),

	/**
	 * Calculate the difference of the given arrays of 1-D region data.
	 * Returns a new array that contains the 1-D difference.
	 */
	subtractData = (array1, array2) => combineData(array1, array2,
		(depth1, depth2) => (depth1 & ~depth2)
	),

	/**
	 * Calculate whether the given arrays of 1-D region data intersect, and
	 * if so, how.  This requires constant memory, but it may take O(n+m) time.
	 * 
	 * If 'earlyOut' is true, this will return only '' or 'intersects', and
	 * it will return that answer as soon as it possibly can, skipping testing
	 * successive data if possible.
	 * 
	 * Returns one of:
	 *    '': no intersection
	 *    'intersect': there is at least some kind of intersection
	 *    'a-contain-b': array1 is a proper superset of array2
	 *    'b-contain-a': array2 is a proper superset of array1
	 *    'equal': array1 and array2 represent the same exact region
	 */
	relateData = function(array1, array2, earlyOut) {
		
		// If either is empty, there's no intersection.
		if (!array1.length || !array2.length) return '';
		
		// If all of the spans of one are before all of the spans of another, there's no intersection.
		if (array1[array1.length - 1] < array2[0]
			|| array2[array2.length - 1] < array1[0]) return '';
			
		// Test all the spans against each other.
		let depth1 = 0, depth2 = 0;
		const getNext = makeCoordinateGenerator(array1, array2);

		// Do whatever needs to happen at the very first coordinate.
		let coord = getNext();

		// Bit flags:  We start out assuming A and B both contain each other, but there
		// is not yet an intersection.  It's weird, but go with it.
		let result = 3;

		do {
			// Do whatever happens at this coordinate.
			if (coord.src === 1) depth1 += coord.kind;
			else depth2 += coord.kind;

			// Process any subsequent coordinates at the same 'x' offset,
			// also collecting the one after it.
			let nextCoord;
			while ((nextCoord = getNext()) && nextCoord.x === coord.x) {
				if (nextCoord.src === 1) depth1 += nextCoord.kind;
				else depth2 += nextCoord.kind;
			}
			
			// Change the state to match whatever happened here.
			if (depth1 & depth2) {
				// Got an intersection.
				result |= 4;
				if (earlyOut) return 'intersect';
			}
			else if (depth2 & ~depth1) {
				// A does not contain B.
				result &= ~1;
			}
			else if (depth1 & ~depth2) {
				// B does not contain A.
				result &= ~2;
			}

			coord = nextCoord;
		} while (coord);

		// Choose an answer based on the resulting flag bits.
		switch (result) {
			case 4: return 'intersect';		// 1 0 0
			case 5: return 'a-contain-b';	// 1 0 1
			case 6: return 'b-contain-a';	// 1 1 0
			case 7: return 'equal';			// 1 1 1
			default: return '';				// 0 * *
		}
	},

	/**
	 * Determine whether the given point lies within the spans of the Region1D data.
	 */
	isPointInData = function(array, x) {
		// It can't be in the empty set.
		if (!array.length) return false;
		
		// If it's outside the bounds, it's not anywhere within any of the spans.
		if (x < array[0] || x > array[array.length - 1]) return false;
		
		if (array.length <= 8) {
			// Spin over all the spans in a simple linear search.
			for (let i = 0, l = array.length; i < l; i += 2) {
				if (x >= array[i] && x < array[i+1]) return true;
			}
			return false;
		}
		else {
			// Binary search to find the array index that x is either after or at.
			let start = 0, end = array.length;
			let index = 0;
			while (start < end) {
				const midpt = ((start + end) / 2) & ~0;
				const value = array[midpt];
				if (x === value) {
					index = midpt;
					break;
				}
				else if (x < value) {
					end = midpt;
				}
				else {
					index = midpt;
					start = midpt + 1;
				}
			}

			// 'index' now is the closest value at or before 'x', so we just need to see if
			// it's an odd or even array index to know if 'x' is inside the span or outside it.
			return !(index & 1);
		}
	},
	
	/**
	 * Calculate a complement of the 1-D (sorted!) region data.
	 * This is easy:
	 *    If it starts with -Inf, remove that; otherwise, prepend -Inf.
	 *    If it ends with +Inf, remove that; otherwise, append +Inf.
	 * Returns a new array that contains the 1D complement.
	 */
	notData = function(array) {
		const newArray = [];

		let src = 0;

		if (!array.length) {
			newArray.push(nInf);
			newArray.push(pInf);
			return newArray;
		}
		else {
			if (array[src] != nInf) newArray.push(nInf);
			else src++;
		}

		while (src < array.length - 1) {
			newArray.push(array[src++]);
		}

		if (array[src] != pInf) {
			newArray.push(array[src++]);
			newArray.push(pInf);
		}
		
		return newArray;
	},
	
	/**
	 * Calculate a new region whose coordinates have all been translated/scaled by the given amounts.
	 */
	transformData = function(array, ratio, delta) {
		delta = Number(delta);
		if (!(nInf < delta && delta < pInf))	// Catches other NaNs as well as infinities.
			throw new regionError("Invalid translation delta");
		ratio = Number(ratio);
		if (!(nInf < ratio && ratio < pInf) || ratio === 0)		// Catches other NaNs as well as infinities.
			throw new regionError("Invalid scale ratio");

		const newArray = [];
		for (let i = 0, l = array.length; i < l; i++) {
			newArray[i] = array[i] * ratio + delta;
		}
		
		return newArray;
	},
	
	/**
	 * Determine if two arrays of (sorted!) 1-D region data are equivalent.
	 * Returns true if they are the same, false if they are different.
	 */
	arrayEquals = function(array1, array2) {
		if (array1.length !== array2.length) return false;
		for (let i = 0, l = array1.length; i < l; i++) {
			if (array1[i] !== array2[i]) return false;
		}
		return true;
	},

	/**
	 * Transform a set of 1-D region data into an array of rectangles with
	 * the given same y and height values.
	 *
	 * Returns a new array that contains rectangles of the form { x:, y:, width:, height:, left:, top:, right:, bottom: }.
	 */
	makeRects = function(array, minY, maxY, result) {
		const height = maxY - minY;
		
		for (let i = 0, l = array.length; i < l; i += 2) {
			const minX = array[i  ];
			const maxX = array[i+1];
			result.push({
				x: minX, y: minY, width: maxX - minX, height:height,
				left: minX, top: minY, right: maxX, bottom: maxY
			});
		}
		
		return result;
	},

	/**
	 * Clone a set of 1-D region data into a raw array.
	 * Returns a new array that contains pairs of points.
	 */
	makeRawSpans = function(array) {
		const result = [];
		for (let i = 0, l = array.length; i < l; i += 2) {
			result.push(array[i  ]);
			result.push(array[i+1]);
		}
		return result;
	},

	/**
	 * Calculate a hash that (loosely) describes the given Region1D of data, so that we
	 * can readily tell whether it is different from another.
	 */
	makeHashCode = function(array) {
		let hash = 0;
		for (let i = 0, l = array.length; i < l; i++) {
			hash *= 23;
			hash += array[i] | 0;
			hash &= ~0;
		}
		return hash;
	},
	
	/**
	 * Check to ensure that the given object is actually a Region1D, and abort if it is not.
	 */
	verifyRegion1DType = function(obj) {
		if (!(obj instanceof Region1D)) {
			throw new regionError("Object must be a Region1D instance.");
		}
	},
	
	/**
	 * Check the given data to make sure that it consists of an array of ordered pairs
	 * of span start/end points.
	 */
	validateData = function(array) {
	
		const typeErrorMsg = "Expected an ordered array of numeric start/end pairs.";
		const dataErrorMsg = "Array start/end pairs are not in strictly ascending order.";

		// Make sure it's an array of even length.
		if (!isArray(array) || (array.length & 1)) {
			throw new regionError(typeErrorMsg);
		}

		// Empty array is always valid.
		if (array.length == 0) return;

		// Get the first entry, and make sure it's a number.
		let prev = array[0];
		if (typeof prev !== 'number') {
			throw new regionError(typeErrorMsg);
		}

		// Check each successive entry to make sure that it's (A) a number and (B) strictly
		// greater than the entry before it.
		for (let i = 1, l = array.length; i < l; i++) {
			let cur = array[i];
			if (typeof cur !== 'number') {
				throw new regionError(typeErrorMsg);
			}
			if (cur <= prev) {
				throw new regionError(dataErrorMsg);
			}
			prev = cur;
		}
	},
	
	//---------------------------------------------------------------------------------------------
	// Public interface.
	
	/**
	 * A special private object used to flag internal constructions in such a way that
	 * external callers' data must be validated, but internal data can skip those checks.
	 */
	privateKey = {},

	/**
	 * Access the internal data, if this is an allowed thing to do.
	 */
	getData = function(region) {
		return region._opaque(privateKey);
	};

	/**
	 * Construct a 1-D region from the given array of start/end X coordinates.  This is a
	 * proper object, with prototype methods for performing operations like
	 * union/intersect/subtract/xor.
	 *
	 * Usage:  new Region1D(array)
	 *
	 * @param array {Array} - The array of span endpoints, in pairs of start (inclusive)
	 *        and end (exclusive) X-coordinates.
	 */
	function Region1D(array, key, hash) {
	
		// Internal-only second parameter: A 'key' flag, indicating this data came from an
		// internal operation and does not require validation for correctness.
		if (key === privateKey) {
		
			// Internal-only third parameter: A hash for comparisons.
			if (typeof hash !== 'number')
				hash = makeHashCode(array);
		}
		else if (typeof key !== 'undefined' || typeof hash !== 'undefined') {
			// You're not allowed to specify a key unless it's the right one.
			throw new regionError("Illegal access");
		}
		else {
			// Verify that the user passed us data that makes sense.
			validateData(array);
			hash = makeHashCode(array);
		}

		this._opaque = makeProtectedData({
			array: array,
			min: array.length ? array[0] : pInf,
			max: array.length ? array[array.length - 1] : nInf,
			hash: hash
		}, privateKey);
	};
	
	/**
	 * The row's prototype contains helpers that simply invoke the private operations
	 * to do all the hard work.
	 */
	Region1D.prototype = {
		union: function(other) {
			verifyRegion1DType(other);
			const data = getData(this), otherData = getData(other);
			return new Region1D(unionData(data.array, otherData.array), privateKey);
		},
		intersect: function(other) {
			verifyRegion1DType(other);
			const data = getData(this), otherData = getData(other);
			return new Region1D(intersectData(data.array, otherData.array), privateKey);
		},
		subtract: function(other) {
			verifyRegion1DType(other);
			const data = getData(this), otherData = getData(other);
			return new Region1D(subtractData(data.array, otherData.array), privateKey);
		},
		xor: function(other) {
			verifyRegion1DType(other);
			const data = getData(this), otherData = getData(other);
			return new Region1D(xorData(data.array, otherData.array), privateKey);
		},
		not: function() {
			const data = getData(this);
			return new Region1D(notData(data.array), privateKey);
		},
		transform: function(scale, offset) {
			const data = getData(this);
			return new Region1D(transformData(data.array, scale, offset));		// No privateKey forces a data check, since we could have lost precision.
		},
		translate: function(offset) {
			const data = getData(this);
			return new Region1D(transformData(data.array, 1.0, offset));		// No privateKey forces a data check, since we could have lost precision.
		},
		scale: function(scale) {
			const data = getData(this);
			return new Region1D(transformData(data.array, scale, 0));		// No privateKey forces a data check, since we could have lost precision.
		},
		isEmpty: function() {
			return !getData(this).array.length;
		},
		getCount: function() {
			return getData(this).array.length >> 1;
		},
		doesIntersect: function(other) {
			verifyRegion1DType(other);
			return !!relateData(getData(this).array, getData(other).array, true);
		},
		relate: function(other) {
			verifyRegion1DType(other);
			return relateData(getData(this).array, getData(other).array, false);
		},
		isPointIn: function(x) {
			return isPointInData(getData(this).array, Number(x));
		},
		equals: function(other) {
			verifyRegion1DType(other);
			const data = getData(this), otherData = getData(other);
			if (data === otherData) return true;
			if (data.hash !== otherData.hash) return false;
			return arrayEquals(data.array, otherData.array);
		},
		getRawSpans: function() {
			const data = getData(this);
			return makeRawSpans(data.array);
		},
		getAsRects: function(minY, maxY, destArray) {
			const data = getData(this);
			return makeRects(data.array, minY, maxY, destArray || []);
		},
		getBounds: function() {
			const data = getData(this);
			return { min: data.min, max: data.max };
		},
		getHashCode: function() {
			return getData(this).hash;
		}
	};

	// Construct a convenient shareable 'empty' instance.
	Region1D.empty = new Region1D([], privateKey, 0);
		
	return Region1D;

})();

export default Region1D;
export { RegionError, Region1D };
