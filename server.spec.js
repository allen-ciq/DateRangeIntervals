const assert = require('node:assert');
const Logger = require('log-ng');
const path = require('node:path');
const { DateRangeIntervals, DateRangeIntervalVisitor } = require('./DateRangeIntervals.js');

const logger = new Logger(path.basename(__filename));

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

	it('should return the correct iterator', function() {
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
		const start = new Date('2024-01-01');
		const end = new Date('2025-01-01');
		const interval = 'quarter';
		const intervals = new DateRangeIntervals(start, end, interval);
		const visitor = new DateRangeIntervalVisitor(function(interval){
			if(this.depth > 1){
				logger.silly(`Ending descent at depth ${this.depth}`);
				return;
			}
			logger.debug(`Visiting interval ${this.visitCount} (depth ${this.depth}): ${interval.start.toISOString()} (${interval.start.getTime()}) - ${interval.end.toISOString()} (${interval.end.getTime()})`);
			this.visitCount++;
			return true;
		});
		visitor.visitCount = 0;
		visitor.subIntervals = true;
		await intervals.accept(visitor);

		assert.strictEqual(visitor.visitCount, 16);
	});
});
