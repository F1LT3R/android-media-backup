const backup = require('./backup.js')

const settings = undefined

backup(settings).then(results => {
	console.log(results)
}).catch(err => {
	console.error(err)
})
