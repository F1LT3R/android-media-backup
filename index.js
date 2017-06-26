const fs = require('fs')
const path = require('path')

const Promise = require('bluebird')
const mkdirp = require('mkdirp')

const paths = {
	media: process.env.AMB_MEDIA,
	backup: process.env.AMB_BACKUP
}

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
						created: stat.birthtimeMs,
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

const makeBackupDir = () => new Promise((resolve, reject) => {
	fs.stat(paths.backup, (err, stat) => {
		if (stat === undefined || err) {
			mkdirp(paths.backup, err => {
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

const backupFiles = backupList => new Promise((resolve, reject) => {

})

const createBackupList = collections => new Promise((resolve, reject) => {
	const [media, backup] = collections

	media.forEach((file, idx) => {
		console.log(idx, file.filepath)
	})
})

const main = () => new Promise((resolve, reject) => {
	const collections = [
		recursiveRead(paths.media),
		recursiveRead(paths.backup)
	]

	makeBackupDir().then(() => {
		Promise.all(collections)
		.then(createBackupList)
		.then(backupFiles)
		.catch(err => {
			reject(err)
		})
	})
	.catch(err => {
		reject(err)
	})
})

main()
