const { assert } = require('chai');
const { default: Logger } = require('log-ng');
const { DateRangeIntervals, DateRangeIntervalVisitor } = require('./DateRangeIntervals.js');

const logger = new Logger('spec.js');

describe('DateRangeIntervals', function(){
	it('should create intervals with correct start, end, and length', function(){
		const start = new Date('2024-01-01');
		const end = new Date('2024-01-05');
		const interval = 'day';
		const intervals = new DateRangeIntervals(start, end, interval);

		assert.strictEqual(intervals.start.getTime(), start.getTime());
		assert.strictEqual(intervals.end.getTime(), end.getTime());
		assert.strictEqual(intervals.interval, interval);
		assert.strictEqual(intervals.length, 4);
	});

	it('should throw an error for invalid interval', function(){
		const start = new Date();
		const end = new Date();
		const interval = 'bogus';
		assert.throws(() => new DateRangeIntervals(start, end, interval), Error);
	});

	it('should return the correct iterator', function(){
		const start = new Date('2024-01-01');
		const end = new Date('2024-01-05');
		const interval = 'day';
		const intervals = new DateRangeIntervals(start, end, interval);

		const expectedIntervals = [
			[new Date('2024-01-01T00:00:00Z'), new Date('2024-01-02T00:00:00Z')],
			[new Date('2024-01-02T00:00:00Z'), new Date('2024-01-03T00:00:00Z')],
			[new Date('2024-01-03T00:00:00Z'), new Date('2024-01-04T00:00:00Z')],
			[new Date('2024-01-04T00:00:00Z'), new Date('2024-01-05T00:00:00Z')]
		];

		const generatedIntervals = [];
		for (const interval of intervals) {
			generatedIntervals.push(interval);
		}

		assert.deepStrictEqual(generatedIntervals, expectedIntervals);
	});

	it('should visit intervals with correct start and end dates', async function(){
		const start = new Date('2024-01-01T12:00:00Z');
		const end = new Date('2024-01-01T12:15:00Z');
		const interval = 'minute';
		const intervals = new DateRangeIntervals(start, end, interval);
		const visitor = new DateRangeIntervalVisitor(function(interval){
			this.intervals.push([interval.start, interval.end]);
		});
		visitor.intervals = [];

		assert.strictEqual(intervals.length, 15);
		await intervals.accept(visitor);

		const expected = [
			[new Date('2024-01-01T12:00:00Z'), new Date('2024-01-01T12:01:00Z')],
			[new Date('2024-01-01T12:01:00Z'), new Date('2024-01-01T12:02:00Z')],
			[new Date('2024-01-01T12:02:00Z'), new Date('2024-01-01T12:03:00Z')],
			[new Date('2024-01-01T12:03:00Z'), new Date('2024-01-01T12:04:00Z')],
			[new Date('2024-01-01T12:04:00Z'), new Date('2024-01-01T12:05:00Z')],
			[new Date('2024-01-01T12:05:00Z'), new Date('2024-01-01T12:06:00Z')],
			[new Date('2024-01-01T12:06:00Z'), new Date('2024-01-01T12:07:00Z')],
			[new Date('2024-01-01T12:07:00Z'), new Date('2024-01-01T12:08:00Z')],
			[new Date('2024-01-01T12:08:00Z'), new Date('2024-01-01T12:09:00Z')],
			[new Date('2024-01-01T12:09:00Z'), new Date('2024-01-01T12:10:00Z')],
			[new Date('2024-01-01T12:10:00Z'), new Date('2024-01-01T12:11:00Z')],
			[new Date('2024-01-01T12:11:00Z'), new Date('2024-01-01T12:12:00Z')],
			[new Date('2024-01-01T12:12:00Z'), new Date('2024-01-01T12:13:00Z')],
			[new Date('2024-01-01T12:13:00Z'), new Date('2024-01-01T12:14:00Z')],
			[new Date('2024-01-01T12:14:00Z'), new Date('2024-01-01T12:15:00Z')]
		];

		let count = 0;
		for(const [intervalStart, intervalEnd] of visitor.intervals){
			assert.strictEqual(intervalStart.getTime(), expected[count][0].getTime());
			assert.strictEqual(intervalEnd.getTime(), expected[count][1].getTime());
			count++;
		}

		assert.strictEqual(count, 15);
	});

	it('should handle DST transitions correctly for daily intervals', function(){
		const start = new Date('2024-03-10T02:00:00Z');
		const end = new Date('2024-03-10T05:00:00Z');
		const intervals = new DateRangeIntervals(start, end, 'hour');

		assert.strictEqual(intervals.length, 3);

		for(const [intervalStart, intervalEnd] of intervals){
			const diffHours = (intervalEnd.getTime() - intervalStart.getTime()) / 3600000;
			assert.strictEqual(diffHours, 1, `Interval should be 1 hour, but got ${diffHours} hours`);
		}
	});

	it('should handle month boundaries with varying day counts', function(){
		const start = new Date('2024-02-28T00:00:00Z');
		const end = new Date('2024-03-02T00:00:00Z');
		const intervals = new DateRangeIntervals(start, end, 'day');

		const results = Array.from(intervals);
		assert.strictEqual(results.length, 3);
	});

	it('should visit the full interval and exit', async function(){
		const start = new Date('2024-01-01');
		const end = new Date('2024-01-05');
		const interval = 'day';
		const intervals = new DateRangeIntervals(start, end, interval);
		const visitor = new DateRangeIntervalVisitor(function(interval){
			const expectedStart = new Date(start.getTime() + this.visitCount * 86400000);
			const expectedEnd = new Date(start.getTime() + (this.visitCount + 1) * 86400000);
			logger.debug(`Visiting interval ${this.visitCount}`);
			logger.debug(`Actual  : ${interval.start.toISOString()} (${interval.start.getTime()}) - ${interval.end.toISOString()} (${interval.end.getTime()})`);
			logger.debug(`Expected: ${expectedStart.toISOString()} (${expectedStart.getTime()}) - ${expectedEnd.toISOString()} (${expectedEnd.getTime()})`);
			assert.equal(interval.start.getTime(), expectedStart.getTime());
			assert.strictEqual(interval.end.getTime(), expectedEnd.getTime());
			this.visitCount++;
		});
		visitor.visitCount = 0;
		await intervals.accept(visitor);

		assert.strictEqual(visitor.visitCount, 4);
	});

	it('should visit the subintervals and exit', async function(){
		const start = new Date('2024-01-01T00:00:00Z');
		const end = new Date('2025-01-01T00:00:00Z');
		const interval = 'quarter';
		const intervals = new DateRangeIntervals(start, end, interval);
		const visitor = new DateRangeIntervalVisitor(function(interval){
			if(this.depth > 1){
				logger.trace(`Ending descent at depth ${this.depth}`);
				return;
			}
			logger.debug(`Visiting interval ${this.visitCount} (depth ${this.depth}): ${interval.start.toISOString()} (${interval.start.getTime()}) - ${interval.end.toISOString()} (${interval.end.getTime()})`);
			this.dates.push([interval.start, interval.end]);
			this.visitCount++;
			return true;
		});
		visitor.dates = [];
		visitor.visitCount = 0;
		visitor.subIntervals = true;

		await intervals.accept(visitor);

		const expectedIntervals = [
			[ new Date('2024-01-01T00:00:00.000Z'), new Date('2024-04-01T00:00:00.000Z') ],
			[ new Date('2024-01-01T00:00:00.000Z'), new Date('2024-02-01T00:00:00.000Z') ],
			[ new Date('2024-02-01T00:00:00.000Z'), new Date('2024-03-01T00:00:00.000Z') ],
			[ new Date('2024-03-01T00:00:00.000Z'), new Date('2024-04-01T00:00:00.000Z') ],
			[ new Date('2024-04-01T00:00:00.000Z'), new Date('2024-07-01T00:00:00.000Z') ],
			[ new Date('2024-04-01T00:00:00.000Z'), new Date('2024-05-01T00:00:00.000Z') ],
			[ new Date('2024-05-01T00:00:00.000Z'), new Date('2024-06-01T00:00:00.000Z') ],
			[ new Date('2024-06-01T00:00:00.000Z'), new Date('2024-07-01T00:00:00.000Z') ],
			[ new Date('2024-07-01T00:00:00.000Z'), new Date('2024-10-01T00:00:00.000Z') ],
			[ new Date('2024-07-01T00:00:00.000Z'), new Date('2024-08-01T00:00:00.000Z') ],
			[ new Date('2024-08-01T00:00:00.000Z'), new Date('2024-09-01T00:00:00.000Z') ],
			[ new Date('2024-09-01T00:00:00.000Z'), new Date('2024-10-01T00:00:00.000Z') ],
			[ new Date('2024-10-01T00:00:00.000Z'), new Date('2025-01-01T00:00:00.000Z') ],
			[ new Date('2024-10-01T00:00:00.000Z'), new Date('2024-11-01T00:00:00.000Z') ],
			[ new Date('2024-11-01T00:00:00.000Z'), new Date('2024-12-01T00:00:00.000Z') ],
			[ new Date('2024-12-01T00:00:00.000Z'), new Date('2025-01-01T00:00:00.000Z') ]
		];

		assert.strictEqual(visitor.visitCount, 16);
		for(let i = 0; i < visitor.dates.length; i++){
			const [start, end] = visitor.dates[i];
			assert.strictEqual(start.getTime(), expectedIntervals[i][0].getTime());
			assert.strictEqual(end.getTime(), expectedIntervals[i][1].getTime());
		}
	});
});
