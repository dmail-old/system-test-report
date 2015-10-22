var FileTemplate = {
	maxLines: 10000,

	constructor: function(container){
		this.container = typeof container === 'string' ? document.querySelector(container) : container;
	},

	create: function(){
		var instance = Object.create(this);

		instance.constructor.apply(instance, arguments);

		return instance;
	},

	prepareLine: function(line){

	},

	renderLineState: function(line){
		var html = '';

		html+= '<state></state>';

		return html;
	},

	renderLineNumber: function(line){
		var html = '';

		html+= '<a href="#L' + line.number + '">';
		html+= '	' + line.number;
		html+= '</a>';

		return html;
	},

	renderLineComment: function(line){
		var html = '';

		if( line.comment ){
			html+= '<a href="#L' + line.number + '-comment"></a>';
		}

		return html;
	},

	renderLineSource: function(line){
		var html = '';

		html+= '<line>';
		html+= line.source;
		html+= '</line>';

		if( line.comment ){
		html+= '<comment id="L-' + line.number + '-comment">';
		html+= '	' + line.comment;
		html+= '</comment>';
		}

		return html;
	},

	renderLine: function(line){
		this.prepareLine(line);

		var html = '';

		html+= '<tr id="L' + line.number + '" data-type="' + line.type + '" data-state="' + line.state + '" ' + (line.comment ? 'data-comment="comment"' : '') + '>';
		html+= '	<td class="line-state">';
		html+= '		' + this.renderLineState(line);
		html+= '	</td>';
		html+= '	<td class="line-number">';
		html+= '		' + this.renderLineNumber(line);
		html+= '	</td>';
		html+= '	<td class="line-comment">';
		html+= '		' + this.renderLineComment(line);
		html+= '	</td>';
		html+= '	<td class="line-source">';
		html+= '		' + this.renderLineSource(line);
		html+= '	</td>';
		html+= '</tr>';

		return html;
	},

	renderLines: function(lines){
		var html = '';

		lines.forEach(function(lineSource, index){
			var line = {
				number: this.firstLinerNumber + index + 1,
				source: lineSource === '' ? '\n' : lineSource,
				type: 'normal',
				state: 'normal'
			};

			html+= this.renderLine(line);
		}, this);

		return html;
	},

	render: function(lines){
		var html = '';

		html+= '<table>';
		html+= '	<tbody>';
		html+= '		' + this.renderLines(lines);
		html+= '	</tbody>';
		html+= '</table>';

		return html;
	},

	setup: function(){
		for( var link of this.container.querySelectorAll('.line-comment a') ){
			link.addEventListener('click', function(e){
				e.preventDefault();

				var lineElement = this.parentNode.parentNode;

				if( lineElement.dataset.expanded ){
					delete lineElement.dataset.expanded;
				}
				else{
					lineElement.dataset.expanded = 'expanded';
				}
			});
		}

		for( var line of this.container.querySelectorAll('*[data-comment] line') ){
			line.addEventListener('click', function(e){
				this.parentNode.parentNode.querySelector('.line-comment a').click();
			});
		}

		// content is dynamically loaded retrigger the scroll to the hash
		window.location.hash = window.location.hash;
	},

	onslice: function(){

	},

	fetch: function(url, lineNumber){
		return window.createFileContentPromise(url).then(function(fileContent){
			var lines = fileContent.split(/\r\n|\r|\n/), length = lines.length;
			var max = this.maxLines;
			var half;
			var startLine = 0;
			var endLine;
			var html = '';

			this.lineNumber = lineNumber;

			if( length > max ){
				half = max / 2;

				if( isNaN(lineNumber) ){
					lineNumber = half;
				}

				startLine = lineNumber - half;
				if( startLine < 0 ) startLine = 0;
				endLine = startLine + max;
				lines = lines.slice(startLine, endLine);

				html+= '\
					<p type="warning">\
						This file is too big, the view is reduced to line <strong>' + startLine + '-' + endLine + '</strong>\
					</p>\
				';

				this.onslice(startLine, endLine);
			}

			this.firstLinerNumber = startLine;
			html+= this.render(lines);
			this.container.innerHTML = html;
			this.setup();
		}.bind(this));
	}
};

window.FileTemplate = FileTemplate;
