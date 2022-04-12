(function (d, w) {
'use strict';

var matchPointsRegEx = /\(([0-9]*[.]?[0-9]+)pts?\)/im;

var debounce = function (func, wait, immediate) {
	var timeout;
	return function() {
		var context = this, args = arguments;
		var later = function() {
			timeout = null;
			if (!immediate) func.apply(context, args);
		};
		var callNow = immediate && !timeout;
		clearTimeout(timeout);
		timeout = setTimeout(later, wait);
		if (callNow) func.apply(context, args);
	};
};

var pluralize = (value) => (
	value === 1 ? '' : 's'
);

var resetStoryPointsForColumn = (column) => {
	const customElements = Array.from(column.getElementsByClassName('column-story-points'));
	for (let e of customElements) {
		const parent = e.parentNode;
		if (parent.dataset.gpspOriginalContent) {
			parent.innerText = parent.dataset.gpspOriginalContent;
			delete parent.dataset.gpspOriginalContent;
		} else {
			parent.removeChild(e);
		}
	}
};

var titleWithTotalPoints = (cards, points, unestimated, notes) => {
		let unestimated_element = "";
		let points_element      = "";
		let notes_element       = "";
		let issues_element      = "";
		let issues              = cards - notes;
		let show_notes          = false;
		let show_issues         = false;

		if ( issues && show_issues ) {
			issues_element = `${issues} issue${pluralize(issues)}`;
			if ( notes && show_notes ) {
				issues_element += ', ';
			}
		}

		if (notes && show_notes) {
			notes_element = `${notes} note${pluralize(notes)}`;
		}

		if (unestimated > 0) {
			unestimated_element = ` <span class="column-story-points" style="font-size:xx-small">(${issues-unestimated}/${issues} estd.)</span>`;
		}

		if (issues && points >= 0) {
			points_element = `${points} pt${pluralize(points)}`;
		}

		if (points_element && (show_issues || show_notes)) {
			points_element = `, ${points_element}`;
		}

		return issues_element + notes_element + points_element + unestimated_element;
};

var addStoryPointsForColumn = (column) => {
	const columnCards = Array
		.from(column.getElementsByClassName('issue-card'))
		.filter(card => !card.classList.contains('sortable-ghost') && !card.classList.contains('d-none'))
		.map(card => {

			const is_note = Array
				.from(card.getElementsByClassName('card-note-octicon')).length;

			// Points.
			const issueTitle = Array
				.from(card.getElementsByClassName('js-project-card-issue-link'));

			const issueTitleInner = (
				issueTitle.length > 0 ? issueTitle[0].innerText.trim() : null)

			const matchPoints = (
				matchPointsRegEx.exec(issueTitleInner) ||
				[null, '0', '0'])

			const storyPoints = parseFloat(matchPoints[1]) || 0;

			const is_estimated = (matchPoints[0] !== null);

			return {
				element: card,
				is_estimated,
				is_note,
				storyPoints
			};
		});

	let columnStoryPoints = 0;
	let columnUnestimated = 0;
	let columnNotes       = 0;

	for (let card of columnCards) {
		columnStoryPoints += card.storyPoints;
		columnNotes       += card.is_note ? 1 : 0;
		columnUnestimated += (card.is_estimated || card.is_note ? 0 : 1);
	}

	// Apply DOM changes:
	const columnCountElement = column.getElementsByClassName('js-column-card-count')[0];

	columnCountElement.innerHTML = titleWithTotalPoints(columnCards.length, columnStoryPoints, columnUnestimated, columnNotes);
};

var resets = [];

var start = debounce(() => {
	// Reset
	for (let reset of resets) {
		reset();
	}
	resets = [];
	// Projects
	const projects = d.getElementsByClassName('project-columns-container');
	if (projects.length > 0) {
		const project = projects[0];
		const columns = Array.from(project.getElementsByClassName('js-project-column')); // Was 'col-project-custom', but that's gitenterprise; github.com is 'project-column', fortunately, both have 'js-project-column'
		for (let column of columns) {
			const addStoryPoints = ((c) => debounce(() => {
				resetStoryPointsForColumn(c);
				addStoryPointsForColumn(c);
			}, 50))(column);
			column.addEventListener('DOMSubtreeModified', addStoryPoints);
			column.addEventListener('drop', addStoryPoints);
			addStoryPointsForColumn(column);
			resets.push(((c) => () => {
				resetStoryPointsForColumn(c);
				column.removeEventListener('DOMSubtreeModified', addStoryPoints);
				column.removeEventListener('drop', addStoryPoints);
			})(column));
		}
	}
}, 100);

// Hacks to restart the plugin on pushState change
w.addEventListener('statechange', () => setTimeout(() => {
	const timelines = d.getElementsByClassName('new-discussion-timeline');
	if (timelines.length > 0) {
		const timeline = timelines[0];
		const startOnce = () => {
			timeline.removeEventListener('DOMSubtreeModified', startOnce);
			start();
		};
		timeline.addEventListener('DOMSubtreeModified', startOnce);
	}
	start();
}, 500));

// First start
start();

})(document, window);
