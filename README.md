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
const end = new Date('2025-02-01');
const interval = 'month';
const intervals = new DateRangeIntervals(start, end, interval);

intervals.accept(visitor);

console.log(visitor.dates);
```
