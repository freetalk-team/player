

dom.toggleTitle = function(e) {

	const [title, state] = e.title.splitLast(' ')
		, s = state == 'on' ? 'off' : 'on';

	e.title = title + ' ' + s;
}