import crypto from 'node:crypto'
import knex from 'knex'
import knexfile from '../knexfile.js'

export const db = knex(knexfile[process.env.NODE_ENV || 'development'])

export const createUser = async (username, password) => {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex')
  const token = crypto.randomBytes(16).toString('hex')

  const [user] = await db('users').insert({ username, salt, hash, token }).returning('*')

  return user
}

export const getUserByPassword = async (username, password) => {
  const user = await db('users').where({ username }).first()
  if (!user) return null

  const hash = crypto.pbkdf2Sync(password, user.salt, 100000, 64, 'sha512').toString('hex')
  if (hash !== user.hash) return null

  return user
}

export const getUserByToken = async (token) => {
  const user = await db('users').where({ token }).first()

  return user
}
