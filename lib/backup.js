const fs = require('fs')
const path = require('path')

const Promise = require('bluebird')
const mkdirp = require('mkdirp')
const Utimes = require('@ronomon/utimes')

const epoch = (new Date()).getTime()
const copyStamp = '_' + epoch

const recursiveRead = dir => new Promise((resolve, reject) => {
	const readDir = uri => new Promise((resolve, reject) => {
		fs.readdir(uri, (err, data) => {
			if (err) {
				reject(err)
			}

			resolve(data)
		})
	})

	const stat = filepath => new Promise((resolve, reject) => {
		fs.stat(filepath, (err, stat) => {
			if (err) {
				return reject(err)
			}

			resolve(stat)
		})
	})

	const filterFiles = files => new Promise((resolve, reject) => {
		const stats = []

		files.forEach(file => {
			const filepath = path.join(dir, file)
			stats.push(stat(filepath))
		})

		Promise.all(stats).then(results => {
			const dirs = []
			let fileList = []

			results.forEach((stat, idx) => {
				const filepath = path.join(dir, files[idx])

				if (stat.isFile()) {
					const file = {
						filepath,
						created: new Date(stat.birthtime).getTime(),
						modified: new Date(stat.mtime).getTime(),
						accessed: new Date(stat.atime).getTime(),
						size: stat.size
					}

					fileList.push(file)
				} else if (stat.isDirectory()) {
					if (filepath === '..' && filepath === '.') {
						return
					}

					dirs.push(filepath)
				}
			})

			if (dirs.length === 0) {
				return resolve(fileList)
			}

			const nextReads = []

			dirs.forEach(dir => {
				nextReads.push(recursiveRead(dir))
			})

			Promise.all(nextReads)
			.then(results => {
				results.forEach(dirResult => {
					fileList = fileList.concat(dirResult)
				})

				resolve(fileList)
			})
			.catch(err => {
				reject(err)
			})
		})
	})

	readDir(dir)
	.then(filterFiles)
	.then(files => {
		resolve(files)
	})
	.catch(err => {
		reject(err)
	})
})

const copyFileStream = file => new Promise((resolve, reject) => {
	const {
		from,
		toFile,
		toDir,
		created,
		modified,
		accessed
	} = file

	mkdirp(toDir, err => {
		if (err) {
			reject(err)
		}

		const readableStream = fs.createReadStream(from)
		const writableStream = fs.createWriteStream(toFile)

		readableStream.on('data', chunk => {
			writableStream.write(chunk)
		})

		readableStream.on('end', () => {
			Utimes.utimes(toFile, created, modified, accessed, () => {
				resolve(toFile)
			})
		})

		readableStream.on('close', () => {
			writableStream.close()
			resolve(toFile)
		})

		readableStream.on('error', err => {
			console.error(err)
			reject(err)
		})
	})
})

const backupFiles = backupList => new Promise((resolve, reject) => {
	const results = []
	const total = backupList.length
	let done = 0

	const getNextFile = () => {
		const file = backupList.pop()
		return file
	}

	const doStream = () => {
		if (backupList.length === 0) {
			resolve('All done')
		}

		const nextFile = getNextFile()

		copyFileStream(nextFile)
		.then(toFile => {
			done += 1
			results.push(`Finished: ${done} of ${total} > ${toFile}`)

			if (done === total) {
				results.push('ALL DONE!')
				resolve(results)
			} else {
				doStream()
			}
		})
		.catch(() => {
			doStream()
		})
	}

	doStream()
})

module.exports = settingsObject => {
	let settings

	if (settingsObject) {
		// Pass a settings object in testing
		settings = settingsObject
	} else {
		// Use JSON definition in production
		settings = require('../settings.json')
	}

	if (!settings) {
		throw new Error('No settings found for backup!')
	}

	const makeBackupDir = () => new Promise((resolve, reject) => {
		fs.stat(settings.paths.backup, (err, stat) => {
			if (stat === undefined || err) {
				mkdirp(settings.paths.backup, err => {
					if (err) {
						return reject(err)
					}

					resolve(true)
				})

				return
			}

			resolve(true)
		})
	})

	const createBackupList = collections => new Promise((resolve, reject) => {
		const [media, backup] = collections

		const backupList = []

		media.forEach(file => {
			const from = file.filepath
			const parsed = path.parse(from)
			const filename = parsed.name + parsed.ext
			const relativeDir = path.dirname(path.relative(settings.paths.media, from))
			const relativePath = path.join(relativeDir, filename)

			const toDir = path.join(settings.paths.backup, relativeDir)
			const toFile = path.join(toDir, filename)

			const nextItem = {
				from,
				toFile,
				toDir,
				relativePath,
				created: file.created,
				modified: file.modified,
				size: file.size
			}

			backupList.push(nextItem)
		})

		backup.forEach(file => {
			const toFile = file.filepath
			const parsed = path.parse(toFile)
			const filename = parsed.name + parsed.ext
			const relativeDir = path.dirname(path.relative(settings.paths.backup, toFile))

			const to = {
				relativePath: path.join(relativeDir, filename),
				size: file.size,
				created: file.created,
				modified: file.modified
			}

			backupList.forEach(from => {
				if (from.relativePath === to.relativePath) {
					let fails = 0

					if (from.size !== to.size) {
						fails += 1
					}

					if (from.created !== to.created) {
						fails += 1
					}

					if (from.modified !== to.modified) {
						fails += 1
					}

					if (fails > 0) {
						const toFile = path.parse(from.toFile)
						toFile.name += copyStamp
						toFile.base = toFile.name + toFile.ext
						from.toFile = path.format(toFile)
					}
				}
			})
		})

		resolve(backupList)
	})

	const kicker = new Promise((resolve, reject) => {
		const collections = [
			recursiveRead(settings.paths.media),
			recursiveRead(settings.paths.backup)
		]

		makeBackupDir().then(() => {
			Promise.all(collections)
			.then(createBackupList)
			.then(backupFiles)
			.then(results => {
				resolve(results)
			})
			.catch(err => {
				reject(err)
			})
		})
		.catch(err => {
			reject(err)
		})
	})

	return kicker
}
