function basename(path, stripExtension){
	var name = path.slice(path.lastIndexOf('/') + 1);
	if( stripExtension ){
		name = name.slice(0, name.lastIndexOf('.'));
	}
	return name;
}

function createFileContentPromise(path){
	return new Promise(function(resolve, reject){
		var xhr = new XMLHttpRequest();
		xhr.open('GET', path);
		console.log('GET', path);
		xhr.onload = function(){
			resolve(xhr.responseText);
		};

		xhr.onreadystatechange = function(e){
			if( xhr.status === 0 && xhr.responseText === '' ){
				reject();
			}
		};

		xhr.send();
	});
}

function readDirectory(path){
	return createFileContentPromise(path).then(function(directoryString){
		var lines = directoryString.split('\n');
		lines.pop();
		var directory = lines.shift();
		var directoryLocation = directory.split(' ')[1].slice(0, -1);
		var properties = lines.shift();
		var entries = lines.map(function(line){
			var parts = line.split(' ');
			var fileName = decodeURIComponent(parts[1]);

			return {
				status: parts[0].slice(0, -1),
				location: directoryLocation + '/' + fileName,
				fileName: fileName,
				size: Number(parts[2]),
				mtime: new Date(decodeURIComponent(parts[3])),
				type: parts[4]
			};
		});

		return entries;
	});
}

function createReportPromise(path){
	var filename = basename(path, true);

	return createFileContentPromise(path + '/report/' + filename + '.json');
}

function restoreDuration(item){
	item.startDate = new Date(item.startDate);
	item.endDate = new Date(item.endDate);
	item.duration = item.endDate - item.startDate;
}

function loadReport(path){
	return createReportPromise(path).then(JSON.parse).then(function(report){
		//report.dirname = reportFolderLocation;
		restoreDuration(report);
		var fileName = suite.fileName;
		var reportLocation = report.location;

		if( fileName.indexOf(reportLocation) === 0 ){
			fileName = fileName.slice(reportLocation.length + 1);
		}

		suite.name = fileName;
		suite.url = ' ./suite.html?report=' + report.dirname + '&file=' + suite.name;
		restoreDuration(suite);

		suite.tests.forEach(function(test){
			restoreDuration(test);
			test.assertions.forEach(function(assertion){
				restoreDuration(assertion);
			});
		});

		return report;
	});
}

Number.prototype[Symbol.iterator] = function(){
	return {
		index: 0,
		length: this,

		next: function(){
			var i = this.index++, value, done;

			if( i >= this.length ){
				done = true;
			}
			else{
				done = false;
				value = i;
			}
			return {
				done: done,
				value: value
			};
		}
	};
};

function writeAttributes(attributes){
	var html = '';

	for( var attributeName in attributes ){
		html+= ' ' + attributeName + '="' + attributes[attributeName] + '"';
	}

	return html;
}

var Table = {
	writeHeader: function(headers){
		var html = '';

		html+= '<thead>';
		html+= '	<tr>';
		headers.forEach(function(cell){
		html+= '		<th>';
		html+= '			' + cell;
		html+= '		</th>';
		}, this);
		html+= '	</tr>';
		html+= '</thead>';

		return html;
	},

	writeRow: function(row){
		var html = '';

		if( Array.isArray(row) ){
			row = {
				cells: row
			};
		}

		html+= '<tr'+ writeAttributes(row.attributes) +'>';
		row.cells.forEach(function(cell){
			if( typeof cell === 'string' ){
				cell = {
					value: cell
				};
			}

			html+= '	<td ' + writeAttributes(cell.attributes) + '>';
			html+= '		' + cell.value;
			html+= '	</td>';
		}, this);
		html+= '</tr>';

		return html;
	},

	writeBody: function(body){
		var html = '';

		html+= '<tbody>';
		body.forEach(function(row){
			html+= '	' + this.writeRow(row);
		}, this);
		html+= '</tbody>';

		return html;
	},

	writeFooter: function(footer){
		var html = '';

		html+= '<tfoot>';
		html+= '	<tr>';
		footer.forEach(function(cell){
		html+= '		<th>';
		html+= '			' + cell;
		html+= '		</th>';
		});
		html+= '	</tr>';
		html+= '</tfoot>';

		return html;
	},

	write: function(data){
		var html = '';

		html+= '<table>';
		html+= '	' + this.writeHeader(data.header);
		html+= '	' + this.writeBody(data.body);
		if( data.footer ) html+= '	' + this.writeFooter(data.footer);
		html+= '</table>';

		return html;
	}
};

Date.MS_PER_SECOND = 1000;
Date.MS_PER_MINUTE = 60 * 1000;
Date.MS_PER_HOUR = 60 * 60 * 1000;
Date.MS_PER_DAY = 24 * 60 * 60 * 1000;

function ago(dateA, dateB){
	var diff = dateA - dateB;
	var moments = [
		{
			name: 'millisecond',
			plural: 'milliseconds',
			ms: 1
		},
		{
			name: 'second',
			plural: 'seconds',
			ms: Date.MS_PER_SECOND
		},
		{
			name: 'minute',
			plural: 'minutes',
			ms: Date.MS_PER_MINUTE
		},
		{
			name: 'hour',
			plural: 'hours',
			ms: Date.MS_PER_HOUR
		},
		{
			name: 'day',
			plural: 'days',
			ms: Date.MS_PER_DAY
		}
	];

	var moment = moments.find(function(moment, index, moments){
		if( index === moments.length - 1 ){
			return true;
		}

		return diff < moments[index + 1].ms;
	});

	if( !moment ){
		moment = moments[moments.length - 1];
	}

	var count = Math.floor(diff / moment.ms);

	return count + ' ' +  moment.name + ' ago';
}

function reportError(error){
	return error.stack ? error.stack : error;
}

function reportValue(value){
	return 'no error';
}

function isValidURL(url){
	try{
		new URL(url);
		return true;
	}
	catch(e){
		return false;
	}
}

function prepareLocationLink(location){
	var fileName = location.name;
	var suite = window.report.suites.find(function(suite){
		return suite.fileName === fileName;
	});

	if( suite ){
		location.url = suite.url + '#L' + location.line;
		location.name = suite.name;
	}
	else{
		location.url = './file.html?file=' + fileName + '#L' + location.line;
	}
}

function writeLocation(location){
	var html = '';

	if( location.name ){
		if( isValidURL(location.name) ){
			prepareLocationLink(location);
		}

		if( location.url ){
			html+= '<a href="' + location.url + '">';
		}

		html+= '<name>' + location.name + '</name>';
		if( location.line ){
			html+= '<line>' + location.line + '</line>';
			if( location.column ){
				html+= '<column>' + location.column + '</column>';
			}
		}

		if( location.url ){
			html+= '</a>';
		}
	}

	return html;
}

function stringifyCallSite(callSite, index){
	var line = '', fileName, location = {};

	if( callSite.fromNative ){
		location.name = 'native';
	}
	else{
		fileName = callSite.source || callSite.fileName;
		if( !fileName && callSite.fromEval ){
			location.name = callSite.evalFileName;
			//fileLocation+= ", "; // Expecting source position to follow.
		}

		if( fileName ){
			// when fileName is a valid URL, add a link on it
			location.name = fileName;
		}
		else{
			// Source code does not originate from a file and is not native, but we
			// can still get the source position inside the source string, e.g. in
			// an eval string.
			location.name = '&lt;anonymous&gt';
		}

		location.line = callSite.lineNumber;
		location.column = callSite.columnNumber;
	}

	var functionName = callSite.functionName;
	var isConstructor = callSite.fromConstructor;
	var isMethodCall = !callSite.fromTopLevel && !isConstructor;

	if( isMethodCall ){
		var typeName = callSite.typeName;
		var methodName = callSite.methodName;

		if( functionName ){
			if( typeName && functionName.indexOf(typeName) !== 0 ){
				line+= '<name type="object">' + typeName + '</name>';
			}
			line+= '<name type="function">' + functionName + '</name>';

			if( methodName && functionName.indexOf("." + methodName) != functionName.length - methodName.length - 1 ){
				line+= '<name type="method">' + methodName + '</name>';
			}
		}
		else{
			line+= '<name type="object">' + typeName + '</name>';
			line+= '<name type="method">' + (methodName || "&lt;anonymous&gt") + '</name>';
		}
	}
	else if( isConstructor ){
		line+= '<name type="constructor">' + (functionName || "&lt;anonymous&gt") + '</name>';
	}
	else if( functionName ){
		line+= '<name type="function">' + functionName + '</name>';
	}

	line+= '<location>' + writeLocation(location) + '</location>';

	return line;
}

var ReportResult = {
	writeCallSite: function(callSite, index){
		var html = '';

		html+= '<callsite>';
		html+= stringifyCallSite(callSite, index);
		html+= '</callsite>';

		return html;
	},

	writeTrace: function(error){
		var html = '';
		var callSites = error.callSites;

		html+= '<trace>';
		html+= callSites ? callSites.map(this.writeCallSite, this).join('') : error.stack;
		html+= '</trace>';

		return html;
	},

	createOriginHTMLPromise: function(error){
		if( error.callSites ){
			var firstCall = error.callSites[0];
			var fileName = firstCall.source || firstCall.fileName;

			if( fileName && isValidURL(fileName) ){
				// faut faire une requête xhr vers la location du fichier si on le trouve on pourrait écrire l'info
				return window.createFileContentPromise(fileName).then(
					function(fileContent){
						var html = '';
						var column = firstCall.columnNumber;
						var line = firstCall.lineNumber;
						var lineSource = fileContent.split(/(?:\r\n|\r|\n)/)[line - 1];

						html+= '<origin>';
						if( column != null ){
							html+= lineSource.slice(0, column - 1) + '<span>' + lineSource.slice(column - 1) + '</span>';
						}
						else{
							html+= lineSource;
						}

						html+= '\n';

						if( column != null ){
							var i = 0, j = column -1, char;
							for(;i<j;i++){
								char = lineSource[i];
								// keep \t and space but replace others by spaces
								html+= char === ' ' || char === '\t'  ? char : ' ';
							}
							html+= '^';
						}

						html+= '</origin>';

						return html;
					}, function(error){
						return '<origin>Error while loading file' + error  + '</origin>';
					}
				);
			}
		}

		return Promise.resolve('');
	},

	writeError: function(error){
		var html = '';

		return this.createOriginHTMLPromise(error).then(function(originHTML){
			html+= originHTML;

			html+= '	<name>' + error.name + '</name>';
			html+= '	<message>' + error.message + '</message>';
			html+= '	' + this.writeTrace(error);

			return html;
		}.bind(this));
	},

	write: function(error){
		var html = '';

		if( error && typeof error.stackTrace === 'object' ) error = error.stackTrace;

		if( error ){
			if( typeof error.stack === 'string' || Array.isArray(error.callSites) ){
				html+= '<error>';
				this.writeError(error).then(function(errorHTML){
					document.querySelector('error').innerHTML = errorHTML;
				});
				html+= '</error>';
			}
			else{
				html+= error;
			}
		}
		else{

		}

		return html;
	}
};