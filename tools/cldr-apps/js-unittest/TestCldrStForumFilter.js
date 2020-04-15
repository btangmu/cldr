'use strict';
const assert = require('assert');
const cldrStForumFilter = require('../WebContent/js/CldrStForumFilter.js');

describe('cldrStForumFilter.getFilteredThreadIds', function() {
	it('should return two threads for two unrelated posts', function() {
		let posts = [{id: 1, threadId: 't1', parent: -1, poster: 100}, {id: 2, threadId: 't2', parent: -1, poster: 200}];
		const actualOutput = cldrStForumFilter.getFilteredThreadIds(posts);
		const expectedOutput = ['t1', 't2'];
		assert.deepEqual(actualOutput, expectedOutput);
	});
	it('should return one thread for two related posts', function() {
		let posts = [{id: 1, threadId: 't1', parent: -1, poster: 100}, {id: 2, threadId: 't1', parent: 1, poster: 200}];
		const actualOutput = cldrStForumFilter.getFilteredThreadIds(posts);
		const expectedOutput = ['t1'];
		assert.deepEqual(actualOutput, expectedOutput);
	});
});
