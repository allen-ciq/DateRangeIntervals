# DateRangeIntervals
> An array of intervals created for a date range which implements a visitor-like pattern

Implements a visitor-like pattern on an array of intervals created for a date range.  It is "visitor-like" because it
allows the visitor to dynamically descend into smaller intervals.  For example, if traversing a range of months, the
visitor can choose to subdivide a month and traverse the weeks.

Example:
```javascript
const visitorFn = (interval) => {
	this.dates.push([interval.start, interval.end]);
};
const visitor = new DateRangeIntervalVisitor(visitorFn);
visitor.dates = [];

const start = new Date('2025-01-01');
const end = new Date('2025-04-01');
const interval = 'month';
const intervals = new DateRangeIntervals(start, end, interval);

intervals.accept(visitor);

console.log(visitor.dates);
// output:
/* [
[2025-01-01T00:00:00.000Z, 2025-02-01T00:00:00.000Z],
[2025-02-01T00:00:00.000Z, 2025-03-01T00:00:00.000Z],
[2025-03-01T00:00:00.000Z, 2025-04-01T00:00:00.000Z]]
] */
```

Example with subdivision:
```javascript
const visitorFn = (interval) => {
	if(this.depth > 1){
		logger.debug(`Ending descent at depth ${this.depth}`);
		return;
	}
	this.dates.push([interval.start, interval.end]);
	return true;
};
const visitor = new DateRangeIntervalVisitor(visitorFn);
visitor.dates = [];
visitor.subIntervals = true;

const start = new Date('2024-01-01');
const end = new Date('2025-01-01');
const interval = 'quarter';
const intervals = new DateRangeIntervals(start, end, interval);

intervals.accept(visitor);

console.log(visitor.dates);
// output:
/* [
[ '2024-01-01T00:00:00.000Z', '2024-04-01T00:00:00.000Z' ],
[ '2024-01-01T00:00:00.000Z', '2024-02-01T00:00:00.000Z' ],
[ '2024-02-01T00:00:00.000Z', '2024-03-01T00:00:00.000Z' ],
[ '2024-03-01T00:00:00.000Z', '2024-04-01T00:00:00.000Z' ],
[ '2024-04-01T00:00:00.000Z', '2024-07-01T00:00:00.000Z' ],
[ '2024-04-01T00:00:00.000Z', '2024-05-01T00:00:00.000Z' ],
[ '2024-05-01T00:00:00.000Z', '2024-06-01T00:00:00.000Z' ],
[ '2024-06-01T00:00:00.000Z', '2024-07-01T00:00:00.000Z' ],
[ '2024-07-01T00:00:00.000Z', '2024-10-01T00:00:00.000Z' ],
[ '2024-07-01T00:00:00.000Z', '2024-08-01T00:00:00.000Z' ],
[ '2024-08-01T00:00:00.000Z', '2024-09-01T00:00:00.000Z' ],
[ '2024-09-01T00:00:00.000Z', '2024-10-01T00:00:00.000Z' ],
[ '2024-10-01T00:00:00.000Z', '2025-01-01T00:00:00.000Z' ],
[ '2024-10-01T00:00:00.000Z', '2024-11-01T00:00:00.000Z' ],
[ '2024-11-01T00:00:00.000Z', '2024-12-01T00:00:00.000Z' ],
[ '2024-12-01T00:00:00.000Z', '2025-01-01T00:00:00.000Z' ]
] */
```
