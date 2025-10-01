let logger;
if(typeof process !== 'undefined' && process?.versions?.node){
	console.log('Node.js environment detected');
	try{
		const path = require('path');
		const Logger = require('log-ng');
		logger = new Logger(path.basename(__filename));
	}catch(err){
		console.error("Failed to initialize logger:", err);
	}
}else{
	const { default: Logger } = require('log-ng');
	logger = new Logger('DateRangeIntervals.js');
}

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

	if(!start || !end){
		throw new Error('Start and end dates required');
	}

	const segments = [];
	const startDate = new Date(start);
	const endDate = new Date(end);
	const curDate = new Date(start);

	if(isNaN(startDate.getTime())){
		throw new Error('Invalid start date');
	}
	if(isNaN(endDate.getTime())){
		throw new Error('Invalid end date');
	}
	if(startDate >= endDate){
		throw new Error('Start must be before end');
	}

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
					yield new DateRangeInterval(segments[i], segments[i + 1], interval);
				}
			}
		},
		end: {
			enumerable: true,
			value: endDate
		},
		interval: {
			enumerable: true,
			value: interval
		},
		/**
		 * Indicates whether the collection of segments partition the date
		 * range into equal intervals, ie. is the final segment a full
		 * interval?
		 *
		 * @type {boolean}
		 */
		isEquipartition: {
			value: curDate.getTime() === endDate.getTime()
		},
		/**
		 * The number of intervals in the date range.
		 * @type {number}
		 */
		length: {
			enumerable: true,
			value: segments.length - 1
		},
		start: {
			enumerable: true,
			value: startDate
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
				for(const interval of this){
					logger.silly(`visiting ${interval.start.toISOString()} - ${interval.end.toISOString()}`);
					try{
						const subdivide = await visitor.visit(interval);
						if(subdivide && visitor.subIntervals && lowerInterval){
							logger.debug(`recursing lower for subinterval: ${lowerInterval} (${interval.start}, ${interval.end})`);
							try{
								visitor.depth++;
								await (new DateRangeIntervals(interval.start, interval.end, lowerInterval)).accept(visitor);
							}finally{
								visitor.depth--;
							}
						}
					}catch(err){
						logger.error(`Visitor error at depth ${visitor.depth} (${interval.interval}) for interval ${interval.start.toISOString()} - ${interval.end.toISOString()}: ${err.message}`);
					}
				}
			}
		}
	});
}

function DateRangeInterval(start, end, interval){
	if(!new.target){
		return new DateRangeInterval(...arguments);
	}

	Object.defineProperties(this, {
		start: {
			value: new Date(start)
		},
		end: {
			value: new Date(end)
		},
		interval: {
			value: interval
		}
	});
}

function DateRangeIntervalVisitor(fn){
	if(!new.target){
		return new DateRangeIntervalVisitor(...arguments);
	}

	if(typeof fn !== 'function'){
		throw new Error('Visitor must be a function');
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
	DateRangeInterval,
	DateRangeIntervalVisitor
};
