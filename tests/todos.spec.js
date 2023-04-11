import test from 'ava'
import supertest from 'supertest'
import { app } from '../src/app.js'
import { db } from '../src/database.js'

test.beforeEach(async () => {
  await db.migrate.latest()
})

test.afterEach(async () => {
  await db.migrate.rollback()
})

test.serial('GET / shows title of the application', async (t) => {
  const response = await supertest(app).get('/')

  t.assert(response.text.includes('<h1>ToDos!</h1>'))
})

test.serial('GET / shows list of todos', async (t) => {
  await db('todos').insert({ title: 'Test todo!!!' })

  const response = await supertest(app).get('/')

  t.assert(response.text.includes('Test todo!!!'))
})

test.serial('POST /new-todo creates new todo', async (t) => {
  const response = await supertest(app)
    .post('/new-todo')
    .type('form')
    .send({ title: 'Test todo from form' })
    .redirects(1)

  t.assert(response.text.includes('Test todo from form'))
})