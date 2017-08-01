const path = require('path')
const chai = require('chai')
const backup = require('../../lib/backup')

const expect = chai.expect

const settings = {
	paths: {
		media: 'from',
		backup: 'to'
	},
	dryrun: false
}

describe('backup', () => {
	it('should copy new files', () => {
		return backup(settings).then(results => {
			console.log(results)
		}).catch(err => {
			console.error(err)
		})
	})
})
