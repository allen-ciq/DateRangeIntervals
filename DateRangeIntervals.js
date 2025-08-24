// should bundle and link bundled index
// import Logger from 'log-ng';
const Logger = require('log-ng');
const path = require('path');

const logger = new Logger(path.basename(__filename));

/**
 * Creates an array of intervals from the passed date range and implements a
 * visitor-like pattern.  It is "visitor-like" because the visitor is not
 * completely decoupled from the data (ie. date intervals).  This is necessary
 * because the data are dynamic and the visitor directs how they are traversed.
 *
 * @constructor
 * @param {Date|number|string} start - The start date of the range.
 * @param {Date|number|string} end - The end date of the range.
 * @param {string} interval - The interval for segmentation ('second', 'minute', 'hour', or 'day').
 * @throws {Error} Throws an error if an invalid interval is provided.
 */
function DateRangeIntervals(start, end, interval){
	if(!new.target){
		return new DateRangeIntervals(...arguments);
	}

	const segments = [];
	let iStart;
	let iEnd;
	const startDate = new Date(start);
	const endDate = new Date(end);
	const curDate = new Date(start);
	const lowerInterval = {
		'minute': 'second',
		'hour': 'minute',
		'day': 'hour',
		'week': 'day',
		'month': 'day',
		'quarter': 'month',
		'year': 'month'
	}[interval];

	const advanceByInterval = {
		'second': () => curDate.setUTCSeconds(curDate.getUTCSeconds() + 1),
		'minute': () => curDate.setUTCMinutes(curDate.getUTCMinutes() + 1),
		'hour': () => curDate.setUTCHours(curDate.getUTCHours() + 1),
		'day': () => curDate.setUTCDate(curDate.getUTCDate() + 1),
		'week': () => curDate.setUTCDate(curDate.getUTCDate() + 7),
		'month': () => curDate.setUTCMonth(curDate.getUTCMonth() + 1),
		'quarter': () => curDate.setUTCMonth(curDate.getUTCMonth() + 3),
		'year': () => curDate.setUTCFullYear(curDate.getUTCFullYear() + 1)
	}[interval];

	if(!advanceByInterval){
		throw new Error(`Invalid interval '${interval}' provided.`);
	}

	while(curDate < endDate){
		segments.push(new Date(curDate));
		advanceByInterval();
	}
	segments.push(endDate);

	logger.debug(`Created ${segments.length-1} ${interval} segments for range (${startDate.toISOString()}, ${endDate.toISOString()})`);

	Object.defineProperties(this, {
		/**
		 * Returns an iterator object for iterating over date range intervals.
		 * @function
		 * @name DateRangeIntervals[Symbol.iterator]
		 * @returns {Iterator<Date[]>} Iterator object.
		 */
		[Symbol.iterator]: {
			value: function*(){
				for(let i = 0; i < segments.length-1; i++){
					// the idea is to mark the current segment
					// a note of caution that the interval start/end is only defined while iterating
					// not so sure this is a good idea; maybe revisit later
					iStart = segments[i];
					iEnd = segments[i + 1];
					yield [iStart, iEnd];
				}
				iStart = undefined;
				iEnd = undefined;
			}
		},
		end: {
			get: () => iEnd || endDate
		},
		interval: {
			get: () => interval
		},
		/**
		 * Indicates whether the collection forms a congruent partition of the
		 * entire date range.  A congruent partition divides the range into
		 * segments of equal size, ie. is the final segment a full interval
		 * @type {boolean}
		 */
		isCongruentPartition: {
			value: curDate == endDate
		},
		/**
		 * The number of intervals in the date range.
		 * @type {number}
		 */
		length: {
			// get: () => iStart === undefined ? segments.length-1 : 1
			get: () => segments.length-1
		},
		start: {
			get: () => iStart || startDate
		},
		/**
		 * Accepts a visitor function to perform operations on each segment.
		 * The visitor must be an instanceof DateRangeIntervalVisitor and
		 * implement `visit(DateRangeIntervals)`.
		 *
		 * @async
		 * @function
		 * @name DateRangeIntervals#accept
		 * @param {function} visitor - The visitor function.
		 */
		accept: {
			value: async function(visitor){
				if(!(visitor instanceof DateRangeIntervalVisitor)){
					throw new Error('Invalid visitor: accepts only DateRangeIntervalVisitor');
				}
				for(const [start, end] of this){
					logger.debug(`visiting ${start.toISOString()} - ${end.toISOString()}`);
					const subdivide = await visitor.visit(this);
					if(subdivide && visitor.subIntervals && lowerInterval){
						logger.debug(`recursing lower for subinterval: ${lowerInterval} (${start}, ${end})`);
						visitor.depth++;
						await (new DateRangeIntervals(start, end, lowerInterval)).accept(visitor);
						visitor.depth--;
					}
				}
			}
		}
	});
}

function DateRangeIntervalVisitor(fn){
	if(!new.target){
		return new DateRangeIntervalVisitor(...arguments);
	}

	Object.defineProperties(this, {
		depth: {
			value: 0,
			writable: true
		},
		subIntervals: {
			value: false,
			writable: true
		},
		visit: {
			value: fn
		}
	});
}

module.exports = {
	DateRangeIntervals,
	DateRangeIntervalVisitor
};
