/**
 * Region1D objects are semi-opaque data structures that represent a 1-dimensional
 * region on the number line, described using "spans" of included points.
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
 *   result = a.doesIntersect(b);   // Return true if the logical intersection of the two sets is nonempty.
 *   result = a.matches(b);         // Return true if the sets are identical (ignoring their Y-coordinates).
 *   result = a.getBounds(b);       // Return { minX:, maxX: } of the Region1D.
 *   result = a.getRects(y, height); // Return an array of { x:, y:, width:, height: } rectangles describing the Region1D.
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

	//---------------------------------------------------------------------------------------------
	// Helper functions.

	/**
	 * Construct a wrapper around the given private data that makes it opaque except for 
	 * those with access to the 'expectedKey'.
	 */
	makeProtectedData = function(protectedData, expectedKey) {
		return function(actualKey) {
			if (actualKey === expectedKey) return protectedData;
			else throw "Illegal access";
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
	 * Calculate the combination of the given (sorted!) arrays of 1-D region data.
	 * Returns a new array that contains the 1-D combination.
	 */
	combineData = function(array1, array2, op) {

		// Special case: Nothin' from nothin' gives nothin'.
		if (!array1.length && !array2.length)
			return [];

		let i1 = 0, i2 = 0;
		
		// Get the next coordinate with the lowest value from either array, keeping
		// track of whether it is a begin (+1) or end (-1) coordinate of its span.  O(1).
		const getNext = function() {
			if (i1 >= array1.length && i2 >= array2.length)
				return null;
			else if (i1 >= array1.length)
				return { x: array2[i2], kind: i2++ & 1 ? -1 : +1, src: 2 };
			else if (i2 >= array2.length || array1[i1] < array2[i2])
				return { x: array1[i1], kind: i1++ & 1 ? -1 : +1, src: 1 };
			else
				return { x: array2[i2], kind: i2++ & 1 ? -1 : +1, src: 2 };
		};
		
		let depth1 = 0, depth2 = 0;
		let state = 0, lastState = 0;

		// Do whatever needs to happen at the very first coordinate.
		let coord = getNext();
		
		// Process all of the coordinates until both arrays are empty, collecting
		// new spans in the 'result' array.  O(n+m).
		const result = [];
		do {
			// Do whatever happens at this first coordinate.
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
	 * Calculate whether the given arrays of 1-D region data intersect.
	 * Returns true or false.
	 */
	doesIntersectData = function(array1, array2) {
		
		// If either is empty, there's no intersection.
		if (!array1.length || !array2.length) return false;
		
		// If all of the spans of one are before all of the spans of another, there's no intersection.
		if (array1[array1.length - 1] < array2[0]
			|| array2[array2.length - 1] < array1[0]) return false;
			
		// Test all the spans against each other.
		let result = false;
		combineData(array1, array2, (depth1, lastDepth1, depth2, lastDepth2) => {
			if ((depth1 | depth2) !== (lastDepth1 | lastDepth2))
				result = true;
			return false;
		});
		return result;
	},

	/**
	 * Determine whether the given point lies within the spans of the Region1D data.
	 */
	isPointInData = function(array, x) {
		// It can't be in the empty set.
		if (!array.length) return false;
		
		// If it's outside the bounds, it's not anywhere within any of the spans.
		if (x < array[0] || x > array[array.length - 1]) return false;
		
		// Spin over all the spans for real.
		for (let i = 0, l = array.length; i < l; i += 2) {
			if (x >= array[i] && x < array[i+1]) return true;
		}
		
		return false;
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
	 * Determine if two arrays of (sorted!) 1-D region data are equivalent.
	 * Returns true if they are the same, false if they are different.
	 */
	doesDataMatch = function(array1, array2) {
		if (array1.length != array2.length) return false;
		for (let i = 0, l = array1.length; i < l; i++) {
			if (array1[i] != array2[i]) return false;
		}
		return true;
	},

	/**
	 * Transform a set of 1-D region data into an array of rectangles with
	 * the given same y and height values.
	 *
	 * Returns a new array that contains rectangles of the form { x:, y:, width: height: }.
	 */
	makeRects = function(array, y, height) {
		const result = [];
		
		for (let i = 0, l = array.length; i < l; i += 2) {
			const min = array[i  ];
			const max = array[i+1];
			result.push({ x: min, y: y, width: max - min, height: height });
		}
		
		return result;
	},

	/**
	 * Calculate a checksum that (loosely) describes the given Region1D of data, so that we
	 * can readily tell whether it is different from another.
	 */
	makeChecksum = function(array) {
		let checksum = 0;
		for (let i = 0, l = array.length; i < l; i++) {
			checksum *= 23;
			checksum += array[i] | 0;
			checksum &= ~0;
		}
		return checksum;
	},
	
	/**
	 * Check to ensure that the given object is actually a Region1D, and abort if it is not.
	 */
	verifyRegion1DType = function(obj) {
		if (!(obj instanceof Region1D)) {
			console.error("Object must be a Region1D instance.");
			throw "Type error";
		}
	},
	
	/**
	 * Check the given data to make sure that it consists of an array of ordered pairs
	 * of span start/end points.
	 */
	validateData = function(array) {
	
		const typeError = "Type error";
		const typeErrorMsg = "Expected an ordered array of numeric start/end pairs.";
		const dataError = "Data error";
		const dataErrorMsg = "Array start/end pairs are not in strictly ascending order.";

		// Make sure it's an array of even length.
		if (!isArray(array) || (array.length & 1)) {
			console.error(typeErrorMsg);
			throw typeError;
		}

		// Empty array is always valid.
		if (array.length == 0) return;

		// Get the first entry, and make sure it's a number.
		let prev = array[0];
		if (typeof prev !== 'number') {
			console.error(typeErrorMsg);
			throw typeError;
		}

		// Check each successive entry to make sure that it's (A) a number and (B) strictly
		// greater than the entry before it.
		for (let i = 1, l = array.length; i < l; i++) {
			let cur = array[i];
			if (typeof cur !== 'number') {
				console.error(typeErrorMsg);
				throw typeError;
			}
			if (cur <= prev) {
				console.error(dataErrorMsg);
				throw dataError;
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
	 * Construct a 1-D region from the given array of start/end X coordinates.  This is a
	 * proper object, with prototype methods for performing operations like
	 * union/intersect/subtract/xor.
	 *
	 * Usage:  new Region1D(array)
	 *
	 * @param array {Array} - The array of span endpoints, in pairs of start (inclusive)
	 *        and end (exclusive) X-coordinates.
	 */
	Region1D = function(array, key, checksum) {
	
		// Internal-only second parameter: A 'key' flag, indicating this data came from an
		// internal operation and does not require validation for correctness.
		if (key === privateKey) {
		
			// Internal-only third parameter: A checksum for comparisons.
			if (typeof checksum !== 'number')
				checksum = makeChecksum(array);
		}
		else if (typeof key !== 'undefined' || typeof checksum !== 'undefined') {
			// You're not allowed to specify a key unless it's the right one.
			throw "Illegal access";
		}
		else {
			// Verify that the user passed us data that makes sense.
			validateData(array);
			checksum = makeChecksum(array);
		}

		this._opaque = makeProtectedData({
			array: array,
			minX: array.length ? array[0] : pInf,
			maxX: array.length ? array[array.length - 1] : nInf,
			checksum: checksum
		}, privateKey);
	};

	/**
	 * Access the internal data, if this is an allowed thing to do.
	 */
	const getData = function(region) {
		return region._opaque(privateKey);
	};
	
	/**
	 * The row's prototype contains helpers that simply invoke the private operations
	 * to do all the hard work.
	 */
	Region1D.prototype = {
		clone: function() {
			const data = getData(this);
			return new Region1D(data.array, privateKey, data.checksum);
		},
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
		isEmpty: function() {
			return !!getData(this).array.length;
		},
		doesIntersect: function(other) {
			verifyRegion1DType(other);
			return doesIntersectData(getData(this).array, getData(other).array);
		},
		isPointIn: function(x) {
			return isPointInData(getData(this).array, Number(x));
		},
		matches: function(other) {
			verifyRegion1DType(other);
			const data = getData(this), otherData = getData(other);
			if (data.checksum != otherData.checksum) return false;
			return doesDataMatch(data.array, otherData.array);
		},
		getRects: function(y, height) {
			const data = getData(this);
			return makeRects(data.array, y, height);
		},
		getBounds: function() {
			const data = getData(this);
			return { minX: data.minX, maxX: data.maxX };
		}
	};
		
	return Region1D;

})();

// Export it for use in Node-type environments.
if (typeof exports !== 'undefined') {
	exports.Region1D = Region1D;
}
