const program = require('commander')
		, _ = require('lodash')
		, fs = require('fs')
		, path = require('path')
		, os = require('os')
		, async = require('async')
		, debug = require('debug')('haproxy-json');

debug('parsing program arguments');

program
	.version(require('./package.json').version)
	.usage('[options] -f file [-f file]*')
	.option('-f, --file <file>', 'Input file', Array)
	.option('-o, --output [output]', 'Output file', String, 'haproxy.cfg')
	.option('--tab-size [tab-size]', 'Tab size. Only applies if indented with', Number, 2)
	.option('-t, --tab [tab]', 'Flag to indent with tabs', Boolean, false)
	.parse(process.argv);

debug('demand at least one file');

if (!program.file || !program.file.length) {
	console.error('-f option required');
	process.exit(1);
}

debug('convert argument format to array');

const files = _.chain(program.file).flattenDeep().compact().value();

debug('input files are %o', files);

const checkThatAllFilesExist = files => cb => {
	async.each(files, (file, cb) => {
		debug('checking that %s exists', file);

		fs.stat(file, (err, stats) => {
			if (err) return cb(err);

			if (!stats.isFile()) {
				return cb(new Error(`${file} is not a regular file`));
			}

			return cb();
		})

	}, cb);
};

const readFiles = (files, cb) => {
	async.map(files, (file, cb) => {
		debug('reading %s', file);
		fs.readFile(file, cb);
	}, cb);
};

const merger = (objValue, srcValue, key) => {
	debug('%s: %o vs %o', key, objValue, srcValue);
	if (_.isUndefined(objValue)) {
		return srcValue;
	}
	if (key === 'global') {
		return _.extend({}, objValue, srcValue);
	}
	if (key === 'defaults') {
		return [].concat(objValue, srcValue);
	}
	if (key === 'frontend') {
		return [].concat(objValue, srcValue);
	}
	if (key === 'backend') {
		return [].concat(objValue, srcValue);
	}
	return objValue;
}

async.auto({
	filesExist: checkThatAllFilesExist(files),
	readFiles: ['filesExist', (results, cb) => {
		readFiles(files, cb);
	}],
	parseFiles: ['readFiles', (results, cb) => {
		let _err = false;
		const fileContents = _.map(results.readFiles, (buffer, i) => {
			if (_err) return;
			debug('parsing %s', files[i]);
			let json;
			try {
				json = JSON.parse(buffer.toString());
			} catch (err) {
				_err = true;
				cb(new Error(`${files[i]} is not valid JSON`));
			}
			return json;
		});
		if (_err) return;
		cb(null, fileContents);
	}],
	buildConf: ['parseFiles', (results, cb) => {
		debug('parsed files are %o', results.parseFiles);
		debug('building main json file');

		const mainJSON = _.chain({}).extendWith(..._.reverse(results.parseFiles), merger).pick('global', 'defaults', 'frontend', 'backend').value();
		cb(null, mainJSON);
	}],
	writeHAProxyConf: ['buildConf', (results, cb) => {
		debug('writing %O to %s', results.buildConf, program.output);
		const writeStream = fs.createWriteStream(program.output);
		_.each(results.buildConf, (options, key) => {
			debug('writing %o to %s', options, key);
			if (Array.isArray(options)) {
				_.each(options, (val, k) => {
					writeStream.write(`${key}${os.EOL}`);
					_.each(val, (val, key) => {
						if (program.tab) {
							writeStream.write('\t');
						} else {
							writeStream.write(_.times(program.tabSize, _.constant(' ')).join(''));
						}
						writeStream.write(`${[key, val].join(' ')}${os.EOL}`);
					});
				});
				return;
			}
			writeStream.write(`${key}${os.EOL}`);
			_.each(options, (val, key) => {
				if (program.tab) {
					writeStream.write('\t');
				} else {
					writeStream.write(_.times(program.tabSize, _.constant(' ')).join(''));
				}
				writeStream.write(`${[key, val].join(' ')}${os.EOL}`);
			});
		});
		writeStream.on('finish', () => {
			writeStream.end();
			cb();
		});
	}]
}, (err, results) => {
	if (err) {
		console.error(err);
		process.exit(2);
	}

	console.log(`Successfully wrote config file to %s`, program.output);

	process.exit(0);
});