const path = require('path')
const chai = require('chai')
const backup = require('../../lib/backup')

const expect = chai.expect

const settings = {
	paths: {
		media: 'from',
		backup: 'to'
	}
}

// describe('backup', () => {
// 	it('should copy new files', () => {
// 		backup
// 	})

// 	describe('should duplicate file with the same name', () => {
// 		it('with different created dates', () => {
// 		})
// 		it('with different file sizes', () => {
// 		})
// 	})
// })
